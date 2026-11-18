import { describe, expect, it, vi } from 'vitest';
import { ceilingCost, requestCost, THINKING_ALLOWANCE } from '../lib/cost';
import { realBatchIds, unresolvedMarkers } from '../lib/batch';
import { createGuardedClient } from '../lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { main as judge, type CandidateRow } from '../job1/judge-pairs';
import { CliError, makeCtx } from '../job1/cli';
import {
  assertDigestMatches, assertResumable, assertSpendConfirmed, estimateSpend, extrapolateTokens, planSample, requestChars,
  requestDigest, SpendGateError, type EstItem,
} from '../job1/spend';
import type { RunRow } from '../job1/cli';
import { fakeAnthropic, fakeDb, textMessage, type Row } from './job1-fakes';

const run = (over: Partial<RunRow> = {}): RunRow => ({
  id: 'j1h-1', job: 'pair_judge', pass: 'haiku', model: 'claude-haiku-5-5', effort: 'medium', status: 'estimated',
  params: {}, estimate: { digest: 'abc' }, batch_ids: [], ...over,
});
const expect_ = { job: 'pair_judge', pass: 'haiku', model: 'claude-haiku-5-5' };

describe('spend gate (pure)', () => {
  it('accepts exactly the estimated run named by --confirm-spend', () => {
    expect(assertSpendConfirmed(run(), 'j1h-1', expect_).id).toBe('j1h-1');
  });
  it('refuses without --confirm-spend, with an unknown id, a mismatched id, a non-estimated status', () => {
    expect(() => assertSpendConfirmed(run(), undefined, expect_)).toThrow(SpendGateError);
    expect(() => assertSpendConfirmed(null, 'j1h-1', expect_)).toThrow(/no run/);
    expect(() => assertSpendConfirmed(run({ id: 'other' }), 'j1h-1', expect_)).toThrow(/no run/);
    for (const status of ['submitted', 'collecting', 'completed', 'failed', 'canceled']) {
      expect(() => assertSpendConfirmed(run({ status }), 'j1h-1', expect_)).toThrow(/not "estimated"/);
    }
  });
  it('refuses a run for another job, stage or model, and a run without an estimate', () => {
    expect(() => assertSpendConfirmed(run({ job: 'name_extract' }), 'j1h-1', expect_)).toThrow(SpendGateError);
    expect(() => assertSpendConfirmed(run({ pass: 'sonnet' }), 'j1h-1', expect_)).toThrow(SpendGateError);
    expect(() => assertSpendConfirmed(run({ model: 'claude-sonnet-5-5' }), 'j1h-1', expect_)).toThrow(SpendGateError);
    expect(() => assertSpendConfirmed(run({ estimate: null }), 'j1h-1', expect_)).toThrow(/no estimate/);
  });
  it('digest mismatch refuses; resume needs a submitted run with batch ids', () => {
    expect(() => assertDigestMatches(run(), 'abc')).not.toThrow();
    expect(() => assertDigestMatches(run(), 'zzz')).toThrow(/no longer match/);
    expect(() => assertResumable(run({ status: 'submitted', batch_ids: ['b1'] }), 'j1h-1', expect_)).not.toThrow();
    expect(() => assertResumable(run({ status: 'estimated' }), 'j1h-1', expect_)).toThrow(CliError);
    expect(() => assertResumable(run({ status: 'submitted', batch_ids: [] }), 'j1h-1', expect_)).toThrow(CliError);
  });
});

const item = (key: string, user: string): EstItem => ({
  key,
  params: { model: 'claude-haiku-5-5', max_tokens: 100, system: [{ type: 'text', text: 'sys' }], messages: [{ role: 'user', content: user }] } as never,
});

