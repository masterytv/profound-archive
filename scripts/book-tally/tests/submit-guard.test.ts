import { describe, expect, it } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import {
  PENDING_LOOKBACK_MS, PENDING_VOID_MIN_AGE_MS, customIdsSha12, isMarker, makeCustomId, makePendingMarker, parsePendingMarker,
  realBatchIds, resolvePending, submitGuarded, unresolvedMarkers, voidPending, type BatchRequest,
} from '../lib/batch';
import type { Db } from '../lib/supabase';

const RUN = 'run1';
const ids = (n: number, run = RUN) => Array.from({ length: n }, (_, i) => makeCustomId({ run, key: `vid${i}`, pass: 'first', attempt: 1 }));
const reqs = (idList: string[]) => idList.map((custom_id) => ({ custom_id, params: { model: 'm', max_tokens: 1, messages: [] } })) as unknown as BatchRequest[];

/** In-memory bt_runs with the query shapes lib/supabase.ts and lib/batch.ts use. */
function fakeDb(initial: { status: string; batch_ids?: string[] }) {
  const row = { id: RUN, status: initial.status, batch_ids: [...(initial.batch_ids ?? [])] };
  const state = { row, failUpdates: 0, skip: 0, updates: 0, log: [] as string[] };
  const db = {
    from: (table: string) => {
      if (table !== 'bt_runs') throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({ eq: (_c: string, v: string) => Promise.resolve({ data: v === RUN ? [{ ...row, batch_ids: [...row.batch_ids] }] : [], error: null }) }),
        update: (patch: Record<string, unknown>) => ({
          eq: (_c1: string, id: string) => ({
            eq: (_c2: string, status: string) => ({
              select: () => {
                state.updates++;
                if (state.skip > 0) state.skip--;
                else if (state.failUpdates > 0) { state.failUpdates--; return Promise.resolve({ data: null, error: { message: 'db hiccup' } }); }
                if (id !== RUN || row.status !== status) return Promise.resolve({ data: [], error: null });
                Object.assign(row, patch);
                if (patch.batch_ids) row.batch_ids = [...(patch.batch_ids as string[])];
                state.log.push(`update ${status}->${String(patch.status ?? status)}`);
                return Promise.resolve({ data: [{ id }], error: null });
              },
            }),
          }),
        }),
      };
    },
  } as unknown as Db;
  return { db, state };
}

interface FakeBatch { id: string; created_at: string; counts: number; customIds: string[] }

function fakeClient(opts: { batches?: FakeBatch[]; listPlan?: FakeBatch[][]; createBehaviour?: (params: { requests: BatchRequest[] }, o: unknown) => Promise<{ id: string }> } = {}) {
  const calls = { create: [] as Array<{ n: number; opts: unknown }>, list: 0 };
  const batches = opts.batches ?? opts.listPlan?.flat() ?? [];
  const client = {
    messages: {
      batches: {
        create: async (params: { requests: BatchRequest[] }, o: unknown) => {
          calls.create.push({ n: params.requests.length, opts: o });
          if (opts.createBehaviour) return opts.createBehaviour(params, o);
          return { id: 'msgbatch_new' };
        },
        retrieve: async (id: string) => ({ id, processing_status: 'ended' }),
        results: async (id: string) => {
          const b = batches.find((x) => x.id === id);
          return (async function* () {
            for (const c of b?.customIds ?? []) yield { custom_id: c, result: { type: 'succeeded', message: { stop_reason: 'end_turn', content: [], usage: {} } } };
          })();
        },
        list: () => (async function* () {
          const view = opts.listPlan ? opts.listPlan[Math.min(calls.list, opts.listPlan.length - 1)] : batches;
          calls.list++;
          for (const b of [...view].sort((a, c) => (a.created_at < c.created_at ? 1 : -1))) {
            yield { id: b.id, created_at: b.created_at, request_counts: { processing: 0, succeeded: b.counts, errored: 0, canceled: 0, expired: 0 } };
          }
        })(),
      },
    },
  } as unknown as Anthropic;
  return { client, calls };
}

