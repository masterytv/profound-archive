import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { parseCsv } from '../job2/csv';
import { loadCodebook, loadCodebookPrompt } from '../job3/codebook';
import { main as rollup } from '../job3/rollup';
import { combineStances, latestRows, personState, tallyAll, tallyItem, type TallyInputRow } from '../job3/tally';
import { FakeDb } from './job2-fakes';

const cb = loadCodebook();
const item = (k: string) => [...cb.facts, ...cb.items].find((i) => i.key === k)!;
let nextId = 1;
const ch = (code: string, ok = true) => ({ code, quote: 'q', other_text: null, quote_verified: ok, quote_norm_offset: ok ? 1 : null, quote_check: ok ? 'ok' : 'not_found' });
const yn = (video: string, key: string, stance: 'yes' | 'no' | 'mixed' | null, opts: { ok?: boolean; attempt?: number; valid?: boolean } = {}): TallyInputRow => ({
  id: nextId++, video_id: video, item_key: key, kind: 'yn', attempt: opts.attempt ?? 1,
  addressed: opts.valid === false ? null : stance !== null, stance: opts.valid === false ? null : stance,
  quote_verified: stance !== null && opts.ok !== false, choices: null, valid: opts.valid !== false,
});
const mc = (video: string, key: string, choices: ReturnType<typeof ch>[] | null): TallyInputRow => ({
  id: nextId++, video_id: video, item_key: key, kind: 'mc', attempt: 1, addressed: choices !== null, stance: null,
  quote_verified: (choices ?? []).every((c) => c.quote_verified), choices, valid: true,
});

describe('person-level combination', () => {
  it('stances: agreement keeps the stance; any disagreement or mixed gives mixed', () => {
    expect(combineStances(['yes', 'yes'])).toBe('yes');
    expect(combineStances(['yes', 'no'])).toBe('mixed');
    expect(combineStances(['no', 'mixed'])).toBe('mixed');
  });

  it('a counted answer in any video makes the person addressed; not-addressed videos are ignored then', () => {
    expect(personState(item('q38'), [yn('a', 'q38', null), yn('b', 'q38', 'yes')])).toEqual({ state: 'addressed', stance: 'yes' });
    expect(personState(item('q38'), [yn('a', 'q38', 'no'), yn('b', 'q38', 'yes')])).toEqual({ state: 'addressed', stance: 'mixed' });
  });

  it('an unverified quote or an invalid answer never counts; it excludes the person unless another video counts', () => {
    expect(personState(item('q38'), [yn('a', 'q38', 'yes', { ok: false })])).toEqual({ state: 'excluded_unverified' });
    expect(personState(item('q38'), [yn('a', 'q38', null, { valid: false }), yn('b', 'q38', null)])).toEqual({ state: 'excluded_invalid' });
    expect(personState(item('q38'), [yn('a', 'q38', 'yes', { ok: false }), yn('b', 'q38', 'no')])).toEqual({ state: 'addressed', stance: 'no' });
    expect(personState(item('q38'), [undefined])).toEqual({ state: 'not_coded' });
  });

  it('multiple choice: the union of VERIFIED answers across a person\'s videos', () => {
    const s = personState(item('q78'), [mc('a', 'q78', [ch('love'), ch('learn_grow', false)]), mc('b', 'q78', [ch('serve_help_others')]), mc('c', 'q78', null)]);
    expect(s).toEqual({ state: 'addressed', choices: ['love', 'serve_help_others'] });
    expect(personState(item('q78'), [mc('a', 'q78', [ch('love', false)])])).toEqual({ state: 'excluded_unverified' });
  });

  it('the latest attempt of a cell wins', () => {
    const first = yn('a', 'q38', 'yes', { attempt: 1 });
    const retry = yn('a', 'q38', 'no', { attempt: 2 });
    expect(latestRows([retry, first]).get('a\u0000q38')).toBe(retry);
  });
});