describe('estimate arithmetic', () => {
  it('digest is order independent and sensitive to content', () => {
    const a = [item('a', 'x'), item('b', 'y')];
    expect(requestDigest(a)).toBe(requestDigest([...a].reverse()));
    expect(requestDigest(a)).not.toBe(requestDigest([item('a', 'x'), item('b', 'z')]));
  });
  it('counts every request when there are few; output = thinking allowance + visible; prices with the batch discount; ceiling covers all attempts', async () => {
    const items = [item('a', 'x'.repeat(400)), item('b', 'y'.repeat(800))];
    const counter = async (p: EstItem['params']) => requestChars(p) * 2;
    const e = await estimateSpend({ model: 'claude-haiku-5-5', effort: 'medium', items, counter, visibleTokensPerRequest: 50, maxTokens: 8192, maxAttempts: 3 });
    expect(e.method).toBe('count_tokens_all');
    expect(e.counted_requests).toBe(2);
    const toks = items.map((i) => requestChars(i.params) * 2);
    expect(e.input_tokens).toBe(toks[0] + toks[1]);
    expect(e.per_request_input_tokens).toEqual({ a: toks[0], b: toks[1] });
    const perReq = THINKING_ALLOWANCE.haiku + 50;
    expect(e.expected_output_tokens_per_request).toBe(perReq);
    expect(e.expected_output_tokens).toBe(perReq * 2);
    expect(e.assumptions).toMatch(/adaptive thinking is on .* billed as OUTPUT/);
    expect(e.assumptions).not.toMatch(/no extended thinking/);
    // Haiku $0.10/MTok input, $0.50/MTok output, 50% batch discount
    expect(e.cost_usd).toBeCloseTo(((toks[0] + toks[1]) * 0.1 + perReq * 2 * 0.5) / 1e6 / 2, 9);
    expect(e.cost_usd).toBeCloseTo(toks.reduce((s, t) => s + requestCost('claude-haiku-5-5', { inputTokens: t, outputTokens: perReq }), 0), 9);
    expect(e.worst_case_cost_usd).toBeGreaterThan(e.cost_usd);
    const ceiling = ceilingCost({ model: 'claude-haiku-5-5', requests: toks.map((t) => ({ inputTokens: t })), maxTokens: 8192, maxAttempts: 3, doubling: true });
    expect(e.ceiling_usd).toBeCloseTo(ceiling, 9);
    expect(e.ceiling_usd).toBeGreaterThan(e.worst_case_cost_usd * 2); // 1x + 2x + 4x output at max_tokens
    expect(e.max_attempts).toBe(3);
  });
  it('stratified sample: >= 50 counted, deterministic, every stratum represented, exact when tokens are proportional to chars', async () => {
    const items = Array.from({ length: 300 }, (_, i) => item(`k${String(i).padStart(3, '0')}`, 'z'.repeat(100 + i * 37)));
    const chars = items.map((i) => requestChars(i.params));
    const plan = planSample(chars, 10); // asks for fewer than 50: clamped up
    expect(plan.sample.length).toBeGreaterThanOrEqual(50);
    expect(planSample(chars, 10).sample).toEqual(plan.sample);
    expect(plan.strata).toHaveLength(10);
    for (const st of plan.strata) expect(st.some((i) => plan.sample.includes(i))).toBe(true);
    const calls = vi.fn(async (p: EstItem['params']) => Math.round(requestChars(p) / 4));
    const e = await estimateSpend({ model: 'claude-haiku-5-5', effort: 'medium', items, counter: calls, visibleTokensPerRequest: 10, maxTokens: 50, maxAttempts: 2, forceSample: true, sampleSize: 60 });
    expect(e.method).toBe('count_tokens_stratified_sample');
    expect(calls.mock.calls.length).toBe(e.counted_requests);
    expect(e.counted_requests).toBeLessThan(300);
    const truth = chars.reduce((s, c) => s + Math.round(c / 4), 0);
    expect(Math.abs(e.input_tokens - truth) / truth).toBeLessThan(0.01);
    expect(Object.keys(e.per_request_input_tokens)).toHaveLength(300);
  });
  it('extrapolation uses measured values for counted items and the stratum ratio for the rest', () => {
    const chars = [100, 200, 300, 400];
    const plan = { strata: [[0, 1], [2, 3]], sample: [0, 2] };
    expect(extrapolateTokens(chars, plan, new Map([[0, 10], [2, 60]]))).toEqual([10, 20, 60, 80]);
  });
});

// ---- judge-pairs end to end against the mock database / mock Anthropic client ----

