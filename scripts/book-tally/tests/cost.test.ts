import { cappedCeiling, splitBudget } from '../lib/cost';
import { describe, expect, it } from 'vitest';
import {
  MODELS, THINKING_ALLOWANCE, addUsage, assertRetryBudget, ceilingCost, costFromUsage, emptyTotals, estimateCost,
  estimateOutputTokens, familyOf, isLongContext, projectFromPilot, requestCost, usageToCounts,
} from '../lib/cost';

describe('requestCost', () => {
  it('haiku standard tier, batch discount applied (default)', () => {
    // 1M in * $0.10 + 100k out * $0.50 = 0.10 + 0.05 = 0.15 ; but prompt is 1M tokens > 100K -> long tier
    // so use 90k in: 90k*0.10/1M = 0.009 ; 10k out*0.50/1M = 0.005 ; total 0.014 ; batch -> 0.007
    expect(requestCost(MODELS.haiku, { inputTokens: 90_000, outputTokens: 10_000 })).toBeCloseTo(0.007, 12);
    expect(requestCost(MODELS.haiku, { inputTokens: 90_000, outputTokens: 10_000 }, { batch: false })).toBeCloseTo(0.014, 12);
  });
  it('haiku long-context tier above 100K prompt tokens (boundary exclusive)', () => {
    expect(requestCost(MODELS.haiku, { inputTokens: 100_000, outputTokens: 0 }, { batch: false })).toBeCloseTo(0.01, 12);
    // 100,001 tokens -> $0.50/MTok in, $2.50/MTok out
    expect(requestCost(MODELS.haiku, { inputTokens: 100_001, outputTokens: 1_000_000 }, { batch: false }))
      .toBeCloseTo(100_001 * 0.5 / 1e6 + 2.5, 9);
  });
  it('cache tokens count toward the long-context threshold', () => {
    const c = requestCost(MODELS.haiku, { inputTokens: 1000, cacheReadTokens: 100_000, outputTokens: 0 }, { batch: false });
    expect(c).toBeCloseTo((1000 * 0.5 + 100_000 * 0.5 * 0.1) / 1e6, 12);
  });
  it('sonnet and opus flat rates', () => {
    expect(requestCost(MODELS.sonnet, { inputTokens: 1_000_000, outputTokens: 1_000_000 }, { batch: false })).toBeCloseTo(12, 12);
    expect(requestCost(MODELS.opus, { inputTokens: 1_000_000, outputTokens: 1_000_000 }, { batch: false })).toBeCloseTo(24, 12);
    expect(requestCost(MODELS.opus, { inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBeCloseTo(12, 12);
  });
  it('cache read is 10% of input; cache write 125% (5m) / 200% (1h)', () => {
    const base = { inputTokens: 0, outputTokens: 0 };
    expect(requestCost(MODELS.sonnet, { ...base, cacheReadTokens: 1_000_000 }, { batch: false })).toBeCloseTo(0.2, 12);
    expect(requestCost(MODELS.sonnet, { ...base, cacheWrite5mTokens: 1_000_000 }, { batch: false })).toBeCloseTo(2.5, 12);
    expect(requestCost(MODELS.sonnet, { ...base, cacheWrite1hTokens: 1_000_000 }, { batch: false })).toBeCloseTo(4, 12);
  });
  it('rejects unknown models, accepts dated variants', () => {
    expect(() => requestCost('claude-haiku-4-5', { inputTokens: 1, outputTokens: 1 })).toThrow(/No price table/);
    expect(familyOf('claude-sonnet-5-5-20261101')).toBe('sonnet');
  });
});

describe('estimate / usage', () => {
  it('estimateCost sums per-request (tier decided per request)', () => {
    const reqs = [{ inputTokens: 50_000, outputTokens: 1000 }, { inputTokens: 150_000, outputTokens: 1000 }];
    const a = requestCost(MODELS.haiku, reqs[0]);
    const b = requestCost(MODELS.haiku, reqs[1]);
    expect(estimateCost(MODELS.haiku, reqs)).toBeCloseTo(a + b, 12);
    expect(b).toBeGreaterThan(a * 5);
  });
  it('costFromUsage reads an API usage object incl. cache breakdown', () => {
    const usage = {
      input_tokens: 1000, output_tokens: 500, cache_read_input_tokens: 20_000,
      cache_creation_input_tokens: 3000,
      cache_creation: { ephemeral_5m_input_tokens: 1000, ephemeral_1h_input_tokens: 2000 },
    };
    expect(usageToCounts(usage)).toMatchObject({ cacheWrite5mTokens: 1000, cacheWrite1hTokens: 2000 });
    const expected = (1000 * 2 + 20_000 * 2 * 0.1 + 1000 * 2 * 1.25 + 2000 * 2 * 2 + 500 * 10) / 1e6 / 2;
    expect(costFromUsage(MODELS.sonnet, usage)).toBeCloseTo(expected, 12);
  });
  it('cache_creation_input_tokens without breakdown is treated as 5m', () => {
    expect(usageToCounts({ input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 7 }).cacheWrite5mTokens).toBe(7);
  });
  it('addUsage accumulates totals', () => {
    const t = emptyTotals();
    addUsage(t, MODELS.haiku, { input_tokens: 1000, output_tokens: 100 });
    addUsage(t, MODELS.haiku, { input_tokens: 2000, output_tokens: 200, cache_read_input_tokens: 5000 });
    expect(t).toMatchObject({ requests: 2, inputTokens: 3000, outputTokens: 300, cacheReadTokens: 5000 });
    expect(t.costUsd).toBeGreaterThan(0);
  });
});

describe('ceilingCost', () => {
  it('sums every attempt with max_tokens doubling, at batch price', () => {
    // sonnet: $2/MTok in, $10/MTok out, batch x0.5. 2 requests, 10k input each, max 4000, 3 attempts.
    // outputs per request: 4000 + 8000 + 16000 = 28000 ; inputs: 3 attempts * 10k = 30000
    // per request: (30000*2 + 28000*10)/1e6 = 0.34 ; two requests 0.68 ; batch -> 0.34
    const c = ceilingCost({ model: MODELS.sonnet, requests: [{ inputTokens: 10_000 }, { inputTokens: 10_000 }], maxTokens: 4000, maxAttempts: 3 });
    expect(c).toBeCloseTo(0.34, 12);
  });
  it('doubling:false keeps max_tokens constant', () => {
    const c = ceilingCost({ model: MODELS.sonnet, requests: [{ inputTokens: 10_000 }], maxTokens: 4000, maxAttempts: 3, doubling: false });
    expect(c).toBeCloseTo(((30_000 * 2 + 12_000 * 10) / 1e6) / 2, 12);
  });
  it('is never below a single-attempt cost and grows with attempts', () => {
    const base = { model: MODELS.opus, requests: [{ inputTokens: 1000 }], maxTokens: 1000 };
    const one = ceilingCost({ ...base, maxAttempts: 1 });
    expect(one).toBeCloseTo(requestCost(MODELS.opus, { inputTokens: 1000, outputTokens: 1000 }), 12);
    expect(ceilingCost({ ...base, maxAttempts: 3 })).toBeGreaterThan(one * 3);
  });
  it('applies the Haiku long-context tier PER REQUEST (one big request does not reprice the small ones)', () => {
    const small = { inputTokens: 50_000 };
    const big = { inputTokens: 150_000 };
    const c = ceilingCost({ model: MODELS.haiku, requests: [small, big], maxTokens: 1000, maxAttempts: 1 });
    const expected = requestCost(MODELS.haiku, { ...small, outputTokens: 1000 }) + requestCost(MODELS.haiku, { ...big, outputTokens: 1000 });
    expect(c).toBeCloseTo(expected, 12);
    // hand check: small = (50k*0.10 + 1000*0.50)/1e6/2 ; big = (150k*0.50 + 1000*2.50)/1e6/2
    expect(c).toBeCloseTo((50_000 * 0.1 + 500) / 2e6 + (150_000 * 0.5 + 2500) / 2e6, 12);
  });
  it('validates maxAttempts', () => {
    expect(() => ceilingCost({ model: MODELS.haiku, requests: [], maxTokens: 1, maxAttempts: 0 })).toThrow();
  });
});

describe('output model and projections', () => {
  it('documents the thinking allowance defaults', () => {
    expect(THINKING_ALLOWANCE).toEqual({ haiku: 2000, sonnet: 3000, opus: 5000 });
  });
  it('estimateOutputTokens = thinking allowance + visible tokens per item', () => {
    expect(estimateOutputTokens(MODELS.haiku, 81, 60)).toBe(2000 + 81 * 60);
    expect(estimateOutputTokens(MODELS.opus, 1, 100)).toBe(5100);
    expect(estimateOutputTokens(MODELS.sonnet, 10, 10, 500)).toBe(600);
  });
  it('isLongContext only for haiku above 100K prompt tokens (cache counts)', () => {
    expect(isLongContext(MODELS.haiku, { inputTokens: 100_000 })).toBe(false);
    expect(isLongContext(MODELS.haiku, { inputTokens: 1, cacheReadTokens: 100_000 })).toBe(true);
    expect(isLongContext(MODELS.sonnet, { inputTokens: 900_000 })).toBe(false);
  });
  it('projectFromPilot prices each pilot request individually, then scales', () => {
    const pilot = [
      { inputTokens: 40_000, outputTokens: 3000 },
      { inputTokens: 40_000, outputTokens: 3000 },
      { inputTokens: 160_000, outputTokens: 3000 },
      { inputTokens: 40_000, outputTokens: 3000 },
    ];
    const p = projectFromPilot(MODELS.haiku, pilot, 1000);
    const exact = pilot.reduce((s, r) => s + requestCost(MODELS.haiku, r), 0) / pilot.length;
    expect(p.perRequestUsd).toBeCloseTo(exact, 12);
    expect(p.totalUsd).toBeCloseTo(exact * 1000, 9);
    expect(p.longContextShare).toBe(0.25);
    // averaging tokens first would price every request at the cheap tier and understate the cost
    const avgTokens = { inputTokens: 70_000, outputTokens: 3000 };
    expect(p.perRequestUsd).toBeGreaterThan(requestCost(MODELS.haiku, avgTokens));
    expect(() => projectFromPilot(MODELS.haiku, [], 10)).toThrow();
  });
});

describe('assertRetryBudget', () => {
  it('passes within the approved ceiling (boundary inclusive)', () => {
    expect(() => assertRetryBudget({ approvedCeilingUsd: 10, spentUsd: 4, queuedWorstUsd: 6 })).not.toThrow();
    expect(() => assertRetryBudget({ approvedCeilingUsd: 10, spentUsd: 0, queuedWorstUsd: 1 })).not.toThrow();
  });
  it('throws when spent + queued worst case exceeds the ceiling', () => {
    expect(() => assertRetryBudget({ approvedCeilingUsd: 10, spentUsd: 4, queuedWorstUsd: 6.01 })).toThrow(/Retry budget exceeded/);
    expect(() => assertRetryBudget({ approvedCeilingUsd: 10, spentUsd: 4, queuedWorstUsd: 6.01, confirmedRetries: false })).toThrow();
  });
  it('explicit confirmedRetries lets it through', () => {
    expect(() => assertRetryBudget({ approvedCeilingUsd: 10, spentUsd: 9, queuedWorstUsd: 50, confirmedRetries: true })).not.toThrow();
  });
});

describe('budget cap (--budget-usd)', () => {
  it('leaves the all-attempts ceiling alone without a budget', () => {
    expect(cappedCeiling({ uncappedUsd: 183.86, firstAttemptWorstUsd: 28.6 })).toBe(183.86);
  });
  it('caps the ceiling at the budget, never above the all-attempts figure', () => {
    expect(cappedCeiling({ uncappedUsd: 183.86, firstAttemptWorstUsd: 28.6, budgetUsd: 35 })).toBe(35);
    expect(cappedCeiling({ uncappedUsd: 6.85, firstAttemptWorstUsd: 0.99, budgetUsd: 10 })).toBe(6.85);
    expect(cappedCeiling({ uncappedUsd: 10, firstAttemptWorstUsd: 2, budgetUsd: 2 })).toBe(2);
  });
  it('refuses a budget the first batch alone could exceed, or a non-positive one', () => {
    expect(() => cappedCeiling({ uncappedUsd: 183.86, firstAttemptWorstUsd: 28.6, budgetUsd: 28.5, label: 'full' }))
      .toThrow(/full: budget \$28\.50 is below the first-attempt worst case \$28\.60/);
    expect(() => cappedCeiling({ uncappedUsd: 1, firstAttemptWorstUsd: 0.5, budgetUsd: 0 })).toThrow(/positive/);
    expect(() => cappedCeiling({ uncappedUsd: 1, firstAttemptWorstUsd: 0.5, budgetUsd: NaN })).toThrow(/positive/);
  });
  it('splits a group budget in proportion to first-attempt worst cases', () => {
    const shares = splitBudget(12, [1, 3]);
    expect(shares).toEqual([3, 9]);
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(12, 12);
    expect(() => splitBudget(5, [0, 0])).toThrow(/more than 0/);
  });
});
