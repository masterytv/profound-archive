/**
 * Cost estimation, request fingerprints, the spend gate and the full-run projection.
 * Pure functions: no DB, no API (the caller supplies counted tokens).
 */
import { createHash } from 'crypto';
import { requestCost, type ModelFamily } from '../lib/cost';
import { MODELS } from '../lib/cost';

// ---------- fingerprint / group id ----------

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

export interface FingerprintParts {
  key: string; // video id
  kind: string; // pass kind
  model: string;
  effort: string;
  maxTokens: number;
  system: string;
  user: string;
}

/** One line per request; deliberately excludes the run id / attempt so it can be part of the run id. */
export function fingerprintLine(p: FingerprintParts): string {
  return [p.key, p.kind, p.model, p.effort, p.maxTokens, sha256(p.system), sha256(p.user)].join('|');
}

/** Order-independent digest of a request set. */
export function fingerprint(lines: readonly string[]): string {
  return sha256([...lines].sort().join('\n'));
}

/** Group id printed by --estimate and passed to --confirm-spend. Deterministic. */
export function groupId(mode: string, pass: string, fp: string, assumptionsKey: string): string {
  const short = sha256(`${fp}:${assumptionsKey}`).slice(0, 8);
  const base = mode === 'pilot' ? 'pilot' : `${mode}-${pass}`;
  return `${base}-${short}`;
}

export const RUN_TAG: Record<ModelFamily, string> = { haiku: 'h', sonnet: 's', opus: 'o' };
export function runIdFor(group: string, family: ModelFamily): string {
  const id = `${group}-${RUN_TAG[family]}`;
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(id)) throw new Error(`run id "${id}" violates bt_runs id pattern`);
  return id;
}

// ---------- cost estimate ----------

export interface TokenItem {
  /** Total prompt tokens (system + transcript + framing) from messages.countTokens. */
  promptTokens: number;
  /** Tokens of the system prompt alone (the cache_control prefix). */
  systemTokens: number;
  cached: boolean;
  outputTokens: number;
}

/** Conservative per-request cost: assumes NO cache reads; a cached system prefix pays the 25% write premium. */
export function itemCost(model: string, it: TokenItem): number {
  const sys = it.cached ? Math.min(it.systemTokens, it.promptTokens) : 0;
  return requestCost(model, {
    inputTokens: it.promptTokens - sys, cacheWrite5mTokens: sys, outputTokens: it.outputTokens,
  });
}

/** Same without the cache-write premium (every prompt token billed as plain input). */
export function itemCostNoCacheWrite(model: string, it: TokenItem): number {
  return requestCost(model, { inputTokens: it.promptTokens, outputTokens: it.outputTokens });
}

export interface ModelEstimate {
  model: string;
  requests: number;
  countedRequests: number;
  method: 'exact' | 'stratified_sample';
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  costUsdNoCacheWrite: number;
}

export function estimateExact(model: string, items: readonly TokenItem[]): ModelEstimate {
  return {
    model, requests: items.length, countedRequests: items.length, method: 'exact',
    inputTokens: items.reduce((s, i) => s + i.promptTokens, 0),
    outputTokens: items.reduce((s, i) => s + i.outputTokens, 0),
    costUsd: items.reduce((s, i) => s + itemCost(model, i), 0),
    costUsdNoCacheWrite: items.reduce((s, i) => s + itemCostNoCacheWrite(model, i), 0),
  };
}

/**
 * Stratified extrapolation: per stratum h, mean(sampled value) * N_h, summed. `strataSizes[h]`
 * is the full population of stratum h; each stratum must have >= 1 sampled item.
 */
export function estimateStratified(
  model: string,
  sample: ReadonlyArray<{ stratum: number; item: TokenItem }>,
  strataSizes: readonly number[],
): ModelEstimate {
  let input = 0, output = 0, cost = 0, costNoWrite = 0, total = 0;
  strataSizes.forEach((n, h) => {
    total += n;
    if (n === 0) return;
    const s = sample.filter((x) => x.stratum === h).map((x) => x.item);
    if (s.length === 0) throw new Error(`stratum ${h} (N=${n}) has no sampled requests`);
    const mean = (f: (i: TokenItem) => number) => s.reduce((a, i) => a + f(i), 0) / s.length;
    input += mean((i) => i.promptTokens) * n;
    output += mean((i) => i.outputTokens) * n;
    cost += mean((i) => itemCost(model, i)) * n;
    costNoWrite += mean((i) => itemCostNoCacheWrite(model, i)) * n;
  });
  return {
    model, requests: total, countedRequests: sample.length, method: 'stratified_sample',
    inputTokens: Math.round(input), outputTokens: Math.round(output), costUsd: cost, costUsdNoCacheWrite: costNoWrite,
  };
}

export interface OutputAssumption {
  perRequest: number;
  perQuestion: number;
  source: string;
}

/** Documented defaults when no pilot actuals exist (see README): ~25% of 81 answers carry a quote. */
export const DEFAULT_OUTPUT_ASSUMPTION: OutputAssumption = {
  perRequest: 4000,
  perQuestion: 60,
  source: 'assumption: 4,000 tokens per 81-answer request, 60 per answer in recheck/arbiter (excludes any reasoning tokens effort may add)',
};

/** Expected output tokens for a request covering n questions. */
export function outputTokensFor(kind: 'pilot' | 'first' | 'recheck' | 'arbiter', nQuestions: number, a: OutputAssumption): number {
  if (kind === 'pilot' || kind === 'first') return a.perRequest;
  return Math.round(80 + a.perQuestion * nQuestions);
}

