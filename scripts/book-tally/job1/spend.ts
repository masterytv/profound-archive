/**
 * Spend gate and pre-spend estimate (mandatory for judge-pairs and extract-names).
 *
 * Flow: `--estimate` builds the exact requests, counts input tokens with the free
 * messages.countTokens endpoint, prices them with lib/cost (batch discount) and writes the
 * estimate into a bt_runs row (status 'estimated'). Submitting requires
 * `--confirm-spend <run_id>` naming that estimated run; the requests are rebuilt and their
 * digest must equal the estimated one, so what is paid for is what was estimated.
 */
import { createHash } from 'crypto';
import type Anthropic from '@anthropic-ai/sdk';
import type { RequestParams } from '../lib/batch';
import { BATCH_DISCOUNT, formatUsd, requestCost } from '../lib/cost';
import { stableStringify } from '../lib/prompts';
import { CliError, getRun, type RunRow } from './cli';
import type { Db } from '../lib/supabase';

export class SpendGateError extends CliError {}

export interface RunExpect {
  job: string;
  pass: string;
  model: string;
}

/** Throws unless `run` is the estimated run named by `--confirm-spend`. Pure; no I/O. */
export function assertSpendConfirmed(run: RunRow | null, confirmId: string | undefined, expect: RunExpect): RunRow {
  if (!confirmId) throw new SpendGateError('refusing to spend: pass --confirm-spend <run_id> of an estimated run (create one with --estimate)');
  if (!run || run.id !== confirmId) throw new SpendGateError(`refusing to spend: no run "${confirmId}" found`);
  if (run.status !== 'estimated') {
    throw new SpendGateError(`refusing to spend: run ${run.id} has status "${run.status}", not "estimated" (already submitted? use --resume ${run.id})`);
  }
  if (run.job !== expect.job || run.pass !== expect.pass || run.model !== expect.model) {
    throw new SpendGateError(`refusing to spend: run ${run.id} is ${run.job}/${run.pass}/${run.model}, expected ${expect.job}/${expect.pass}/${expect.model}`);
  }
  if (!run.estimate || typeof run.estimate.digest !== 'string') throw new SpendGateError(`refusing to spend: run ${run.id} carries no estimate`);
  return run;
}

export function assertDigestMatches(run: RunRow, digest: string): void {
  if (run.estimate?.digest !== digest) {
    throw new SpendGateError(`refusing to spend: the requests no longer match the estimate for run ${run.id} (inputs changed); run --estimate again`);
  }
}

export function assertResumable(run: RunRow | null, resumeId: string, expect: RunExpect): RunRow {
  if (!run || run.id !== resumeId) throw new CliError(`no run "${resumeId}" found`);
  if (run.job !== expect.job || run.pass !== expect.pass) throw new CliError(`run ${run.id} is ${run.job}/${run.pass}, expected ${expect.job}/${expect.pass}`);
  if (!['submitted', 'collecting'].includes(run.status) || !run.batch_ids?.length) {
    throw new CliError(`run ${run.id} cannot be resumed (status "${run.status}", ${run.batch_ids?.length ?? 0} batch ids)`);
  }
  return run;
}

export async function loadRunForConfirm(db: Db, confirmId: string | undefined, expect: RunExpect): Promise<RunRow> {
  // Validate the argument before any read; a missing id never reaches the database.
  if (!confirmId) assertSpendConfirmed(null, confirmId, expect);
  return assertSpendConfirmed(await getRun(db, confirmId!), confirmId, expect);
}

// ---- digest / sizes ---------------------------------------------------------------------

export interface EstItem {
  key: string;
  params: RequestParams;
}

export function requestChars(p: RequestParams): number {
  const sys = typeof p.system === 'string' ? p.system.length : (p.system ?? []).reduce((n, b) => n + b.text.length, 0);
  const user = p.messages.reduce((n, m) => n + (typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length), 0);
  return sys + user;
}

/** sha256 over the sorted (key, request params) pairs. Transcripts are hashed, never stored. */
export function requestDigest(items: EstItem[]): string {
  const h = createHash('sha256');
  for (const it of [...items].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))) {
    h.update(it.key);
    h.update('\0');
    h.update(stableStringify(it.params));
    h.update('\0');
  }
  return h.digest('hex');
}

// ---- stratified sampling ----------------------------------------------------------------------

export interface SamplePlan {
  strata: number[][]; // item indexes per stratum, ordered by chars
  sample: number[]; // indexes to count
}

/**
 * Deterministic stratified sample: items are sorted by size (chars), cut into equal-count
 * strata, and evenly spaced items are taken from each stratum. Never fewer than
 * min(n, max(sampleSize, 50)) items.
 */
export function planSample(chars: number[], sampleSize: number): SamplePlan {
  const n = chars.length;
  const want = Math.min(n, Math.max(sampleSize, 50));
  const order = chars.map((c, i) => i).sort((a, b) => chars[a] - chars[b] || a - b);
  const S = Math.max(1, Math.min(10, Math.floor(want / 5)));
  const strata: number[][] = [];
  for (let s = 0; s < S; s++) strata.push(order.slice(Math.floor((s * n) / S), Math.floor(((s + 1) * n) / S)));
  const sample: number[] = [];
  let remaining = want;
  strata.forEach((st, s) => {
    const k = Math.min(st.length, Math.ceil(remaining / (S - s)));
    remaining -= k;
    for (let j = 0; j < k; j++) sample.push(st[Math.min(st.length - 1, Math.floor(((j + 0.5) * st.length) / k))]);
  });
  return { strata, sample: [...new Set(sample)].sort((a, b) => a - b) };
}