describe('tallies', () => {
  it('yes/no shares are out of the people who addressed it; addressed is out of addressed + not addressed', () => {
    const t = tallyItem(item('q38'), 'all', [
      { state: 'addressed', stance: 'yes' }, { state: 'addressed', stance: 'yes' }, { state: 'addressed', stance: 'no' },
      { state: 'not_addressed' }, { state: 'excluded_unverified' }, { state: 'not_coded' },
    ]);
    expect(t).toMatchObject({ n_people: 6, n_addressed: 3, n_not_addressed: 1, n_excluded_unverified: 1, n_not_coded: 1 });
    expect(t.addressed).toMatchObject({ k: 3, n: 4, p: 0.75 });
    expect(t.answers.map((a) => [a.answer, a.share.k, a.share.n])).toEqual([['yes', 2, 3], ['no', 1, 3], ['mixed', 0, 3]]);
    expect(t.answers[0].label).toBe('yes: calm or peace');
  });

  it('multiple-choice shares can add up to more than 100%, and "other" is always listed', () => {
    const t = tallyItem(item('q78'), 'all', [{ state: 'addressed', choices: ['love', 'learn_grow'] }, { state: 'addressed', choices: ['love'] }]);
    const share = Object.fromEntries(t.answers.map((a) => [a.answer, a.share.p]));
    expect(share.love).toBe(1);
    expect(share.learn_grow).toBe(0.5);
    expect(t.answers.reduce((s, a) => s + (a.share.p ?? 0), 0)).toBeGreaterThan(1);
    expect(t.answers.at(-1)!.answer).toBe('other');
  });

  it('people, not videos; a conditional question is also reported in its subgroup', () => {
    const personOf = new Map([['v1', 'p1'], ['v2', 'p1'], ['v3', 'p2'], ['v4', 'p3']]);
    const rows = [
      // p1: two videos, suffered (f2 yes in one), found peace (q29 yes)
      yn('v1', 'f2', 'yes'), yn('v1', 'q29', null), yn('v2', 'f2', null), yn('v2', 'q29', 'yes'),
      // p2: suffered, did not address q29
      yn('v3', 'f2', 'yes'), yn('v3', 'q29', null),
      // p3: no suffering mentioned, q29 yes
      yn('v4', 'f2', null), yn('v4', 'q29', 'yes'),
    ];
    const res = tallyAll(cb, rows, personOf);
    expect(res.n_people).toBe(3);
    const q29 = res.tallies.filter((t) => t.item_key === 'q29');
    expect(q29.map((t) => t.group)).toEqual(['all', 'f2 = yes']);
    expect(q29[0]).toMatchObject({ n_people: 3, n_addressed: 2, n_not_addressed: 1 });
    expect(q29[1]).toMatchObject({ n_people: 2, n_addressed: 1, n_not_addressed: 1 });
    // per video: v1 and v2 counted separately
    const pv = tallyAll(cb, rows, personOf, 'video').tallies.find((t) => t.item_key === 'q29' && t.group === 'all')!;
    expect(pv).toMatchObject({ n_people: 4, n_addressed: 2, n_not_addressed: 2 });
  });
});