// ---------- spend gate ----------

export interface RunLike {
  id: string;
  status: string;
  estimate?: { fingerprint?: string } | null;
}

export interface GateArgs {
  confirm: string | undefined;
  group: string;
  runs: readonly RunLike[];
  expectedRunIds: readonly string[];
  fingerprint: string;
  allowedStatuses?: readonly string[];
}

/** Throws unless the caller passed --confirm-spend equal to the estimated group and nothing changed. */
export function assertSpendConfirmed(a: GateArgs): void {
  if (!a.confirm) {
    throw new Error(`Refusing to spend: run with --estimate first, then re-run with --confirm-spend ${a.group}`);
  }
  if (a.confirm !== a.group) {
    throw new Error(`Refusing to spend: --confirm-spend "${a.confirm}" does not match estimate group "${a.group}"`);
  }
  const byId = new Map(a.runs.map((r) => [r.id, r]));
  const allowed = a.allowedStatuses ?? ['estimated', 'submitted', 'collecting'];
  for (const id of a.expectedRunIds) {
    const r = byId.get(id);
    if (!r) throw new Error(`Refusing to spend: no estimate row (bt_runs) for ${id}; run --estimate first`);
    if (!allowed.includes(r.status)) throw new Error(`Refusing to spend: run ${id} has status "${r.status}"`);
    if (!r.estimate?.fingerprint) throw new Error(`Refusing to spend: run ${id} has no stored estimate fingerprint`);
    if (r.estimate.fingerprint !== a.fingerprint) {
      throw new Error(`Refusing to spend: requests changed since the estimate for ${id} (fingerprint mismatch); re-run --estimate`);
    }
  }
}

// ---------- full-run projection from pilot actuals ----------

export interface PilotModelRates {
  requests: number;
  /** Mean prompt tokens per request (input + cache read + cache write), i.e. billed as plain input. */
  meanPromptTokens: number;
  meanOutputTokens: number;
  /** meanOutputTokens / questions per request (81). */
  meanOutputPerQuestion: number;
}

export interface PilotShares {
  videos: number;
  questionsPerVideo: number;
  /** Fraction of videos with >= 1 flagged cell (Haiku pilot answers, first-pass flag rule). */
  shareVideosWithFlag: number;
  /** Mean flagged cells per video that has any. */
  meanFlaggedPerFlaggedVideo: number;
  /** Fraction of videos with >= 1 disputed cell (flagged and Sonnet disagrees or either invalid). */
  shareVideosWithDispute: number;
  meanDisputedPerDisputedVideo: number;
  /** Cell-level shares, reported for transparency. */
  flaggedCellShare: number;
  disputeShareOfFlagged: number;
}

export interface ProjectionInput {
  nVideos: number;
  haiku: PilotModelRates;
  sonnet: PilotModelRates;
  shares: PilotShares;
  /** Extra prompt tokens per disputed question in the arbiter prompt (readers' answers + quotes). */
  arbiterTokensPerDispute?: number;
}

export interface Projection {
  firstUsd: number;
  recheckUsd: number;
  arbiterUsd: number;
  totalUsd: number;
  recheckRequests: number;
  arbiterRequests: number;
  notes: string[];
}

/**
 * Projection of a full run from pilot rates, all at batch prices with no cache reads:
 *  - first: nVideos Haiku requests at the pilot mean tokens;
 *  - recheck: Sonnet on the share of videos with a flagged cell; prompt tokens = Sonnet's pilot
 *    mean (conservative: the recheck prompt lists fewer questions), output = pilot per-answer
 *    tokens x mean flagged cells;
 *  - arbiter: Opus on the share of videos with a disputed cell; prompt = Sonnet pilot mean
 *    (tokenizer proxy) + arbiterTokensPerDispute x disputes, output = Sonnet per-answer x disputes.
 */
export function projectFullCost(i: ProjectionInput): Projection {
  const perDispute = i.arbiterTokensPerDispute ?? 150;
  const first = i.nVideos * requestCost(MODELS.haiku, {
    inputTokens: i.haiku.meanPromptTokens, outputTokens: i.haiku.meanOutputTokens,
  });
  const recheckReq = i.nVideos * i.shares.shareVideosWithFlag;
  const recheck = recheckReq * requestCost(MODELS.sonnet, {
    inputTokens: i.sonnet.meanPromptTokens,
    outputTokens: i.sonnet.meanOutputPerQuestion * i.shares.meanFlaggedPerFlaggedVideo,
  });
  const arbiterReq = i.nVideos * i.shares.shareVideosWithDispute;
  const arbiter = arbiterReq * requestCost(MODELS.opus, {
    inputTokens: i.sonnet.meanPromptTokens + perDispute * i.shares.meanDisputedPerDisputedVideo,
    outputTokens: i.sonnet.meanOutputPerQuestion * i.shares.meanDisputedPerDisputedVideo,
  });
  return {
    firstUsd: first, recheckUsd: recheck, arbiterUsd: arbiter, totalUsd: first + recheck + arbiter,
    recheckRequests: recheckReq, arbiterRequests: arbiterReq,
    notes: [
      'Batch prices (50% discount), no cache reads assumed; Haiku long-context tier ignored (means used).',
      'Rates come from the pilot sample; confidence intervals on the flagged/dispute shares are not propagated.',
      'Pilot Sonnet answered all questions; the real recheck sees only flagged ones, so its prompt is smaller (projection is conservative).',
    ],
  };
}