const pairInput = (n: number) => ({ profile_1: { name: `A${n}`, summary: 's'.repeat(50) }, profile_2: { name: `B${n}`, summary: 't'.repeat(50) } });
const candidates = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({
  id: i + 1, key_a: `profile:${i + 1}`, key_b: `profile:${i + 101}`, rule: 'swapped', features: { pair_input: pairInput(i + 1) },
}));
const verdictFor = (customId: string, v: Record<number, string>) => {
  const id = Number(/_c(\d+)_/.exec(customId)![1]);
  return JSON.stringify({ verdict: v[id] ?? 'different', reason: 'because' });
};

function harness(seed: Record<string, Row[]>, respond: (cid: string, p: Record<string, unknown>) => string | null, model: string, extra: Partial<Parameters<typeof fakeAnthropic>[0]> = {}) {
  const fake = fakeDb(seed);
  // every job1 script here runs through the real write guard (lib/supabase.createGuardedClient)
  const guarded = createGuardedClient(fake.db as unknown as SupabaseClient);
  const api = fakeAnthropic({ respond, model, ...extra });
  const makeClient = vi.fn(() => api.client);
  const logs: string[] = [];
  let tick = 0;
  const call = (argv: string[]) => judge(argv, { db: guarded, makeClient, log: (l) => logs.push(l), now: () => new Date(Date.UTC(2026, 10, 18, 10, 0, tick++)), sleep: async () => undefined });
  return { fake, guarded, api, makeClient, logs, call };
}

