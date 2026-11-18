import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { parseCsv } from '../job2/csv';
import { seededShuffle } from '../job2/sampling';
import { loadCodebook, loadCodebookPrompt } from '../job3/codebook';
import { main as report, goldStats, renderReport, reportRows, confidenceBand, type ReportRow } from '../job3/gold-report';
import { chooseRows, chooseVideos, eligibleVideos, main as sheet, selectGold, type GoldCodedRow } from '../job3/gold-sheet';
import { main as importGold, parseMarksFile, parseYN, validateMarks, type CodedAnswerLite, type DbMark, type ParsedMark } from '../job3/import-gold';
import { FakeDb } from './job2-fakes';

const cb = loadCodebook();
const ph = loadCodebookPrompt().promptHash;

// ---- fixtures ---------------------------------------------------------------------------------

type Row = Record<string, unknown>;
let seq = 1;
const ch = (code: string, ok = true, quote = `quote for ${code} in the account`) => ({ code, quote, other_text: null, quote_verified: ok, quote_norm_offset: ok ? 1 : null, quote_check: ok ? 'ok' : 'not_found' });
const qid = (key: string) => (key.startsWith('q') ? Number(/\d+/.exec(key)![0]) : null);
const common = (video: string, key: string, run: string, attempt: number) => ({ id: seq++, run_id: run, video_id: video, item_key: key, question_id: qid(key), attempt });
const yn = (video: string, key: string, stance: 'yes' | 'no' | 'mixed' | null, o: { ok?: boolean; attempt?: number; run?: string; conf?: number; quote?: string } = {}): Row => ({
  ...common(video, key, o.run ?? 'j3c-1', o.attempt ?? 1), kind: 'yn', addressed: stance !== null, stance,
  quote: stance ? o.quote ?? `yes no quote for ${key} here` : null, quote_verified: stance !== null && o.ok !== false, choices: null, confidence: o.conf ?? 90, valid: true,
});
const mc = (video: string, key: string, choices: ReturnType<typeof ch>[] | null, o: { run?: string; conf?: number } = {}): Row => ({
  ...common(video, key, o.run ?? 'j3c-1', 1), kind: 'mc', addressed: choices !== null, stance: null, quote: null,
  quote_verified: (choices ?? []).every((c) => c.quote_verified), choices, confidence: o.conf ?? 80, valid: true,
});
const bad = (video: string, key: string, run = 'j3c-1'): Row => ({
  ...common(video, key, run, 1), kind: 'yn', addressed: null, stance: null, quote: null, quote_verified: false, choices: null, confidence: null, valid: false,
});

const NA_KEYS = ['q29', 'q1', 'q3', 'q4', 'q5'];
const SEED = 20261118;

function codedRows(): Row[] {
  return [
    // v1: an attempt-1 "no" superseded by an attempt-2 "yes"; mixed counted/unverified/invalid; five not-addressed items
    yn('v1', 'q38', 'no', { attempt: 1 }), yn('v1', 'q38', 'yes', { attempt: 2, conf: 95 }),
    yn('v1', 'f2', 'no', { conf: 60 }),
    mc('v1', 'q78', [ch('love'), ch('learn_grow', false), ch('other')]),
    yn('v1', 'q7', 'yes', { ok: false }), bad('v1', 'q9'),
    ...NA_KEYS.map((k) => yn('v1', k, null)),
    // v2: the whole response was rejected
    ...['q38', 'f2', 'q78', 'q29'].map((k) => bad('v2', k)),
    // v3, v4: v4 has nothing counted
    yn('v3', 'q38', 'mixed'), mc('v3', 'f0', [ch('illness')]), yn('v3', 'q29', null),
    yn('v4', 'q38', null), yn('v4', 'q29', null),
    // not eligible: coded with an old prompt, or in an unfinished run
    yn('v5', 'q38', 'yes', { run: 'j3c-old' }), yn('v6', 'q38', 'yes', { run: 'j3c-2' }),
  ];
}

const SEGMENTS = [{ start: 12, duration: 3, text: 'We hello there friends.' }, { start: 42, duration: 4, text: 'we talked about many things today' }, { start: 50, duration: 4, text: 'and more' }];

function world(over: Record<string, Row[]> = {}) {
  return new FakeDb({
    bt_runs: [
      { id: 'j3c-1', job: 'other', status: 'completed', params: { kind: 'codebook', prompt_hash: ph } },
      { id: 'j3c-old', job: 'other', status: 'completed', params: { kind: 'codebook', prompt_hash: 'old' } },
      { id: 'j3c-2', job: 'other', status: 'collecting', params: { kind: 'codebook', prompt_hash: ph } },
      { id: 'pair-1', job: 'pair_judge', status: 'completed', params: {} },
    ],
    bt_coded_answers: codedRows(),
    bt_coded_gold_marks: [],
    nde_vids: ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'].map((v) => ({
      videoId: v, title: v === 'v1' ? '=SUM(A1) a title' : `Title ${v}`, subtitles_punctuated: 'text '.repeat(20), subtitles_cleaned: null, subtitles: null,
      raw_timestamped_subtitles: v === 'v1' ? SEGMENTS : null,
    })),
    ...over,
  });
}

