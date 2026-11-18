/**
 * Haiku-only resolution: classification, person rollup, rollup/gold CLIs, the no-spend gold path
 * and the guard on the expensive recheck/arbiter passes. In-memory database and fake API only.
 */
import { mkdtempSync, readFileSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { main as runStance } from '../job2/run-stance';
import { main as goldSheet } from '../job2/gold-sheet';
import { main as importGold } from '../job2/import-gold';
import { main as goldReport, renderHaikuGoldMarkdown } from '../job2/gold-report';
import { main as rollup } from '../job2/rollup';
import { parseCsv } from '../job2/csv';
import { goldOrder, pilotOrder } from '../job2/sampling';
import { confidenceBand, haikuGoldStats, type HaikuMark } from '../job2/gold';
import {
  HAIKU_RESOLUTION_LABEL, categoryOf, completeVideos, countCategories, haikuCells, latestPerCell, parseResolution, quoteFailureByStance, toFinalRows,
  wouldBeFlagged, type FirstPassAnswer,
} from '../job2/haiku';
import { tallyByQuestion } from '../job2/tally';
import { FakeAnthropic, FakeDb, message, type Responder } from './job2-fakes';

const GOOD = 'I saw a bright light at the end of the tunnel';
const BAD = 'this sentence is definitely not in the transcript';

const ans = (o: Partial<FirstPassAnswer> & { id: number }): FirstPassAnswer => ({
  video_id: 'v1', question_id: 1, stance: 'yes', confidence: 90, quote_verified: true, valid: true, ...o,
});

describe('haiku-first-pass classification (pure)', () => {
  it('counts valid answers that are not_addressed or have a verified quote; excludes invalid and unverified_quote', () => {
    expect(categoryOf(ans({ id: 1 }))).toBe('counted');
    expect(categoryOf(ans({ id: 1, stance: 'not_addressed', quote_verified: false }))).toBe('counted');
    expect(categoryOf(ans({ id: 1, stance: 'no', quote_verified: false }))).toBe('unverified_quote');
    expect(categoryOf(ans({ id: 1, valid: false, stance: null, confidence: null, quote_verified: false }))).toBe('invalid');
  });

  it('flags (would-be) no, mixed and confidence < 70, and nothing else', () => {
    expect(wouldBeFlagged(ans({ id: 1, stance: 'yes', confidence: 90 }))).toBe(false);
    expect(wouldBeFlagged(ans({ id: 1, stance: 'yes', confidence: 70 }))).toBe(false);
    expect(wouldBeFlagged(ans({ id: 1, stance: 'yes', confidence: 69 }))).toBe(true);
    expect(wouldBeFlagged(ans({ id: 1, stance: 'no', confidence: 95 }))).toBe(true);
    expect(wouldBeFlagged(ans({ id: 1, stance: 'mixed', confidence: 95 }))).toBe(true);
    expect(wouldBeFlagged(ans({ id: 1, stance: 'not_addressed', confidence: 50, quote_verified: false }))).toBe(true);
    expect(wouldBeFlagged(ans({ id: 1, stance: 'not_addressed', confidence: 95, quote_verified: false }))).toBe(false);
  });

  it('keeps the latest row (max id) per (video, question) and ignores inactive questions', () => {
    const rows = [ans({ id: 5, stance: 'no' }), ans({ id: 9, stance: 'yes' }), ans({ id: 7, stance: 'mixed' }), ans({ id: 2, question_id: 99 })];
    expect(latestPerCell(rows).map((r) => [r.question_id, r.id]).sort()).toEqual([[1, 9], [99, 2]]);
    const cells = haikuCells(rows, [1]);
    expect(cells).toHaveLength(1);
    expect(cells[0]).toMatchObject({ id: 9, stance: 'yes', category: 'counted', flagged: false });
  });

  it('completeVideos needs a row for every active question', () => {
    const rows = [{ video_id: 'a', question_id: 1 }, { video_id: 'a', question_id: 2 }, { video_id: 'b', question_id: 1 }, { video_id: 'b', question_id: 7 }];
    expect([...completeVideos(rows, [1, 2])]).toEqual(['a']);
  });

  it('parseResolution defaults to full and rejects unknown values', () => {
    expect(parseResolution(undefined)).toBe('full');
    expect(parseResolution('haiku-first-pass')).toBe('haiku-first-pass');
    expect(() => parseResolution('sonnet')).toThrow(/must be one of/);
  });
});

describe('haiku person rollup (pure)', () => {
  const q = [{ id: 1, category: 'c', consumer_question: 'Q1?' }];
  it('counts a flagged no with a verified quote, excludes invalid/unverified_quote, and reports flagged counts per person and cell', () => {
    const cells = haikuCells([
      ans({ id: 1, video_id: 'v1', stance: 'no', confidence: 80 }),                       // P1: flagged, counted
      ans({ id: 2, video_id: 'v2', stance: 'no', confidence: 95 }),                       // P1: flagged, counted
      ans({ id: 3, video_id: 'v3', stance: 'yes', confidence: 90 }),                      // P2: unflagged
      ans({ id: 4, video_id: 'v4', stance: 'yes', quote_verified: false }),               // P3: unverified_quote
      ans({ id: 5, video_id: 'v5', valid: false, stance: null, confidence: null, quote_verified: false }), // P4: invalid
      ans({ id: 6, video_id: 'v6', stance: 'not_addressed', confidence: 40, quote_verified: false }),    // P5: counted, flagged (conf < 70)
    ], [1]);
    expect(countCategories(cells)).toEqual({ counted: 4, invalid: 1, unverified_quote: 1, counted_flagged: 3 });
    const personOf = new Map([['v1', 'P1'], ['v2', 'P1'], ['v3', 'P2'], ['v4', 'P3'], ['v5', 'P4'], ['v6', 'P5']]);
    const [t] = tallyByQuestion(toFinalRows(cells), personOf, q);
    expect(t).toMatchObject({
      n_persons: 3, n_yes: 1, n_no: 1, n_mixed: 0, n_not_addressed: 1,
      n_persons_all_excluded: 2, n_excl_unverified_cells: 1, n_excl_invalid_cells: 1, n_excl_pending_cells: 0,
      n_unchecked_flagged_cells: 3, n_persons_with_unchecked_flagged: 2,
    });
  });
});

describe('excluded unverified_quote cells keep their original stance', () => {
  const q = [{ id: 1, category: 'c', consumer_question: 'Q1?' }];
  it('breaks excluded cells down by stance per question and overall (Wilson CI, n), never counting them', () => {
    const cells = haikuCells([
      ans({ id: 1, video_id: 'v1', stance: 'yes', quote_verified: false }),
      ans({ id: 2, video_id: 'v2', stance: 'yes', quote_verified: false }),
      ans({ id: 3, video_id: 'v3', stance: 'yes' }),
      ans({ id: 4, video_id: 'v4', stance: 'no', quote_verified: false }),
      ans({ id: 5, video_id: 'v5', stance: 'no' }),
      ans({ id: 6, video_id: 'v6', stance: 'no' }),
      ans({ id: 7, video_id: 'v7', stance: 'mixed', quote_verified: false }),
      ans({ id: 8, video_id: 'v8', valid: false, stance: null, confidence: null, quote_verified: false }),
      ans({ id: 9, video_id: 'v9', stance: 'not_addressed', quote_verified: false }),
    ], [1]);
    const rows = toFinalRows(cells);
    expect(rows.find((r) => r.video_id === 'v1')).toMatchObject({ stance: 'yes', status: 'unverified' });
    expect(rows.find((r) => r.video_id === 'v8')).toMatchObject({ stance: null, status: 'invalid' });
    const [t] = tallyByQuestion(rows, new Map(rows.map((r) => [r.video_id, `P${r.video_id}`])), q);
    expect(t).toMatchObject({ n_excl_unverified_yes: 2, n_excl_unverified_no: 1, n_excl_unverified_mixed: 1, n_excl_unverified_cells: 4, n_excl_invalid_cells: 1, n_yes: 1, n_no: 2, n_mixed: 0 });
    const f = quoteFailureByStance(cells);
    expect([f.yes.k, f.yes.n, f.no.k, f.no.n, f.mixed.k, f.mixed.n]).toEqual([2, 3, 1, 3, 1, 1]);
    expect(f.yes.p).toBeCloseTo(2 / 3, 10);
    expect(f.yes.lo).not.toBeNull();
  });
});

describe('haiku gold statistics (pure)', () => {
  const m = (i: number, stance: 'yes' | 'no' | 'not_addressed', correct: boolean, confidence: number, flagged: boolean): HaikuMark => ({
    id: i, video_id: `v${i}`, question_id: 1, final_stance: stance, correct, quote_is_experiencer: null, confidence, wouldBeFlagged: flagged,
  });
  it('bands and splits precision by flag and confidence over non-not_addressed marks', () => {
    expect(['<70', '70-89', '>=90']).toEqual([confidenceBand(69), confidenceBand(89), confidenceBand(90)]);
    expect(confidenceBand(70)).toBe('70-89');
    const marks = [
      m(1, 'yes', true, 95, false), m(2, 'yes', false, 92, false), m(3, 'no', true, 80, true), m(4, 'no', false, 60, true),
      m(5, 'yes', true, 65, true), m(6, 'not_addressed', false, 90, false),
    ];
    const s = haikuGoldStats(marks);
    expect([s.byFlag.flagged.k, s.byFlag.flagged.n, s.byFlag.unflagged.k, s.byFlag.unflagged.n]).toEqual([2, 3, 1, 2]);
    expect(s.byBand['>=90']).toMatchObject({ k: 1, n: 2 });
    expect(s.byBand['70-89']).toMatchObject({ k: 1, n: 1 });
    expect(s.byBand['<70']).toMatchObject({ k: 1, n: 2 });
    expect(s.base.perStance.yes).toMatchObject({ k: 2, n: 3 });
    const md = renderHaikuGoldMarkdown(s, 25);
    expect(md).toMatch(/no second model re-checked them/);
    expect(md).toMatch(/Precision by would_be_flagged/);
    expect(md).toMatch(/\| <70 \| 50\.0% \(1\/2; Wilson 95% CI/);
  });
});

// ---------------------------------------------------------------------------------------

function world(n = 12) {
  const vids = Array.from({ length: n }, (_, i) => `vidA${String(i + 1).padStart(2, '0')}`);
  return new FakeDb({
    nde_questions: [1, 2, 3, 4, 5].map((id) => ({ id, category: 'cat', consumer_question: `Question ${id}?`, is_active: true })),
    nde_analysis: vids.map((v) => ({ video_id: v, experience_type: 'nde' })),
    nde_vids: vids.map((v) => ({
      videoId: v, title: `Title ${v}`, subtitles_punctuated: `Number ${v} here. ${GOOD} and I felt total peace in that room. Then the nurse came in and spoke to me.`,
      subtitles_cleaned: null, subtitles: null, raw_timestamped_subtitles: null,
    })),
    bt_runs: [], bt_prompts: [], bt_raw_responses: [], bt_stance_answers: [], bt_gold_marks: [],
    bt_unmapped_nde_videos: [],
    bt_effective_person_map: vids.map((v, i) => ({ video_id: v, person_key: `profile:${Math.floor(i / 2)}` })),
  });
}

const idsIn = (params: any): number[] => [...new Set([...String(params.system[0].text).matchAll(/"question_id":(\d+)/g)].map((m) => Number(m[1])))];

/** Haiku: q1 yes 90 (unflagged); q2 NO with a VERIFIED quote, conf 80 (flagged); q3 yes with a bad quote (unverified); rest not_addressed. */
const responder: Responder = (_cid, params) => {
  const model = params.model as string;
  const answers = idsIn(params).map((q) => {
    if (q === 1) return { question_id: q, stance: 'yes', confidence: 90, quote: GOOD };
    if (q === 2) return { question_id: q, stance: 'no', confidence: 80, quote: GOOD };
    if (q === 3) return { question_id: q, stance: 'yes', confidence: 90, quote: BAD };
    return { question_id: q, stance: 'not_addressed', confidence: 90, quote: null };
  });
  return { type: 'succeeded', message: message(`${model}-20261001`, answers) };
};

function harness(n = 12) {
  const db = world(n);
  const client = new FakeAnthropic(responder);
  const logs: string[] = [];
  const makeClient = vi.fn(() => client as unknown as Anthropic);
  const outDir = mkdtempSync(path.join(os.tmpdir(), 'bt-haiku-'));
  const deps = { db: db.asDb(), makeClient, log: (l: string) => logs.push(l), sleep: async () => {}, outDir, now: () => new Date() };
  const rdeps = { ...deps, findMergeConflicts: async () => [] };
  const run = (args: string[]) => runStance(args, deps);
  const groupOf = () => [...logs].reverse().find((x) => x.startsWith('To submit'))!.split('--confirm-spend ')[1].trim();
  const firstPass = async () => { await run(['--full', '--estimate']); await run(['--full', '--confirm-spend', groupOf()]); };
  const read = (f: string) => readFileSync(path.join(outDir, f), 'utf8');
  return { db, client, logs, makeClient, deps, rdeps, run, groupOf, firstPass, outDir, read };
}

describe('rollup --resolution haiku-first-pass', () => {
  it('bias case: a flagged Haiku no with a verified quote is COUNTED in haiku mode and excluded (pending) in full mode', async () => {
    const h = harness();
    await h.firstPass();

    // full mode: refuses (pending), and with --allow-pending the no answers are not in the tally
    await expect(rollup([], h.rdeps)).rejects.toThrow(/await the recheck/);
    await rollup(['--allow-pending'], h.rdeps);
    const full = parseCsv(h.read('tally_by_question.csv'));
    expect(Object.keys(full[0])).not.toContain('resolution');
    expect(Object.keys(full[0])).not.toContain('n_unchecked_flagged_cells');
    expect(full[1]).toMatchObject({ question_id: '2', n_no: '0', n_persons: '0' });

    // haiku mode: no pending refusal; the no answers are counted, flagged and labelled
    await rollup(['--resolution', 'haiku-first-pass'], h.rdeps);
    const t = parseCsv(h.read('tally_by_question_haiku_only.csv'));
    expect(t).toHaveLength(5);
    expect(t.every((r) => r.resolution === HAIKU_RESOLUTION_LABEL)).toBe(true);
    expect(t[0]).toMatchObject({ question_id: '1', n_persons: '6', n_yes: '6', n_unchecked_flagged_cells: '0', n_persons_with_unchecked_flagged: '0' });
    expect(t[1]).toMatchObject({ question_id: '2', n_persons: '6', n_no: '6', n_yes: '0', n_unchecked_flagged_cells: '12', n_persons_with_unchecked_flagged: '6', n_excl_pending_cells: '0' });
    // q3: a valid claim whose quote is not in the transcript is excluded and reported, never counted
    expect(t[2]).toMatchObject({ question_id: '3', n_persons: '0', n_excl_unverified_cells: '12', n_excl_unverified_yes: '12', n_excl_unverified_no: '0', n_excl_unverified_mixed: '0', n_persons_all_excluded: '6' });
    expect(t[3]).toMatchObject({ question_id: '4', n_not_addressed: '6' });
    const sens = parseCsv(h.read('tally_by_question_sensitivity_per_video_haiku_only.csv'));
    expect(sens[1]).toMatchObject({ n_persons: '12', n_no: '12', resolution: HAIKU_RESOLUTION_LABEL });
    const rep = h.read('tally_report_haiku_only.md');
    expect(rep).toMatch(/No answer was independently re-checked by a second model/);
    expect(rep).toMatch(/gold_report_haiku_only\.md/);
    expect(rep).toContain('excluded, unverified_quote (a claim whose quote was not found in the transcript): 12');
    expect(rep).toContain('would have been flagged for a re-check (no, mixed or confidence < 70) and were NOT re-checked: 12');
    expect(rep).toMatch(/## Quote-failure rate by stance/);
    expect(rep).toMatch(/\| yes \| 50\.0% \(12\/24; Wilson 95% CI/); // q1 counted 12 + q3 unverified 12
    expect(rep).toMatch(/\| no \| 0\.0% \(0\/12; Wilson 95% CI/);
    expect(rep).toMatch(/\| mixed \| n\/a \(n=0\)/);
    // the full-mode files were not overwritten by the haiku run
    expect(h.read('tally_report.md')).not.toMatch(/Haiku-only/);
  });

  it('excludes invalid answers (counted apart), and the latest row per cell wins', async () => {
    const h = harness();
    await h.firstPass();
    const rows = h.db.rows('bt_stance_answers');
    const target = rows.find((r) => r.video_id === 'vidA01' && r.question_id === 4)!;
    Object.assign(target, { valid: false, stance: null, confidence: null, quote: null, quote_verified: false });
    // a newer first-pass row for vidA02/q4 (different run id so the cell key is unique) overrides the old not_addressed
    const old = rows.find((r) => r.video_id === 'vidA02' && r.question_id === 4)!;
    rows.push({ ...old, id: 9999, run_id: old.run_id, attempt: 2, stance: 'yes', confidence: 90, quote: GOOD, quote_verified: true, quote_norm_offset: 1 });
    await rollup(['--resolution', 'haiku-first-pass'], h.rdeps);
    const t = parseCsv(h.read('tally_by_question_haiku_only.csv'));
    expect(t[3]).toMatchObject({ question_id: '4', n_excl_invalid_cells: '1', n_yes: '1', n_not_addressed: '5' });
  });

  it('still refuses unmapped videos and merge conflicts; refuses an incomplete first pass unless --allow-partial; ignores --allow-pending', async () => {
    const h = harness();
    await h.firstPass();
    h.db.rows('bt_unmapped_nde_videos').push({ video_id: 'vidA01' });
    await expect(rollup(['--resolution', 'haiku-first-pass'], h.rdeps)).rejects.toThrow(/no accepted person link/);
    h.db.rows('bt_unmapped_nde_videos').length = 0;
    const conflict = { ...h.deps, findMergeConflicts: async () => [{ component: 'profile:1', keys: ['a', 'b'], mergeEdges: [1], conflicting: [2] }] };
    await expect(rollup(['--resolution', 'haiku-first-pass'], conflict)).rejects.toThrow(/merge conflict/);

    // vidA03 loses one question's row (partial row set), vidA04 loses all
    const rows = h.db.rows('bt_stance_answers');
    h.db.tables.bt_stance_answers = rows.filter((r) => !(r.video_id === 'vidA03' && r.question_id === 5) && r.video_id !== 'vidA04');
    await expect(rollup(['--resolution', 'haiku-first-pass'], h.rdeps)).rejects.toThrow(/2 NDE videos lack a complete first-pass row set/);
    await rollup(['--resolution', 'haiku-first-pass', '--allow-partial', '--allow-pending'], h.rdeps);
    const t = parseCsv(h.read('tally_by_question_haiku_only.csv'));
    expect(t[0].WARNING_incomplete_data).toBe('INCOMPLETE_COVERAGE videos=2');
    expect(t[0].resolution).toBe(HAIKU_RESOLUTION_LABEL);
    expect(h.read('tally_report_haiku_only.md')).toContain('WARNING: incomplete data');
    expect(h.logs.join('\n')).toMatch(/--allow-pending has no effect/);
  });

  it('writes nothing to the database', async () => {
    const h = harness();
    await h.firstPass();
    const before = h.db.writes.length;
    await rollup(['--resolution', 'haiku-first-pass'], h.rdeps);
    expect(h.db.writes.length).toBe(before);
  });
});

describe('haiku gold: selection, sheet, report, no-spend path', () => {
  it('--gold --resolution haiku-first-pass needs no spend when the first pass is complete (no run row, no API client, no writes)', async () => {
    const h = harness();
    await h.firstPass();
    const writes = h.db.writes.length;
    const runsBefore = h.db.rows('bt_runs').length;
    const clientBefore = h.makeClient.mock.calls.length;
    await h.run(['--gold', '--resolution', 'haiku-first-pass', '--pilot-n', '4', '--gold-n', '3', '--estimate']);
    expect(h.logs.join('\n')).toMatch(/NO SPEND NEEDED: all 3 gold videos already have a complete first-pass row set/);
    expect(h.db.writes.length).toBe(writes);
    expect(h.db.rows('bt_runs').length).toBe(runsBefore);
    expect(h.makeClient.mock.calls.length).toBe(clientBefore);
  });

  it('plans only the Haiku first pass for gold videos that lack rows, behind the estimate/confirm gate; never recheck/arbiter', async () => {
    const h = harness();
    await h.firstPass();
    await h.run(['--gold', '--resolution', 'haiku-first-pass', '--pilot-n', '4', '--gold-n', '3', '--dry-run']);
    expect(h.logs.join('\n')).toMatch(/NO SPEND NEEDED/);
    // find the gold videos through the sheet, then delete one video's rows
    await goldSheet(['--resolution', 'haiku-first-pass', '--pilot-n', '4', '--gold-n', '3'], h.deps);
    const goldIds = [...new Set(parseCsv(h.read('gold_review_haiku_only.csv')).map((r) => r.video_id))];
    const victim = goldIds[0];
    h.db.tables.bt_stance_answers = h.db.rows('bt_stance_answers').filter((r) => r.video_id !== victim);
    // the sheet now picks a different (complete) video instead of the victim, but run-stance still samples the victim and plans just it
    const w0 = h.db.writes.length;
    await h.run(['--gold', '--resolution', 'haiku-first-pass', '--pilot-n', '4', '--gold-n', '3', '--dry-run']);
    expect(h.db.writes.length).toBe(w0);
    expect(h.logs.join('\n')).toMatch(/1 gold videos lack first-pass rows: only the Haiku first pass is planned/);
    await h.run(['--gold', '--resolution', 'haiku-first-pass', '--pilot-n', '4', '--gold-n', '3', '--estimate']);
    const runs = h.db.rows('bt_runs').filter((r) => r.params.mode === 'gold');
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ pass: 'first', model: 'claude-haiku-5-5' });
    expect(runs[0].params).toMatchObject({ resolution: 'haiku-first-pass', kind: 'first' });
    expect(runs[0].params.plan.videoIds).toEqual([victim]);
    const created = h.client.created.length;
    await h.run(['--gold', '--resolution', 'haiku-first-pass', '--confirm-spend', h.groupOf()]);
    expect(h.client.created.slice(created).flatMap((b) => b.requests).every((r) => r.params.model.includes('haiku'))).toBe(true);
    expect(h.db.rows('bt_stance_answers').filter((r) => r.video_id === victim && r.pass === 'first')).toHaveLength(5);
    expect(h.db.rows('bt_stance_answers').some((r) => r.pass === 'recheck' || r.pass === 'arbiter')).toBe(false);
    // full-mode gold lookup ignores this run
    await expect(goldSheet([], h.deps)).rejects.toThrow(/no gold run found/);

    for (const pass of ['recheck', 'arbiter']) {
      await expect(h.run(['--gold', '--resolution', 'haiku-first-pass', '--pass', pass, '--estimate'])).rejects.toThrow(/only ever runs the Haiku first pass/);
    }
  });

  it('sheet: pilot-disjoint complete videos, every counted claim + 3 seeded not_addressed, would_be_flagged, confidence, quote, t= link; report splits precision', async () => {
    const h = harness();
    await h.firstPass();
    // give claims a timestamp so the link carries t=
    for (const r of h.db.rows('bt_stance_answers')) if (r.stance !== 'not_addressed') r.start_seconds = 42.7;
    const args = ['--resolution', 'haiku-first-pass', '--pilot-n', '4', '--gold-n', '3'];
    const before = h.db.writes.length;
    const clients = h.makeClient.mock.calls.length;
    await goldSheet(args, h.deps);
    expect(h.db.writes.length).toBe(before);              // read-only
    expect(h.makeClient.mock.calls.length).toBe(clients); // no API
    const sheet = parseCsv(h.read('gold_review_haiku_only.csv'));
    const goldIds = [...new Set(sheet.map((r) => r.video_id))];
    expect(goldIds).toHaveLength(3);
    const nde = h.db.rows('nde_analysis').map((r) => r.video_id as string);
    const pilotIds = pilotOrder(nde, 20261118).slice(0, 4);
    expect(goldIds.filter((v) => pilotIds.includes(v))).toEqual([]);
    expect(sheet).toHaveLength(3 * (2 + 2)); // q1 yes + q2 no counted; q3 (unverified quote) excluded; the only 2 not_addressed cells (q4, q5) per video (cap is 3)
    expect(sheet.some((r) => r.question_id === '3')).toBe(false);
    expect(Object.keys(sheet[0])).toEqual(['video_id', 'title', 'question_id', 'category', 'question', 'final_stance', 'confidence', 'quote', 'youtube_link', 'deciding_model', 'deciding_pass', 'answer_id', 'would_be_flagged', 'correct (Y/N)', 'quote_is_experiencer (Y/N)', 'note']);
    const claims = sheet.filter((r) => r.final_stance !== 'not_addressed');
    expect(claims.every((r) => r.quote === GOOD && r.youtube_link.endsWith('&t=42s') && r.deciding_pass === 'first')).toBe(true);
    expect(claims.filter((r) => r.question_id === '2').every((r) => r.would_be_flagged === 'Y' && r.confidence === '80')).toBe(true);
    expect(claims.filter((r) => r.question_id === '1').every((r) => r.would_be_flagged === 'N' && r.confidence === '90')).toBe(true);
    expect(sheet.filter((r) => r.final_stance === 'not_addressed').every((r) => r.quote === '' && !r.youtube_link.includes('&t=') && r.would_be_flagged === 'N')).toBe(true);

    // deterministic; and a stored pilot run that overlaps the sample forces it to move
    await goldSheet(args, h.deps);
    expect(parseCsv(h.read('gold_review_haiku_only.csv'))).toEqual(sheet);
    h.db.rows('bt_runs').push({ id: 'pilotX', job: 'stance', pass: 'pilot', model: 'm', status: 'completed', created_at: '2026-01-01T00:00:00Z', params: { mode: 'pilot', plan: { videoIds: [goldIds[0]] } }, estimate: null, batch_ids: [] });
    await goldSheet(args, h.deps);
    const moved = [...new Set(parseCsv(h.read('gold_review_haiku_only.csv')).map((r) => r.video_id))];
    expect(moved).toHaveLength(3);
    expect(moved).not.toContain(goldIds[0]);
    h.db.rows('bt_runs').length = 0;
    await goldSheet(args, h.deps);

    // marks -> import -> report (flagged rows are wrong, unflagged right)
    const marked = sheet.map((r) => ({ ...r, 'correct (Y/N)': r.would_be_flagged === 'Y' ? 'N' : 'Y', 'quote_is_experiencer (Y/N)': r.final_stance === 'not_addressed' ? '' : 'Y' }));
    const head = Object.keys(marked[0]);
    const csv = [head.join(','), ...marked.map((r) => head.map((k) => `"${String((r as Record<string, string>)[k]).replace(/"/g, '""')}"`).join(','))].join('\n');
    const file = path.join(h.outDir, 'marked.csv');
    writeFileSync(file, csv);
    await importGold(['--file', file], h.deps);
    expect(h.db.rows('bt_gold_marks')).toHaveLength(12);
    // marks that do not point at a counted first-pass answer of these videos (full-pipeline marks) must not mix in
    const q3 = h.db.rows('bt_stance_answers').find((r) => r.video_id === goldIds[0] && r.question_id === 3)!; // unverified: not on the sheet
    h.db.rows('bt_gold_marks').push(
      { id: 9001, video_id: goldIds[0], question_id: 1, stance_answer_id: 123456, final_stance: 'yes', correct: false, quote_is_experiencer: null, note: null },
      { id: 9002, video_id: goldIds[0], question_id: 3, stance_answer_id: q3.id, final_stance: 'yes', correct: false, quote_is_experiencer: null, note: null },
    );
    await goldReport(args, h.deps);
    expect(h.logs.join('\n')).toMatch(/ignored 2 gold marks that do not refer to a counted first-pass answer/);
    const rep = h.read('gold_report_haiku_only.md');
    expect(rep).toMatch(/no second model re-checked them/);
    expect(rep).toMatch(/\| Y \| 0\.0% \(0\/3; Wilson 95% CI/);
    expect(rep).toMatch(/\| N \| 100\.0% \(3\/3; Wilson 95% CI/);
    expect(rep).toMatch(/\| 70-89 \| 0\.0% \(0\/3;/);
    expect(rep).toMatch(/\| >=90 \| 100\.0% \(3\/3;/);
    expect(rep).toMatch(/\| <70 \| n\/a \(n=0\)/);
    expect(rep).toMatch(/\| no \| 0\.0% \(0\/3;/);
  });
});

describe('haiku gold selection warning', () => {
  it('ignores skipped candidates with no transcript; warns for skipped candidates that have one', async () => {
    const h = harness();
    await h.firstPass();
    const nde = h.db.rows('nde_analysis').map((r) => r.video_id as string);
    const pilotIds = pilotOrder(nde, 20261118).slice(0, 4);
    const order = goldOrder(nde, 20261118, pilotIds);
    const args = ['--resolution', 'haiku-first-pass', '--pilot-n', '4', '--gold-n', '3'];
    h.db.rows('nde_vids').find((r) => r.videoId === order[0])!.subtitles_punctuated = '';
    h.db.tables.bt_stance_answers = h.db.rows('bt_stance_answers').filter((r) => r.video_id !== order[0]);
    await goldSheet(args, h.deps);
    expect(h.logs.filter((l) => /WARNING/.test(l))).toEqual([]);
    h.db.tables.bt_stance_answers = h.db.rows('bt_stance_answers').filter((r) => r.video_id !== order[1]);
    await goldSheet(args, h.deps);
    expect(h.logs.filter((l) => /WARNING: 1 earlier candidates/.test(l))).toHaveLength(1);
  });
});

describe('expensive pass guard', () => {
  it('--pass recheck|arbiter --full needs --i-understand-this-is-the-expensive-pass on top of --confirm-spend', async () => {
    const h = harness(6);
    await h.firstPass();
    await h.run(['--full', '--pass', 'recheck', '--estimate']);
    const g = h.groupOf();
    const created = h.client.created.length;
    const clients = h.makeClient.mock.calls.length;
    // flags given: refused before anything is built or submitted
    await expect(h.run(['--full', '--pass', 'recheck', '--confirm-spend', g])).rejects.toThrow(/expensive-pass/);
    // flags omitted entirely: the stored group is still recognised as the expensive pass
    await expect(h.run(['--confirm-spend', g])).rejects.toThrow(/expensive pass/);
    await expect(h.run(['--pass', 'arbiter', '--full', '--confirm-spend', g])).rejects.toThrow(/expensive-pass/);
    expect(h.client.created.length).toBe(created);
    expect(h.makeClient.mock.calls.length).toBe(clients);
    // with the explicit flag it proceeds (fake API)
    await h.run(['--full', '--pass', 'recheck', '--confirm-spend', g, '--i-understand-this-is-the-expensive-pass']);
    expect(h.client.created.length).toBeGreaterThan(created);
  });

  it('does not affect the first pass or the pilot (including its Sonnet arm)', async () => {
    const h = harness(6);
    await h.run(['--pilot', '--pilot-n', '2', '--estimate']);
    const created = h.client.created.length;
    await h.run(['--pilot', '--confirm-spend', h.groupOf()]);
    expect(h.client.created.length).toBeGreaterThan(created);
    expect(h.db.rows('bt_stance_answers').some((r) => r.model.includes('sonnet'))).toBe(true);
    await h.firstPass();
  });
});
