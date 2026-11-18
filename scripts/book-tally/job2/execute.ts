/**
 * Request streaming, estimation (the spend gate's first half) and batch execution
 * (the second half: collect, validate, store, retry). Transcripts flow DB -> API only;
 * logs carry counts and ids.
 */
import type Anthropic from '@anthropic-ai/sdk';
import {
  MAX_BYTES_PER_BATCH, MAX_REQUESTS_PER_BATCH, createBatch, makeCustomId, parseCustomId, pollBatch, streamResults,
  type BatchRequest, type Effort, type RequestParams,
} from '../lib/batch';
import { MODELS, addUsage, emptyTotals, formatUsd, type ModelFamily } from '../lib/cost';
import { prepareTranscript } from '../lib/quote';
import { assertQuestionIdsExist, assertVideoIdsExist, btInsert, btUpdateRun, type Db } from '../lib/supabase';
import { fetchTranscripts, type Transcript } from '../lib/transcript';
import { parseAnswers } from './answers';
import { CliError, gitSha, type Ctx } from './cli';
import {
  answeredRawIds, appendBatchId, ensurePrompts, fetchAnswersByIds, fetchRawRefs, fetchRawResponses, fetchRunsByGroup,
  fetchUsages, insertRunsIfAbsent, type AnswerRecord, type RawRef, type RunRow,
} from './db';
import {
  DEFAULT_OUTPUT_ASSUMPTION, assertSpendConfirmed, estimateExact, estimateStratified, fingerprint, fingerprintLine, groupId,
  outputTokensFor, runIdFor, type ModelEstimate, type OutputAssumption, type TokenItem,
} from './estimate';
import { buildDisputes, firstPassIsReaderA } from './flags';
import { familiesOf, loadQuestions, type Mode, type PassOpt, type Plan } from './plan';
import {
  buildStanceParams, loadStancePrompts, renderArbiterPrompt, renderStancePrompt, type PassKind, type PromptQuestion,
  type Rendered, type StancePrompts, PASS_ROLE,
} from './requests';
import { MAX_ATTEMPTS, buildAnswerRows, classifyOutcome, invalidAnswerRows, maxTokensFor } from './rows';
import { stratifiedSample } from './sampling';

// ---------------------------------------------------------------------------------------
// request streaming
// ---------------------------------------------------------------------------------------

export interface Group {
  mode: Mode;
  pass: PassOpt;
  kind: PassKind;
  seed: number;
  maxTokens: number;
  effort: Record<ModelFamily, Effort>;
  plan: Plan;
}

export interface BuildCtx {
  db: Db;
  prompts: StancePrompts;
  questions: PromptQuestion[];
}

export interface BuiltRequest {
  key: string;
  kind: PassKind;
  family: ModelFamily;
  attempt: number;
  params: RequestParams;
  rendered: Rendered;
  questionIds: number[];
  line: string;
  userChars: number;
  systemChars: number;
  transcriptSource: string;
}

export interface StreamOpts {
  /** Restrict to these keys with per-key attempt / max_tokens (retries, resubmissions). */
  only?: Map<string, { attempt: number; maxTokens: number }>;
}

function questionsOf(bc: BuildCtx, ids: readonly number[]): PromptQuestion[] {
  const by = new Map(bc.questions.map((q) => [q.question_id, q]));
  return ids.map((id) => {
    const q = by.get(id);
    if (!q) throw new Error(`question ${id} is not in the active question list`);
    return q;
  });
}

/** Question ids a request for `key` covers. */
export function questionIdsFor(g: Group, key: string): number[] {
  return g.kind === 'recheck' || g.kind === 'arbiter' ? (g.plan.cells?.[key] ?? []).map((c) => c[0]) : g.plan.questionIds;
}

/** First-pass model is shown as Reader A when the seeded coin says so. */
export function readerMapping(seed: number, videoId: string): { first_is_reader_a: boolean; reader_a: string; reader_b: string } {
  const firstIsA = firstPassIsReaderA(seed, videoId);
  return {
    first_is_reader_a: firstIsA,
    reader_a: firstIsA ? MODELS.haiku : MODELS.sonnet,
    reader_b: firstIsA ? MODELS.sonnet : MODELS.haiku,
  };
}

