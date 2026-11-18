import { describe, expect, it, vi } from 'vitest';
import {
  assertSpendConfirmed, estimateExact, estimateStratified, fingerprint, fingerprintLine, groupId, itemCeiling, itemCost, itemCostNoCacheWrite,
  outputTokensFor, projectFullCost, runIdFor, DEFAULT_OUTPUT_ASSUMPTION, type TokenItem,
} from '../job2/estimate';
import { main as runStance } from '../job2/run-stance';

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 10);

describe('cost estimate math (batch prices)', () => {
  const item: TokenItem = { promptTokens: 10_000, systemTokens: 4_000, cached: true, outputTokens: 4_000 };
  const ceil = { maxTokens: 16_000, maxAttempts: 3 };
  it('prices a cached system prefix as a 5-minute cache write, the rest as input', () => {
    // haiku: (6000*0.10 + 4000*0.10*1.25 + 4000*0.50) / 1e6 * 0.5 = 0.00155
    close(itemCost('claude-haiku-5-5', item), 0.00155);
    // without the premium: (10000*0.10 + 4000*0.50)/1e6*0.5 = 0.0015
    close(itemCostNoCacheWrite('claude-haiku-5-5', item), 0.0015);
    close(itemCost('claude-haiku-5-5', { ...item, cached: false }), 0.0015);
  });
  it('hard ceiling: every attempt, output at max_tokens doubling (16k + 32k + 64k)', () => {
    // inputs: 3 x (6000*0.1 + 4000*0.1*1.25)/1e6*0.5 = 0.00165 ; outputs: 112000 * 0.5/1e6 * 0.5 = 0.028
    close(itemCeiling('claude-haiku-5-5', item, 16_000, 3), 0.02965);
    expect(itemCeiling('claude-haiku-5-5', item, 16_000, 3)).toBeGreaterThan(itemCost('claude-haiku-5-5', item) * 10);
  });
  it('sums an exact estimate, with expected cost AND ceiling', () => {
    const e = estimateExact('claude-haiku-5-5', Array(100).fill(item), ceil);
    expect(e).toMatchObject({ requests: 100, countedRequests: 100, method: 'exact', inputTokens: 1_000_000, outputTokens: 400_000, meanPromptTokens: 10_000 });
    close(e.costUsd, 0.155);
    close(e.ceilingUsd, 2.965);
  });
  it('extrapolates a stratified sample as sum_h mean_h * N_h (cost and ceiling)', () => {
    const small: TokenItem = { promptTokens: 1000, systemTokens: 0, cached: false, outputTokens: 100 };
    const big: TokenItem = { promptTokens: 9000, systemTokens: 0, cached: false, outputTokens: 100 };
    const e = estimateStratified('claude-sonnet-5-5', [
      { stratum: 0, item: small }, { stratum: 0, item: small }, { stratum: 1, item: big },
    ], [60, 40], { maxTokens: 1000, maxAttempts: 2 });
    expect(e.method).toBe('stratified_sample');
    expect(e.requests).toBe(100);
    expect(e.countedRequests).toBe(3);
    expect(e.inputTokens).toBe(60 * 1000 + 40 * 9000);
    // sonnet: small (1000*2+100*10)/1e6*.5 = 0.0015; big (9000*2+1000)/1e6*.5 = 0.0095
    close(e.costUsd, 60 * 0.0015 + 40 * 0.0095);
    // ceiling small: attempts 1,2 -> (2000+10000)/1e6*.5 + (2000+20000)/1e6*.5 = 0.017 ; big -> 0.014 + 0.019 = 0.033
    close(e.ceilingUsd, 60 * 0.017 + 40 * 0.033);
    expect(() => estimateStratified('claude-sonnet-5-5', [{ stratum: 0, item: small }], [1, 1], ceil)).toThrow(/no sampled/);
  });
  it('output model: model-specific thinking allowance + visible tokens per answered question', () => {
    const d = DEFAULT_OUTPUT_ASSUMPTION;
    expect(outputTokensFor('first', 'haiku', 81, d)).toBe(2000 + 81 * 32);
    expect(outputTokensFor('pilot', 'sonnet', 81, d)).toBe(3000 + 81 * 32);
    // recheck/arbiter: fixed allowance + per flagged question, NOT scaled from the 81-question request
    expect(outputTokensFor('recheck', 'sonnet', 10, d)).toBe(3000 + 10 * 60);
    expect(outputTokensFor('arbiter', 'opus', 4, d)).toBe(5000 + 4 * 70);
    // pilot actuals (mean output per video, thinking included) replace the model for full-question passes only
    const a = { ...d, perVideoOverride: { haiku: 3000.4 } };
    expect(outputTokensFor('first', 'haiku', 81, a)).toBe(3001);
    expect(outputTokensFor('recheck', 'sonnet', 10, a)).toBe(3600);
    expect(outputTokensFor('first', 'sonnet', 81, a)).toBe(3000 + 81 * 32);
  });
});