describe('judge-pairs spend gate (mock DB + mock Anthropic)', () => {
  it('refuses to run with no mode, and never builds a client', async () => {
    const h = harness({ bt_merge_candidates: candidates(3) }, () => '{}', 'claude-haiku-5-5');
    await expect(h.call([])).rejects.toThrow(/refusing to run/);
    await expect(h.call(['--estimate', '--dry-run'])).rejects.toThrow(/only one/);
    expect(h.makeClient).not.toHaveBeenCalled();
  });

  it('refuses --confirm-spend for an unknown run id: no client, no batch, no writes', async () => {
    const h = harness({ bt_merge_candidates: candidates(3) }, () => '{}', 'claude-haiku-5-5');
    await expect(h.call(['--confirm-spend', 'j1h-20261118000000'])).rejects.toThrow(SpendGateError);
    expect(h.makeClient).not.toHaveBeenCalled();
    expect(h.api.create).not.toHaveBeenCalled();
    expect(h.fake.ops.filter((o) => o.op !== 'select')).toEqual([]);
  });

  it('--dry-run builds requests offline: no client, no writes', async () => {
    const h = harness({ bt_merge_candidates: candidates(4) }, () => '{}', 'claude-haiku-5-5');
    await h.call(['--dry-run']);
    expect(h.makeClient).not.toHaveBeenCalled();
    expect(h.fake.ops.filter((o) => o.op !== 'select')).toEqual([]);
    expect(h.logs.join('\n')).toMatch(/requests that would be built: 4/);
  });

  it('--estimate counts tokens (free endpoint), records an "estimated" run, submits nothing', async () => {
    const h = harness({ bt_merge_candidates: candidates(5) }, () => '{}', 'claude-haiku-5-5');
    await h.call(['--estimate']);
    expect(h.api.countTokens).toHaveBeenCalledTimes(5);
    expect(h.api.create).not.toHaveBeenCalled();
    const runRow = h.fake.tables.bt_runs[0] as Row & { estimate: Record<string, number | string> };
    expect(runRow).toMatchObject({ status: 'estimated', job: 'pair_judge', pass: 'haiku', model: 'claude-haiku-5-5' });
    expect(runRow.estimate).toMatchObject({ requests: 5, method: 'count_tokens_all', expected_output_tokens: 5 * (THINKING_ALLOWANCE.haiku + 120), max_attempts: 3 });
    expect(runRow.estimate.ceiling_usd).toBeGreaterThan(Number(runRow.estimate.cost_usd));
    expect(runRow.params).toMatchObject({ max_attempts: 3 });
    const out = h.logs.join('\n');
    expect(out).toMatch(/requests:\s+5/);
    expect(out).toMatch(/input tokens:\s+\d+/);
    expect(out).toMatch(/expected output tokens:\s+10600 .*adaptive thinking is on/);
    expect(out).toMatch(/HARD CEILING:\s+\$/);
    expect(out).toMatch(/expected cost:/);
    expect(out).toMatch(new RegExp(`--confirm-spend ${String(runRow.id)}`));
    // the requests carry no temperature, structured output via output_config.format, explicit effort
  });

  it('--confirm-spend submits exactly the estimated requests once; a second confirm is refused', async () => {
    const h = harness({ bt_merge_candidates: candidates(4) }, (cid) => verdictFor(cid, { 1: 'same', 2: 'different', 3: 'unsure', 4: 'different' }), 'claude-haiku-5-5');
    await h.call(['--estimate']);
    const id = String(h.fake.tables.bt_runs[0].id);
    await h.call(['--confirm-spend', id]);
    expect(h.api.create).toHaveBeenCalledTimes(1);
    expect(h.api.batchRequests).toHaveLength(4);
    for (const r of h.api.batchRequests) {
      expect(r.params).not.toHaveProperty('temperature');
      expect(r.params.output_config).toMatchObject({ effort: 'medium', format: { type: 'json_schema' } });
      expect(r.params.model).toBe('claude-haiku-5-5');
      expect(r.custom_id).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    }
    const runRow = h.fake.tables.bt_runs[0];
    expect(runRow.status).toBe('completed');
    expect(realBatchIds(runRow.batch_ids as string[])).toEqual(['batch_1']);
    expect((runRow.batch_ids as string[])[0]).toMatch(/^pending:/); // durable marker written BEFORE batches.create
    expect(unresolvedMarkers(runRow.batch_ids as string[])).toEqual([]);
    expect(h.fake.tables.bt_merge_judgments).toHaveLength(4);
    expect(h.fake.tables.bt_raw_responses).toHaveLength(4);
    expect(h.fake.tables.bt_prompts).toHaveLength(1);
    // Haiku different -> auto keep_separate; same/unsure wait for Sonnet; nothing else decided
    expect(h.fake.tables.bt_merge_decisions.map((d) => [d.candidate_id, d.decision, d.decided_by])).toEqual([
      [2, 'keep_separate', 'auto:haiku'], [4, 'keep_separate', 'auto:haiku'],
    ]);
    await expect(h.call(['--confirm-spend', id])).rejects.toThrow(/not "estimated"/);
    expect(h.api.create).toHaveBeenCalledTimes(1);
  });

  it('refuses to submit if the inputs changed after the estimate (digest mismatch)', async () => {
    const h = harness({ bt_merge_candidates: candidates(3) }, () => '{}', 'claude-haiku-5-5');
    await h.call(['--estimate']);
    (h.fake.tables.bt_merge_candidates[0].features as { pair_input: unknown }).pair_input = pairInput(999);
    await expect(h.call(['--confirm-spend', String(h.fake.tables.bt_runs[0].id)])).rejects.toThrow(/no longer match/);
    expect(h.api.create).not.toHaveBeenCalled();
  });

  it('refuses a haiku estimate used for the sonnet stage', async () => {
    const h = harness({ bt_merge_candidates: candidates(2) }, () => '{}', 'claude-haiku-5-5');
    await h.call(['--estimate']);
    await expect(h.call(['--stage', 'sonnet', '--confirm-spend', String(h.fake.tables.bt_runs[0].id)])).rejects.toThrow(/expected pair_judge\/sonnet/);
    expect(h.api.create).not.toHaveBeenCalled();
  });

  it('Sonnet stage: own estimate over only same/unsure candidates; merge needs both same; disagreement -> review (no row)', async () => {
    const hv: Record<number, string> = { 1: 'same', 2: 'different', 3: 'same', 4: 'unsure' };
    const h = harness({ bt_merge_candidates: candidates(4) }, (cid, p) => (String(p.model) === 'claude-haiku-5-5' ? verdictFor(cid, hv) : verdictFor(cid, { 1: 'same', 3: 'different', 4: 'same' })), 'claude-haiku-5-5');
    await expect(h.call(['--stage', 'sonnet', '--estimate'])).rejects.toThrow(/no Haiku judgment yet/);
    await h.call(['--estimate']);
    await h.call(['--confirm-spend', String(h.fake.tables.bt_runs[0].id)]);

    await h.call(['--stage', 'sonnet', '--estimate']);
    const sRun = h.fake.tables.bt_runs[1];
    expect(sRun).toMatchObject({ status: 'estimated', pass: 'sonnet', model: 'claude-sonnet-5-5' });
    expect((sRun.estimate as { requests: number }).requests).toBe(3); // candidates 1, 3, 4
    // blind: the Sonnet request carries exactly the same pair JSON, with no Haiku verdict anywhere
    h.api.countTokens.mockClear();
    const before = h.api.batchRequests.length;
    // swap the respond behaviour by model: the fake answers per request model
    await h.call(['--stage', 'sonnet', '--confirm-spend', String(sRun.id)]);
    const sonnetReqs = h.api.batchRequests.slice(before);
    expect(sonnetReqs).toHaveLength(3);
    const haikuUser = new Map(h.api.batchRequests.slice(0, before).map((r) => [r.custom_id.match(/_(c\d+)_/)![1], r.params.messages[0].content]));
    for (const r of sonnetReqs) {
      expect(r.params.model).toBe('claude-sonnet-5-5');
      // same user message as Haiku saw, and no verdict or reason from Haiku anywhere in the request
      expect(r.params.messages[0].content).toBe(haikuUser.get(r.custom_id.match(/_(c\d+)_/)![1]));
      expect(JSON.stringify(r.params.messages)).not.toMatch(/because|verdict/);
      expect(r.params.messages).toHaveLength(1);
    }
    const d = h.fake.tables.bt_merge_decisions.map((x) => [x.candidate_id, x.decision, x.decided_by]);
    expect(d).toContainEqual([2, 'keep_separate', 'auto:haiku']);
    expect(d).toContainEqual([1, 'merge', 'auto:haiku+sonnet']);
    expect(d.map((x) => x[0]).sort()).toEqual([1, 2]); // 3 (same/different) and 4 (unsure/same) go to review
  });

  it('retries errored requests in a new batch of the same run (attempt+1) and --resume collects without new spend', async () => {
    const respond = (cid: string) => (cid.endsWith('_c2_haiku_1') ? null : verdictFor(cid, { 1: 'same', 2: 'same' }));
    const h = harness({ bt_merge_candidates: candidates(2) }, respond, 'claude-haiku-5-5');
    await h.call(['--estimate']);
    await h.call(['--confirm-spend', String(h.fake.tables.bt_runs[0].id)]);
    expect(h.api.create).toHaveBeenCalledTimes(2);
    expect(h.api.batchRequests.map((r) => r.custom_id).filter((c) => c.includes('_c2_'))).toHaveLength(2);
    expect(h.api.batchRequests.map((r) => r.custom_id).some((c) => c.endsWith('_haiku_2'))).toBe(true);
    expect(h.fake.tables.bt_merge_judgments).toHaveLength(2);
    expect(realBatchIds(h.fake.tables.bt_runs[0].batch_ids as string[])).toEqual(['batch_1', 'batch_2']);
    expect(h.logs.join('\n')).toMatch(/unresolved after retries 0/);
  });

  it('crash after batch creation: run stays "submitted" with its batch id; --resume collects idempotently', async () => {
    const respond = (cid: string) => verdictFor(cid, { 1: 'same', 2: 'same' });
    const crash = harness({ bt_merge_candidates: candidates(2) }, respond, 'claude-haiku-5-5', { crashOnResults: true });
    await crash.call(['--estimate']);
    const id = String(crash.fake.tables.bt_runs[0].id);
    await expect(crash.call(['--confirm-spend', id])).rejects.toThrow(/simulated crash/);
    expect(crash.fake.tables.bt_runs[0]).toMatchObject({ status: 'submitted' });
    expect(realBatchIds(crash.fake.tables.bt_runs[0].batch_ids as string[])).toEqual(['batch_1']);

    // new process, same database: resume with a client that can see the batch
    const api2 = fakeAnthropic({ respond, model: 'claude-haiku-5-5', seed: { batch_1: crash.api.batchRequests } });
    const logs: string[] = [];
    const deps = { db: crash.guarded, makeClient: () => api2.client, log: (l: string) => logs.push(l), now: () => new Date('2026-11-18T12:00:00Z'), sleep: async () => undefined };
    await judge(['--resume', id], deps);
    expect(api2.create).not.toHaveBeenCalled();
    expect(crash.fake.tables.bt_merge_judgments).toHaveLength(2);
    expect(crash.fake.tables.bt_runs[0].status).toBe('completed');
    await judge(['--resume', id], deps).catch(() => undefined); // completed run cannot be resumed again
    expect(crash.fake.tables.bt_merge_judgments).toHaveLength(2);
    expect(crash.fake.tables.bt_raw_responses).toHaveLength(2);
  });

  it('invalid model output is stored in bt_raw_responses but yields no judgment (and the candidate is re-judged by a later run)', async () => {
    const h = harness({ bt_merge_candidates: candidates(2) }, (cid) => (cid.includes('_c1_') ? 'not json' : verdictFor(cid, { 2: 'same' })), 'claude-haiku-5-5');
    await h.call(['--estimate']);
    await h.call(['--confirm-spend', String(h.fake.tables.bt_runs[0].id)]);
    expect(h.fake.tables.bt_merge_judgments).toHaveLength(1);
    expect(h.fake.tables.bt_raw_responses).toHaveLength(2);
    await h.call(['--estimate']);
    expect((h.fake.tables.bt_runs[1].estimate as { requests: number }).requests).toBe(1);
  });
});