/** Prompt row/hash for a request without needing the transcript. */
export function renderFor(bc: BuildCtx, g: Group, key: string): Rendered {
  const qs = questionsOf(bc, questionIdsFor(g, key));
  return g.kind === 'arbiter' ? renderArbiterPrompt(bc.prompts, qs, []) : renderStancePrompt(bc.prompts, qs);
}

export async function* streamRequests(
  bc: BuildCtx,
  g: Group,
  family: ModelFamily,
  opts: StreamOpts = {},
): AsyncGenerator<BuiltRequest | { key: string; missing: true }> {
  const keys = opts.only ? g.plan.videoIds.filter((k) => opts.only!.has(k)) : g.plan.videoIds;
  const pageSize = 20;
  const cache = PASS_ROLE[g.kind].cacheSystem;
  for (let i = 0; i < keys.length; i += pageSize) {
    const page = keys.slice(i, i + pageSize);
    let answers = new Map<number, AnswerRecord>();
    if (g.kind === 'arbiter') {
      const ids = page.flatMap((k) => (g.plan.cells?.[k] ?? []).flatMap((c) => [c[1], c[2]!]));
      answers = await fetchAnswersByIds(bc.db, ids);
    }
    for await (const { transcripts, missing } of fetchTranscripts(bc.db, page, { pageSize })) {
      for (const k of missing) yield { key: k, missing: true };
      for (const t of transcripts) {
        const o = opts.only?.get(t.videoId);
        const attempt = o?.attempt ?? 1;
        const maxTokens = o?.maxTokens ?? g.maxTokens;
        const qids = questionIdsFor(g, t.videoId);
        const qs = questionsOf(bc, qids);
        let rendered: Rendered;
        if (g.kind === 'arbiter') {
          const firstIsA = firstPassIsReaderA(g.seed, t.videoId);
          const disputes = buildDisputes(
            (g.plan.cells![t.videoId] ?? []).map(([qid, firstId, recheckId]) => {
              const f = answers.get(firstId);
              const r = answers.get(recheckId!);
              if (!f || !r) throw new Error(`arbiter: missing prior answer for ${t.videoId} question ${qid}`);
              const q = qs.find((x) => x.question_id === qid)!;
              return { questionId: qid, category: q.category, question: q.question, first: f, recheck: r };
            }),
            firstIsA,
          );
          rendered = renderArbiterPrompt(bc.prompts, qs, disputes);
        } else {
          rendered = renderStancePrompt(bc.prompts, qs);
        }
        const params = buildStanceParams({
          family, effort: g.effort[family], maxTokens, rendered, transcriptText: t.text, cacheSystem: cache,
        });
        const user = params.messages[0].content as string;
        yield {
          key: t.videoId, kind: g.kind, family, attempt, params, rendered, questionIds: qids,
          line: fingerprintLine({
            key: t.videoId, kind: g.kind, model: MODELS[family], effort: g.effort[family], maxTokens: g.maxTokens,
            system: rendered.system, user,
          }),
          userChars: user.length, systemChars: rendered.system.length, transcriptSource: t.source,
        };
      }
    }
  }
}

// ---------------------------------------------------------------------------------------
// estimation
// ---------------------------------------------------------------------------------------

export interface EstimateOptions {
  sampleSize: number;
  strata: number;
  assumption: OutputAssumption;
  dryRun: boolean;
  exactLimit: number;
}

export interface RunEstimate {
  family: ModelFamily;
  model: string;
  effort: Effort;
  fingerprint: string;
  estimate: ModelEstimate;
  missing: string[];
  tokenMethod: string;
}

const CHARS_PER_TOKEN = 3.5;

