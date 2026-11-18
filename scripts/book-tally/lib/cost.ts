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
