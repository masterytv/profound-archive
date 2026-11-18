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
import { createHash } from 'crypto';
import type Anthropic from '@anthropic-ai/sdk';
import { btUpdateRunIf, type Db } from './supabase';

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
  // maxRetries: 0 — a transparent SDK retry after a lost response could create a second paid batch.
  const batch = await client.messages.batches.create({ requests }, { maxRetries: 0 });
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

/** Attempts per (cell, pass): the original submission plus at most two retries. */
export const MAX_ATTEMPTS = 3;

/** API error types worth retrying; everything else (invalid_request_error, ...) is terminal. */
export const RETRYABLE_ERROR_TYPES = new Set(['overloaded_error', 'api_error', 'rate_limit_error']);

/**
 * succeeded : finished normally (stop_reason end_turn / stop_sequence / ...; see stopReason)
 * truncated : succeeded but stop_reason === 'max_tokens'; output may be cut off. The caller
 *             retries with a higher max_tokens (never treat it as an invalid model answer).
 * errored   : per-request error; retryable only for RETRYABLE_ERROR_TYPES or 5xx
 * canceled / expired : retryable
 */
export type ResultKind = 'succeeded' | 'truncated' | 'errored' | 'canceled' | 'expired';

export interface ClassifiedResult {
  customId: string;
  kind: ResultKind;
  /** Present for 'succeeded' and 'truncated'. */
  message?: Anthropic.Messages.Message;
  /** Present when kind === 'errored'. */
  error?: unknown;
  /** API error type for 'errored' results, when present. */
  errorType?: string;
  /** stop_reason of a succeeded/truncated message (null if the API sent none). */
  stopReason?: string | null;
  /** Whether a new attempt could change the outcome (attempt cap NOT applied here; see selectRetries). */
  retryable: boolean;
  /** Why: 'transient' (expired/canceled/overloaded/api/rate-limit/5xx) or 'truncated' (raise max_tokens). */
  retryReason?: 'transient' | 'truncated';
}

function errorInfo(error: unknown): { type?: string; status?: number } {
  const e = error as { error?: { type?: unknown }; type?: unknown; status?: unknown } | null | undefined;
  const inner = typeof e?.error?.type === 'string' ? e.error.type : typeof e?.type === 'string' && e.type !== 'error' ? e.type : undefined;
  const status = typeof e?.status === 'number' ? e.status : undefined;
  return { type: inner, status };
}

export function classifyResult(r: Anthropic.Messages.MessageBatchIndividualResponse): ClassifiedResult {
  const res = r.result;
  switch (res.type) {
    case 'succeeded': {
      const stopReason = res.message.stop_reason ?? null;
      if (stopReason === 'max_tokens') {
        return { customId: r.custom_id, kind: 'truncated', message: res.message, stopReason, retryable: true, retryReason: 'truncated' };
      }
      return { customId: r.custom_id, kind: 'succeeded', message: res.message, stopReason, retryable: false };
    }
    case 'errored': {
      const { type, status } = errorInfo(res.error);
      const retryable = (type !== undefined && RETRYABLE_ERROR_TYPES.has(type)) || (status !== undefined && status >= 500);
      return {
        customId: r.custom_id, kind: 'errored', error: res.error, errorType: type, retryable,
        ...(retryable ? { retryReason: 'transient' as const } : {}),
      };
    }
    case 'canceled':
      return { customId: r.custom_id, kind: 'canceled', retryable: true, retryReason: 'transient' };
    case 'expired':
      return { customId: r.custom_id, kind: 'expired', retryable: true, retryReason: 'transient' };
    default:
      throw new Error(`unknown batch result type for ${r.custom_id}`);
  }
}

/**
 * Splits non-succeeded results into those to resubmit (retryable AND attempt < maxAttempts)
 * and those that stay terminal (non-retryable errors, or retries exhausted). The attempt
 * number is read from the custom_id (see makeCustomId). Truncated results are returned
 * in `retry` too; the caller must raise max_tokens for them (see `reason`).
 */
export function selectRetries(
  results: Iterable<ClassifiedResult>,
  run: string,
  maxAttempts = MAX_ATTEMPTS,
): {
  retry: Array<{ result: ClassifiedResult; parts: CustomIdParts; nextAttempt: number; reason: 'transient' | 'truncated' }>;
  terminal: Array<{ result: ClassifiedResult; parts: CustomIdParts; why: 'non_retryable' | 'attempts_exhausted' }>;
} {
  const retry: ReturnType<typeof selectRetries>['retry'] = [];
  const terminal: ReturnType<typeof selectRetries>['terminal'] = [];
  for (const result of results) {
    if (result.kind === 'succeeded') continue;
    const parts = parseCustomId(result.customId, run);
    if (!result.retryable) terminal.push({ result, parts, why: 'non_retryable' });
    else if (parts.attempt >= maxAttempts) terminal.push({ result, parts, why: 'attempts_exhausted' });
    else retry.push({ result, parts, nextAttempt: parts.attempt + 1, reason: result.retryReason ?? 'transient' });
  }
  return { retry, terminal };
}