async function countTokens(client: Anthropic, p: RequestParams, userOverride?: string): Promise<number> {
  const r = await client.messages.countTokens({
    model: p.model,
    system: p.system,
    messages: userOverride !== undefined ? [{ role: 'user', content: userOverride }] : p.messages,
    output_config: p.output_config,
  });
  return r.input_tokens;
}

/** Runs `fn` over `items` with limited concurrency. */
async function pooled<T, R>(items: readonly T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  }));
  return out;
}

export async function estimateRun(
  bc: BuildCtx,
  g: Group,
  family: ModelFamily,
  opts: EstimateOptions,
  client: Anthropic | null,
  log: (s: string) => void,
): Promise<RunEstimate> {
  const n = g.plan.videoIds.length;
  const exact = n <= opts.exactLimit;
  const lines: string[] = [];
  const sizes: Array<{ id: string; size: number; nQ: number }> = [];
  const keep = new Map<string, BuiltRequest>();
  const missing: string[] = [];
  for await (const r of streamRequests(bc, g, family)) {
    if ('missing' in r) { missing.push(r.key); continue; }
    lines.push(r.line);
    sizes.push({ id: r.key, size: r.userChars, nQ: r.questionIds.length });
    if (exact) keep.set(r.key, r);
  }
  log(`  ${MODELS[family]}: built ${lines.length} requests (${missing.length} videos without transcript)`);
  const fp = fingerprint(lines);
  const cached = PASS_ROLE[g.kind].cacheSystem;
  const outFor = (nQ: number) => outputTokensFor(g.kind, nQ, opts.assumption);

  const itemFor = async (r: BuiltRequest, sysTokens: number): Promise<TokenItem> => ({
    promptTokens: client && !opts.dryRun
      ? await countTokens(client, r.params)
      : Math.ceil((r.systemChars + r.userChars) / CHARS_PER_TOKEN),
    systemTokens: sysTokens, cached, outputTokens: outFor(r.questionIds.length),
  });

  let sysTokens = 0;

  if (exact) {
    const reqs = [...keep.values()];
    if (reqs.length === 0) throw new CliError('no requests could be built (no transcripts?)');
    if (cached) sysTokens = client && !opts.dryRun ? await countTokens(client, reqs[0].params, '.') : Math.ceil(reqs[0].systemChars / CHARS_PER_TOKEN);
    const items = await pooled(reqs, 4, (r) => itemFor(r, sysTokens));
    return {
      family, model: MODELS[family], effort: g.effort[family], fingerprint: fp, missing,
      estimate: estimateExact(MODELS[family], items),
      tokenMethod: opts.dryRun ? 'chars/3.5 approximation (dry run)' : `countTokens on all ${reqs.length} requests`,
    };
  }

  // stratified sample by transcript length, extrapolated
  const pop = sizes;
  const sample = stratifiedSample(pop, opts.sampleSize, opts.strata, g.seed);
  const strataSizes: number[] = [];
  {
    const sorted = [...pop].sort((a, b) => a.size - b.size || (a.id < b.id ? -1 : 1));
    const k = Math.max(1, Math.min(opts.strata, sorted.length));
    for (let h = 0; h < k; h++) strataSizes.push(0);
    sorted.forEach((_, i) => { strataSizes[Math.min(k - 1, Math.floor((i * k) / sorted.length))]++; });
  }
  const stratumOf = new Map(sample.map((s) => [s.item.id, s.stratum]));
  const only = new Map([...stratumOf.keys()].map((k) => [k, { attempt: 1, maxTokens: g.maxTokens }]));
  const built: BuiltRequest[] = [];
  for await (const r of streamRequests(bc, g, family, { only })) if (!('missing' in r)) built.push(r);
  if (cached) sysTokens = client && !opts.dryRun ? await countTokens(client, built[0].params, '.') : Math.ceil(built[0].systemChars / CHARS_PER_TOKEN);
  const items = await pooled(built, 4, (r) => itemFor(r, sysTokens));
  const withStratum = built.map((r, i) => ({ stratum: stratumOf.get(r.key)!, item: items[i] }));
  return {
    family, model: MODELS[family], effort: g.effort[family], fingerprint: fp, missing,
    estimate: estimateStratified(MODELS[family], withStratum, strataSizes),
    tokenMethod: `${opts.dryRun ? 'chars/3.5 approximation' : 'countTokens'} on a seeded sample of ${built.length} of ${lines.length} requests, stratified by transcript length into ${strataSizes.length} strata, extrapolated`,
  };
}