describe('markers', () => {
  it('round-trips and detects unresolved markers', () => {
    const m = makePendingMarker(ids(3), new Date('2026-11-18T10:00:00.000Z'));
    expect(m).toMatch(/^pending:2026-11-18T10:00:00\.000Z:3:[0-9a-f]{12}$/);
    const p = parsePendingMarker(m)!;
    expect([p.nRequests, p.sha12, p.at.toISOString()]).toEqual([3, customIdsSha12(ids(3)), '2026-11-18T10:00:00.000Z']);
    expect(unresolvedMarkers([m])).toHaveLength(1);
    expect(unresolvedMarkers([m, 'msgbatch_1'])).toHaveLength(0);
    expect(unresolvedMarkers([m, 'void:2026-11-18T10:05:00.000Z'])).toHaveLength(0);
    expect(unresolvedMarkers([m, makePendingMarker(ids(2), new Date())])).toHaveLength(2); // both lack a real id
    expect(realBatchIds([m, 'msgbatch_1', 'void:x'])).toEqual(['msgbatch_1']);
    expect(isMarker('msgbatch_1')).toBe(false);
  });
  it('sha is order-independent', () => {
    expect(customIdsSha12(['b', 'a', 'c'])).toBe(customIdsSha12(['c', 'a', 'b']));
    expect(customIdsSha12(['a', 'b'])).not.toBe(customIdsSha12(['a', 'c']));
  });
});

