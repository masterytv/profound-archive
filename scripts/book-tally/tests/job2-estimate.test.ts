import { describe, expect, it, vi } from 'vitest';
import {
  assertSpendConfirmed, estimateExact, estimateStratified, fingerprint, fingerprintLine, groupId, itemCost, itemCostNoCacheWrite,
  outputTokensFor, projectFullCost, runIdFor, DEFAULT_OUTPUT_ASSUMPTION, type TokenItem,
} from '../job2/estimate';
import { main as runStance } from '../job2/run-stance';

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 10);

describe('cost estimate math (batch prices)', () => {
  const item: TokenItem = { promptTokens: 10_000, systemTokens: 4_000, cached: true, outputTokens: 4_000 };
  it('prices a cached system prefix as a 5-minute cache write, the rest as input', () => {
    // haiku: (6000*0.10 + 4000*0.10*1.25 + 4000*0.50) / 1e6 * 0.5 = 0.00155
    close(itemCost('claude-haiku-5-5', item), 0.00155);
    // without the premium: (10000*0.10 + 4000*0.50)/1e6*0.5 = 0.0015
    close(itemCostNoCacheWrite('claude-haiku-5-5', item), 0.0015);
    close(itemCost('claude-haiku-5-5', { ...item, cached: false }), 0.0015);
  });
  it('sums an exact estimate', () => {
    const e = estimateExact('claude-haiku-5-5', Array(100).fill(item));
    expect(e).toMatchObject({ requests: 100, countedRequests: 100, method: 'exact', inputTokens: 1_000_000, outputTokens: 400_000 });
    close(e.costUsd, 0.155);
  });
  it('extrapolates a stratified sample as sum_h mean_h * N_h', () => {
    const small: TokenItem = { promptTokens: 1000, systemTokens: 0, cached: false, outputTokens: 100 };
    const big: TokenItem = { promptTokens: 9000, systemTokens: 0, cached: false, outputTokens: 100 };
    const e = estimateStratified('claude-sonnet-5-5', [
      { stratum: 0, item: small }, { stratum: 0, item: small }, { stratum: 1, item: big },
    ], [60, 40]);
    expect(e.method).toBe('stratified_sample');
    expect(e.requests).toBe(100);
    expect(e.countedRequests).toBe(3);
    expect(e.inputTokens).toBe(60 * 1000 + 40 * 9000);
    // sonnet: small (1000*2+100*10)/1e6*.5 = 0.0015; big (9000*2+1000)/1e6*.5 = 0.0095
    close(e.costUsd, 60 * 0.0015 + 40 * 0.0095);
    expect(() => estimateStratified('claude-sonnet-5-5', [{ stratum: 0, item: small }], [1, 1])).toThrow(/no sampled/);
  });
  it('output token assumptions', () => {
    expect(outputTokensFor('first', 81, DEFAULT_OUTPUT_ASSUMPTION)).toBe(4000);
    expect(outputTokensFor('pilot', 81, DEFAULT_OUTPUT_ASSUMPTION)).toBe(4000);
    expect(outputTokensFor('recheck', 10, DEFAULT_OUTPUT_ASSUMPTION)).toBe(80 + 600);
  });
});

describe('full-run projection from pilot actuals (hand computed)', () => {
  it('first + recheck + arbiter', () => {
    const p = projectFullCost({
      nVideos: 1000,
      haiku: { requests: 100, meanPromptTokens: 10_000, meanOutputTokens: 4_000, meanOutputPerQuestion: 50 },
      sonnet: { requests: 100, meanPromptTokens: 10_000, meanOutputTokens: 4_050, meanOutputPerQuestion: 50 },
      shares: {
        videos: 100, questionsPerVideo: 81, shareVideosWithFlag: 0.5, meanFlaggedPerFlaggedVideo: 10,
        shareVideosWithDispute: 0.2, meanDisputedPerDisputedVideo: 4, flaggedCellShare: 0.1, disputeShareOfFlagged: 0.2,
      },
    });
    // first: 1000 * (10000*0.1 + 4000*0.5)/1e6*0.5 = 1000*0.0015 = 1.5
    close(p.firstUsd, 1.5);
    // recheck: 500 req * (10000*2 + 500*10)/1e6*0.5 = 500*0.0125 = 6.25
    close(p.recheckUsd, 6.25);
    expect(p.recheckRequests).toBe(500);
    // arbiter: 200 req * ((10000+600)*4 + 200*20)/1e6*0.5 = 200*0.0232 = 4.64
    close(p.arbiterUsd, 4.64);
    expect(p.arbiterRequests).toBe(200);
    close(p.totalUsd, 12.39);
    expect(p.notes.length).toBeGreaterThan(0);
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