describe('job3/rollup (fake DB)', () => {
  const ph = loadCodebookPrompt().promptHash;
  const world = (over: Record<string, unknown[]> = {}) => new FakeDb({
    nde_analysis: ['v1', 'v2', 'v3'].map((v) => ({ video_id: v, experience_type: 'nde' })),
    bt_unmapped_nde_videos: [],
    bt_effective_person_map: [{ video_id: 'v1', person_key: 'profile:1' }, { video_id: 'v2', person_key: 'profile:1' }, { video_id: 'v3', person_key: 'anon:v3' }],
    bt_runs: [{ id: 'j3c-1', job: 'other', pass: 'haiku', status: 'completed', params: { kind: 'codebook', prompt_hash: ph, no_transcript_ids: [] } }],
    bt_coded_answers: [
      { ...yn('v1', 'q38', 'yes'), run_id: 'j3c-1' }, { ...yn('v2', 'q38', 'no'), run_id: 'j3c-1' }, { ...yn('v3', 'q38', null), run_id: 'j3c-1' },
      { ...mc('v1', 'q78', [ch('love')]), run_id: 'j3c-1' }, { ...mc('v3', 'q78', [ch('learn_grow'), ch('love')]), run_id: 'j3c-1' },
    ] as unknown as Record<string, unknown>[],
    ...over,
  } as never);
  const run = (db: FakeDb, argv: string[] = []) => {
    const outDir = mkdtempSync(path.join(tmpdir(), 'j3r-'));
    const logs: string[] = [];
    return { outDir, logs, p: rollup(argv, { db: db.asDb(), log: (l) => logs.push(l), outDir, findMergeConflicts: async () => [] }) };
  };

  it('writes the person tally, the per-video sensitivity tally and the report', async () => {
    const r = run(world());
    await r.p;
    const rows = parseCsv(readFileSync(path.join(r.outDir, 'coded_tally_by_item.csv'), 'utf8'));
    const q38 = rows.filter((x) => x.item_key === 'q38' && x.group === 'all');
    expect(q38.map((x) => [x.answer, x.n_answer])).toEqual([['yes', '0'], ['no', '0'], ['mixed', '1']]); // profile:1 said yes and no
    expect(q38[0]).toMatchObject({ n_people: '2', n_addressed: '1', n_not_addressed: '1', pct_addressed: '50.0' });
    const love = rows.find((x) => x.item_key === 'q78' && x.answer === 'love')!;
    expect(love).toMatchObject({ n_answer: '2', pct_of_addressed: '100.0', note: expect.stringMatching(/more than 100%/) });
    const md = readFileSync(path.join(r.outDir, 'coded_tally_report.md'), 'utf8');
    expect(md).toMatch(/## Q38: Did peace come over them as they died\?/);
    expect(md).toMatch(/Question as asked on the site: Will I panic/);
    expect(md).toMatch(/Q24 is merged into Q22/);
    expect(md).not.toMatch(/PARTIAL/);
    const pv = parseCsv(readFileSync(path.join(r.outDir, 'coded_tally_per_video.csv'), 'utf8')).find((x) => x.item_key === 'q38' && x.answer === 'yes')!;
    expect(pv).toMatchObject({ n_people: '3', n_answer: '1' });
  });

  it('leaves out videos of channels in excluded-channels.json and says so', async () => {
    const r = run(world({ nde_vids: [{ videoId: 'v3', channelId: 'UC6G-0YOhL4dNkex8Vw5pqWw' }, { videoId: 'v1', channelId: 'other' }] }));
    await r.p;
    const rows = parseCsv(readFileSync(path.join(r.outDir, 'coded_tally_by_item.csv'), 'utf8'));
    expect(rows.find((x) => x.item_key === 'q38' && x.answer === 'yes')).toMatchObject({ n_people: '1' }); // anon:v3 is gone
    expect(readFileSync(path.join(r.outDir, 'coded_tally_report.md'), 'utf8')).toMatch(/Excluded: 1 NDE videos of channel\(s\) no longer available \(Life After Life NDE/);
    expect(r.logs.join('\n')).toMatch(/1 excluded by excluded-channels.json/);
  });

  it('refuses while a video is uncoded (unless --allow-partial, which marks every file PARTIAL)', async () => {
    const db = () => world({ nde_analysis: ['v1', 'v2', 'v3', 'v4'].map((v) => ({ video_id: v, experience_type: 'nde' })) });
    await expect(run(db()).p).rejects.toThrow(/1 NDE videos are not coded yet/);
    const r = run(db(), ['--allow-partial']);
    await r.p;
    expect(readFileSync(path.join(r.outDir, 'coded_tally_report_PARTIAL.md'), 'utf8')).toMatch(/\*\*PARTIAL:\*\* 1 NDE videos/);
  });

  it('refuses with unmapped videos, an unfinished run, or no run for the current prompt', async () => {
    await expect(run(world({ bt_unmapped_nde_videos: [{ video_id: 'v1' }] })).p).rejects.toThrow(/no accepted person link/);
    await expect(run(world({ bt_runs: [{ id: 'j3c-1', job: 'other', status: 'collecting', params: { kind: 'codebook', prompt_hash: ph } }] })).p).rejects.toThrow(/not finished/);
    await expect(run(world({ bt_runs: [{ id: 'j3c-1', job: 'other', status: 'completed', params: { kind: 'codebook', prompt_hash: 'old' } }] })).p).rejects.toThrow(/no completed codebook run/);
  });
});
