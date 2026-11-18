/**
 * Submit / collect driver shared by judge-pairs and extract-names.
 *
 * - Every paid submission goes through lib/batch.submitGuarded: a conditional status change
 *   plus a durable `pending:` marker in bt_runs.batch_ids BEFORE batches.create, create with
 *   maxRetries 0, then the real id is recorded. resolvePending runs before any resubmission.
 * - Every result is stored in bt_raw_responses (UNIQUE run_id+custom_id, so resuming never
 *   duplicates), then handed to the caller's handler with its raw_response id.
 * - lib/batch.selectRetries decides what is re-submitted (expired, canceled, transient errors,
 *   and 'truncated' results with max_tokens doubled) in a new batch of the same run with
 *   attempt+1. Before each retry batch lib/cost.assertRetryBudget checks spent + queued worst
 *   case against the ceiling the human approved (override: --confirm-retries <run_id>).
 *   Schema-invalid (but complete) output is NOT retried automatically.
 */
import type Anthropic from '@anthropic-ai/sdk';
import {
  collectBatch, makeCustomId, parseCustomId, raiseMaxTokens, realBatchIds, resolvePending, selectRetries, submitGuarded,
  type BatchRequest, type ClassifiedResult, type CollectedBatch, type RequestParams,
} from '../lib/batch';
import { addUsage, assertRetryBudget, emptyTotals, requestCost, type UsageTotals } from '../lib/cost';
import { btInsert, btUpdateRunIf, selectAll } from '../lib/supabase';
import { CliError, getRun, type Ctx, type RunRow } from './cli';
import { assertSpendConfirmed, type RunExpect } from './spend';

export interface CollectedRow {
  customId: string;
  key: string;
  attempt: number;
  kind: string;
  message?: Anthropic.Messages.Message;
  rawId: number;
}

export interface DriverBase {
  ctx: Ctx;
  client: Anthropic;
  runId: string;
  model: string;
  pass: string;
  /** Called once per collected batch with rows not yet seen by this process. */
  onCollected: (rows: CollectedRow[]) => Promise<void>;
}

export interface RunOutcome {
  usage: UsageTotals;
  /** keys with no succeeded result after all attempts */
  unresolved: string[];
  batchIds: string[];
}

async function processCollected(d: DriverBase, collected: CollectedBatch, usage: UsageTotals): Promise<void> {
  const { db } = d.ctx;
  const existing = new Map(
    (await selectAll<{ id: number; custom_id: string }>(db, 'bt_raw_responses', 'id, custom_id', {
      orderBy: 'id',
      filter: (q) => q.eq('run_id', d.runId),
    })).map((r) => [r.custom_id, r.id]),
  );
  const fresh: Array<ClassifiedResult> = [];
  for (const r of collected.results.values()) {
    if (r.message) addUsage(usage, d.model, r.message.usage as never);
    if (!existing.has(r.customId)) fresh.push(r);
  }
  if (fresh.length) {
    const inserted = await btInsert(
      db,
      'bt_raw_responses',
      fresh.map((r) => ({
        run_id: d.runId,
        custom_id: r.customId,
        batch_id: collected.batch.id,
        model: d.model,
        model_version: r.message?.model ?? null,
        // a truncated result is a succeeded message whose stop_reason is max_tokens
        result_type: r.kind === 'truncated' ? 'succeeded' : r.kind,
        response: r.message ? r.message : r.kind === 'errored' ? { error: r.error ?? null } : {},
      })),
      { select: 'id, custom_id', validateRefs: false, chunkSize: 100 },
    );
    for (const row of inserted) existing.set(row.custom_id as string, row.id as number);
  }
  const rows: CollectedRow[] = [];
  for (const r of collected.results.values()) {
    const parts = parseCustomId(r.customId, d.runId);
    rows.push({ customId: r.customId, key: parts.key, attempt: parts.attempt, kind: r.kind, message: r.message, rawId: existing.get(r.customId)! });
  }
  await d.onCollected(rows);
}

