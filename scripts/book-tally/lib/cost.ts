/**
 * Price table and cost math. USD per million tokens (MTok), standard (non-batch)
 * rates; every Message Batches request gets BATCH_DISCOUNT.
 *
 *  - haiku 5.5: $0.10 in / $0.50 out for prompts <= 100K tokens, $0.50 / $2.50 above.
 *  - sonnet 5.5: $2 / $10.   opus 5.5: $4 / $20.
 *  - cache read = 10% of input rate; cache write (5m TTL) = 125%, (1h TTL) = 200% of input
 *    (write multipliers are the standard published ones, not in the original brief).
 *  - "Prompt tokens" for the long-context threshold = input + cache read + cache write.
 *
 * Verify rates against the live pricing page before approving spend.
 */

export type ModelFamily = 'haiku' | 'sonnet' | 'opus';

export const MODELS = {
  haiku: 'claude-haiku-5-5',
  sonnet: 'claude-sonnet-5-5',
  opus: 'claude-opus-5-5',
} as const;

export interface Rate { input: number; output: number }

export interface PriceEntry {
  standard: Rate;
  /** Applies when a request's prompt tokens exceed longContextThreshold. */
  longContext?: Rate;
  longContextThreshold?: number;
}

export const PRICES: Record<ModelFamily, PriceEntry> = {
  haiku: {
    standard: { input: 0.1, output: 0.5 },
    longContext: { input: 0.5, output: 2.5 },
    longContextThreshold: 100_000,
  },
  sonnet: { standard: { input: 2, output: 10 } },
  opus: { standard: { input: 4, output: 20 } },
};

export const BATCH_DISCOUNT = 0.5;
export const CACHE_READ_MULTIPLIER = 0.1;
export const CACHE_WRITE_5M_MULTIPLIER = 1.25;
export const CACHE_WRITE_1H_MULTIPLIER = 2;

/** Maps a model id (including dated variants like claude-haiku-5-5-20261001) to its family. */
export function familyOf(model: string): ModelFamily {
  const m = /^claude-(haiku|sonnet|opus)-5-5(?:$|-)/.exec(model);
  if (!m) throw new Error(`No price table entry for model "${model}"`);
  return m[1] as ModelFamily;
}

export interface TokenCounts {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  /** Cache writes at the 5-minute TTL. */
  cacheWrite5mTokens?: number;
  cacheWrite1hTokens?: number;
}

export interface CostOptions {
  /** Default true: all pipeline traffic goes through the Message Batches API. */
  batch?: boolean;
}

/** Cost in USD of ONE request (long-context tier is decided per request). */
export function requestCost(model: string, t: TokenCounts, opts: CostOptions = {}): number {
  const price = PRICES[familyOf(model)];
  const read = t.cacheReadTokens ?? 0;
  const w5 = t.cacheWrite5mTokens ?? 0;
  const w1 = t.cacheWrite1hTokens ?? 0;
  const promptTokens = t.inputTokens + read + w5 + w1;
  const long = price.longContext && price.longContextThreshold !== undefined && promptTokens > price.longContextThreshold;
  const rate = long ? price.longContext! : price.standard;
  const usd =
    (t.inputTokens * rate.input +
      read * rate.input * CACHE_READ_MULTIPLIER +
      w5 * rate.input * CACHE_WRITE_5M_MULTIPLIER +
      w1 * rate.input * CACHE_WRITE_1H_MULTIPLIER +
      t.outputTokens * rate.output) /
    1_000_000;
  return (opts.batch ?? true) ? usd * (1 - BATCH_DISCOUNT) : usd;
}

/** Total estimate over many requests (e.g. one per video) for one model. */
export function estimateCost(model: string, requests: TokenCounts[], opts: CostOptions = {}): number {
  return requests.reduce((sum, r) => sum + requestCost(model, r, opts), 0);
}

/** Subset of the API usage object this module reads. */
export interface UsageLike {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_creation?: { ephemeral_5m_input_tokens?: number | null; ephemeral_1h_input_tokens?: number | null } | null;
}