export function formatEstimateLines(group: string, g: Group, ests: RunEstimate[], assumption: OutputAssumption): string[] {
  const out: string[] = [`ESTIMATE group=${group} mode=${g.mode} pass=${g.kind} seed=${g.seed}`];
  let total = 0;
  for (const e of ests) {
    const s = e.estimate;
    total += s.costUsd;
    out.push(
      `  ${e.model} effort=${e.effort}: ${s.requests} requests, ${s.inputTokens.toLocaleString('en-US')} input tokens, ` +
      `${s.outputTokens.toLocaleString('en-US')} assumed output tokens (${Math.round(s.outputTokens / Math.max(1, s.requests))}/request), ` +
      `cost ${formatUsd(s.costUsd)} (${formatUsd(s.costUsdNoCacheWrite)} if no cache-write premium applies)`,
    );
    out.push(`    token count: ${e.tokenMethod}`);
  }
  out.push(`  TOTAL ${formatUsd(total)} at batch prices (50% discount)`);
  out.push(`  output assumption: ${assumption.source}`);
  out.push('  Cache note: batch cache hits are best-effort, so no cache reads are assumed; shared system prompts are priced as cache writes (upper bound).');
  return out;
}

export interface EstimateRequest {
  group: Group;
  options: EstimateOptions;
}

export async function runEstimate(
  ctx: Ctx,
  req: EstimateRequest,
  prompts: StancePrompts,
  questions: PromptQuestion[],
): Promise<{ group: string; ests: RunEstimate[]; skipped: string[] }> {
  const db = ctx.getDb();
  const g = req.group;
  const bc: BuildCtx = { db, prompts, questions };
  const client = req.options.dryRun ? null : ctx.makeClient();
  const families = familiesOf(g.kind);
  const ests: RunEstimate[] = [];
  for (const f of families) ests.push(await estimateRun(bc, g, f, req.options, client, ctx.log));
  const skipped = [...new Set(ests.flatMap((e) => e.missing))].sort();
  const finalPlan: Plan = { ...g.plan, videoIds: g.plan.videoIds.filter((v) => !skipped.includes(v)), skippedNoTranscript: [...new Set([...g.plan.skippedNoTranscript, ...skipped])] };
  const fp = fingerprint(ests.map((e) => e.fingerprint));
  const assumptionsKey = JSON.stringify({ a: req.options.assumption, s: req.options.sampleSize, st: req.options.strata, dry: req.options.dryRun });
  const group = groupId(g.mode, g.kind, fp, assumptionsKey);
  for (const l of formatEstimateLines(group, g, ests, req.options.assumption)) ctx.log(l);
  if (skipped.length) ctx.log(`  skipped (no transcript): ${skipped.length}`);
  if (req.options.dryRun) {
    ctx.log('DRY RUN: nothing written. Re-run without --dry-run to record the estimate.');
    return { group, ests, skipped };
  }
  await assertVideoIdsExist(db, finalPlan.videoIds);
  await assertQuestionIdsExist(db, finalPlan.questionIds);
  const rows = ests.map((e) => ({
    id: runIdFor(group, e.family),
    job: 'stance',
    pass: g.kind,
    model: e.model,
    effort: e.effort,
    status: 'estimated',
    params: {
      group, mode: g.mode, kind: g.kind, pass: g.pass, seed: g.seed, maxTokens: g.maxTokens, plan: finalPlan,
      effort: g.effort, family: e.family,
    },
    estimate: {
      fingerprint: e.fingerprint, group, assumption: req.options.assumption, tokenMethod: e.tokenMethod,
      cache_note: 'no cache reads assumed', ...e.estimate,
    },
    script: 'job2/run-stance.ts',
    git_sha: gitSha(),
  }));
  const inserted = await insertRunsIfAbsent(db, rows);
  ctx.log(inserted.length
    ? `recorded bt_runs rows (status 'estimated'): ${inserted.join(', ')}`
    : 'bt_runs rows for this group already exist (same requests and assumptions); nothing written');
  ctx.log(`To submit: re-run with --confirm-spend ${group}`);
  return { group, ests, skipped };
}

