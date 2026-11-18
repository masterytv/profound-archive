import { describe, expect, it, vi } from 'vitest';
import { assertBtTable, btInsert, btUpdateRun, createGuardedClient, type Db } from '../lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

function fakeDb() {
  const calls: Array<{ table: string; op: string; payload: unknown }> = [];
  const db = {
    from: (table: string) => ({
      insert: (payload: unknown) => { calls.push({ table, op: 'insert', payload }); return Promise.resolve({ data: null, error: null }); },
      update: (payload: unknown) => {
        calls.push({ table, op: 'update', payload });
        return { eq: () => Promise.resolve({ error: null }) };
      },
    }),
  } as unknown as Db;
  return { db, calls };
}

describe('write guard', () => {
  it('refuses any table not starting with bt_', async () => {
    const { db, calls } = fakeDb();
    for (const t of ['nde_vids', 'nde_questions', 'experiencer_profiles', 'public.bt_runs', 'bt_', 'BT_runs', 'bt_runs; drop table x']) {
      await expect(btInsert(db, t, { a: 1 })).rejects.toThrow(/Refusing to write/);
    }
    expect(calls).toHaveLength(0);
    expect(() => assertBtTable('xbt_runs')).toThrow();
  });
  it('allows bt_ tables and chunks large inserts', async () => {
    const { db, calls } = fakeDb();
    await btInsert(db, 'bt_stance_answers', Array.from({ length: 1200 }, (_, i) => ({ i })), { chunkSize: 500 });
    expect(calls.map((c) => (c.payload as unknown[]).length)).toEqual([500, 500, 200]);
    expect(calls.every((c) => c.table === 'bt_stance_answers')).toBe(true);
  });
  it('bt_runs updates are limited to bookkeeping columns', async () => {
    const { db, calls } = fakeDb();
    await btUpdateRun(db, 'r1', { status: 'completed', finished_at: 'now' });
    expect(calls[0]).toMatchObject({ table: 'bt_runs', op: 'update' });
    await expect(btUpdateRun(db, 'r1', { model: 'x' } as never)).rejects.toThrow(/only status/);
    expect(calls).toHaveLength(1);
  });
  it('surfaces database errors', async () => {
    const db = { from: () => ({ insert: () => Promise.resolve({ data: null, error: { message: 'boom' } }) }) } as unknown as Db;
    await expect(btInsert(db, 'bt_runs', { id: 'x' })).rejects.toThrow(/boom/);
    vi.restoreAllMocks();
  });
});

describe('createGuardedClient', () => {
  function realMock() {
    const log: string[] = [];
    const builder = (t: string) => ({
      select: (c: string) => { log.push(`select ${t} ${c}`); return { in: () => Promise.resolve({ data: [], error: null }) }; },
      insert: () => { log.push(`insert ${t}`); return Promise.resolve({ error: null }); },
      update: () => { log.push(`update ${t}`); return Promise.resolve({ error: null }); },
      upsert: () => { log.push(`upsert ${t}`); return Promise.resolve({ error: null }); },
      delete: () => { log.push(`delete ${t}`); return Promise.resolve({ error: null }); },
    });
    const real = {
      from: builder,
      rpc: (n: string) => { log.push(`rpc ${n}`); return Promise.resolve({ data: null, error: null }); },
      schema: () => { throw new Error('should be unreachable'); },
      storage: {},
    } as unknown as SupabaseClient;
    return { real, log };
  }

  it('non-bt tables: select works; insert/update/upsert/delete throw and never reach the real client', () => {
    const { real, log } = realMock();
    const db = createGuardedClient(real);
    expect(() => db.from('nde_vids').select('videoId')).not.toThrow();
    for (const op of ['insert', 'update', 'upsert', 'delete'] as const) {
      expect(() => (db.from('nde_vids') as never as Record<string, () => unknown>)[op]()).toThrow(/Refusing .* on "nde_vids"/);
    }
    expect(log).toEqual(['select nde_vids videoId']);
  });
  it('bt_ tables stay fully writable through the wrapper', () => {
    const { real, log } = realMock();
    const db = createGuardedClient(real);
    db.from('bt_runs').insert({} as never);
    db.from('bt_runs').update({} as never);
    expect(log).toEqual(['insert bt_runs', 'update bt_runs']);
  });
  it('rpc throws unless allowlisted (empty by default)', () => {
    const { real, log } = realMock();
    expect(() => createGuardedClient(real).rpc('anything')).toThrow(/not in the read-only allowlist/);
    expect(log).toEqual([]);
    const db = createGuardedClient(real, { rpcAllowlist: new Set(['read_only_fn']) });
    expect(() => db.rpc('read_only_fn')).not.toThrow();
    expect(() => db.rpc('delete_everything')).toThrow();
    expect(log).toEqual(['rpc read_only_fn']);
  });
  it('other client members (schema, storage, auth, ...) are unavailable', () => {
    const db = createGuardedClient(realMock().real) as unknown as Record<string, unknown>;
    for (const m of ['schema', 'storage', 'auth', 'functions', 'channel']) expect(() => db[m]).toThrow(/not available/);
  });
  it('is not accidentally thenable and works with the reference-check helpers', async () => {
    const db = createGuardedClient(realMock().real);
    expect((db as unknown as { then?: unknown }).then).toBeUndefined();
    await expect(btInsert(db, 'bt_gold_marks', [{ note: 'x' }])).resolves.toEqual([]);
  });
});