export interface SubmitInput extends DriverBase {
  items: Array<{ key: string; params: RequestParams }>;
  maxAttempts: number;
  /** Ceiling the human approved (estimate.ceiling_usd). */
  ceilingUsd: number;
  /** Per-request input tokens from the estimate (key -> tokens); missing keys use the mean. */
  perKeyInputTokens: Record<string, number>;
  /** True when --confirm-retries named this run. */
  confirmRetries: boolean;
}

export async function submitRun(d: SubmitInput): Promise<RunOutcome> {
  const usage = emptyTotals();
  const batchIds: string[] = [];
  const ok = new Map<string, boolean>(); // latest outcome per key across attempts
  const tokVals = Object.values(d.perKeyInputTokens);
  const meanTok = tokVals.length ? tokVals.reduce((a, b) => a + b, 0) / tokVals.length : 0;
  let pending = d.items.map((it) => ({ key: it.key, params: { ...it.params } }));
  for (let attempt = 1; attempt <= d.maxAttempts && pending.length > 0; attempt++) {
    if (attempt > 1) {
      const resolved = await resolvePending({ db: d.ctx.db, client: d.client, run: { id: d.runId }, now: d.ctx.now });
      if (resolved.length) d.ctx.log(`resolved ${resolved.length} pending submission marker(s) before the retry batch`);
      const queuedWorst = pending.reduce((s, it) => s + requestCost(d.model, { inputTokens: d.perKeyInputTokens[it.key] ?? meanTok, outputTokens: it.params.max_tokens }), 0);
      assertRetryBudget({ approvedCeilingUsd: d.ceilingUsd, spentUsd: usage.costUsd, queuedWorstUsd: queuedWorst, confirmedRetries: d.confirmRetries });
    }
    const requests: BatchRequest[] = pending.map((it) => ({
      custom_id: makeCustomId({ run: d.runId, key: it.key, pass: d.pass, attempt }),
      params: it.params,
    }));
    d.ctx.log(`submitting batch: ${requests.length} requests (attempt ${attempt})`);
    const { batchId } = await submitGuarded({
      db: d.ctx.db, client: d.client, runId: d.runId, expectedStatus: attempt === 1 ? 'estimated' : 'submitted',
      requests, now: d.ctx.now, sleep: d.ctx.sleep,
    });
    batchIds.push(batchId);
    d.ctx.log(`batch ${batchId} recorded in bt_runs.batch_ids; polling`);
    const collected = await collectBatch(d.client, batchId, {
      sleep: d.ctx.sleep,
      onTick: (b) => d.ctx.log(`  batch ${b.id}: ${b.processing_status} ${JSON.stringify(b.request_counts)}`),
    });
    await processCollected(d, collected, usage);
    for (const r of collected.results.values()) ok.set(parseCustomId(r.customId, d.runId).key, r.kind === 'succeeded');
    const { retry } = selectRetries(collected.results.values(), d.runId, d.maxAttempts);
    const raise = new Set(retry.filter((r) => r.reason === 'truncated').map((r) => r.parts.key));
    const again = new Set(retry.map((r) => r.parts.key));
    pending = pending
      .filter((it) => again.has(it.key))
      .map((it) => (raise.has(it.key) ? { key: it.key, params: { ...it.params, max_tokens: raiseMaxTokens(it.params.max_tokens) } } : it));
  }
  return { usage, unresolved: [...ok.entries()].filter(([, v]) => !v).map(([k]) => k).sort(), batchIds };
}

/**
 * Brings a run in status submitting/submitted to a state where its REAL batch ids can be
 * collected: resolves pending markers (optionally adopting a human-chosen batch).
 */
export async function prepareResume(ctx: Ctx, client: Anthropic, runId: string, adoptBatchId?: string): Promise<string[]> {
  const res = await resolvePending({ db: ctx.db, client, run: { id: runId }, adoptBatchId, now: ctx.now });
  for (const r of res) ctx.log(`pending marker ${r.marker.sha12}: ${r.result}${r.batchId ? ` (${r.batchId})` : ''}`);
  const run = await getRun(ctx.db, runId);
  const ids = realBatchIds(run?.batch_ids);
  if (ids.length === 0) throw new CliError(`run ${runId} has no recorded batch: nothing was created (any pending submission was voided); re-confirm with --confirm-spend ${runId}`);
  return ids;
}

