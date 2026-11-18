import { describe, expect, it, vi } from 'vitest';
import { assertBtTable, btInsert, btUpdateRun, type Db } from '../lib/supabase';

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
