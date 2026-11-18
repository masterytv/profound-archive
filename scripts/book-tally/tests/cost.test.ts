import { describe, expect, it } from 'vitest';
import {
  MODELS, addUsage, costFromUsage, emptyTotals, estimateCost, familyOf, requestCost, usageToCounts,
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
