/**
 * Cost estimation, request fingerprints, the spend gate and the full-run projection.
 * Pure functions: no DB, no API (the caller supplies counted tokens).
 */
import { createHash } from 'crypto';
import {
  MODELS, THINKING_ALLOWANCE, ceilingCost, estimateOutputTokens, projectFromPilot, requestCost, type ModelFamily, type TokenCounts,
} from '../lib/cost';

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
  /** Request key (video id) the counted tokens belong to; stored per key so retries can be priced exactly. */
  key?: string;
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

/** What a run's stored estimate must carry to price a retry batch per request. */
export interface RetryPricing {
  /** Counted prompt tokens per request key (messages.countTokens), stored in bt_runs.estimate. */
  promptTokensByKey?: Record<string, number> | null;
  systemTokens?: number | null;
  cached?: boolean | null;
  meanPromptTokens?: number | null;
}

/** Counted prompt tokens for one key; falls back to the largest counted request (never to a mean). */
export function promptTokensFor(key: string, p: RetryPricing): number {
  const by = p.promptTokensByKey ?? {};
  if (typeof by[key] === 'number') return by[key];
  const all = Object.values(by).filter((v) => typeof v === 'number');
  if (all.length) return Math.max(...all);
  if (typeof p.meanPromptTokens === 'number' && p.meanPromptTokens > 0) return p.meanPromptTokens;
  throw new Error(`the run's estimate has no counted prompt tokens for "${key}"; re-estimate before retrying`);
}

/**
 * Worst-case cost of a retry batch: each queued request priced on ITS OWN counted prompt tokens
 * (so Haiku's >100K long-context tier applies per request) with output at that attempt's max_tokens.
 */
export function queuedRetriesWorstUsd(
  model: string,
  retries: ReadonlyArray<{ key: string; maxTokens: number }>,
  p: RetryPricing,
): number {
  return retries.reduce((sum, r) => sum + itemCost(model, {
    promptTokens: promptTokensFor(r.key, p),
    systemTokens: p.systemTokens ?? 0,
    cached: p.cached === true,
    outputTokens: r.maxTokens,
  }), 0);
}

/** Hard ceiling for ONE request: every attempt used, every output at max_tokens (doubling). */
export function itemCeiling(model: string, it: TokenItem, maxTokens: number, maxAttempts: number): number {
  const sys = it.cached ? Math.min(it.systemTokens, it.promptTokens) : 0;
  return ceilingCost({
    model, requests: [{ inputTokens: it.promptTokens - sys, cacheWrite5mTokens: sys }], maxTokens, maxAttempts,
  });
}

export interface CeilingParams { maxTokens: number; maxAttempts: number }

export interface ModelEstimate {
  model: string;
  requests: number;
  countedRequests: number;
  method: 'exact' | 'stratified_sample';
  inputTokens: number;
  outputTokens: number;
  /** Expected cost: assumed output tokens, no cache reads, one attempt per request. */
  costUsd: number;
  costUsdNoCacheWrite: number;
  /** Hard ceiling: all attempts at max_tokens with doubling (lib/cost.ceilingCost). */
  ceilingUsd: number;
  meanPromptTokens: number;
}

export function estimateExact(model: string, items: readonly TokenItem[], ceil: CeilingParams): ModelEstimate {
  const input = items.reduce((s, i) => s + i.promptTokens, 0);
  return {
    model, requests: items.length, countedRequests: items.length, method: 'exact',
    inputTokens: input,
    outputTokens: items.reduce((s, i) => s + i.outputTokens, 0),
    costUsd: items.reduce((s, i) => s + itemCost(model, i), 0),
    costUsdNoCacheWrite: items.reduce((s, i) => s + itemCostNoCacheWrite(model, i), 0),
    ceilingUsd: items.reduce((s, i) => s + itemCeiling(model, i, ceil.maxTokens, ceil.maxAttempts), 0),
    meanPromptTokens: items.length ? input / items.length : 0,
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
  ceil: CeilingParams,
): ModelEstimate {
  let input = 0, output = 0, cost = 0, costNoWrite = 0, ceiling = 0, total = 0;
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
    ceiling += mean((i) => itemCeiling(model, i, ceil.maxTokens, ceil.maxAttempts)) * n;
  });
  return {
    model, requests: total, countedRequests: sample.length, method: 'stratified_sample',
    inputTokens: Math.round(input), outputTokens: Math.round(output), costUsd: cost, costUsdNoCacheWrite: costNoWrite,
    ceilingUsd: ceiling, meanPromptTokens: total ? input / total : 0,
  };
}

export type StanceKind = 'pilot' | 'first' | 'recheck' | 'arbiter';

/**
 * Output-token model (usage.output_tokens includes thinking): per request a fixed thinking
 * allowance per model family plus visible tokens per answered question. `perVideoOverride`
 * (pilot actuals: mean output tokens per VIDEO summed over attempts) replaces the model for
 * the full-question passes (pilot / first).
 */
export interface OutputAssumption {
  thinkingAllowance: Record<ModelFamily, number>;
  visiblePerQuestion: Record<StanceKind, number>;
  perVideoOverride?: Partial<Record<ModelFamily, number>>;
  source: string;
}