/** Larger max_tokens for a truncated request's retry (doubles, capped). */
export function raiseMaxTokens(current: number, cap = 64_000): number {
  return Math.min(cap, Math.max(current + 1, current * 2));
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
  /**
   * custom_ids whose result may be worth another attempt (expired, canceled, transient
   * errors, truncated). Apply the attempt cap with selectRetries(); terminal errors
   * such as invalid_request_error are not listed.
   */
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
    if (r.retryable) retryable.push(r.customId);
  }
  return { batch, results, retryable };
}

// =====================================================================================
// Guarded submission: never create a paid batch without a durable, conditional record
// =====================================================================================

/** Marker appended to bt_runs.batch_ids BEFORE batches.create: `pending:<iso>:<nReq>:<sha12>`. */
export interface PendingMarker {
  raw: string;
  at: Date;
  iso: string;
  nRequests: number;
  sha12: string;
}

const PENDING_RE = /^pending:(\d{4}-\d\d-\d\dT[\d:.]+Z):(\d+):([0-9a-f]{12})$/;

export function isMarker(entry: string): boolean {
  return entry.startsWith('pending:') || entry.startsWith('void:');
}

/** The real Anthropic batch ids in bt_runs.batch_ids, with pending/void markers removed. */
export function realBatchIds(batchIds: readonly string[] | null | undefined): string[] {
  return (batchIds ?? []).filter((e) => !isMarker(e));
}

export function parsePendingMarker(raw: string): PendingMarker | null {
  const m = PENDING_RE.exec(raw);
  if (!m) return null;
  return { raw, at: new Date(m[1]), iso: m[1], nRequests: Number(m[2]), sha12: m[3] };
}

/** First 12 hex chars of sha256 over the sorted custom_ids joined by newlines. */
export function customIdsSha12(customIds: Iterable<string>): string {
  return createHash('sha256').update([...customIds].sort().join('\n')).digest('hex').slice(0, 12);
}

export function makePendingMarker(customIds: readonly string[], now: Date = new Date()): string {
  return `pending:${now.toISOString()}:${customIds.length}:${customIdsSha12(customIds)}`;
}

/** Pending markers that are NOT immediately followed by a real id or a void marker. */
export function unresolvedMarkers(batchIds: readonly string[]): PendingMarker[] {
  const out: PendingMarker[] = [];
  batchIds.forEach((entry, i) => {
    const m = parsePendingMarker(entry);
    if (!m) return;
    const next = batchIds[i + 1];
    if (next === undefined || next.startsWith('pending:')) out.push(m);
  });
  return out;
}

export interface RunState { id: string; status: string; batch_ids: string[] }

async function readRunState(db: Db, runId: string): Promise<RunState> {
  const { data, error } = await db.from('bt_runs').select('id, status, batch_ids').eq('id', runId);
  if (error) throw new Error(`read bt_runs ${runId} failed: ${error.message}`);
  const row = (data ?? [])[0] as { id: string; status: string; batch_ids: string[] | null } | undefined;
  if (!row) throw new Error(`bt_runs ${runId} not found`);
  return { id: row.id, status: row.status, batch_ids: row.batch_ids ?? [] };
}

type Sleep = (ms: number) => Promise<void>;
const defaultSleep: Sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export interface SubmitGuardedInput {
  db: Db;
  client: Anthropic;
  runId: string;
  /** Status the run must have right now (e.g. 'estimated'); everything hinges on this compare-and-set. */
  expectedStatus: string;
  requests: BatchRequest[];
  now?: () => Date;
  sleep?: Sleep;
  /** Max total time to keep retrying the "record real batch id" write. Default 120 s. */
  recordRetryBudgetMs?: number;
}

export interface SubmitGuardedResult { batchId: string; marker: string }