// ---------------------------------------------------------------------------------------
// execution
// ---------------------------------------------------------------------------------------

export interface ExecOptions {
  pollMs: number;
}

interface RunCtx {
  ctx: Ctx;
  client: Anthropic;
  bc: BuildCtx;
  g: Group;
  run: RunRow;
  family: ModelFamily;
  verified: boolean;
  /** Raw responses fetched in this invocation (avoids re-reading them from the DB). */
  mem: Map<string, any>;
  collected: Set<string>;
  opts: ExecOptions;
}

export function groupFromRun(run: RunRow): Group {
  const p = run.params;
  return {
    mode: p.mode, pass: p.pass, kind: p.kind, seed: p.seed, maxTokens: p.maxTokens, effort: p.effort, plan: p.plan,
  };
}

/** Rebuilds all requests from the stored plan and checks the digest against the estimate. */
async function verifyFingerprint(rc: RunCtx): Promise<void> {
  if (rc.verified) return;
  const lines: string[] = [];
  for await (const r of streamRequests(rc.bc, rc.g, rc.family)) {
    if (!('missing' in r)) lines.push(r.line);
  }
  assertSpendConfirmed({
    confirm: rc.run.params.group, group: rc.run.params.group, runs: [rc.run], expectedRunIds: [rc.run.id], fingerprint: fingerprint(lines),
  });
  rc.verified = true;
}

interface KeyState {
  attempts: Map<number, RawRef>;
  maxAttempt: number;
  truncated: number;
}

async function loadState(rc: RunCtx, needAnswered = false): Promise<{ byKey: Map<string, KeyState>; answered: Set<number>; refs: RawRef[] }> {
  const db = rc.ctx.getDb();
  const refs = await fetchRawRefs(db, rc.run.id);
  const byKey = new Map<string, KeyState>();
  for (const r of refs) {
    const p = parseCustomId(r.custom_id, rc.run.id);
    let s = byKey.get(p.key);
    if (!s) byKey.set(p.key, (s = { attempts: new Map(), maxAttempt: 0, truncated: 0 }));
    s.attempts.set(p.attempt, r);
    s.maxAttempt = Math.max(s.maxAttempt, p.attempt);
    if (r.result_type === 'succeeded' && r.stop_reason === 'max_tokens') s.truncated++;
  }
  const answered = needAnswered && refs.length ? await answeredRawIds(db, rc.run.id) : new Set<number>();
  return { byKey, answered, refs };
}

function refOutcome(r: RawRef, attempt: number) {
  return classifyOutcome({ resultType: r.result_type, stopReason: r.stop_reason, errorType: r.err_type, attempt });
}