export const DEFAULT_OUTPUT_ASSUMPTION: OutputAssumption = {
  thinkingAllowance: { ...THINKING_ALLOWANCE },
  visiblePerQuestion: { pilot: 32, first: 32, recheck: 60, arbiter: 70 },
  source: 'assumption: thinking allowance (lib/cost THINKING_ALLOWANCE) + visible tokens per answered question (32 for 81-question passes, 60 recheck, 70 arbiter); no pilot actuals yet',
};

/** Expected output tokens for a request covering n questions. */
export function outputTokensFor(kind: StanceKind, family: ModelFamily, nQuestions: number, a: OutputAssumption): number {
  if ((kind === 'pilot' || kind === 'first') && a.perVideoOverride?.[family] !== undefined) return Math.ceil(a.perVideoOverride[family]!);
  return estimateOutputTokens(MODELS[family], nQuestions, a.visiblePerQuestion[kind], a.thinkingAllowance[family]);
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
  const allowed = a.allowedStatuses ?? ['estimated', 'submitting', 'submitted', 'collecting'];
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

export interface ProjectionInput {
  nVideos: number;
  /** Pilot per-VIDEO actual token counts (all attempts summed), one entry per video. */
  haikuPerVideo: TokenCounts[];
  sonnetPerVideo: ReadonlyMap<string, TokenCounts>;
  /** Pilot cells flagged / disputed per video (Haiku flag rule; dispute = Sonnet disagrees or either invalid). */
  flaggedByVideo: ReadonlyMap<string, number>;
  disputedByVideo: ReadonlyMap<string, number>;
  /** Number of pilot videos the maps above were measured on. */
  pilotVideos: number;
  assumption: OutputAssumption;
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
  firstLongContextShare: number;
  notes: string[];
}

const promptOf = (t: TokenCounts) => t.inputTokens + (t.cacheReadTokens ?? 0) + (t.cacheWrite5mTokens ?? 0) + (t.cacheWrite1hTokens ?? 0);

/**
 * Projection of a full run from pilot actuals, batch prices, no cache reads. Every pilot
 * request is priced individually (lib/cost.projectFromPilot), so the Haiku long-context tier
 * is decided per request:
 *  - first: Haiku pilot videos as measured (all attempts summed), scaled to nVideos;
 *  - recheck: for each pilot video with flagged cells, one Sonnet request with that video's
 *    Sonnet prompt tokens and output = Sonnet thinking allowance + flagged x visible tokens;
 *    scaled by the share of videos with a flagged cell;
 *  - arbiter: same for disputed cells with Opus (prompt = Sonnet prompt + per-dispute tokens).
 */
export function projectFullCost(i: ProjectionInput): Projection {
  const perDispute = i.arbiterTokensPerDispute ?? 150;
  const a = i.assumption;
  const first = projectFromPilot(MODELS.haiku, i.haikuPerVideo, i.nVideos);

  const rcReqs: TokenCounts[] = [];
  const arReqs: TokenCounts[] = [];
  for (const [v, n] of i.flaggedByVideo) {
    const s = i.sonnetPerVideo.get(v);
    if (!s || n <= 0) continue;
    rcReqs.push({ inputTokens: promptOf(s), outputTokens: estimateOutputTokens(MODELS.sonnet, n, a.visiblePerQuestion.recheck, a.thinkingAllowance.sonnet) });
  }
  for (const [v, n] of i.disputedByVideo) {
    const s = i.sonnetPerVideo.get(v);
    if (!s || n <= 0) continue;
    arReqs.push({ inputTokens: promptOf(s) + perDispute * n, outputTokens: estimateOutputTokens(MODELS.opus, n, a.visiblePerQuestion.arbiter, a.thinkingAllowance.opus) });
  }
  const scale = (n: number) => (i.pilotVideos > 0 ? Math.round((i.nVideos * n) / i.pilotVideos) : 0);
  const rcTarget = scale(rcReqs.length), arTarget = scale(arReqs.length);
  const rc = rcReqs.length ? projectFromPilot(MODELS.sonnet, rcReqs, rcTarget) : null;
  const ar = arReqs.length ? projectFromPilot(MODELS.opus, arReqs, arTarget) : null;
  const recheckUsd = rc?.totalUsd ?? 0, arbiterUsd = ar?.totalUsd ?? 0;
  return {
    firstUsd: first.totalUsd, recheckUsd, arbiterUsd, totalUsd: first.totalUsd + recheckUsd + arbiterUsd,
    recheckRequests: rcTarget, arbiterRequests: arTarget, firstLongContextShare: first.longContextShare,
    notes: [
      'Batch prices (50% discount), no cache reads assumed; each pilot video is priced as its own request (Haiku long-context tier per request).',
      'First-pass output tokens are pilot actuals per video (thinking included, all attempts summed). Recheck/arbiter output uses the thinking allowance + visible tokens per flagged question.',
      'The pilot Sonnet answered all questions; the real recheck sees only flagged ones, so its prompt is smaller (projection is conservative).',
    ],
  };
}