/**
 * Safe paid submission:
 *  a. conditional UPDATE status expectedStatus -> 'submitting' appending a durable
 *     `pending:<iso>:<nReq>:<sha12>` marker to batch_ids. 0 rows updated => throw (concurrent
 *     or already submitted); NOTHING is sent.
 *  b. batches.create with maxRetries 0 (never auto-retried: a lost response must not duplicate spend).
 *     On failure the run stays 'submitting' with the pending marker; call resolvePending() before
 *     any resubmission.
 *  c. append the real batch id and set status 'submitted' in ONE conditional update (retried with
 *     exponential backoff for ~2 min). If that cannot be recorded the error names the batch id so a
 *     human can pass it to resolvePending --adopt-batch.
 */
export async function submitGuarded(i: SubmitGuardedInput): Promise<SubmitGuardedResult> {
  const { db, client, runId, expectedStatus, requests } = i;
  const sleep = i.sleep ?? defaultSleep;
  if (requests.length === 0) throw new Error('submitGuarded: no requests');
  const ids = requests.map((r) => r.custom_id);
  for (const id of ids) {
    assertValidCustomId(id);
    if (!id.startsWith(`${runId}_`)) throw new Error(`custom_id "${id}" does not start with "${runId}_"`);
  }
  if (new Set(ids).size !== ids.length) throw new Error('duplicate custom_id in requests');

  // a. compare-and-set + durable marker
  const before = await readRunState(db, runId);
  if (before.status !== expectedStatus) {
    throw new Error(`run not in expected status (concurrent or already submitted): ${runId} is "${before.status}", expected "${expectedStatus}"`);
  }
  const marker = makePendingMarker(ids, (i.now ?? (() => new Date()))());
  const n = await btUpdateRunIf(db, runId, expectedStatus, { status: 'submitting', batch_ids: [...before.batch_ids, marker] });
  if (n === 0) throw new Error(`run not in expected status (concurrent or already submitted): ${runId}`);

  // b. create, never auto-retried
  let batch: MessageBatch;
  try {
    batch = await client.messages.batches.create({ requests }, { maxRetries: 0 });
  } catch (e) {
    throw new Error(
      `batches.create failed or its response was lost; run ${runId} stays "submitting" with marker ${marker}. ` +
        `Run resolvePending (it checks whether the batch was created) before ANY resubmission. Cause: ${(e as Error).message}`,
    );
  }

  // c. record the real id (+ status) durably
  await recordBatchId(db, runId, batch.id, sleep, i.recordRetryBudgetMs ?? 120_000);
  return { batchId: batch.id, marker };
}

async function recordBatchId(db: Db, runId: string, batchId: string, sleep: Sleep, budgetMs: number): Promise<void> {
  let waited = 0;
  let delay = 1000;
  let lastErr: unknown;
  for (;;) {
    try {
      const cur = await readRunState(db, runId);
      if (cur.batch_ids.includes(batchId) && cur.status !== 'submitting') return;
      const ids = cur.batch_ids.includes(batchId) ? cur.batch_ids : [...cur.batch_ids, batchId];
      const n = await btUpdateRunIf(db, runId, 'submitting', { batch_ids: ids, status: 'submitted' });
      if (n === 1) return;
      lastErr = new Error(`run ${runId} no longer "submitting" (status "${cur.status}")`);
    } catch (e) {
      lastErr = e;
    }
    if (waited >= budgetMs) break;
    const step = Math.min(delay, budgetMs - waited);
    await sleep(step);
    waited += step;
    delay *= 2;
  }
  throw new Error(
    `BATCH CREATED BUT NOT RECORDED: ${batchId} (run ${runId}). It is running and billing. ` +
      `Record it with resolvePending({ adoptBatchId: "${batchId}" }). Last error: ${(lastErr as Error)?.message ?? lastErr}`,
  );
}

export interface PendingResolution {
  marker: PendingMarker;
  /** 'adopted': a verified batch was recorded; 'none': no matching batch exists, safe to resubmit those keys. */
  result: 'adopted' | 'none';
  batchId?: string;
}

export interface ResolvePendingInput {
  db: Db;
  client: Anthropic;
  /** Run id; the current batch_ids/status are re-read from the database. */
  run: { id: string };
  /** Human-chosen batch to adopt (from a previous "candidates" error). Verified before it is recorded. */
  adoptBatchId?: string;
  poll?: PollOptions;
  now?: () => Date;
}

/** Window before the marker time in which a matching batch may legitimately have been created. */
export const PENDING_LOOKBACK_MS = 60_000;

async function batchCustomIds(client: Anthropic, batchId: string, poll?: PollOptions): Promise<string[]> {
  await pollBatch(client, batchId, poll);
  const ids: string[] = [];
  for await (const r of streamResults(client, batchId)) ids.push(r.customId);
  return ids;
}