/**
 * --confirm-spend for a run stuck in 'submitting' (create failed or its response was lost):
 * resolve the marker first. A found batch is adopted (collect it with --resume); if none exists
 * the marker is voided and the run goes back to 'estimated' so the confirm can proceed.
 */
export async function recoverSubmitting(ctx: Ctx, client: Anthropic, run: RunRow): Promise<'resubmit' | 'adopted'> {
  const res = await resolvePending({ db: ctx.db, client, run: { id: run.id }, now: ctx.now });
  for (const r of res) ctx.log(`pending marker ${r.marker.sha12}: ${r.result}${r.batchId ? ` (${r.batchId})` : ''}`);
  const cur = await getRun(ctx.db, run.id);
  if (realBatchIds(cur?.batch_ids).length > 0) return 'adopted';
  const n = await btUpdateRunIf(ctx.db, run.id, 'submitting', { status: 'estimated' });
  if (n === 0 && cur?.status !== 'estimated') throw new CliError(`run ${run.id} is "${cur?.status}", cannot reset to estimated`);
  return 'resubmit';
}

export async function resumeRun(d: DriverBase & { batchIds: string[] }): Promise<RunOutcome> {
  const usage = emptyTotals();
  const ok = new Map<string, boolean>();
  for (const id of realBatchIds(d.batchIds)) {
    d.ctx.log(`collecting batch ${id}`);
    const collected = await collectBatch(d.client, id, { sleep: d.ctx.sleep, onTick: (b) => d.ctx.log(`  batch ${b.id}: ${b.processing_status}`) });
    await processCollected(d, collected, usage);
    // batch ids are in attempt order: a later batch's outcome for a key supersedes an earlier one
    for (const r of collected.results.values()) ok.set(parseCustomId(r.customId, d.runId).key, r.kind === 'succeeded');
  }
  return { usage, unresolved: [...ok.entries()].filter(([, v]) => !v).map(([k]) => k).sort(), batchIds: realBatchIds(d.batchIds) };
}

export function usageSummary(u: UsageTotals): Record<string, number> {
  return {
    requests: u.requests, input_tokens: u.inputTokens, output_tokens: u.outputTokens,
    cache_read_tokens: u.cacheReadTokens, cache_write_tokens: u.cacheWriteTokens, cost_usd: Math.round(u.costUsd * 1e6) / 1e6,
  };
}

/**
 * The spend gate for --confirm-spend. An unknown / non-estimated / mismatched run is refused
 * before any API client exists. A run stuck in 'submitting' is recovered first (see recoverSubmitting).
 */
export async function confirmGate(ctx: Ctx, confirmId: string | undefined, expect: RunExpect): Promise<RunRow> {
  if (!confirmId) return assertSpendConfirmed(null, confirmId, expect);
  let run = await getRun(ctx.db, confirmId);
  if (run && run.status === 'submitting' && run.job === expect.job && run.pass === expect.pass && run.model === expect.model) {
    const outcome = await recoverSubmitting(ctx, ctx.makeClient(), run);
    if (outcome === 'adopted') throw new CliError(`run ${run.id}: the pending submission was found at the API and recorded; collect it with --resume ${run.id}`);
    run = await getRun(ctx.db, confirmId);
  }
  return assertSpendConfirmed(run, confirmId, expect);
}

export function approvedBudget(run: RunRow): { ceilingUsd: number; perKeyInputTokens: Record<string, number>; maxAttempts: number } {
  const e = (run.estimate ?? {}) as { ceiling_usd?: number; per_request_input_tokens?: Record<string, number>; max_attempts?: number };
  if (typeof e.ceiling_usd !== 'number') throw new CliError(`run ${run.id}: estimate has no ceiling_usd; run --estimate again`);
  return { ceilingUsd: e.ceiling_usd, perKeyInputTokens: e.per_request_input_tokens ?? {}, maxAttempts: e.max_attempts ?? 1 };
}
