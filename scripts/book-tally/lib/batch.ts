/**
 * Thin wrapper over the official SDK's Message Batches API.
 *
 * Contract used by the job scripts:
 *  - createBatch() calls `onCreated(batchId)` BEFORE returning, so the id can be
 *    persisted (bt_runs.batch_ids) before any polling begins and a crashed run can
 *    resume by collecting results.
 *  - results are keyed by custom_id, never by position.
 *  - no sampling parameters are ever sent (these models reject temperature).
 */
import type Anthropic from '@anthropic-ai/sdk';

export type BatchRequest = Anthropic.Messages.BatchCreateParams.Request;
export type RequestParams = Anthropic.Messages.MessageCreateParamsNonStreaming;
export type MessageBatch = Anthropic.Messages.MessageBatch;
export type Effort = NonNullable<Anthropic.Messages.OutputConfig['effort']>;

/** Documented service limits for one batch. */
export const MAX_REQUESTS_PER_BATCH = 100_000;
export const MAX_BYTES_PER_BATCH = 256 * 1024 * 1024;

export interface BuildParamsInput {
  model: string;
  /** Instructions + question list. Marked with cache_control so repeated requests read it from cache. */
  system: string;
  /** User message text (the transcript or pair description). */
  user: string;
  maxTokens: number;
  effort: Effort;
  /** JSON schema for output_config.format. */
  schema: Record<string, unknown>;
  cacheSystem?: boolean;
}

/** Builds request params. Deliberately has no temperature / top_p / top_k. */
export function buildParams(i: BuildParamsInput): RequestParams {
  return {
    model: i.model,
    max_tokens: i.maxTokens,
    system: [
      {
        type: 'text',
        text: i.system,
        ...(i.cacheSystem === false ? {} : { cache_control: { type: 'ephemeral' as const } }),
      },
    ],
    messages: [{ role: 'user', content: i.user }],
    output_config: { effort: i.effort, format: { type: 'json_schema', schema: i.schema } },
  };
}

/**
 * The Batches API requires custom_id to match ^[A-Za-z0-9_-]{1,64}$ (no colons), so the
 * SPEC's `<run>:<video>:<pass>[:<attempt>]` is encoded with underscores instead:
 * `<run>_<key>_<pass>_<attempt>` (key = videoId, or `c<candidateId>` for pair judging).
 * Parsing strips the known run prefix then reads attempt and pass from the right, so
 * keys containing '_' (YouTube ids can) are safe.
 */
export interface CustomIdParts { run: string; key: string; pass: string; attempt: number }

export function makeCustomId(p: CustomIdParts): string {
  if (!/^[A-Za-z0-9-]+$/.test(p.pass)) throw new Error(`invalid pass "${p.pass}" for custom_id`);
  if (!Number.isInteger(p.attempt) || p.attempt < 1) throw new Error('attempt must be an integer >= 1');
  const id = `${p.run}_${p.key}_${p.pass}_${p.attempt}`;
  assertValidCustomId(id);
  return id;
}

export function parseCustomId(id: string, run: string): CustomIdParts {
  if (!id.startsWith(`${run}_`)) throw new Error(`custom_id "${id}" does not belong to run ${run}`);
  const m = /^(.+)_([A-Za-z0-9-]+)_(\d+)$/.exec(id.slice(run.length + 1));
  if (!m) throw new Error(`unparseable custom_id "${id}"`);
  return { run, key: m[1], pass: m[2], attempt: Number(m[3]) };
}

export function assertValidCustomId(id: string): void {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    throw new Error(`custom_id "${id}" violates the API pattern ^[a-zA-Z0-9_-]{1,64}$`);
  }
}

/** Splits requests so each batch stays under the request-count and byte limits. */
export function chunkRequests(
  requests: BatchRequest[],
  limits: { maxRequests?: number; maxBytes?: number } = {},
): BatchRequest[][] {
  const maxRequests = limits.maxRequests ?? MAX_REQUESTS_PER_BATCH;
  const maxBytes = limits.maxBytes ?? Math.floor(MAX_BYTES_PER_BATCH * 0.9);
  const out: BatchRequest[][] = [];
  let cur: BatchRequest[] = [];
  let bytes = 0;
  for (const r of requests) {
    const size = Buffer.byteLength(JSON.stringify(r));
    if (cur.length > 0 && (cur.length >= maxRequests || bytes + size > maxBytes)) {
      out.push(cur);
      cur = [];
      bytes = 0;
    }
    cur.push(r);
    bytes += size;
  }
  if (cur.length) out.push(cur);
  return out;
}