/** FakeDb only numbers a few tables; number bt_coded_gold_marks inserts like the real bigserial. */
class GoldFakeDb extends FakeDb {
  from(table: string) {
    const q = super.from(table);
    if (table === 'bt_coded_gold_marks') {
      const orig = q.insert.bind(q);
      (q as { insert: unknown }).insert = (rows: Row | Row[]) => orig((Array.isArray(rows) ? rows : [rows]).map((r) => ({ id: this.nextId(table), ...r })));
    }
    return q;
  }
}
const goldWorld = () => {
  const w = world();
  const g = new GoldFakeDb();
  g.tables = w.tables;
  return g;
};

const tmp = () => mkdtempSync(path.join(tmpdir(), 'j3g-'));
const rowsOf = (db: FakeDb, video: string, key: string, attempt = 1) => db.tables.bt_coded_answers.find((r) => r.video_id === video && r.item_key === key && r.attempt === attempt)!;

// ---- sheet ------------------------------------------------------------------------------------

describe('job3/gold-sheet selection', () => {
  it('eligible videos: a valid latest row is needed; a fully rejected response is excluded; sorted', () => {
    const rows = codedRows().filter((r) => r.run_id === 'j3c-1');
    expect(eligibleVideos(rows as never)).toEqual(['v1', 'v3', 'v4']);
    // a retry that is valid rescues a video whose first attempt was rejected
    const retry = { ...yn('v2', 'q38', 'yes', { attempt: 2 }) };
    expect(eligibleVideos([...rows, retry] as never)).toEqual(['v1', 'v2', 'v3', 'v4']);
    expect(eligibleVideos([])).toEqual([]);
  });

  it('chooseVideos = seededShuffle(eligible, seed, "codebook-gold").slice(0, n); independent of input order', () => {
    const eligible = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7'];
    const p = { n: 3, seed: SEED, naPerVideo: 3 };
    const expected = seededShuffle(eligible, SEED, 'codebook-gold').slice(0, 3).sort();
    expect(chooseVideos(eligible, p)).toEqual(expected);
    expect(chooseVideos([...eligible].reverse(), p)).toEqual(expected);
    expect([1, 2, 3, 4, 5].some((d) => chooseVideos(eligible, { ...p, seed: SEED + d }).join() !== expected.join())).toBe(true); // the seed matters
    expect(chooseVideos(eligible, { ...p, n: 50 })).toEqual(eligible);
  });

  it('keeps every counted item (latest attempt), caps and seeds the not-addressed sample, skips unverified and invalid', async () => {
    const db = world();
    const sel = await selectGold(db.asDb(), { codebook: cb, promptHash: ph }, { n: 10, seed: SEED, naPerVideo: 3 });
    expect(sel.videoIds).toEqual(['v1', 'v3', 'v4']);
    expect(sel.runIds).toEqual(['j3c-1']);
    expect(sel.eligible).toBe(3);
    const v1 = sel.rows.filter((r) => r.row.video_id === 'v1');
    const counted = v1.filter((r) => r.outcome === 'counted').map((r) => r.item.key);
    expect(counted).toEqual(['f2', 'q38', 'q78']); // codebook order: facts first
    expect(v1.find((r) => r.item.key === 'q38')!.row.stance).toBe('yes'); // attempt 2 wins
    const na = v1.filter((r) => r.outcome === 'not_addressed').map((r) => r.item.key);
    expect(na).toHaveLength(3);
    const expectedNa = seededShuffle(NA_KEYS, SEED, 'codebook-gold-na:v1').slice(0, 3);
    expect([...na].sort()).toEqual([...expectedNa].sort());
    expect(v1.map((r) => r.item.key)).not.toContain('q7'); // unverified quote
    expect(v1.map((r) => r.item.key)).not.toContain('q9'); // invalid
    // v4 has nothing counted: only its not-addressed items (both, since 2 <= 3)
    expect(sel.rows.filter((r) => r.row.video_id === 'v4').map((r) => r.item.key)).toEqual(['q29', 'q38']);
    // a different cap
    const none = await selectGold(db.asDb(), { codebook: cb, promptHash: ph }, { n: 10, seed: SEED, naPerVideo: 0 });
    expect(none.rows.every((r) => r.outcome === 'counted')).toBe(true);
    expect(none.rows).toHaveLength(counted.length + 2); // v1 (3) + v3 (q38, f0)
  });

  it('is deterministic, and the same for any row order in the table', async () => {
    const a = await selectGold(world().asDb(), { codebook: cb, promptHash: ph }, { n: 2, seed: SEED, naPerVideo: 2 });
    const b = await selectGold(world().asDb(), { codebook: cb, promptHash: ph }, { n: 2, seed: SEED, naPerVideo: 2 });
    const key = (s: typeof a) => s.rows.map((r) => `${r.row.video_id}:${r.item.key}`);
    expect(key(a)).toEqual(key(b));
    expect(a.videoIds).toEqual(chooseVideos(['v1', 'v3', 'v4'], { n: 2, seed: SEED, naPerVideo: 2 }));
    // chooseRows alone: shuffled input map, same output
    const latest = new Map(codedRows().filter((r) => r.video_id === 'v1' && r.attempt === 1 && r.run_id === 'j3c-1').map((r) => [r.item_key as string, r as unknown as GoldCodedRow]));
    const rev = new Map([...latest].reverse());
    const p = { n: 1, seed: SEED, naPerVideo: 2 };
    expect(chooseRows(cb, 'v1', rev, p).map((r) => r.item.key)).toEqual(chooseRows(cb, 'v1', latest, p).map((r) => r.item.key));
  });

  it('refuses without a completed run for the current prompt', async () => {
    const db = world({ bt_runs: [{ id: 'j3c-old', job: 'other', status: 'completed', params: { kind: 'codebook', prompt_hash: 'old' } }] });
    await expect(selectGold(db.asDb(), { codebook: cb, promptHash: ph }, { n: 5, seed: SEED, naPerVideo: 3 })).rejects.toThrow(/no completed codebook run/);
  });
});