/** Submits (attempt 1 or retries) every key that has no usable result and no pending batch. */
async function submitPending(rc: RunCtx): Promise<number> {
  const db = rc.ctx.getDb();
  const { byKey } = await loadState(rc);
  const only = new Map<string, { attempt: number; maxTokens: number }>();
  for (const key of rc.g.plan.videoIds) {
    const s = byKey.get(key);
    if (!s) { only.set(key, { attempt: 1, maxTokens: rc.g.maxTokens }); continue; }
    const last = s.attempts.get(s.maxAttempt)!;
    const o = refOutcome(last, s.maxAttempt);
    if (o.action === 'retry') {
      only.set(key, { attempt: s.maxAttempt + 1, maxTokens: maxTokensFor(rc.g.maxTokens, s.truncated) });
    }
  }
  if (only.size === 0) return 0;
  await verifyFingerprint(rc);
  rc.ctx.log(`  ${rc.run.id}: submitting ${only.size} requests`);

  let buf: BatchRequest[] = [];
  let bytes = 0;
  const hashes: Rendered['row'][] = [];
  let batches = 0;
  const limit = Math.floor(MAX_BYTES_PER_BATCH * 0.85);
  const flush = async () => {
    if (!buf.length) return;
    await ensurePrompts(db, hashes);
    const b = await createBatch(rc.client, buf, (id) => appendBatchId(db, rc.run, id, 'submitted'));
    rc.ctx.log(`  ${rc.run.id}: batch ${b.id} created with ${buf.length} requests`);
    buf = []; bytes = 0; hashes.length = 0; batches++;
  };
  for await (const r of streamRequests(rc.bc, rc.g, rc.family, { only })) {
    if ('missing' in r) { rc.ctx.log(`  ${rc.run.id}: transcript now missing for a planned video; skipped`); continue; }
    const customId = makeCustomId({ run: rc.run.id, key: r.key, pass: r.kind, attempt: r.attempt });
    const req: BatchRequest = { custom_id: customId, params: r.params as BatchRequest['params'] };
    const size = Buffer.byteLength(r.params.system ? JSON.stringify(r.params.system) : '') + Buffer.byteLength(String(r.params.messages[0].content)) + 2000;
    if (buf.length > 0 && (buf.length >= MAX_REQUESTS_PER_BATCH || bytes + size > limit)) await flush();
    buf.push(req); bytes += size; hashes.push(r.rendered.row);
  }
  await flush();
  return batches;
}

/** Polls every recorded batch not yet collected in this invocation and stores its results. */
async function collectBatches(rc: RunCtx): Promise<number> {
  const db = rc.ctx.getDb();
  let stored = 0;
  for (const batchId of rc.run.batch_ids) {
    if (rc.collected.has(batchId)) continue;
    await btUpdateRun(db, rc.run.id, { status: 'collecting' });
    const b = await pollBatch(rc.client, batchId, {
      intervalMs: rc.opts.pollMs, sleep: rc.ctx.sleep,
      onTick: (x) => rc.ctx.log(`  ${rc.run.id}: batch ${batchId} ${x.processing_status} (done ${x.request_counts.succeeded + x.request_counts.errored + x.request_counts.expired + x.request_counts.canceled}, processing ${x.request_counts.processing})`),
    });
    const existing = new Set((await fetchRawRefs(db, rc.run.id)).map((r) => r.custom_id));
    let rows: Array<Record<string, unknown>> = [];
    const flushRows = async () => {
      if (rows.length) { await btInsert(db, 'bt_raw_responses', rows, { validateRefs: false, chunkSize: 25 }); stored += rows.length; rows = []; }
    };
    for await (const r of streamResults(rc.client, batchId)) {
      if (existing.has(r.customId)) continue;
      const parts = parseCustomId(r.customId, rc.run.id);
      const message = (r as { message?: Anthropic.Messages.Message }).message;
      const meta: Record<string, unknown> = {
        kind: rc.g.kind, attempt: parts.attempt, batch_id: batchId, requested_model: rc.run.model,
        ...(rc.g.kind === 'arbiter' ? { reader_mapping: readerMapping(rc.g.seed, parts.key), reader_note: 'first-pass model = claude-haiku-5-5, recheck model = claude-sonnet-5-5' } : {}),
      };
      const response = message
        ? { ...message, _bt_meta: meta }
        : { error: (r as { error?: unknown }).error ?? null, _bt_meta: meta };
      const result_type = message ? 'succeeded' : r.kind === 'errored' ? 'errored' : r.kind === 'canceled' ? 'canceled' : 'expired';
      rc.mem.set(r.customId, response);
      rows.push({
        run_id: rc.run.id, custom_id: r.customId, batch_id: batchId, model: rc.run.model,
        model_version: message?.model ?? null, result_type, response,
      });
      if (rows.length >= 25) await flushRows();
    }
    await flushRows();
    rc.collected.add(batchId);
    rc.ctx.log(`  ${rc.run.id}: batch ${batchId} ended; ${b.request_counts.succeeded} succeeded, ${b.request_counts.errored} errored, ${b.request_counts.expired} expired; new raw rows ${stored}`);
  }
  return stored;
}