export async function createBatch(
  client: Anthropic,
  requests: BatchRequest[],
  onCreated: (batchId: string) => void | Promise<void>,
): Promise<MessageBatch> {
  if (requests.length === 0) throw new Error('createBatch: no requests');
  const seen = new Set<string>();
  for (const r of requests) {
    assertValidCustomId(r.custom_id);
    if (seen.has(r.custom_id)) throw new Error(`duplicate custom_id ${r.custom_id}`);
    seen.add(r.custom_id);
  }
  const batch = await client.messages.batches.create({ requests });
  await onCreated(batch.id);
  return batch;
}

export interface PollOptions {
  intervalMs?: number;
  maxWaitMs?: number;
  onTick?: (b: MessageBatch) => void;
  sleep?: (ms: number) => Promise<void>;
}

/** Polls until processing_status === 'ended'. */
export async function pollBatch(client: Anthropic, batchId: string, opts: PollOptions = {}): Promise<MessageBatch> {
  const interval = opts.intervalMs ?? 30_000;
  const maxWait = opts.maxWaitMs ?? 26 * 60 * 60 * 1000; // batches expire after 24h
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const started = Date.now();
  for (;;) {
    const b = await client.messages.batches.retrieve(batchId);
    opts.onTick?.(b);
    if (b.processing_status === 'ended') return b;
    if (Date.now() - started > maxWait) throw new Error(`batch ${batchId} still ${b.processing_status} after ${maxWait} ms`);
    await sleep(interval);
  }
}

export type ResultKind = 'succeeded' | 'errored' | 'canceled' | 'expired';

export interface ClassifiedResult {
  customId: string;
  kind: ResultKind;
  /** Present when kind === 'succeeded'. */
  message?: Anthropic.Messages.Message;
  /** Present when kind === 'errored'. */
  error?: unknown;
}

export function classifyResult(r: Anthropic.Messages.MessageBatchIndividualResponse): ClassifiedResult {
  const res = r.result;
  switch (res.type) {
    case 'succeeded':
      return { customId: r.custom_id, kind: 'succeeded', message: res.message };
    case 'errored':
      return { customId: r.custom_id, kind: 'errored', error: res.error };
    case 'canceled':
      return { customId: r.custom_id, kind: 'canceled' };
    case 'expired':
      return { customId: r.custom_id, kind: 'expired' };
    default:
      throw new Error(`unknown batch result type for ${r.custom_id}`);
  }
}

/** Streams results of an ended batch, classified, in whatever order the API returns them. */
export async function* streamResults(client: Anthropic, batchId: string): AsyncGenerator<ClassifiedResult> {
  const decoder = await client.messages.batches.results(batchId);
  for await (const item of decoder) yield classifyResult(item);
}

/** Text of the first text block of a succeeded message (structured output is JSON text). */
export function messageText(m: Anthropic.Messages.Message): string {
  for (const block of m.content) if (block.type === 'text') return block.text;
  return '';
}

export interface CollectedBatch {
  batch: MessageBatch;
  results: Map<string, ClassifiedResult>;
  /** custom_ids that errored, expired or were canceled: resubmit in a new batch (attempt + 1). */
  retryable: string[];
}

/** Convenience: create (recording the id first), poll, then collect all results keyed by custom_id. */
export async function runBatch(
  client: Anthropic,
  requests: BatchRequest[],
  hooks: { onCreated: (batchId: string) => void | Promise<void> } & PollOptions,
): Promise<CollectedBatch> {
  const created = await createBatch(client, requests, hooks.onCreated);
  return collectBatch(client, created.id, hooks);
}

/** Resume path: poll an already-recorded batch id and collect its results. */
export async function collectBatch(client: Anthropic, batchId: string, opts: PollOptions = {}): Promise<CollectedBatch> {
  const batch = await pollBatch(client, batchId, opts);
  const results = new Map<string, ClassifiedResult>();
  const retryable: string[] = [];
  for await (const r of streamResults(client, batchId)) {
    results.set(r.customId, r);
    if (r.kind !== 'succeeded') retryable.push(r.customId);
  }
  return { batch, results, retryable };
}