describe('job3/gold-sheet files (fake DB, no API)', () => {
  const run = async (argv: string[] = ['--n', '10']) => {
    const outDir = tmp();
    const logs: string[] = [];
    const db = world();
    await sheet(argv, { db: db.asDb(), log: (l) => logs.push(l), outDir });
    return { outDir, logs, db };
  };

  it('writes JSON (header + rows) and CSV with blank mark columns; mc lists only counted answers; links are timestamped', async () => {
    const { outDir, logs } = await run();
    const json = JSON.parse(readFileSync(path.join(outDir, 'coded_gold_sheet.json'), 'utf8')) as { header: Record<string, unknown>; rows: Array<Record<string, any>> };
    expect(json.header).toMatchObject({ n: 10, seed: SEED, na_per_video: 3, prompt_hash: ph, video_ids: ['v1', 'v3', 'v4'] });
    const q78 = json.rows.find((r) => r.video_id === 'v1' && r.item_key === 'q78')!;
    expect(q78).toMatchObject({ type: 'multiple_choice', outcome: 'counted', question_id: 78 });
    expect(q78.answers.map((a: any) => a.code)).toEqual(['love', 'other']); // learn_grow's quote did not verify: not listed
  });

  it('counts only; yes/no rows carry a readable stance label and a link with the aligned timestamp', async () => {
    const outDir = tmp();
    const logs: string[] = [];
    const db = world();
    // a quote that aligns to the 42 s segment
    db.tables.bt_coded_answers.find((r) => r.video_id === 'v1' && r.item_key === 'q38' && r.attempt === 2)!.quote = 'we talked about many things today and more';
    await sheet(['--n', '10'], { db: db.asDb(), log: (l) => logs.push(l), outDir });
    const json = JSON.parse(readFileSync(path.join(outDir, 'coded_gold_sheet.json'), 'utf8')) as { rows: Array<Record<string, any>> };
    const q38 = json.rows.find((r) => r.video_id === 'v1' && r.item_key === 'q38')!;
    expect(q38).toMatchObject({ type: 'yes_no', outcome: 'counted', stance: 'yes', stance_label: 'yes: calm or peace', confidence: 95, title: '=SUM(A1) a title' });
    expect(q38.youtube_link).toBe('https://www.youtube.com/watch?v=v1&t=42s');
    const f2 = json.rows.find((r) => r.video_id === 'v1' && r.item_key === 'f2')!;
    expect(f2.youtube_link).toBe('https://www.youtube.com/watch?v=v1'); // not alignable: no &t
    expect(f2.question).toBeNull();
    const naRow = json.rows.find((r) => r.outcome === 'not_addressed')!;
    expect(naRow).toMatchObject({ stance: null, quote: null, answers: [] });
    const csv = parseCsv(readFileSync(path.join(outDir, 'coded_gold_sheet.csv'), 'utf8'));
    expect(csv).toHaveLength(json.rows.length);
    const c38 = csv.find((r) => r.video_id === 'v1' && r.item_key === 'q38')!;
    expect(c38.title).toBe("'=SUM(A1) a title"); // formula neutralized
    expect(c38.answer).toBe('yes: calm or peace');
    for (const col of ['addressed_correct', 'answer_correct', 'wrong_choices', 'missing_answer', 'quote_is_experiencer', 'note']) expect(c38[col]).toBe('');
    expect(Number(c38.coded_answer_id)).toBe(q38.coded_answer_id);
    // log lines: counts only, never a quote
    const text = logs.join('\n');
    expect(text).toMatch(/selected: 3; rows: \d+/);
    expect(text).not.toMatch(/quote for|many things/);
  });

  it('mc answers are joined with " | " in the CSV, counted ones only, other with its description', async () => {
    const outDir = tmp();
    const db = world();
    const q78 = db.tables.bt_coded_answers.find((r) => r.video_id === 'v1' && r.item_key === 'q78')!;
    q78.choices = [ch('love'), ch('learn_grow', false), { ...ch('other'), other_text: 'peace with God' }, ch('serve_help_others')];
    await sheet(['--n', '10'], { db: db.asDb(), log: () => {}, outDir });
    const json = JSON.parse(readFileSync(path.join(outDir, 'coded_gold_sheet.json'), 'utf8')) as { rows: Array<Record<string, any>> };
    const row = json.rows.find((r) => r.video_id === 'v1' && r.item_key === 'q78')!;
    expect(row.answers.map((a: any) => a.code)).toEqual(['love', 'other', 'serve_help_others']);
    expect(row.answers[0].label).toBe('To love');
    const c = parseCsv(readFileSync(path.join(outDir, 'coded_gold_sheet.csv'), 'utf8')).find((r) => r.video_id === 'v1' && r.item_key === 'q78')!;
    expect(c.answer.split(' | ')).toHaveLength(3);
    expect(c.answer).toContain('other (Other: peace with God)');
    expect(c.answer_codes).toBe('love other serve_help_others');
    expect(c.quote.split(' | ')).toHaveLength(3);
    expect(c.youtube_link.split(' | ')).toHaveLength(3);
    expect(c.quote).not.toContain('learn_grow');
  });

  it('writes the same files twice (deterministic)', async () => {
    const a = await run(['--n', '2']);
    const b = await run(['--n', '2']);
    // the fixture ids differ between the two worlds; everything else must be identical
    const body = (d: string) => parseCsv(readFileSync(path.join(d, 'coded_gold_sheet.csv'), 'utf8')).map(({ coded_answer_id: _id, ...rest }) => rest);
    expect(body(a.outDir)).toEqual(body(b.outDir));
  });

  it('does no writes', async () => {
    expect((await run()).db.writes).toEqual([]);
  });
});