describe('full-run projection from pilot actuals (hand computed, per-request pricing)', () => {
  const tc = (i: number, o: number) => ({ inputTokens: i, outputTokens: o });
  it('first + recheck + arbiter', () => {
    const p = projectFullCost({
      nVideos: 1000, pilotVideos: 4,
      haikuPerVideo: [tc(10_000, 4_000), tc(10_000, 4_000), tc(10_000, 4_000), tc(10_000, 4_000)],
      sonnetPerVideo: new Map([['v1', tc(10_000, 4_050)], ['v2', tc(10_000, 4_050)], ['v3', tc(10_000, 4_050)], ['v4', tc(10_000, 4_050)]]),
      flaggedByVideo: new Map([['v1', 10], ['v2', 10]]),
      disputedByVideo: new Map([['v1', 4]]),
      assumption: DEFAULT_OUTPUT_ASSUMPTION,
    });
    // first: 1000 * (10000*0.1 + 4000*0.5)/1e6*0.5 = 1.5
    close(p.firstUsd, 1.5);
    // recheck: 2 of 4 videos flagged -> 500 requests; each (10000*2 + (3000+10*60)*10)/1e6*0.5 = 0.028 -> 14
    expect(p.recheckRequests).toBe(500);
    close(p.recheckUsd, 14);
    // arbiter: 1 of 4 -> 250 requests; each ((10000+150*4)*4 + (5000+4*70)*20)/1e6*0.5 = 0.074 -> 18.5
    expect(p.arbiterRequests).toBe(250);
    close(p.arbiterUsd, 18.5);
    close(p.totalUsd, 34);
    expect(p.firstLongContextShare).toBe(0);
  });
  it('prices the Haiku long-context tier per request, not from means', () => {
    // one of two pilot videos exceeds 100K prompt tokens: tier $0.50/$2.50 for it, $0.10/$0.50 for the other
    const p = projectFullCost({
      nVideos: 100, pilotVideos: 2, haikuPerVideo: [tc(10_000, 1_000), tc(150_000, 1_000)],
      sonnetPerVideo: new Map(), flaggedByVideo: new Map(), disputedByVideo: new Map(), assumption: DEFAULT_OUTPUT_ASSUMPTION,
    });
    // cheap: (1000+500)/1e6*.5 = 0.00075 ; long: (150000*0.5 + 1000*2.5)/1e6*.5 = 0.03875 ; mean 0.0197500 x 100
    close(p.firstUsd, 1.975);
    expect(p.firstLongContextShare).toBe(0.5);
    expect(p.recheckUsd).toBe(0);
  });
});

describe('fingerprint, group and run ids', () => {
  const base = { key: 'v1', kind: 'first', model: 'claude-haiku-5-5', effort: 'medium', maxTokens: 16000, system: 'S', user: 'U' };
  it('is order independent and sensitive to every component', () => {
    const l1 = fingerprintLine(base), l2 = fingerprintLine({ ...base, key: 'v2' });
    expect(fingerprint([l1, l2])).toBe(fingerprint([l2, l1]));
    for (const change of [{ system: 'S2' }, { user: 'U2' }, { effort: 'high' }, { model: 'claude-sonnet-5-5' }, { maxTokens: 1 }]) {
      expect(fingerprintLine({ ...base, ...change })).not.toBe(l1);
    }
  });
  it('group id is deterministic, depends on assumptions, and run ids fit bt_runs', () => {
    const g = groupId('full', 'first', 'abc', 'k');
    expect(groupId('full', 'first', 'abc', 'k')).toBe(g);
    expect(groupId('full', 'first', 'abc', 'k2')).not.toBe(g);
    expect(groupId('pilot', 'first', 'abc', 'k')).toMatch(/^pilot-[0-9a-f]{8}$/);
    expect(runIdFor(groupId('full', 'recheck', 'abc', 'k'), 'sonnet')).toMatch(/^full-recheck-[0-9a-f]{8}-s$/);
    expect(runIdFor(groupId('full', 'arbiter', 'abc', 'k'), 'opus').length).toBeLessThanOrEqual(32);
  });
});

describe('spend gate', () => {
  const run = (o = {}) => ({ id: 'g-h', status: 'estimated', estimate: { fingerprint: 'F' }, ...o });
  const ok = { confirm: 'g', group: 'g', runs: [run()], expectedRunIds: ['g-h'], fingerprint: 'F' };
  it('passes only when everything matches', () => expect(() => assertSpendConfirmed(ok)).not.toThrow());
  it.each([
    ['no confirmation', { confirm: undefined }, /--estimate first/],
    ['wrong group', { confirm: 'other' }, /does not match/],
    ['no estimate row', { runs: [] }, /no estimate row/],
    ['canceled run', { runs: [run({ status: 'canceled' })] }, /status "canceled"/],
    ['no fingerprint', { runs: [run({ estimate: null })] }, /no stored estimate/],
    ['requests changed', { fingerprint: 'G' }, /fingerprint mismatch/],
  ])('refuses: %s', (_n, o, re) => expect(() => assertSpendConfirmed({ ...ok, ...o } as never)).toThrow(re));
});

describe('run-stance refuses to spend', () => {
  const trap = () => { throw new Error('must not be called'); };
  it('refuses a bare run and never builds a client or touches the database', async () => {
    const makeClient = vi.fn(trap), db = new Proxy({}, { get: trap }) as never;
    await expect(runStance(['--full'], { db, makeClient, log: () => {} })).rejects.toThrow(/refusing to spend/);
    await expect(runStance(['--full', '--pass', 'arbiter'], { db, makeClient, log: () => {} })).rejects.toThrow(/refusing to spend/);
    expect(makeClient).not.toHaveBeenCalled();
  });
  it('rejects --confirm-spend together with --estimate and bad options, before any I/O', async () => {
    const makeClient = vi.fn(trap), db = new Proxy({}, { get: trap }) as never;
    await expect(runStance(['--full', '--estimate', '--confirm-spend', 'x'], { db, makeClient })).rejects.toThrow(/cannot be combined/);
    await expect(runStance(['--bogus'], { db, makeClient })).rejects.toThrow();
    await expect(runStance(['--pilot', '--gold', '--estimate'], { db, makeClient })).rejects.toThrow(/only one/);
    expect(makeClient).not.toHaveBeenCalled();
  });
});