/** Per-item input tokens: measured where counted, else chars x (tokens/chars) of the item's stratum. */
export function extrapolateTokens(chars: number[], plan: SamplePlan, measured: Map<number, number>): number[] {
  const out = new Array<number>(chars.length).fill(0);
  for (const st of plan.strata) {
    let tok = 0, ch = 0;
    for (const i of st) if (measured.has(i)) { tok += measured.get(i)!; ch += chars[i]; }
    const ratio = ch > 0 ? tok / ch : 0;
    for (const i of st) out[i] = measured.has(i) ? measured.get(i)! : Math.round(chars[i] * ratio);
  }
  return out;
}

// ---- token counting ------------------------------------------------------------------------

export type TokenCounter = (p: RequestParams) => Promise<number>;

/** Free endpoint. Falls back to counting without output_config if the endpoint rejects it (noted in the estimate). */
export function sdkTokenCounter(client: Anthropic): TokenCounter & { fellBack: () => boolean } {
  let noOutputConfig = false;
  const fn = async (p: RequestParams): Promise<number> => {
    const base = { model: p.model, system: p.system, messages: p.messages };
    if (!noOutputConfig) {
      try {
        return (await client.messages.countTokens({ ...base, output_config: p.output_config })).input_tokens;
      } catch (e) {
        if ((e as { status?: number }).status !== 400) throw e;
        noOutputConfig = true;
      }
    }
    return (await client.messages.countTokens(base)).input_tokens;
  };
  return Object.assign(fn, { fellBack: () => noOutputConfig });
}

async function pool<T, R>(items: T[], concurrency: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

export interface Estimate {
  method: 'count_tokens_all' | 'count_tokens_stratified_sample';
  model: string;
  effort: string;
  requests: number;
  counted_requests: number;
  strata: number;
  input_tokens: number;
  expected_output_tokens: number;
  expected_output_tokens_per_request: number;
  max_output_tokens_per_request: number;
  cost_usd: number;
  worst_case_cost_usd: number;
  batch_discount: number;
  digest: string;
  assumptions: string;
  count_without_output_config: boolean;
}

export interface EstimateOptions {
  model: string;
  effort: string;
  items: EstItem[];
  counter: TokenCounter & { fellBack?: () => boolean };
  /** Assumed average output tokens per request (stated in the printed estimate). */
  expectedOutputTokens: number;
  outputAssumption: string;
  maxTokens: number;
  /** Count every request when there are at most this many; otherwise sample. Default 1000. */
  countAllUpTo?: number;
  sampleSize?: number;
  concurrency?: number;
  forceSample?: boolean;
}

export async function estimateSpend(o: EstimateOptions): Promise<Estimate> {
  const n = o.items.length;
  const chars = o.items.map((i) => requestChars(i.params));
  const sampleSize = Math.max(o.sampleSize ?? 100, 50);
  const all = !o.forceSample && n <= (o.countAllUpTo ?? 1000);
  const plan: SamplePlan = all
    ? { strata: [o.items.map((_, i) => i)], sample: o.items.map((_, i) => i) }
    : planSample(chars, sampleSize);
  const counted = await pool(plan.sample, o.concurrency ?? 4, (i) => o.counter(o.items[i].params));
  const measured = new Map(plan.sample.map((idx, k) => [idx, counted[k]]));
  const perItem = all ? o.items.map((_, i) => measured.get(i)!) : extrapolateTokens(chars, plan, measured);
  const input = perItem.reduce((a, b) => a + b, 0);
  const cost = perItem.reduce((s, t) => s + requestCost(o.model, { inputTokens: t, outputTokens: o.expectedOutputTokens }), 0);
  const worst = perItem.reduce((s, t) => s + requestCost(o.model, { inputTokens: t, outputTokens: o.maxTokens }), 0);
  return {
    method: all ? 'count_tokens_all' : 'count_tokens_stratified_sample',
    model: o.model,
    effort: o.effort,
    requests: n,
    counted_requests: plan.sample.length,
    strata: plan.strata.length,
    input_tokens: input,
    expected_output_tokens: o.expectedOutputTokens * n,
    expected_output_tokens_per_request: o.expectedOutputTokens,
    max_output_tokens_per_request: o.maxTokens,
    cost_usd: Math.round(cost * 1e6) / 1e6,
    worst_case_cost_usd: Math.round(worst * 1e6) / 1e6,
    batch_discount: BATCH_DISCOUNT,
    digest: requestDigest(o.items),
    assumptions: o.outputAssumption,
    count_without_output_config: o.counter.fellBack?.() ?? false,
  };
}

export function printEstimate(log: (l: string) => void, runId: string, e: Estimate): void {
  log(`estimate for run ${runId} (${e.model}, effort ${e.effort}, Message Batches API, ${(e.batch_discount * 100).toFixed(0)}% batch discount)`);
  log(`  requests:               ${e.requests}`);
  log(`  input tokens:           ${e.input_tokens} (${e.method === 'count_tokens_all' ? `counted exactly on all ${e.counted_requests} requests` : `extrapolated from a stratified sample of ${e.counted_requests} requests in ${e.strata} strata`}${e.count_without_output_config ? '; count_tokens rejected output_config so it is excluded from the count' : ''})`);
  log(`  expected output tokens: ${e.expected_output_tokens} (${e.expected_output_tokens_per_request}/request; ${e.assumptions})`);
  log(`  expected cost:          ${formatUsd(e.cost_usd)}`);
  log(`  worst-case cost:        ${formatUsd(e.worst_case_cost_usd)} (every response at max_tokens=${e.max_output_tokens_per_request})`);
  log(`  to submit:              --confirm-spend ${runId}`);
}