function verifyBatchAgainstMarker(runId: string, batchId: string, ids: string[], marker: PendingMarker): void {
  const foreign = ids.filter((id) => !id.startsWith(`${runId}_`));
  if (foreign.length) throw new Error(`batch ${batchId} contains ${foreign.length} custom_id(s) not starting with "${runId}_"; refusing to adopt`);
  if (ids.length !== marker.nRequests) throw new Error(`batch ${batchId} has ${ids.length} requests, marker expects ${marker.nRequests}; refusing to adopt`);
  const sha = customIdsSha12(ids);
  if (sha !== marker.sha12) throw new Error(`batch ${batchId} custom_id hash ${sha} != marker ${marker.sha12}; refusing to adopt`);
}

function total(c: Anthropic.Messages.MessageBatchRequestCounts): number {
  return c.canceled + c.errored + c.expired + c.processing + c.succeeded;
}

/**
 * Resolves every pending marker that has no following real batch id by asking the API
 * whether the batch was in fact created. Call this before ANY resubmission.
 *  - adoptBatchId given: verify (after the batch ends) that every custom_id starts with
 *    `${run.id}_` and that count + sha match some unresolved marker, then record it.
 *  - otherwise list batches created at/after (marker time - 60 s) whose request_counts total equals
 *    nReq: exactly 1 -> verify the same way and adopt; 0 -> result 'none' (a `void:` marker is
 *    recorded so the check is not repeated); >1 -> throw listing ids/created_at for the human to
 *    choose with adoptBatchId.
 */
export async function resolvePending(i: ResolvePendingInput): Promise<PendingResolution[]> {
  const { db, client, run } = i;
  const state = await readRunState(db, run.id);
  const pending = unresolvedMarkers(state.batch_ids);
  if (pending.length === 0) return [];
  const known = new Set(realBatchIds(state.batch_ids));
  const results: PendingResolution[] = [];
  let ids = [...state.batch_ids];

  const record = async (marker: PendingMarker, entry: string, adopted: boolean) => {
    const at = ids.indexOf(marker.raw);
    ids = [...ids.slice(0, at + 1), entry, ...ids.slice(at + 1)];
    const fresh = await readRunState(db, run.id);
    const patch: { batch_ids: string[]; status?: string } = { batch_ids: ids };
    if (adopted && fresh.status === 'submitting') patch.status = 'submitted';
    const n = await btUpdateRunIf(db, run.id, fresh.status, patch);
    if (n === 0) throw new Error(`run ${run.id} changed while recording ${entry}; retry`);
  };

  if (i.adoptBatchId) {
    const batchId = i.adoptBatchId;
    if (known.has(batchId)) throw new Error(`batch ${batchId} is already recorded on run ${run.id}`);
    const batchIds = await batchCustomIds(client, batchId, i.poll);
    const sha = customIdsSha12(batchIds);
    const marker = pending.find((m) => m.sha12 === sha && m.nRequests === batchIds.length);
    if (!marker) throw new Error(`batch ${batchId} (${batchIds.length} requests, hash ${sha}) matches no unresolved marker of run ${run.id}; refusing to adopt`);
    verifyBatchAgainstMarker(run.id, batchId, batchIds, marker);
    await record(marker, batchId, true);
    return [{ marker, result: 'adopted', batchId }];
  }

  for (const marker of pending) {
    const since = marker.at.getTime() - PENDING_LOOKBACK_MS;
    const candidates: MessageBatch[] = [];
    for await (const b of client.messages.batches.list({ limit: 100 })) {
      if (new Date(b.created_at).getTime() < since) break; // newest first
      if (known.has(b.id)) continue;
      if (total(b.request_counts) === marker.nRequests) candidates.push(b);
    }
    if (candidates.length > 1) {
      throw new Error(
        `${candidates.length} batches could be the unrecorded submission for marker ${marker.raw} of run ${run.id}: ` +
          candidates.map((b) => `${b.id} (created ${b.created_at})`).join(', ') +
          `. Choose the right one and pass it as adoptBatchId (--adopt-batch).`,
      );
    }
    if (candidates.length === 0) {
      await record(marker, `void:${(i.now ?? (() => new Date()))().toISOString()}`, false);
      results.push({ marker, result: 'none' });
      continue;
    }
    const batchId = candidates[0].id;
    const batchIds = await batchCustomIds(client, batchId, i.poll);
    verifyBatchAgainstMarker(run.id, batchId, batchIds, marker);
    await record(marker, batchId, true);
    known.add(batchId);
    results.push({ marker, result: 'adopted', batchId });
  }
  return results;
}
