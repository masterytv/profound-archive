/**
 * Request streaming, estimation (the spend gate's first half) and batch execution
 * (the second half: collect, validate, store, retry). Transcripts flow DB -> API only;
 * logs carry counts and ids.
 */
import type Anthropic from '@anthropic-ai/sdk';
import * as batchLib from '../lib/batch';
import {
  MAX_ATTEMPTS, MAX_BYTES_PER_BATCH, MAX_REQUESTS_PER_BATCH, makeCustomId, parseCustomId, pollBatch, realBatchIds, resolvePending,
  streamResults, submitGuarded, unresolvedMarkers, type BatchRequest, type Effort, type RequestParams,
} from '../lib/batch';
import { MODELS, addUsage, assertRetryBudget, emptyTotals, formatUsd, type ModelFamily } from '../lib/cost';
import { prepareTranscript } from '../lib/quote';
import { assertQuestionIdsExist, assertVideoIdsExist, btInsert, btUpdateRun, btUpdateRunIf, type Db } from '../lib/supabase';
import { fetchTranscripts, type Transcript } from '../lib/transcript';
import { parseAnswers } from './answers';
import { CliError, gitSha, type Ctx } from './cli';
import {
  answerCountsByRaw, ensurePrompts, fetchAnswersByIds, fetchRawRefs, fetchRawResponses, fetchRawSummaries, fetchRun,
  fetchRunsByGroup, fetchStanceRuns, insertRunsIfAbsent, type AnswerRecord, type RawRef, type RunRow,
} from './db';
import {
  DEFAULT_OUTPUT_ASSUMPTION, assertSpendConfirmed, estimateExact, queuedRetriesWorstUsd, fingerprint, fingerprintLine, groupId,
  outputTokensFor, runIdFor, sha256, type ModelEstimate, type OutputAssumption, type TokenItem,
} from './estimate';
import { buildDisputes, firstPassIsReaderA } from './flags';
import { familiesOf, findOverlap, loadQuestions, type Mode, type PassOpt, type Plan } from './plan';
import {
  buildStanceParams, loadStancePrompts, renderArbiterPrompt, renderStancePrompt, type PassKind, type PromptQuestion,
  type Rendered, type StancePrompts, PASS_ROLE,
} from './requests';
import { buildAnswerRows, classifyOutcome, invalidAnswerRows, maxTokensFor } from './rows';

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
  /** sha256 of the exact transcript text sent (recorded in the raw-response metadata). */
  transcriptSha256: string;
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
          userChars: user.length, systemChars: rendered.system.length, transcriptSource: t.source, transcriptSha256: sha256(t.text),
        };
      }
    }
  }
}

// ---------------------------------------------------------------------------------------
// estimation
// ---------------------------------------------------------------------------------------

export interface EstimateOptions {
  assumption: OutputAssumption;
  dryRun: boolean;
}