describe('makeCtx', () => {
  it('does not touch Supabase until db is used (--help works without credentials)', () => {
    const ctx = makeCtx({ log: () => undefined });
    expect(ctx.outDir).toMatch(/out$/);
  });
});

describe('guarded submission (lib/batch.submitGuarded) through judge-pairs', () => {
  const ok = (cid: string) => verdictFor(cid, { 1: 'same', 2: 'same' });

  it('the guarded client really is in the path: non-bt tables are select-only', () => {
    const h = harness({ nde_vids: [{ videoId: 'v' }], bt_merge_candidates: candidates(1) }, ok, 'claude-haiku-5-5');
    expect(() => h.guarded.from('nde_vids').insert({ videoId: 'x' } as never)).toThrow(/only bt_ tables may be written/);
    expect(() => h.guarded.rpc('anything')).toThrow(/allowlist/);
  });

  it('batches.create is called with maxRetries 0 after the status flipped to submitting with a marker', async () => {
    const h = harness({ bt_merge_candidates: candidates(2) }, ok, 'claude-haiku-5-5');
    await h.call(['--estimate']);
    let seenStatus = '';
    let seenIds: string[] = [];
    h.api.create.mockImplementationOnce(async (body: { requests: unknown[] }, opts: unknown) => {
      seenStatus = String(h.fake.tables.bt_runs[0].status);
      seenIds = h.fake.tables.bt_runs[0].batch_ids as string[];
      expect(opts).toEqual({ maxRetries: 0 });
      return { id: 'batch_x', processing_status: 'in_progress' } as never;
    });
    // create returns a batch the fake knows nothing about; collect will find no results, which is fine for this check
    await h.call(['--confirm-spend', String(h.fake.tables.bt_runs[0].id)]).catch(() => undefined);
    expect(seenStatus).toBe('submitting');
    expect(seenIds).toHaveLength(1);
    expect(seenIds[0]).toMatch(/^pending:2026-11-18T[\d:.]+Z:2:[0-9a-f]{12}$/);
  });

  it('create failed: run stays "submitting"; the next confirm resolves the marker (voids it) and resubmits', async () => {
    const h = harness({ bt_merge_candidates: candidates(2) }, ok, 'claude-haiku-5-5', { createMode: (n) => (n === 1 ? 'fail' : 'ok') });
    await h.call(['--estimate']);
    const id = String(h.fake.tables.bt_runs[0].id);
    await expect(h.call(['--confirm-spend', id])).rejects.toThrow(/stays "submitting"/);
    expect(h.fake.tables.bt_runs[0].status).toBe('submitting');
    expect(unresolvedMarkers(h.fake.tables.bt_runs[0].batch_ids as string[])).toHaveLength(1);
    expect(h.fake.tables.bt_merge_judgments ?? []).toEqual([]);

    await h.call(['--confirm-spend', id]); // resolvePending -> no such batch -> void -> back to estimated -> submit
    expect(h.api.create).toHaveBeenCalledTimes(2);
    const ids = h.fake.tables.bt_runs[0].batch_ids as string[];
    expect(ids.some((e) => e.startsWith('void:'))).toBe(true);
    expect(realBatchIds(ids)).toEqual(['batch_2']);
    expect(h.fake.tables.bt_runs[0].status).toBe('completed');
    expect(h.fake.tables.bt_merge_judgments).toHaveLength(2);
  });

  it('response lost but batch created: the next confirm adopts the existing batch and does NOT resubmit; --resume collects it', async () => {
    const h = harness({ bt_merge_candidates: candidates(2) }, ok, 'claude-haiku-5-5', { createMode: (n) => (n === 1 ? 'lost' : 'ok') });
    await h.call(['--estimate']);
    const id = String(h.fake.tables.bt_runs[0].id);
    await expect(h.call(['--confirm-spend', id])).rejects.toThrow(/stays "submitting"/);
    await expect(h.call(['--confirm-spend', id])).rejects.toThrow(/found at the API and recorded; collect it with --resume/);
    expect(h.api.create).toHaveBeenCalledTimes(1);
    expect(realBatchIds(h.fake.tables.bt_runs[0].batch_ids as string[])).toEqual(['batch_1']);
    expect(h.fake.tables.bt_runs[0].status).toBe('submitted');
    await h.call(['--resume', id]);
    expect(h.fake.tables.bt_merge_judgments).toHaveLength(2);
    expect(h.api.create).toHaveBeenCalledTimes(1);
  });

  it('--adopt-batch records a human-chosen batch after verification; a wrong batch id is refused; needs --resume', async () => {
    const h = harness({ bt_merge_candidates: candidates(2) }, ok, 'claude-haiku-5-5', { createMode: (n) => (n === 1 ? 'lost' : 'ok') });
    await h.call(['--estimate']);
    const id = String(h.fake.tables.bt_runs[0].id);
    await expect(h.call(['--confirm-spend', id])).rejects.toThrow(/stays "submitting"/);
    await expect(h.call(['--adopt-batch', 'batch_1'])).rejects.toThrow(/requires --resume/);
    await expect(h.call(['--resume', id, '--adopt-batch', 'batch_99'])).rejects.toThrow(/refusing to adopt/);
    expect(realBatchIds(h.fake.tables.bt_runs[0].batch_ids as string[])).toEqual([]);
    await h.call(['--resume', id, '--adopt-batch', 'batch_1']);
    expect(realBatchIds(h.fake.tables.bt_runs[0].batch_ids as string[])).toEqual(['batch_1']);
    expect(h.fake.tables.bt_merge_judgments).toHaveLength(2);
    expect(h.fake.tables.bt_runs[0].status).toBe('completed');
  });

  it('refuses to start when the run is no longer "estimated" (compare-and-set): nothing is sent', async () => {
    const h = harness({ bt_merge_candidates: candidates(2) }, ok, 'claude-haiku-5-5');
    await h.call(['--estimate']);
    const id = String(h.fake.tables.bt_runs[0].id);
    h.fake.tables.bt_runs[0].status = 'submitting'; // another process got there first
    h.fake.tables.bt_runs[0].batch_ids = ['pending:2026-11-18T10:00:00.000Z:2:aaaaaaaaaaaa', 'batch_other'];
    await expect(h.call(['--confirm-spend', id])).rejects.toThrow(/not "estimated"|found at the API|no recorded batch|no such/i);
    expect(h.api.create).not.toHaveBeenCalled();
  });

  it('retry batches are checked against the approved ceiling; --confirm-retries <run> overrides', async () => {
    const respond = (cid: string) => (cid.endsWith('_c2_haiku_1') ? null : ok(cid));
    const h = harness({ bt_merge_candidates: candidates(2) }, respond, 'claude-haiku-5-5');
    await h.call(['--estimate']);
    const id = String(h.fake.tables.bt_runs[0].id);
    (h.fake.tables.bt_runs[0].estimate as Record<string, number>).ceiling_usd = 0.00001; // human approved a tiny ceiling
    await expect(h.call(['--confirm-spend', id])).rejects.toThrow(/Retry budget exceeded/);
    expect(h.api.create).toHaveBeenCalledTimes(1); // the retry batch was never created
    expect(h.fake.tables.bt_merge_judgments).toHaveLength(1); // first attempt's good result was kept

    const h2 = harness({ bt_merge_candidates: candidates(2) }, respond, 'claude-haiku-5-5');
    await h2.call(['--estimate']);
    const id2 = String(h2.fake.tables.bt_runs[0].id);
    (h2.fake.tables.bt_runs[0].estimate as Record<string, number>).ceiling_usd = 0.00001;
    await expect(h2.call(['--confirm-spend', id2, '--confirm-retries', 'some-other-run'])).rejects.toThrow(/Retry budget exceeded/);
  });

  it('--confirm-retries naming this run lets the retry batch through', async () => {
    const respond = (cid: string) => (cid.endsWith('_c2_haiku_1') ? null : ok(cid));
    const h = harness({ bt_merge_candidates: candidates(2) }, respond, 'claude-haiku-5-5');
    await h.call(['--estimate']);
    const id = String(h.fake.tables.bt_runs[0].id);
    (h.fake.tables.bt_runs[0].estimate as Record<string, number>).ceiling_usd = 0.00001;
    await h.call(['--confirm-spend', id, '--confirm-retries', id]);
    expect(h.api.create).toHaveBeenCalledTimes(2);
    expect(h.fake.tables.bt_merge_judgments).toHaveLength(2);
  });

  it('truncated results are retried with a doubled max_tokens, then recorded', async () => {
    let first = true;
    const h = harness({ bt_merge_candidates: candidates(1) }, (cid) => ok(cid), 'claude-haiku-5-5');
    h.api.results.mockImplementation(async (bid: string) => ({
      async *[Symbol.asyncIterator]() {
        for (const r of h.api.batches.get(bid) ?? []) {
          const trunc = first;
          first = false;
          yield { custom_id: r.custom_id, result: { type: 'succeeded', message: { ...textMessage('claude-haiku-5-5', trunc ? '{"verdict":"sa' : ok(r.custom_id), trunc ? 'max_tokens' : 'end_turn') } } };
        }
      },
    }) as never);
    await h.call(['--estimate']);
    await h.call(['--confirm-spend', String(h.fake.tables.bt_runs[0].id)]);
    expect(h.api.create).toHaveBeenCalledTimes(2);
    expect(h.api.batchRequests[0].params.max_tokens).toBe(8192);
    expect(h.api.batchRequests[1].params.max_tokens).toBe(16384);
    expect(h.fake.tables.bt_merge_judgments).toHaveLength(1);
  });

  it('refuses to submit when an estimated candidate gained a judgment at that stage since the estimate', async () => {
    const h = harness({ bt_merge_candidates: candidates(3) }, ok, 'claude-haiku-5-5');
    await h.call(['--estimate']);
    h.fake.tables.bt_merge_judgments = [{ id: 1, candidate_id: 2, judge: 'haiku', verdict: 'same', reason: 'x', raw_response_id: null, run_id: 'other' }];
    await expect(h.call(['--confirm-spend', String(h.fake.tables.bt_runs[0].id)])).rejects.toThrow(/already have a result since the estimate/);
    expect(h.api.create).not.toHaveBeenCalled();
  });

  it('unresolved count reflects the FINAL outcome per request, not an accumulation across attempts', async () => {
    const respond = (cid: string) => (cid.includes('_c2_') ? null : ok(cid)); // c2 never succeeds
    const h = harness({ bt_merge_candidates: candidates(2) }, respond, 'claude-haiku-5-5');
    await h.call(['--estimate']);
    await h.call(['--confirm-spend', String(h.fake.tables.bt_runs[0].id)]);
    expect(h.logs.join('\n')).toMatch(/unresolved after retries 1/);
    expect(h.api.create).toHaveBeenCalledTimes(3); // attempts 1..3 for c2 (attempt 1 had both)
    expect((h.fake.tables.bt_runs[0].actual_usage as { unresolved: number }).unresolved).toBe(1);
  });
});