/** Validates and stores answer rows for every raw response that has none yet. */
async function processResults(rc: RunCtx): Promise<number> {
  const db = rc.ctx.getDb();
  const { answered, refs } = await loadState(rc, true);
  const todo = refs.filter((r) => {
    if (answered.has(r.id)) return false;
    return refOutcome(r, parseCustomId(r.custom_id, rc.run.id).attempt).action !== 'retry';
  });
  if (todo.length === 0) return 0;
  const missingMem = todo.filter((r) => !rc.mem.has(r.custom_id)).map((r) => r.id);
  const fromDb = missingMem.length ? await fetchRawResponses(db, missingMem) : new Map<number, any>();
  let rowsWritten = 0;
  const pageSize = 20;
  for (let i = 0; i < todo.length; i += pageSize) {
    const page = todo.slice(i, i + pageSize);
    const needTranscript = page
      .filter((r) => refOutcome(r, parseCustomId(r.custom_id, rc.run.id).attempt).action === 'answers')
      .map((r) => parseCustomId(r.custom_id, rc.run.id).key);
    const transcripts = new Map<string, Transcript>();
    if (needTranscript.length) {
      for await (const { transcripts: ts } of fetchTranscripts(db, needTranscript, { withTimestamps: true, pageSize })) ts.forEach((t) => transcripts.set(t.videoId, t));
    }
    const out: ReturnType<typeof buildAnswerRows> = [];
    const hashes: Rendered['row'][] = [];
    for (const r of page) {
      const p = parseCustomId(r.custom_id, rc.run.id);
      const response = rc.mem.get(r.custom_id) ?? fromDb.get(r.id);
      const qids = questionIdsFor(rc.g, p.key);
      const outcome = refOutcome(r, p.attempt);
      if (outcome.action === 'retry') continue;
      const rendered = renderFor(rc.bc, rc.g, p.key);
      hashes.push(rendered.row);
      const base = {
        runId: rc.run.id, videoId: p.key, kind: rc.g.kind, attempt: p.attempt, model: rc.run.model,
        modelVersion: (response?.model as string | undefined) ?? null, promptHash: rendered.promptHash, rawId: r.id,
        cells: rc.g.plan.cells?.[p.key],
      };
      if (outcome.action === 'invalid') {
        out.push(...buildAnswerRows({ ...base, transcriptSource: null, rows: invalidAnswerRows(qids, outcome.error) }));
        continue;
      }
      const t = transcripts.get(p.key);
      if (!t) {
        out.push(...buildAnswerRows({ ...base, transcriptSource: null, rows: invalidAnswerRows(qids, 'transcript_missing') }));
        continue;
      }
      const text = (response?.content as Array<{ type: string; text?: string }> | undefined)?.find((b) => b.type === 'text')?.text ?? '';
      const parsed = parseAnswers(text, qids, {
        transcript: prepareTranscript(t.text), segments: t.timestamped, stopReason: response?.stop_reason ?? null,
      }, rendered.schema);
      if (parsed.extraIds.length) rc.ctx.log(`  note: response for one video contained ${parsed.extraIds.length} unrequested question ids (ignored)`);
      out.push(...buildAnswerRows({ ...base, transcriptSource: t.source, rows: parsed.rows }));
    }
    await ensurePrompts(db, hashes);
    await btInsert(db, 'bt_stance_answers', out as unknown as Array<Record<string, unknown>>, { validateRefs: false, chunkSize: 500 });
    rowsWritten += out.length;
    rc.ctx.log(`  ${rc.run.id}: stored ${rowsWritten} answer rows`);
  }
  return rowsWritten;
}

