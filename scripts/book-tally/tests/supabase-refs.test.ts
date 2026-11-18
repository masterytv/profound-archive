import { describe, expect, it } from 'vitest';
import {
  assertProfileIdsExist, assertQuestionIdsExist, assertVideoIdsExist, btInsert, collectRefs,
  findMissingIds, validateRowRefs, type Db,
} from '../lib/supabase';

/** Mock client: tables hold id sets; records selects and inserts. */
function mockDb(existing: Record<string, { column: string; ids: Array<string | number> }>) {
  const selects: Array<{ table: string; column: string; ids: unknown[] }> = [];
  const inserts: Array<{ table: string; rows: unknown[] }> = [];
  const db = {
    from: (table: string) => ({
      select: (column: string) => ({
        in: (col: string, ids: Array<string | number>) => {
          selects.push({ table, column: col, ids });
          const have = new Set(existing[table]?.ids ?? []);
          return Promise.resolve({ data: ids.filter((i) => have.has(i)).map((i) => ({ [col]: i })), error: null });
        },
      }),
      insert: (rows: unknown[]) => {
        inserts.push({ table, rows });
        return Promise.resolve({ data: null, error: null });
      },
    }),
  } as unknown as Db;
  return { db, selects, inserts };
}

const world = {
  nde_vids: { column: 'videoId', ids: ['vid_1', 'vid_2', 'vid_3'] },
  nde_questions: { column: 'id', ids: [1, 2, 3] },
  experiencer_profiles: { column: 'id', ids: [10, 11] },
};

describe('findMissingIds', () => {
  it('returns only the ids that are absent, deduplicated, in input order', async () => {
    const { db } = mockDb(world);
    expect(await findMissingIds(db, 'nde_vids', 'videoId', ['vid_1', 'nope', 'vid_2', 'nope', 'zzz'])).toEqual(['nope', 'zzz']);
  });
  it('batches into chunks of the given size', async () => {
    const { db, selects } = mockDb(world);
    await findMissingIds(db, 'nde_vids', 'videoId', Array.from({ length: 450 }, (_, i) => `x${i}`), 200);
    expect(selects.map((s) => s.ids.length)).toEqual([200, 200, 50]);
    expect(selects.every((s) => s.table === 'nde_vids' && s.column === 'videoId')).toBe(true);
  });
  it('makes no query for an empty list; surfaces db errors', async () => {
    const { db, selects } = mockDb(world);
    expect(await findMissingIds(db, 'nde_vids', 'videoId', [])).toEqual([]);
    expect(selects).toHaveLength(0);
    const bad = { from: () => ({ select: () => ({ in: () => Promise.resolve({ data: null, error: { message: 'down' } }) }) }) } as unknown as Db;
    await expect(findMissingIds(bad, 'nde_vids', 'videoId', ['a'])).rejects.toThrow(/down/);
  });
});

describe('assert*Exist', () => {
  it('video ids use nde_vids."videoId"', async () => {
    const { db, selects } = mockDb(world);
    await expect(assertVideoIdsExist(db, ['vid_1', 'vid_3'])).resolves.toBeUndefined();
    await expect(assertVideoIdsExist(db, ['vid_1', 'ghost'])).rejects.toThrow(/1 video_id\(s\) not found in nde_vids.videoId: ghost/);
    expect(selects[0]).toMatchObject({ table: 'nde_vids', column: 'videoId' });
  });
  it('question ids use nde_questions.id', async () => {
    const { db, selects } = mockDb(world);
    await expect(assertQuestionIdsExist(db, [1, 2])).resolves.toBeUndefined();
    await expect(assertQuestionIdsExist(db, [1, 99])).rejects.toThrow(/question_id.*nde_questions.id: 99/);
    expect(selects[0]).toMatchObject({ table: 'nde_questions', column: 'id' });
  });
  it('profile ids use experiencer_profiles.id', async () => {
    const { db } = mockDb(world);
    await expect(assertProfileIdsExist(db, [10])).resolves.toBeUndefined();
    await expect(assertProfileIdsExist(db, [10, 12])).rejects.toThrow(/experiencer_profiles.id: 12/);
  });
  it('truncates long missing lists in the message', async () => {
    const { db } = mockDb(world);
    await expect(assertVideoIdsExist(db, Array.from({ length: 25 }, (_, i) => `m${i}`))).rejects.toThrow(/25 video_id\(s\).*, \.\.\.$/);
  });
});

describe('collectRefs / validateRowRefs', () => {
  it('collects columns plus profile ids embedded in person_key / key_a / key_b', () => {
    const r = collectRefs([
      { video_id: 'vid_1', question_id: 2 },
      { video_id: 'vid_2', person_key: 'profile:10', profile_id: 10 },
      { key_a: 'named:jane doe', key_b: 'profile:11' },
      { person_key: 'anon:vid_3' },
    ]);
    expect([...r.video_id]).toEqual(['vid_1', 'vid_2']);
    expect([...r.question_id]).toEqual([2]);
    expect([...r.profile_id].sort()).toEqual([10, 11]);
  });
  it('validateRowRefs rejects a row pointing at a missing profile via person_key', async () => {
    const { db } = mockDb(world);
    await expect(validateRowRefs(db, [{ video_id: 'vid_1', person_key: 'profile:999', profile_id: 999 }])).rejects.toThrow(/999/);
  });
});

describe('btInsert reference validation', () => {
  it('validates before writing and writes nothing when an id is missing', async () => {
    const { db, inserts } = mockDb(world);
    const rows = [
      { video_id: 'vid_1', question_id: 1 },
      { video_id: 'ghost', question_id: 1 },
    ];
    await expect(btInsert(db, 'bt_stance_answers', rows)).rejects.toThrow(/ghost/);
    expect(inserts).toHaveLength(0);
  });
  it('inserts when all ids exist, one batched SELECT per id kind', async () => {
    const { db, selects, inserts } = mockDb(world);
    await btInsert(db, 'bt_stance_answers', [
      { video_id: 'vid_1', question_id: 1 }, { video_id: 'vid_2', question_id: 1 }, { video_id: 'vid_2', question_id: 2 },
    ]);
    expect(inserts).toHaveLength(1);
    expect(selects.map((s) => s.table)).toEqual(['nde_vids', 'nde_questions']);
    expect(selects[0].ids).toEqual(['vid_1', 'vid_2']);
  });
  it('validateRefs:false skips the checks; non-bt tables are still refused first', async () => {
    const { db, selects, inserts } = mockDb(world);
    await btInsert(db, 'bt_gold_marks', [{ video_id: 'ghost', question_id: 1 }], { validateRefs: false });
    expect(selects).toHaveLength(0);
    expect(inserts).toHaveLength(1);
    await expect(btInsert(db, 'nde_vids', [{ video_id: 'x' }])).rejects.toThrow(/Refusing to write/);
    expect(selects).toHaveLength(0);
  });
});