// ---- import -----------------------------------------------------------------------------------

describe('job3/import-gold parsing', () => {
  it('Y/N values only (any case); blank is null', () => {
    expect(parseYN('y', 'f')).toBe(true);
    expect(parseYN(' N ', 'f')).toBe(false);
    expect(parseYN('', 'f')).toBeNull();
    expect(parseYN(undefined, 'f')).toBeNull();
    expect(() => parseYN('yes', 'f')).toThrow(/must be Y or N/);
    expect(() => parseYN(true, 'f')).toThrow(/must be Y or N/);
  });

  it('CSV: blank addressed_correct is unmarked; wrong_choices is space separated', () => {
    const csv = [
      'coded_answer_id,video_id,addressed_correct,answer_correct,wrong_choices,missing_answer,quote_is_experiencer,note',
      '5,v1,Y,N,love  learn_grow,"a, b",Y,"hello, world"', '6,v1,,,,,,', '7,v1,N,,,,,',
    ].join('\n');
    const r = parseMarksFile(csv, 'csv');
    expect(r.errors).toEqual([]);
    expect(r.unmarked).toBe(1);
    expect(r.marks).toEqual([
      { coded_answer_id: 5, addressed_correct: true, answer_correct: false, wrong_choices: ['learn_grow', 'love'], missing_answer: 'a, b', quote_is_experiencer: true, note: 'hello, world' },
      { coded_answer_id: 7, addressed_correct: false, answer_correct: null, wrong_choices: [], missing_answer: null, quote_is_experiencer: null, note: null },
    ]);
  });

  it('JSON: an array of marks with wrong_choices as an array', () => {
    const r = parseMarksFile(JSON.stringify([{ coded_answer_id: 3, addressed_correct: 'Y', answer_correct: '', wrong_choices: ['a'], quote_is_experiencer: 'N' }]), 'json');
    expect(r.marks).toMatchObject([{ coded_answer_id: 3, wrong_choices: ['a'], answer_correct: null, quote_is_experiencer: false }]);
    expect(parseMarksFile('{"a":1}', 'json').errors[0]).toMatch(/array of mark objects/);
    expect(parseMarksFile('nope', 'json').errors[0]).toMatch(/not valid JSON/);
  });

  it('record-level problems: bad Y/N, filled fields on a blank row, duplicates, contradictions, bad ids', () => {
    const csv = [
      'coded_answer_id,addressed_correct,answer_correct,wrong_choices,missing_answer,quote_is_experiencer,note',
      '1,yes,,,,,', '2,,,,,,a note', '3,Y,Y,love,,,', 'x,Y,,,,,', '4,Y,,,,,', '4,N,,,,,',
    ].join('\n');
    const r = parseMarksFile(csv, 'csv');
    expect(r.errors).toEqual([
      'line 2: addressed_correct must be Y or N, got "yes"',
      'line 3: addressed_correct is blank but other mark fields are filled in',
      'line 4: answer_correct is Y but wrong_choices is not empty',
      'line 5: coded_answer_id is not a positive integer',
      'line 7: coded_answer_id 4 appears twice',
    ]);
    expect(r.marks.map((m) => m.coded_answer_id)).toEqual([4]);
  });
});