export interface RunEstimate {
  family: ModelFamily;
  model: string;
  effort: Effort;
  fingerprint: string;
  estimate: ModelEstimate;
  /** Counted prompt tokens per request key, stored in bt_runs.estimate to price retries per request. */
  promptTokensByKey: Record<string, number>;
  systemTokens: number;
  cached: boolean;
  missing: string[];
  tokenMethod: string;
  shas: Map<string, string>;
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

/**
 * Builds every request and counts input tokens for ALL of them (messages.countTokens is free),
 * so both the expected cost and the hard ceiling are exact in prompt size; only the output
 * side is modelled. Requests are streamed (never all held in memory); `--dry-run` uses chars/3.5.
 */
export async function estimateRun(
  bc: BuildCtx,
  g: Group,
  family: ModelFamily,
  opts: EstimateOptions,
  client: Anthropic | null,
  log: (s: string) => void,
): Promise<RunEstimate> {
  const lines: string[] = [];
  const shas = new Map<string, string>();
  const missing: string[] = [];
  const items: TokenItem[] = [];
  const cached = PASS_ROLE[g.kind].cacheSystem;
  const ceil = { maxTokens: g.maxTokens, maxAttempts: MAX_ATTEMPTS };
  const useApi = client !== null && !opts.dryRun;
  let sysTokens: number | null = null;
  let pending: BuiltRequest[] = [];
  const drain = async () => {
    const batch = pending;
    pending = [];
    items.push(...(await Promise.all(batch.map(async (r): Promise<TokenItem> => ({
      key: r.key,
      promptTokens: useApi ? await countTokens(client!, r.params) : Math.ceil((r.systemChars + r.userChars) / CHARS_PER_TOKEN),
      systemTokens: sysTokens!, cached, outputTokens: outputTokensFor(g.kind, family, r.questionIds.length, opts.assumption),
    })))));
  };
  for await (const r of streamRequests(bc, g, family)) {
    if ('missing' in r) { missing.push(r.key); continue; }
    lines.push(r.line);
    shas.set(r.key, r.transcriptSha256);
    if (sysTokens === null) {
      sysTokens = !cached ? 0 : useApi ? await countTokens(client!, r.params, '.') : Math.ceil(r.systemChars / CHARS_PER_TOKEN);
    }
    pending.push(r);
    if (pending.length >= 8) await drain();
  }
  await drain();
  if (items.length === 0) throw new CliError('no requests could be built (no transcripts?)');
  log(`  ${MODELS[family]}: built and counted ${items.length} requests (${missing.length} videos without transcript)`);
  return {
    family, model: MODELS[family], effort: g.effort[family], fingerprint: fingerprint(lines), missing, shas,
    estimate: estimateExact(MODELS[family], items, ceil),
    promptTokensByKey: Object.fromEntries(items.map((i) => [i.key!, i.promptTokens])),
    systemTokens: sysTokens ?? 0,
    cached,
    tokenMethod: opts.dryRun ? 'chars/3.5 approximation (dry run)' : `countTokens on all ${items.length} requests`,
  };
}

export function formatEstimateLines(group: string, g: Group, ests: RunEstimate[], assumption: OutputAssumption): string[] {
  const out: string[] = [`ESTIMATE group=${group} mode=${g.mode} pass=${g.kind} seed=${g.seed}`];
  let total = 0, ceiling = 0;
  for (const e of ests) {
    const s = e.estimate;
    total += s.costUsd;
    ceiling += s.ceilingUsd;
    out.push(
      `  ${e.model} effort=${e.effort}: ${s.requests} requests, ${s.inputTokens.toLocaleString('en-US')} input tokens, ` +
      `${s.outputTokens.toLocaleString('en-US')} assumed output tokens incl. thinking (${Math.round(s.outputTokens / Math.max(1, s.requests))}/request), ` +
      `expected cost ${formatUsd(s.costUsd)} (${formatUsd(s.costUsdNoCacheWrite)} if no cache-write premium), ` +
      `HARD CEILING ${formatUsd(s.ceilingUsd)} (every attempt at max_tokens=${g.maxTokens}, doubling)`,
    );
    out.push(`    token count: ${e.tokenMethod}`);
  }
  out.push(`  TOTAL expected ${formatUsd(total)}; hard ceiling ${formatUsd(ceiling)} (batch prices, 50% discount)`);
  out.push(`  output assumption: ${assumption.source}`);
  out.push('  Cache note: batch cache hits are best-effort, so no cache reads are assumed; shared system prompts are priced as cache writes (upper bound).');
  out.push(`  Retries (truncation/transient) beyond the ceiling need --confirm-retries ${group}.`);
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
  const shas: Record<string, string> = {};
  for (const e of ests) e.shas.forEach((v, k) => { shas[k] = v; });
  const finalPlan: Plan = {
    ...g.plan,
    videoIds: g.plan.videoIds.filter((v) => !skipped.includes(v)),
    skippedNoTranscript: [...new Set([...g.plan.skippedNoTranscript, ...skipped])],
    transcriptSha: shas,
  };
  const fp = fingerprint(ests.map((e) => e.fingerprint));
  const assumptionsKey = JSON.stringify({ a: req.options.assumption, dry: req.options.dryRun, mt: g.maxTokens });
  const group = groupId(g.mode, g.kind, fp, assumptionsKey);

  // S4: refuse to overlap a non-terminal run of the same pass (the same group is the idempotent re-estimate).
  const overlap = findOverlap(await fetchStanceRuns(db), g.kind, group, finalPlan.videoIds);
  if (overlap) {
    throw new CliError(`refusing to estimate: ${overlap.videos} of these videos are already covered by run ${overlap.runId} (status "${overlap.status}", same pass). Finish it, or cancel its estimate with --cancel ${overlap.group}.`);
  }

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
      cache_note: 'no cache reads assumed', expected_usd: e.estimate.costUsd, ceiling_usd: e.estimate.ceilingUsd,
      mean_prompt_tokens: e.estimate.meanPromptTokens, max_attempts: MAX_ATTEMPTS, max_tokens: g.maxTokens, ...e.estimate,
      prompt_tokens_by_key: e.promptTokensByKey, system_tokens: e.systemTokens, cached: e.cached,
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

/** Marks an estimated (never submitted) group canceled so its videos are free again. */
export async function cancelEstimate(ctx: Ctx, group: string): Promise<void> {
  const db = ctx.getDb();
  const runs = await fetchRunsByGroup(db, group);
  if (runs.length === 0) throw new CliError(`no runs for group "${group}"`);
  const notEstimated = runs.filter((r) => r.status !== 'estimated');
  if (notEstimated.length) throw new CliError(`cannot cancel: ${notEstimated.map((r) => `${r.id} is "${r.status}"`).join(', ')} (only never-submitted estimates can be canceled)`);
  for (const r of runs) {
    const n = await btUpdateRunIf(db, r.id, 'estimated', { status: 'canceled', finished_at: ctx.now().toISOString() });
    if (n !== 1) throw new CliError(`run ${r.id} changed status while canceling`);
  }
  ctx.log(`canceled ${runs.length} estimated run(s) of group ${group}`);
}

// ---------------------------------------------------------------------------------------
// execution
// ---------------------------------------------------------------------------------------

export interface ExecOptions {
  pollMs: number;
  /** Batch id to adopt for a run left in 'submitting' (see lib/batch resolvePending). */
  adoptBatch?: string;
  /** Group id the human confirmed retries beyond the approved ceiling for (--confirm-retries). */
  confirmRetries?: string;
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

async function reload(rc: RunCtx): Promise<void> {
  const r = await fetchRun(rc.ctx.getDb(), rc.run.id);
  if (!r) throw new Error(`run ${rc.run.id} disappeared`);
  rc.run.status = r.status;
  rc.run.batch_ids = r.batch_ids ?? [];
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

async function loadState(rc: RunCtx, needCounts = false): Promise<{ byKey: Map<string, KeyState>; counts: Map<number, number>; refs: RawRef[] }> {
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
  const counts = needCounts && refs.length ? await answerCountsByRaw(db, rc.run.id) : new Map<number, number>();
  return { byKey, counts, refs };
}

function refOutcome(r: RawRef, attempt: number) {
  const status = r.err_status == null || r.err_status === '' ? null : Number(r.err_status);
  return classifyOutcome({ resultType: r.result_type, stopReason: r.stop_reason, errorType: r.err_type, errorStatus: Number.isFinite(status) ? status : null, attempt });
}

/** Actual spend of a run so far (every collected response, all attempts). */
async function spentUsd(rc: RunCtx): Promise<number> {
  const totals = emptyTotals();
  for (const u of await fetchRawSummaries(rc.ctx.getDb(), rc.run.id)) if (u.usage) addUsage(totals, rc.run.model, u.usage);
  return totals.costUsd;
}

/** B1: ask the API whether any batch whose creation response was lost actually exists, before any resubmission. */
async function resolveRun(rc: RunCtx, adoptBatchId?: string): Promise<void> {
  const db = rc.ctx.getDb();
  await reload(rc);
  if (!adoptBatchId && unresolvedMarkers(rc.run.batch_ids).length === 0) return;
  const res = await resolvePending({
    db, client: rc.client, run: rc.run, adoptBatchId, now: rc.ctx.now,
    poll: { intervalMs: rc.opts.pollMs, sleep: rc.ctx.sleep },
  });
  const notFound = res.filter((r) => (r.result as string) !== 'adopted');
  for (const r of res) if ((r.result as string) === 'adopted') rc.ctx.log(`  ${rc.run.id}: pending submission adopted batch ${r.batchId}`);
  await reload(rc);
  if (notFound.length) {
    // Never auto-void: a batch may exist that the listing cannot see. A human decides.
    throw new CliError(
      `run ${rc.run.id}: no batch found for pending marker ${notFound.map((r) => r.marker.raw).join(', ')}. Do NOT resubmit yet. ` +
      `Check the Anthropic console for a batch created around ${notFound[0].marker.iso} with ${notFound[0].marker.nRequests} requests; if one exists, ` +
      `re-run with --confirm-spend ${rc.run.params.group} --adopt-batch <id>. If you are sure none was created and the marker is at least 30 minutes old, ` +
      `run --confirm-spend ${rc.run.params.group} --void-pending ${notFound[0].marker.raw} and then re-run.`,
    );
  }
}

/** Submits (attempt 1 or retries) every key that has no usable result and no pending batch. */
async function submitPending(rc: RunCtx): Promise<number> {
  const db = rc.ctx.getDb();
  await resolveRun(rc);
  const { byKey } = await loadState(rc);
  const only = new Map<string, { attempt: number; maxTokens: number }>();
  for (const key of rc.g.plan.videoIds) {
    const s = byKey.get(key);
    if (!s) { only.set(key, { attempt: 1, maxTokens: rc.g.maxTokens }); continue; }
    const last = s.attempts.get(s.maxAttempt)!;
    if (refOutcome(last, s.maxAttempt).action === 'retry') {
      only.set(key, { attempt: s.maxAttempt + 1, maxTokens: maxTokensFor(rc.g.maxTokens, s.truncated) });
    }
  }
  if (only.size === 0) return 0;
  await verifyFingerprint(rc);

  // Retries must stay inside the approved ceiling unless the human confirmed more.
  const retries = [...only.entries()].filter(([, o]) => o.attempt > 1).map(([key, o]) => ({ key, ...o }));
  if (retries.length) {
    const est = rc.run.estimate ?? {};
    // Each retried request is priced on its own counted prompt tokens (Haiku long-context tier per request).
    const queuedWorst = queuedRetriesWorstUsd(rc.run.model, retries, {
      promptTokensByKey: est.prompt_tokens_by_key, systemTokens: est.system_tokens, cached: est.cached, meanPromptTokens: est.mean_prompt_tokens,
    });
    assertRetryBudget({
      approvedCeilingUsd: Number(est.ceiling_usd ?? 0),
      spentUsd: await spentUsd(rc),
      queuedWorstUsd: queuedWorst,
      confirmedRetries: rc.opts.confirmRetries === rc.run.params.group,
    });
  }
  rc.ctx.log(`  ${rc.run.id}: submitting ${only.size} requests (${retries.length} retries)`);

  let buf: BatchRequest[] = [];
  let bytes = 0;
  const prompts: Rendered['row'][] = [];
  let batches = 0;
  const limit = Math.floor(MAX_BYTES_PER_BATCH * 0.85);
  const flush = async () => {
    if (!buf.length) return;
    await ensurePrompts(db, prompts);
    await reload(rc);
    const r = await submitGuarded({
      db, client: rc.client, runId: rc.run.id, expectedStatus: rc.run.status, requests: buf, now: rc.ctx.now, sleep: rc.ctx.sleep,
    });
    await reload(rc);
    rc.ctx.log(`  ${rc.run.id}: batch ${r.batchId} created with ${buf.length} requests`);
    buf = []; bytes = 0; prompts.length = 0; batches++;
  };
  for await (const r of streamRequests(rc.bc, rc.g, rc.family, { only })) {
    if ('missing' in r) { rc.ctx.log(`  ${rc.run.id}: transcript now missing for a planned video; skipped`); continue; }
    const customId = makeCustomId({ run: rc.run.id, key: r.key, pass: r.kind, attempt: r.attempt });
    const req: BatchRequest = { custom_id: customId, params: r.params as BatchRequest['params'] };
    const size = Buffer.byteLength(JSON.stringify(r.params.system ?? '')) + Buffer.byteLength(String(r.params.messages[0].content)) + 2000;
    if (buf.length > 0 && (buf.length >= MAX_REQUESTS_PER_BATCH || bytes + size > limit)) await flush();
    buf.push(req); bytes += size; prompts.push(r.rendered.row);
  }
  await flush();
  return batches;
}

/** Polls every recorded real batch not yet collected in this invocation and stores its results. */
async function collectBatches(rc: RunCtx): Promise<number> {
  const db = rc.ctx.getDb();
  let stored = 0;
  for (const batchId of realBatchIds(rc.run.batch_ids)) {
    if (rc.collected.has(batchId)) continue;
    await btUpdateRunIf(db, rc.run.id, 'submitted', { status: 'collecting' });
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
        transcript_sha256: rc.g.plan.transcriptSha?.[parts.key] ?? null,
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

/**
 * Validates and stores answer rows for every raw response that has none yet. Each raw
 * response's rows go in ONE insert and the inserted count must equal the requested question
 * count; a raw response with some but not all rows is corruption and stops the run.
 */
async function processResults(rc: RunCtx): Promise<number> {
  const db = rc.ctx.getDb();
  const { counts, refs } = await loadState(rc, true);
  const todo: Array<{ ref: RawRef; key: string; attempt: number; qids: number[] }> = [];
  for (const r of refs) {
    const p = parseCustomId(r.custom_id, rc.run.id);
    if (refOutcome(r, p.attempt).action === 'retry') continue;
    const qids = questionIdsFor(rc.g, p.key);
    const have = counts.get(r.id) ?? 0;
    if (have === qids.length && have > 0) continue;
    if (have !== 0) throw new Error(`raw response ${r.id} (${p.key}) has ${have} of ${qids.length} answer rows; refusing to continue (partial insert)`);
    todo.push({ ref: r, key: p.key, attempt: p.attempt, qids });
  }
  if (todo.length === 0) return 0;
  const missingMem = todo.filter((t) => !rc.mem.has(t.ref.custom_id)).map((t) => t.ref.id);
  const fromDb = missingMem.length ? await fetchRawResponses(db, missingMem) : new Map<number, any>();
  let rowsWritten = 0;
  const pageSize = 20;
  for (let i = 0; i < todo.length; i += pageSize) {
    const page = todo.slice(i, i + pageSize);
    const needTranscript = page.filter((t) => refOutcome(t.ref, t.attempt).action === 'answers').map((t) => t.key);
    const transcripts = new Map<string, Transcript>();
    if (needTranscript.length) {
      for await (const { transcripts: ts } of fetchTranscripts(db, needTranscript, { withTimestamps: true, pageSize })) ts.forEach((t) => transcripts.set(t.videoId, t));
    }
    for (const t of page) {
      const response = rc.mem.get(t.ref.custom_id) ?? fromDb.get(t.ref.id);
      const outcome = refOutcome(t.ref, t.attempt);
      if (outcome.action === 'retry') continue;
      const rendered = renderFor(rc.bc, rc.g, t.key);
      await ensurePrompts(db, [rendered.row]);
      const base = {
        runId: rc.run.id, videoId: t.key, kind: rc.g.kind, attempt: t.attempt, model: rc.run.model,
        modelVersion: (response?.model as string | undefined) ?? null, promptHash: rendered.promptHash, rawId: t.ref.id,
        cells: rc.g.plan.cells?.[t.key],
      };
      let rows: ReturnType<typeof buildAnswerRows>;
      if (outcome.action === 'invalid') {
        rows = buildAnswerRows({ ...base, transcriptSource: null, rows: invalidAnswerRows(t.qids, outcome.error) });
      } else {
        const tr = transcripts.get(t.key);
        const sentSha: string | null | undefined = response?._bt_meta?.transcript_sha256;
        if (!tr) {
          rows = buildAnswerRows({ ...base, transcriptSource: null, rows: invalidAnswerRows(t.qids, 'transcript_missing') });
        } else if (!sentSha || sentSha !== sha256(tr.text)) {
          // N4: quotes are only checked against the exact text that was sent.
          rows = buildAnswerRows({
            ...base, transcriptSource: tr.source,
            rows: invalidAnswerRows(t.qids, sentSha ? 'transcript_changed' : 'transcript_unverifiable'),
          });
        } else {
          const text = (response?.content as Array<{ type: string; text?: string }> | undefined)?.find((b) => b.type === 'text')?.text ?? '';
          const parsed = parseAnswers(text, t.qids, {
            transcript: prepareTranscript(tr.text), segments: tr.timestamped, stopReason: response?.stop_reason ?? null,
          }, rendered.schema);
          if (parsed.extraIds.length) rc.ctx.log(`  note: response for one video contained ${parsed.extraIds.length} unrequested question ids (ignored)`);
          rows = buildAnswerRows({ ...base, transcriptSource: tr.source, rows: parsed.rows });
        }
      }
      if (rows.length !== t.qids.length || rows.length > 1000) throw new Error(`answer row count ${rows.length} != requested ${t.qids.length} for ${t.key}`);
      const inserted = await btInsert(db, 'bt_stance_answers', rows as unknown as Array<Record<string, unknown>>, {
        validateRefs: false, chunkSize: 1000, select: 'id',
      });
      if (inserted.length !== rows.length) throw new Error(`inserted ${inserted.length} of ${rows.length} answer rows for ${t.key}`);
      rowsWritten += rows.length;
    }
    rc.ctx.log(`  ${rc.run.id}: stored ${rowsWritten} answer rows`);
  }
  return rowsWritten;
}

async function unresolvedKeys(rc: RunCtx): Promise<number> {
  const { byKey, counts } = await loadState(rc, true);
  let n = 0;
  for (const key of rc.g.plan.videoIds) {
    const s = byKey.get(key);
    if (!s) { n++; continue; }
    const last = s.attempts.get(s.maxAttempt)!;
    if (refOutcome(last, s.maxAttempt).action === 'retry' || (counts.get(last.id) ?? 0) !== questionIdsFor(rc.g, key).length) n++;
  }
  return n;
}

/** Human-only (--void-pending): releases a pending marker whose batch could not be found (lib/batch voidPending enforces age and re-lists). */
export async function voidPendingMarker(ctx: Ctx, group: string, marker: string): Promise<void> {
  const db = ctx.getDb();
  const run = (await fetchRunsByGroup(db, group)).find((r) => (r.batch_ids ?? []).includes(marker));
  if (!run) throw new CliError(`no run of group "${group}" has the marker "${marker}"`);
  const r = await batchLib.voidPending({ db, client: ctx.makeClient(), runId: run.id, marker, now: ctx.now });
  ctx.log(`voided pending marker on run ${run.id}; run status now "${r.status}"; re-run --confirm-spend ${group} to resubmit`);
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
    if (!['estimated', 'submitting', 'submitted', 'collecting', 'completed'].includes(r.status)) {
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
  const active = () => rcs.filter((rc) => rc.run.status !== 'completed');

  // B1: settle any submission whose response was lost, before anything else.
  if (opts.adoptBatch) {
    const errors: string[] = [];
    let adopted = false;
    for (const rc of active()) {
      try { await resolveRun(rc, opts.adoptBatch); adopted = true; break; } catch (e) { errors.push(`${rc.run.id}: ${(e as Error).message}`); }
    }
    if (!adopted) throw new CliError(`could not adopt batch ${opts.adoptBatch}:\n${errors.join('\n')}`);
  }
  for (const rc of active()) await resolveRun(rc);

  for (const rc of active()) {
    if (realBatchIds(rc.run.batch_ids).length === 0) await submitPending(rc);
  }
  for (let round = 0; round <= MAX_ATTEMPTS; round++) {
    let submitted = 0;
    for (const rc of active()) {
      await collectBatches(rc);
      await processResults(rc);
    }
    for (const rc of active()) submitted += await submitPending(rc);
    if (submitted === 0) break;
  }
  const result: ExecResult = { group, runs: [] };
  for (const rc of rcs) {
    const unresolved = await unresolvedKeys(rc);
    const totals = emptyTotals();
    for (const u of await fetchRawSummaries(db, rc.run.id)) if (u.usage) addUsage(totals, rc.run.model, u.usage);
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