export function usageToCounts(u: UsageLike): TokenCounts {
  const bd = u.cache_creation;
  let w5 = 0;
  let w1 = 0;
  if (bd && (bd.ephemeral_5m_input_tokens != null || bd.ephemeral_1h_input_tokens != null)) {
    w5 = bd.ephemeral_5m_input_tokens ?? 0;
    w1 = bd.ephemeral_1h_input_tokens ?? 0;
  } else {
    w5 = u.cache_creation_input_tokens ?? 0; // no breakdown: assume the default 5m TTL
  }
  return {
    inputTokens: u.input_tokens ?? 0,
    outputTokens: u.output_tokens ?? 0,
    cacheReadTokens: u.cache_read_input_tokens ?? 0,
    cacheWrite5mTokens: w5,
    cacheWrite1hTokens: w1,
  };
}

/** Actual cost of one response from its usage object. */
export function costFromUsage(model: string, usage: UsageLike, opts: CostOptions = {}): number {
  return requestCost(model, usageToCounts(usage), opts);
}

export interface UsageTotals {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
}

export function emptyTotals(): UsageTotals {
  return { requests: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: 0 };
}

/** Accumulates one response's usage into running totals (cost computed per request). */
export function addUsage(totals: UsageTotals, model: string, usage: UsageLike, opts: CostOptions = {}): UsageTotals {
  const c = usageToCounts(usage);
  totals.requests += 1;
  totals.inputTokens += c.inputTokens;
  totals.outputTokens += c.outputTokens;
  totals.cacheReadTokens += c.cacheReadTokens ?? 0;
  totals.cacheWriteTokens += (c.cacheWrite5mTokens ?? 0) + (c.cacheWrite1hTokens ?? 0);
  totals.costUsd += requestCost(model, c, opts);
  return totals;
}

export function formatUsd(n: number): string {
  return `$${n.toFixed(n < 1 ? 4 : 2)}`;
}

// ---- worst-case ceilings, output modelling, retry budget ----------------------------

/**
 * ASSUMED fixed per-request thinking allowance (output tokens). usage.output_tokens
 * includes thinking tokens, so these are guesses to be REPLACED by pilot actuals
 * (mean output_tokens minus visible tokens) as soon as a pilot has run.
 */
export const THINKING_ALLOWANCE: Record<ModelFamily, number> = { haiku: 2000, sonnet: 3000, opus: 5000 };

/**
 * Output-token model for one request: a fixed thinking allowance plus visible tokens per item
 * (an "item" is one answer / one judged pair / one extraction in the request).
 */
export function estimateOutputTokens(
  model: string,
  items: number,
  visibleTokensPerItem: number,
  thinkingAllowance: number = THINKING_ALLOWANCE[familyOf(model)],
): number {
  return Math.ceil(thinkingAllowance + items * visibleTokensPerItem);
}

/** True when this request would be priced at the long-context tier (haiku > 100K prompt tokens). */
export function isLongContext(model: string, t: Pick<TokenCounts, 'inputTokens' | 'cacheReadTokens' | 'cacheWrite5mTokens' | 'cacheWrite1hTokens'>): boolean {
  const price = PRICES[familyOf(model)];
  if (!price.longContext || price.longContextThreshold === undefined) return false;
  const prompt = t.inputTokens + (t.cacheReadTokens ?? 0) + (t.cacheWrite5mTokens ?? 0) + (t.cacheWrite1hTokens ?? 0);
  return prompt > price.longContextThreshold;
}

export interface CeilingInput {
  model: string;
  /** One entry per request (per-request prompt size decides the haiku tier). */
  requests: Array<Omit<TokenCounts, 'outputTokens'>>;
  /** max_tokens of the FIRST attempt. */
  maxTokens: number;
  /** Total attempts allowed per request (>= 1), e.g. MAX_ATTEMPTS = 3. */
  maxAttempts: number;
  /** When true (default) each retry doubles max_tokens (truncation retries). */
  doubling?: boolean;
  batch?: boolean;
}

/**
 * Hard upper bound in USD: every request fully used on every attempt, with every output
 * at max_tokens (doubling per attempt):
 *   sum over attempts k=1..maxAttempts, over requests: (input + maxTokens * 2^(k-1) output)
 * priced at batch rates, Haiku long-context tier decided PER REQUEST.
 */
export function ceilingCost(c: CeilingInput): number {
  if (!Number.isInteger(c.maxAttempts) || c.maxAttempts < 1) throw new Error('ceilingCost: maxAttempts must be an integer >= 1');
  const doubling = c.doubling ?? true;
  let total = 0;
  for (let k = 1; k <= c.maxAttempts; k++) {
    const out = c.maxTokens * (doubling ? 2 ** (k - 1) : 1);
    for (const r of c.requests) total += requestCost(c.model, { ...r, outputTokens: out }, { batch: c.batch });
  }
  return total;
}