describe('submitGuarded', () => {
  it('records a pending marker BEFORE create, creates with maxRetries 0, then records id + status submitted', async () => {
    const { db, state } = fakeDb({ status: 'estimated', batch_ids: ['old_batch'] });
    const seen: Array<{ status: string; batch_ids: string[] }> = [];
    const { client, calls } = fakeClient({
      createBehaviour: async () => { seen.push({ status: state.row.status, batch_ids: [...state.row.batch_ids] }); return { id: 'msgbatch_1' }; },
    });
    const r = await submitGuarded({ db, client, runId: RUN, expectedStatus: 'estimated', requests: reqs(ids(3)) });
    expect(seen[0].status).toBe('submitting');
    expect(seen[0].batch_ids).toHaveLength(2);
    expect(seen[0].batch_ids[1]).toMatch(/^pending:.*:3:[0-9a-f]{12}$/);
    expect(calls.create[0].opts).toEqual({ maxRetries: 0 });
    expect(state.row.status).toBe('submitted');
    expect(state.row.batch_ids).toEqual(['old_batch', r.marker, 'msgbatch_1']);
    expect(r.batchId).toBe('msgbatch_1');
  });
  it('refuses (and sends nothing) when the run is not in the expected status', async () => {
    const { db } = fakeDb({ status: 'submitted' });
    const { client, calls } = fakeClient();
    await expect(submitGuarded({ db, client, runId: RUN, expectedStatus: 'estimated', requests: reqs(ids(2)) })).rejects.toThrow(/run not in expected status \(concurrent or already submitted\)/);
    expect(calls.create).toHaveLength(0);
  });
  it('two concurrent submitters: exactly one wins, create is called once', async () => {
    const { db, state } = fakeDb({ status: 'estimated' });
    const { client, calls } = fakeClient();
    const go = () => submitGuarded({ db, client, runId: RUN, expectedStatus: 'estimated', requests: reqs(ids(2)) });
    const res = await Promise.allSettled([go(), go()]);
    expect(res.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const lost = res.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(String(lost.reason)).toMatch(/run not in expected status/);
    expect(calls.create).toHaveLength(1);
    expect(state.row.status).toBe('submitted');
  });
  it('create failure leaves the run "submitting" with the marker and says to call resolvePending', async () => {
    const { db, state } = fakeDb({ status: 'estimated' });
    const { client } = fakeClient({ createBehaviour: async () => { throw new Error('socket hang up'); } });
    await expect(submitGuarded({ db, client, runId: RUN, expectedStatus: 'estimated', requests: reqs(ids(2)) })).rejects.toThrow(/resolvePending[\s\S]*socket hang up/);
    expect(state.row.status).toBe('submitting');
    expect(state.row.batch_ids).toHaveLength(1);
    expect(unresolvedMarkers(state.row.batch_ids)).toHaveLength(1);
  });
  it('retries recording the real id with backoff, then succeeds', async () => {
    const { db, state } = fakeDb({ status: 'estimated' });
    const { client } = fakeClient();
    state.skip = 1;          // the marker update goes through
    state.failUpdates = 2;   // the next two (record) updates fail
    const sleeps: number[] = [];
    const r = await submitGuarded({ db, client, runId: RUN, expectedStatus: 'estimated', requests: reqs(ids(2)), sleep: async (ms) => { sleeps.push(ms); } });
    expect(r.batchId).toBe('msgbatch_new');
    expect(sleeps).toEqual([1000, 2000]);
    expect(state.row.status).toBe('submitted');
    expect(state.row.batch_ids.at(-1)).toBe('msgbatch_new');
  });
  it('gives up after ~2 minutes of backoff and names the batch id for adoption', async () => {
    const { db, state } = fakeDb({ status: 'estimated' });
    const { client } = fakeClient();
    const sleeps: number[] = [];
    state.skip = 1;
    state.failUpdates = Number.POSITIVE_INFINITY;
    await expect(submitGuarded({ db, client, runId: RUN, expectedStatus: 'estimated', requests: reqs(ids(2)), sleep: async (ms) => { sleeps.push(ms); } }))
      .rejects.toThrow(/BATCH CREATED BUT NOT RECORDED: msgbatch_new[\s\S]*adoptBatchId/);
    expect(sleeps.reduce((a, b) => a + b, 0)).toBe(120_000);
    expect(sleeps.slice(0, 4)).toEqual([1000, 2000, 4000, 8000]);
    expect(state.row.status).toBe('submitting');
  });
  it('rejects custom_ids from another run before touching the database', async () => {
    const { db, state } = fakeDb({ status: 'estimated' });
    const { client, calls } = fakeClient();
    await expect(submitGuarded({ db, client, runId: RUN, expectedStatus: 'estimated', requests: reqs(ids(2, 'other')) })).rejects.toThrow(/does not start with/);
    expect(state.updates).toBe(0);
    expect(calls.create).toHaveLength(0);
  });
});

describe('resolvePending', () => {
  const at = new Date('2026-11-18T10:00:00.000Z');
  const idList = ids(3);
  const marker = makePendingMarker(idList, at);
  const batch = (id: string, createdAt: string, counts = 3, custom = idList): FakeBatch => ({ id, created_at: createdAt, counts, customIds: custom });
  const setup = (batches: FakeBatch[]) => {
    const { db, state } = fakeDb({ status: 'submitting', batch_ids: [marker] });
    const { client } = fakeClient({ batches });
    return { db, state, client };
  };

  it('does nothing when no marker is unresolved', async () => {
    const { db } = fakeDb({ status: 'submitted', batch_ids: [marker, 'msgbatch_1'] });
    expect(await resolvePending({ db, client: fakeClient().client, run: { id: RUN } })).toEqual([]);
  });
  it('0 candidates -> "not_found": NOTHING is written, marker stays unresolved (never auto-void)', async () => {
    const { db, state, client } = setup([batch('b_old', '2026-11-18T08:00:00.000Z'), batch('b_wrongcount', '2026-11-18T10:00:30.000Z', 5)]);
    const r = await resolvePending({ db, client, run: { id: RUN }, now: () => new Date('2026-11-18T12:00:00.000Z') });
    expect(r.map((x) => x.result)).toEqual(['not_found']);
    expect(state.row.batch_ids).toEqual([marker]);
    expect(state.row.status).toBe('submitting');
    expect(state.updates).toBe(0);
    // still unresolved on the next call, and submitting is refused while it is
    expect((await resolvePending({ db, client, run: { id: RUN } })).map((x) => x.result)).toEqual(['not_found']);
    await expect(submitGuarded({ db, client, runId: RUN, expectedStatus: 'submitting', requests: reqs(ids(3)) })).rejects.toThrow(/unresolved pending submission marker/);
  });
  it('lag: the batch is absent from the first list and present on the second -> not_found, then adopted; never voided', async () => {
    const real = batch('b_lagged', '2026-11-18T10:00:05.000Z');
    const { db, state } = fakeDb({ status: 'submitting', batch_ids: [marker] });
    const { client, calls } = fakeClient({ listPlan: [[], [real]], batches: [real] });
    const first = await resolvePending({ db, client, run: { id: RUN } });
    expect(first.map((x) => x.result)).toEqual(['not_found']);
    expect(state.row.batch_ids).toEqual([marker]);
    const second = await resolvePending({ db, client, run: { id: RUN } });
    expect(second).toMatchObject([{ result: 'adopted', batchId: 'b_lagged' }]);
    expect(state.row.batch_ids).toEqual([marker, 'b_lagged']);
    expect(state.row.batch_ids.some((e) => e.startsWith('void:'))).toBe(false);
    expect(calls.list).toBe(2);
  });
  it('lookback is 10 minutes before the marker and every page inside the window is read', async () => {
    expect(PENDING_LOOKBACK_MS).toBe(10 * 60_000);
    const filler = Array.from({ length: 250 }, (_, k) => batch(`b_fill${k}`, new Date(Date.parse('2026-11-18T10:30:00.000Z') - k * 1000).toISOString(), 99));
    const inWindow = batch('b_skewed', '2026-11-18T09:51:00.000Z');   // 9 min before the marker: inside
    const outside = batch('b_toofar', '2026-11-18T09:49:00.000Z', 3, ids(3));  // 11 min before: outside
    const { db, client } = (() => { const d = fakeDb({ status: 'submitting', batch_ids: [marker] }); return { db: d.db, client: fakeClient({ batches: [...filler, inWindow, outside] }).client }; })();
    const r = await resolvePending({ db, client, run: { id: RUN } });
    expect(r).toMatchObject([{ result: 'adopted', batchId: 'b_skewed' }]);
  });
  it('exactly 1 candidate (created 30 s before the marker is still in the window) -> verified, adopted, status submitted', async () => {
    const { db, state, client } = setup([batch('b_match', '2026-11-18T09:59:30.000Z')]);
    const r = await resolvePending({ db, client, run: { id: RUN } });
    expect(r).toMatchObject([{ result: 'adopted', batchId: 'b_match' }]);
    expect(state.row.batch_ids).toEqual([marker, 'b_match']);
    expect(state.row.status).toBe('submitted');
  });
  it('1 candidate whose custom_ids belong to another run -> throws, records nothing', async () => {
    const { db, state, client } = setup([batch('b_foreign', '2026-11-18T10:00:10.000Z', 3, ids(3, 'zzz'))]);
    await expect(resolvePending({ db, client, run: { id: RUN } })).rejects.toThrow(/refusing to adopt/);
    expect(state.row.batch_ids).toEqual([marker]);
  });
  it('1 candidate with the right prefix but a different id set (hash mismatch) -> throws', async () => {
    const other = ['run1_a_first_1', 'run1_b_first_1', 'run1_c_first_1'];
    const { db, state, client } = setup([batch('b_other', '2026-11-18T10:00:10.000Z', 3, other)]);
    await expect(resolvePending({ db, client, run: { id: RUN } })).rejects.toThrow(/hash .* != marker/);
    expect(state.row.batch_ids).toEqual([marker]);
  });
  it('>1 candidates -> throws listing ids and created_at; adoptBatchId then verifies and adopts the right one', async () => {
    const good = batch('b_good', '2026-11-18T10:00:05.000Z');
    const decoy = batch('b_decoy', '2026-11-18T10:00:20.000Z', 3, ['run1_x_first_1', 'run1_y_first_1', 'run1_z_first_1']);
    const { db, state, client } = setup([good, decoy]);
    await expect(resolvePending({ db, client, run: { id: RUN } })).rejects.toThrow(/b_good \(created 2026-11-18T10:00:05\.000Z\)/);
    await expect(resolvePending({ db, client, run: { id: RUN } })).rejects.toThrow(/b_decoy \(created 2026-11-18T10:00:20\.000Z\)[\s\S]*adoptBatchId/);
    expect(state.row.batch_ids).toEqual([marker]);
    await expect(resolvePending({ db, client, run: { id: RUN }, adoptBatchId: 'b_decoy' })).rejects.toThrow(/matches no unresolved marker/);
    const r = await resolvePending({ db, client, run: { id: RUN }, adoptBatchId: 'b_good' });
    expect(r).toMatchObject([{ result: 'adopted', batchId: 'b_good' }]);
    expect(state.row.batch_ids).toEqual([marker, 'b_good']);
    // idempotent: nothing is pending any more
    expect(await resolvePending({ db, client, run: { id: RUN }, adoptBatchId: 'b_good' })).toEqual([]);
  });
  it('adoptBatchId refuses a batch with foreign custom_ids even if the count matches', async () => {
    const { db, client } = setup([batch('b_foreign', '2026-11-18T10:00:10.000Z', 3, ids(3, 'zzz'))]);
    await expect(resolvePending({ db, client, run: { id: RUN }, adoptBatchId: 'b_foreign' })).rejects.toThrow(/matches no unresolved marker|refusing to adopt/);
  });
});

describe('voidPending', () => {
  const at = new Date('2026-11-18T10:00:00.000Z');
  const idList = ids(3);
  const marker = makePendingMarker(idList, at);
  const mk = (batches: FakeBatch[] = []) => {
    const { db, state } = fakeDb({ status: 'submitting', batch_ids: [marker] });
    const { client } = fakeClient({ batches });
    return { db, state, client };
  };
  const at31 = () => new Date(at.getTime() + PENDING_VOID_MIN_AGE_MS + 60_000);

  it('refuses before 30 minutes, even when nothing is listed', async () => {
    expect(PENDING_VOID_MIN_AGE_MS).toBe(30 * 60_000);
    const { db, state, client } = mk();
    await expect(voidPending({ db, client, runId: RUN, marker, now: () => new Date(at.getTime() + 29 * 60_000) })).rejects.toThrow(/refusing to void: marker is 29 min old/);
    expect(state.row.batch_ids).toEqual([marker]);
    expect(state.row.status).toBe('submitting');
    expect(state.updates).toBe(0);
  });
  it('refuses when a candidate batch now exists, listing it', async () => {
    const { db, state, client } = mk([{ id: 'b_appeared', created_at: '2026-11-18T10:00:20.000Z', counts: 3, customIds: idList }]);
    await expect(voidPending({ db, client, runId: RUN, marker, now: at31 })).rejects.toThrow(/refusing to void: 1 batch\(es\) now match.*b_appeared/);
    expect(state.row.batch_ids).toEqual([marker]);
    expect(state.row.status).toBe('submitting');
  });
  it('after 30+ min with nothing listed: writes void:<iso>, resets submitting -> estimated, and submission is allowed again', async () => {
    const { db, state, client } = mk([{ id: 'b_other', created_at: '2026-11-18T10:00:20.000Z', counts: 7, customIds: [] }]);
    const out = await voidPending({ db, client, runId: RUN, marker, now: at31 });
    expect(out.status).toBe('estimated');
    expect(state.row.status).toBe('estimated');
    expect(state.row.batch_ids).toEqual([marker, out.voided]);
    expect(out.voided).toMatch(/^void:2026-11-18T10:31:00\.000Z$/);
    expect(unresolvedMarkers(state.row.batch_ids)).toHaveLength(0);
    const r = await submitGuarded({ db, client: fakeClient().client, runId: RUN, expectedStatus: 'estimated', requests: reqs(idList) });
    expect(r.batchId).toBe('msgbatch_new');
  });
  it('refuses unknown or already-resolved markers', async () => {
    const { db, client } = mk();
    await expect(voidPending({ db, client, runId: RUN, marker: 'pending:2026-11-18T10:00:00.000Z:3:aaaaaaaaaaaa', now: at31 })).rejects.toThrow(/not an unresolved pending marker/);
    const done = fakeDb({ status: 'submitted', batch_ids: [marker, 'msgbatch_1'] });
    await expect(voidPending({ db: done.db, client, runId: RUN, marker, now: at31 })).rejects.toThrow(/not an unresolved pending marker/);
  });
  it('keeps status "submitting" while another marker is still unresolved', async () => {
    const m2 = makePendingMarker(ids(2), new Date(at.getTime() + 5 * 60_000));
    const { db, state } = fakeDb({ status: 'submitting', batch_ids: [marker, m2] });
    const out = await voidPending({ db, client: fakeClient().client, runId: RUN, marker, now: () => new Date(at.getTime() + 50 * 60_000) });
    expect(out.status).toBe('submitting');
    expect(state.row.batch_ids).toEqual([marker, out.voided, m2]);
    expect(unresolvedMarkers(state.row.batch_ids).map((m) => m.raw)).toEqual([m2]);
  });
});