describe('job3/import-gold validation against the coded answers', () => {
  const answers = new Map<number, CodedAnswerLite>(([
    [1, { id: 1, video_id: 'v1', item_key: 'q38', kind: 'yn', addressed: true, quote_verified: true, choices: null, valid: true }],
    [2, { id: 2, video_id: 'v1', item_key: 'q38', kind: 'yn', addressed: false, quote_verified: false, choices: null, valid: true }],
    [3, { id: 3, video_id: 'v1', item_key: 'q78', kind: 'mc', addressed: true, quote_verified: false, choices: [ch('love'), ch('learn_grow', false)], valid: true }],
    [4, { id: 4, video_id: 'v1', item_key: 'q7', kind: 'yn', addressed: true, quote_verified: false, choices: null, valid: true }],
    [5, { id: 5, video_id: 'v1', item_key: 'q9', kind: 'yn', addressed: null, quote_verified: false, choices: null, valid: false }],
  ] as Array<[number, CodedAnswerLite]>));
  const mark = (id: number, o: Partial<ParsedMark> = {}): ParsedMark => ({ coded_answer_id: id, addressed_correct: true, answer_correct: null, wrong_choices: [], missing_answer: null, quote_is_experiencer: null, note: null, ...o });

  it('accepts counted and not_addressed rows', () => {
    expect(validateMarks([mark(1, { answer_correct: true }), mark(2), mark(3, { wrong_choices: ['love'] })], answers)).toEqual([]);
  });
  it('refuses unknown ids and rows that are not on the sheet (unverified, invalid)', () => {
    const e = validateMarks([mark(99), mark(4), mark(5)], answers);
    expect(e[0]).toMatch(/99: not found/);
    expect(e[1]).toMatch(/4: outcome is unverified_quote/);
    expect(e[2]).toMatch(/5: outcome is invalid/);
  });
  it('a not_addressed row takes no answer_correct and no wrong_choices', () => {
    const e = validateMarks([mark(2, { answer_correct: false }), mark(2, { wrong_choices: ['love'] })], answers);
    expect(e).toHaveLength(2);
    expect(e[0]).toMatch(/blank answer_correct/);
    expect(e[1]).toMatch(/blank wrong_choices/);
  });
  it('wrong_choices must be a subset of the counted choices (an unverified answer is not listed; a yes/no row has none)', () => {
    const e = validateMarks([mark(3, { wrong_choices: ['learn_grow'] }), mark(3, { wrong_choices: ['other'] }), mark(1, { wrong_choices: ['love'] })], answers);
    expect(e).toHaveLength(3);
    expect(e[0]).toMatch(/wrong_choices learn_grow not among this row's counted answers \(love\)/);
    expect(e[2]).toMatch(/\(none\)/);
  });
});

describe('job3/import-gold (fake DB)', () => {
  /** coded answer ids of the fixture */
  const ids = (db: FakeDb) => ({
    q38: rowsOf(db, 'v1', 'q38', 2).id as number, f2: rowsOf(db, 'v1', 'f2').id as number, q78: rowsOf(db, 'v1', 'q78').id as number,
    na: rowsOf(db, 'v1', 'q29').id as number, unverified: rowsOf(db, 'v1', 'q7').id as number,
  });
  const csvOf = (marks: Array<Record<string, string | number>>) => {
    const head = ['coded_answer_id', 'video_id', 'addressed_correct', 'answer_correct', 'wrong_choices', 'missing_answer', 'quote_is_experiencer', 'note'];
    return [head.join(','), ...marks.map((m) => head.map((h) => m[h] ?? '').join(','))].join('\n') + '\n';
  };
  const run = async (db: FakeDb, text: string, ext = 'csv', extra: string[] = []) => {
    const file = path.join(tmp(), `marks.${ext}`);
    writeFileSync(file, text);
    const logs: string[] = [];
    await importGold(['--file', file, ...extra], { db: db.asDb(), log: (l) => logs.push(l) });
    return logs;
  };
  const good = (db: FakeDb) => {
    const i = ids(db);
    return csvOf([
      { coded_answer_id: i.q38, addressed_correct: 'Y', answer_correct: 'Y', quote_is_experiencer: 'Y' },
      { coded_answer_id: i.q78, addressed_correct: 'Y', answer_correct: 'N', wrong_choices: 'other', missing_answer: 'serving', quote_is_experiencer: 'N', note: 'ok' },
      { coded_answer_id: i.na, addressed_correct: 'N', note: 'it was addressed' },
      { coded_answer_id: i.f2, addressed_correct: '' },
    ]);
  };

  it('inserts the marked rows (copying video_id and item_key, marked_by owner), skipping unmarked ones', async () => {
    const db = goldWorld();
    const logs = await run(db, good(db));
    expect(logs.join('\n')).toMatch(/rows marked: 3; unmarked \(skipped\): 1; problems: 0/);
    expect(logs.join('\n')).toMatch(/inserted 3 rows/);
    const marks = db.tables.bt_coded_gold_marks;
    expect(marks).toHaveLength(3);
    const m38 = marks.find((m) => m.item_key === 'q38')!;
    expect(m38).toMatchObject({ video_id: 'v1', addressed_correct: true, answer_correct: true, wrong_choices: [], quote_is_experiencer: true, marked_by: 'owner', missing_answer: null });
    const m78 = marks.find((m) => m.item_key === 'q78')!;
    expect(m78).toMatchObject({ wrong_choices: ['other'], missing_answer: 'serving', note: 'ok' });
    const mna = marks.find((m) => m.item_key === 'q29')!;
    expect(mna).toMatchObject({ addressed_correct: false, answer_correct: null, wrong_choices: null });
    expect(db.writes.every((w) => w.table === 'bt_coded_gold_marks')).toBe(true);
  });

  it('is idempotent: the same file again inserts nothing; a changed mark inserts exactly one row; JSON works too', async () => {
    const db = goldWorld();
    await run(db, good(db));
    const before = db.writes.length;
    const logs = await run(db, good(db));
    expect(logs.join('\n')).toMatch(/new or changed marks: 0; already stored identically: 3/);
    expect(db.writes.length).toBe(before);
    expect(db.tables.bt_coded_gold_marks).toHaveLength(3);

    const i = ids(db);
    const changed = good(db).replace('it was addressed', 'it was addressed after all');
    await run(db, changed);
    expect(db.tables.bt_coded_gold_marks).toHaveLength(4);
    expect(db.tables.bt_coded_gold_marks.at(-1)).toMatchObject({ coded_answer_id: i.na, note: 'it was addressed after all' });
    // the same marks as JSON: identical to the latest stored ones -> nothing inserted
    const json = JSON.stringify([{ coded_answer_id: i.q38, addressed_correct: 'Y', answer_correct: 'Y', quote_is_experiencer: 'Y' }]);
    await run(db, json, 'json');
    expect(db.tables.bt_coded_gold_marks).toHaveLength(4);
    // a mark that flips back to an older value is still new relative to the LATEST one
    await run(db, good(db));
    expect(db.tables.bt_coded_gold_marks).toHaveLength(5);
  });

  it('--dry-run writes nothing', async () => {
    const db = goldWorld();
    const logs = await run(db, good(db), 'csv', ['--dry-run']);
    expect(logs.join('\n')).toMatch(/DRY RUN/);
    expect(db.writes).toEqual([]);
  });

  const refusal = async (text: (i: ReturnType<typeof ids>) => string, pattern: RegExp) => {
    const db = goldWorld();
    await expect(run(db, text(ids(db)))).rejects.toThrow(pattern);
    expect(db.writes).toEqual([]); // nothing written
  };
  it('refuses the whole file: unknown coded answer', () => refusal(() => csvOf([{ coded_answer_id: 99999, addressed_correct: 'Y' }]), /99999: not found in bt_coded_answers/));
  it('refuses: a row whose outcome is not counted or not_addressed', () => refusal((i) => csvOf([{ coded_answer_id: i.unverified, addressed_correct: 'Y' }]), /outcome is unverified_quote/));
  it('refuses: answer_correct on a not_addressed row', () => refusal((i) => csvOf([{ coded_answer_id: i.na, addressed_correct: 'Y', answer_correct: 'N' }]), /blank answer_correct/));
  it('refuses: wrong_choices not among the counted choices', () => refusal((i) => csvOf([{ coded_answer_id: i.q78, addressed_correct: 'Y', answer_correct: 'N', wrong_choices: 'learn_grow' }]), /wrong_choices learn_grow not among/));
  it('refuses: a Y/N cell that is not Y or N', () => refusal((i) => csvOf([{ coded_answer_id: i.q38, addressed_correct: 'maybe' }]), /must be Y or N/));
  it('refuses: a file with no marks at all', () => refusal(() => csvOf([{ coded_answer_id: 1, addressed_correct: '' }]), /no marked rows/));
  it('refuses a bad extension', async () => {
    const db = goldWorld();
    await expect(run(db, good(db), 'txt')).rejects.toThrow(/\.json or \.csv/);
    expect(db.writes).toEqual([]);
  });

  it('lists only the first few problems, even when a valid row sits beside bad ones', async () => {
    const db = goldWorld();
    const i = ids(db);
    const rows = [{ coded_answer_id: i.q38, addressed_correct: 'Y' }, ...Array.from({ length: 8 }, (_, k) => ({ coded_answer_id: 90000 + k, addressed_correct: 'Y' }))];
    await expect(run(db, csvOf(rows))).rejects.toThrow(/8 problem\(s\), nothing written; first 5/);
    try { await run(db, csvOf(rows)); } catch (e) { expect((e as Error).message.split('\n')).toHaveLength(6); }
    expect(db.writes).toEqual([]);
  });
});

// ---- report -----------------------------------------------------------------------------------

describe('job3/gold-report statistics (hand-computed)', () => {
  const R = (id: number, kind: 'yn' | 'mc', isFact: boolean, outcome: 'counted' | 'not_addressed', o: Partial<ReportRow> = {}): ReportRow => ({
    coded_answer_id: id, kind, isFact, outcome, stance: kind === 'yn' && outcome === 'counted' ? 'yes' : null, codes: [], confidence: 90, ...o,
  });
  const M = (id: number, o: Partial<DbMark> = {}): DbMark => ({
    id: id * 10, coded_answer_id: id, video_id: 'v', item_key: 'q1', addressed_correct: true, answer_correct: null, wrong_choices: null, missing_answer: null, quote_is_experiencer: null, note: null, ...o,
  });
  const rows: ReportRow[] = [
    R(1, 'yn', false, 'counted', { stance: 'yes', confidence: 95 }),
    R(2, 'yn', false, 'counted', { stance: 'yes', confidence: 80 }),
    R(3, 'yn', true, 'counted', { stance: 'no', confidence: 60 }),
    R(4, 'yn', false, 'counted', { stance: 'mixed', confidence: 92 }),
    R(5, 'mc', false, 'counted', { codes: ['love', 'learn_grow'], confidence: 85 }),
    R(6, 'mc', true, 'counted', { codes: ['illness'], confidence: 65 }),
    R(7, 'mc', false, 'counted', { codes: ['a', 'b', 'c'], confidence: 91 }),
    R(8, 'yn', false, 'not_addressed'), R(9, 'mc', false, 'not_addressed'), R(10, 'yn', false, 'not_addressed'),
    R(11, 'yn', false, 'counted', { stance: 'yes', confidence: 99 }),
    R(12, 'yn', false, 'counted', { stance: 'yes', confidence: 50 }), // no mark: not used
  ];
  const marks = new Map<number, DbMark>([
    M(1, { answer_correct: true, quote_is_experiencer: true }), M(2, { answer_correct: false, quote_is_experiencer: true }),
    M(3, { answer_correct: true, quote_is_experiencer: false }), M(4, { addressed_correct: false }),
    M(5, { answer_correct: false, wrong_choices: ['learn_grow'], missing_answer: 'x', quote_is_experiencer: true }),
    M(6, { answer_correct: true, wrong_choices: [], quote_is_experiencer: true }),
    M(7, { addressed_correct: false, wrong_choices: ['a'] }), // ignored: not addressed
    M(8), M(9), M(10, { addressed_correct: false }), M(11),
  ].map((m) => [m.coded_answer_id, m]));
  const s = goldStats(rows, marks, [777]);
  const kn = (p: { k: number; n: number }) => [p.k, p.n];

  it('coverage', () => {
    expect([s.rows, s.marked]).toEqual([12, 11]);
    expect(s.unmarkedIds).toEqual([12]);
    expect(s.extraMarkIds).toEqual([777]);
  });
  it('addressed precision: overall, yn vs mc, facts vs questions, confidence bands (counted rows only)', () => {
    expect(kn(s.addressed.overall)).toEqual([6, 8]);
    expect(s.addressed.overall.p).toBe(0.75);
    expect(kn(s.addressed.yn)).toEqual([4, 5]);
    expect(kn(s.addressed.mc)).toEqual([2, 3]);
    expect(kn(s.addressed.facts)).toEqual([2, 2]);
    expect(kn(s.addressed.questions)).toEqual([4, 6]);
    expect(BANDS_OF(s)).toEqual([[2, 2], [2, 2], [2, 4]]); // <70, 70-89, >=90
  });
  it('yes/no stance precision among addressed rows; rows without answer_correct are left out and counted', () => {
    expect(kn(s.stance.yes)).toEqual([1, 2]);
    expect(kn(s.stance.no)).toEqual([1, 1]);
    expect(kn(s.stance.mixed)).toEqual([0, 0]); // the only mixed row was marked not addressed
    expect(s.stance.mixed.p).toBeNull();
    expect(s.stanceUnmarked).toBe(1);
  });
  it('multiple-choice: every listed answer not marked wrong; rows with a missing answer', () => {
    expect(kn(s.mcAnswers)).toEqual([2, 3]); // love ok, learn_grow wrong, illness ok
    expect(kn(s.mcMissing)).toEqual([1, 2]);
  });
  it('not-addressed spot check and its miss rate', () => {
    expect(kn(s.notAddressed)).toEqual([2, 3]);
    expect(kn(s.notAddressedMiss)).toEqual([1, 3]);
  });
  it('quote_is_experiencer among counted rows that have it marked', () => {
    expect(kn(s.quoteExperiencer)).toEqual([4, 5]);
    expect(s.quoteUnmarked).toBe(3); // rows 4, 7, 11
  });
  it('Wilson interval: 6 of 8 is 75.0% (40.9-92.9%) and the report prints k/n', () => {
    expect(s.addressed.overall.lo!).toBeCloseTo(0.409, 3);
    expect(s.addressed.overall.hi!).toBeCloseTo(0.929, 3);
    const md = renderReport(s, { codebookVersion: 'codebook-v1', promptHash: 'abc'.repeat(8), videos: 3, params: { n: 25, seed: SEED, naPerVideo: 3 } }, false);
    expect(md).toContain('75.0% (6/8; Wilson 95% CI 40.9-92.9%)');
    expect(md).toContain('| mixed | n/a (n=0) |');
    expect(md).not.toMatch(/NOT FOR PUBLICATION/);
    expect(confidenceBand(69)).toBe('<70');
    expect(confidenceBand(70)).toBe('70-89');
    expect(confidenceBand(89)).toBe('70-89');
    expect(confidenceBand(90)).toBe('>=90');
  });
});

function BANDS_OF(s: ReturnType<typeof goldStats>) {
  return (['<70', '70-89', '>=90'] as const).map((b) => [s.byBand[b].k, s.byBand[b].n]);
}

describe('job3/gold-report (fake DB)', () => {
  const args = ['--n', '10'];
  const markFor = (answerId: number, video: string, key: string, o: Record<string, unknown> = {}) => ({
    coded_answer_id: answerId, video_id: video, item_key: key, addressed_correct: true, answer_correct: null, wrong_choices: null, missing_answer: null, quote_is_experiencer: null, note: null, marked_by: 'owner', ...o,
  });
  /** A mark for every sheet row, built from the same selection the report will rebuild. */
  const markAll = async (db: FakeDb, skip: number[] = []) => {
    const sel = await selectGold(db.asDb(), { codebook: cb, promptHash: ph }, { n: 10, seed: SEED, naPerVideo: 3 });
    let id = 1;
    for (const r of sel.rows) {
      if (skip.includes(r.row.id)) continue;
      db.tables.bt_coded_gold_marks.push({ id: id++, ...markFor(r.row.id, r.row.video_id, r.item.key, { answer_correct: r.outcome === 'counted' ? true : null, wrong_choices: r.outcome === 'counted' ? [] : null }) });
    }
    return sel;
  };
  const run = async (db: FakeDb, argv = args) => {
    const outDir = tmp();
    const logs: string[] = [];
    try { await report(argv, { db: db.asDb(), log: (l) => logs.push(l), outDir }); } catch (e) { return { outDir, logs, error: (e as Error).message }; }
    return { outDir, logs, error: null };
  };

  it('writes coded_gold_report.md when every sheet row has a mark; latest mark wins; extra marks are listed, not used', async () => {
    const db = world();
    const sel = await markAll(db);
    const first = sel.rows.find((r) => r.outcome === 'not_addressed')!;
    // a later mark flips the first one
    db.tables.bt_coded_gold_marks.push({ id: 500, ...markFor(first.row.id, first.row.video_id, first.item.key, { addressed_correct: false }) });
    // a mark on a coded answer that is not a sheet row (an older attempt of q38)
    const stale = rowsOf(db, 'v1', 'q38', 1).id as number;
    db.tables.bt_coded_gold_marks.push({ id: 501, ...markFor(stale, 'v1', 'q38') });
    const r = await run(db);
    expect(r.error).toBeNull();
    const md = readFileSync(path.join(r.outDir, 'coded_gold_report.md'), 'utf8');
    expect(existsSync(path.join(r.outDir, 'coded_gold_report_PARTIAL.md'))).toBe(false);
    expect(md).toMatch(new RegExp(`Sheet rows marked: ${sel.rows.length} of ${sel.rows.length}`));
    expect(md).toContain(`(listed, not used): ${stale}.`);
    const nNa = sel.rows.filter((x) => x.outcome === 'not_addressed').length;
    expect(md).toContain(`(${nNa - 1}/${nNa}; Wilson 95% CI`); // truly not addressed after the flip
    expect(md).not.toMatch(/quote for|yes no quote/);
    expect(db.writes).toEqual([]);
  });

  it('refuses when a sheet row has no mark, and names the count; nothing is written', async () => {
    const db = world();
    const sel = await markAll(db, [rowsOf(db, 'v3', 'f0').id as number]);
    const r = await run(db);
    expect(r.error).toMatch(new RegExp(`1 of ${sel.rows.length} sheet rows have no mark`));
    expect(existsSync(path.join(r.outDir, 'coded_gold_report.md'))).toBe(false);
    expect(existsSync(path.join(r.outDir, 'coded_gold_report_PARTIAL.md'))).toBe(false);
  });

  it('--allow-unmarked writes only coded_gold_report_PARTIAL.md, titled NOT FOR PUBLICATION', async () => {
    const db = world();
    const skipId = rowsOf(db, 'v3', 'f0').id as number;
    const sel = await markAll(db, [skipId]);
    const r = await run(db, [...args, '--allow-unmarked']);
    expect(r.error).toBeNull();
    expect(existsSync(path.join(r.outDir, 'coded_gold_report.md'))).toBe(false);
    const md = readFileSync(path.join(r.outDir, 'coded_gold_report_PARTIAL.md'), 'utf8');
    expect(md.split('\n')[0]).toBe('# Codebook gold-set report: PARTIAL, NOT FOR PUBLICATION');
    expect(md).toContain(`Sheet rows marked: ${sel.rows.length - 1} of ${sel.rows.length}`);
    expect(md).toContain(`without a mark (coded_answer_id): ${skipId}.`);
  });

  it('with no marks at all it refuses too (and the PARTIAL file shows zero coverage)', async () => {
    const db = world();
    expect((await run(db)).error).toMatch(/sheet rows have no mark/);
    const r = await run(db, [...args, '--allow-unmarked']);
    expect(readFileSync(path.join(r.outDir, 'coded_gold_report_PARTIAL.md'), 'utf8')).toMatch(/Sheet rows marked: 0 of/);
  });

  it('reportRows: only the counted choices of a multiple-choice row are listed', async () => {
    const sel = await selectGold(world().asDb(), { codebook: cb, promptHash: ph }, { n: 10, seed: SEED, naPerVideo: 0 });
    const q78 = reportRows(sel).find((r) => r.kind === 'mc' && r.codes.includes('love'))!;
    expect(q78.codes).toEqual(['love', 'other']);
    expect(q78.isFact).toBe(false);
  });
});