/**
 * Applies an owner-set dollar budget to a run's approved ceiling.
 *
 * Without a budget the ceiling is the all-attempts figure from ceilingCost. With one, the stored
 * ceiling becomes min(all-attempts ceiling, budget): the first batch can never cost more than
 * `firstAttemptWorstUsd` (every response at max_tokens), and every retry batch is then admitted
 * only while spent + queued worst case <= the stored ceiling (assertRetryBudget). So a run
 * cannot spend more than its budget unless a human passes --confirm-retries.
 * Refuses a budget below the first-attempt worst case, which the first batch alone could exceed.
 */
export function cappedCeiling(o: { uncappedUsd: number; firstAttemptWorstUsd: number; budgetUsd?: number; label?: string }): number {
  if (o.budgetUsd === undefined) return o.uncappedUsd;
  if (!Number.isFinite(o.budgetUsd) || o.budgetUsd <= 0) throw new Error(`budget must be a positive number of USD (got ${o.budgetUsd})`);
  if (o.budgetUsd + 1e-9 < o.firstAttemptWorstUsd) {
    throw new Error(
      `${o.label ? `${o.label}: ` : ''}budget ${formatUsd(o.budgetUsd)} is below the first-attempt worst case ` +
        `${formatUsd(o.firstAttemptWorstUsd)} (every response at max_tokens), which the first batch alone could reach. ` +
        'Raise the budget or lower max_tokens.',
    );
  }
  return Math.min(o.uncappedUsd, o.budgetUsd);
}

/**
 * Splits one budget across the runs of a group in proportion to each run's first-attempt worst
 * case, so every share covers its run's first batch whenever the total does. Returns the shares
 * in input order (they sum to the budget).
 */
export function splitBudget(budgetUsd: number, firstAttemptWorstUsd: readonly number[]): number[] {
  const total = firstAttemptWorstUsd.reduce((a, b) => a + b, 0);
  if (!(total > 0)) throw new Error('splitBudget: first-attempt worst cases must sum to more than 0');
  return firstAttemptWorstUsd.map((w) => (budgetUsd * w) / total);
}

export interface ProjectionResult {
  perRequestUsd: number;
  totalUsd: number;
  /** Share of the pilot's requests priced at the long-context tier. */
  longContextShare: number;
  pilotRequests: number;
}

/**
 * Projects a full-run cost from pilot per-request actuals (token counts from real usage
 * objects). Each pilot request is priced INDIVIDUALLY (Haiku tier per request, never from
 * averaged token counts), the mean cost per request is scaled to `targetRequests`.
 */
export function projectFromPilot(
  model: string,
  pilotRequests: TokenCounts[],
  targetRequests: number,
  opts: CostOptions = {},
): ProjectionResult {
  if (pilotRequests.length === 0) throw new Error('projectFromPilot: no pilot requests');
  const total = estimateCost(model, pilotRequests, opts);
  const per = total / pilotRequests.length;
  const long = pilotRequests.filter((r) => isLongContext(model, r)).length;
  return { perRequestUsd: per, totalUsd: per * targetRequests, longContextShare: long / pilotRequests.length, pilotRequests: pilotRequests.length };
}

export interface RetryBudgetInput {
  /** The ceiling the human approved (e.g. from ceilingCost, printed in the estimate). */
  approvedCeilingUsd: number;
  /** Actual spend so far (sum of costFromUsage over collected responses). */
  spentUsd: number;
  /** Worst-case cost of the batch about to be queued. */
  queuedWorstUsd: number;
  /** True only when the human explicitly confirmed retries beyond the approved ceiling. */
  confirmedRetries?: boolean;
}

/** Throws unless spent + queued worst case stays within the approved ceiling, or retries were confirmed. */
export function assertRetryBudget(b: RetryBudgetInput): void {
  const projected = b.spentUsd + b.queuedWorstUsd;
  if (projected <= b.approvedCeilingUsd + 1e-9 || b.confirmedRetries === true) return;
  throw new Error(
    `Retry budget exceeded: spent ${formatUsd(b.spentUsd)} + queued worst case ${formatUsd(b.queuedWorstUsd)} = ` +
      `${formatUsd(projected)} > approved ceiling ${formatUsd(b.approvedCeilingUsd)}. ` +
      `Re-approve with an explicit retry confirmation to continue.`,
  );
}