async function unresolvedKeys(rc: RunCtx): Promise<number> {
  const { byKey, answered } = await loadState(rc, true);
  let n = 0;
  for (const key of rc.g.plan.videoIds) {
    const s = byKey.get(key);
    if (!s) { n++; continue; }
    const last = s.attempts.get(s.maxAttempt)!;
    if (refOutcome(last, s.maxAttempt).action === 'retry' || !answered.has(last.id)) n++;
  }
  return n;
}

export interface ExecResult { group: string; runs: Array<{ id: string; unresolved: number; costUsd: number; requests: number }> }

/** Entry point for --confirm-spend: verifies the gate, submits, collects, validates, stores. */
export async function executeGroup(
  ctx: Ctx,
  group: string,
  confirm: string | undefined,
  expect: { mode?: Mode; pass?: PassOpt },
  opts: ExecOptions,
): Promise<ExecResult> {
  // Refuse before touching the database or building an API client.
  if (!confirm) assertSpendConfirmed({ confirm, group, runs: [], expectedRunIds: [], fingerprint: '' });
  const db = ctx.getDb();
  const runs = await fetchRunsByGroup(db, group);
  if (runs.length === 0) throw new CliError(`Refusing to spend: no estimate rows (bt_runs) found for group "${group}"; run --estimate first`);
  runs.sort((a, b) => a.id.localeCompare(b.id));
  const p0 = runs[0].params;
  if ((expect.mode && expect.mode !== p0.mode) || (expect.pass && p0.mode !== 'pilot' && expect.pass !== p0.pass)) {
    throw new CliError(`refusing to spend: group ${group} is mode=${p0.mode} pass=${p0.pass}, which does not match the flags given`);
  }
  for (const r of runs) {
    if (!['estimated', 'submitted', 'collecting', 'completed'].includes(r.status)) {
      throw new CliError(`refusing to spend: run ${r.id} has status "${r.status}"`);
    }
    if (!r.estimate?.fingerprint) throw new CliError(`refusing to spend: run ${r.id} has no stored estimate`);
  }
  const prompts = loadStancePrompts();
  const questions = await loadQuestions(db);
  const bc: BuildCtx = { db, prompts, questions };
  const client = ctx.makeClient();
  const rcs: RunCtx[] = runs.map((run) => ({
    ctx, client, bc, g: groupFromRun(run), run, family: run.params.family as ModelFamily, verified: false,
    mem: new Map(), collected: new Set(), opts,
  }));
  for (const rc of rcs) {
    if (rc.run.status === 'completed') continue;
    if (rc.run.batch_ids.length === 0) await submitPending(rc);
  }
  for (let round = 0; round <= MAX_ATTEMPTS; round++) {
    let submitted = 0;
    for (const rc of rcs) {
      if (rc.run.status === 'completed') continue;
      await collectBatches(rc);
      await processResults(rc);
    }
    for (const rc of rcs) {
      if (rc.run.status === 'completed') continue;
      submitted += await submitPending(rc);
    }
    if (submitted === 0) break;
  }
  const result: ExecResult = { group, runs: [] };
  for (const rc of rcs) {
    const unresolved = await unresolvedKeys(rc);
    const usages = await fetchUsages(db, rc.run.id);
    const totals = emptyTotals();
    for (const u of usages) if (u.usage) addUsage(totals, rc.run.model, u.usage);
    if (rc.run.status !== 'completed') {
      await btUpdateRun(db, rc.run.id, {
        status: unresolved === 0 ? 'completed' : 'failed',
        finished_at: ctx.now().toISOString(),
        actual_usage: { ...totals, unresolved_requests: unresolved },
      });
    }
    ctx.log(`${rc.run.id}: ${unresolved === 0 ? 'completed' : `INCOMPLETE (${unresolved} unresolved)`}; ${totals.requests} responses, ${totals.inputTokens} input, ${totals.outputTokens} output, ${totals.cacheReadTokens} cache-read tokens, actual cost ${formatUsd(totals.costUsd)}`);
    result.runs.push({ id: rc.run.id, unresolved, costUsd: totals.costUsd, requests: totals.requests });
  }
  return result;
}

export { DEFAULT_OUTPUT_ASSUMPTION };
