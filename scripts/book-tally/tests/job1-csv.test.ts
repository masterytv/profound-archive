import { mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { main as buildLinks } from '../job1/build-links';
import { main as exportReview } from '../job1/export-review';
import { main as importDecisions } from '../job1/import-decisions';
import { parseCsv, parseCsvRows, toCsv } from '../job1/csv';
import { LINK_DECISION_COL, PAIR_DECISION_COL, PAIR_HEADERS, parseDecisionSheet, planImport } from '../job1/sheets';
import { fakeDb, type Row } from './job1-fakes';

describe('csv', () => {
  const tricky = ['plain', 'with,comma', 'with "quotes"', 'multi\nline', 'crlf\r\nline', 'unicode é 日本', '', ' padded '];
  it('round-trips awkward cells exactly (formula neutralisation off)', () => {
    const headers = ['a', 'b'];
    const rows = tricky.map((t, i) => ({ a: t, b: String(i) }));
    const parsed = parseCsv(toCsv(headers, rows, { neutralizeFormulas: false }));
    expect(parsed.headers).toEqual(headers);
    expect(parsed.rows.map((r) => r.a)).toEqual(tricky);
  });
  it('neutralizes spreadsheet formulas by default but leaves numbers alone', () => {
    const rows = parseCsv(toCsv(['x'], [{ x: '=SUM(A1)' }, { x: '+1' }, { x: '@cmd' }, { x: '-5' }, { x: '-dash' }, { x: 12 }])).rows.map((r) => r.x);
    expect(rows).toEqual(["'=SUM(A1)", "'+1", "'@cmd", '-5', "'-dash", '12']);
  });
  it('handles BOM, CRLF, blank trailing lines; rejects unterminated quotes and duplicate headers', () => {
    expect(parseCsv('﻿a,b\r\n1,2\r\n\r\n').rows).toEqual([{ a: '1', b: '2' }]);
    expect(() => parseCsvRows('a\n"oops')).toThrow(/unterminated/);
    expect(() => parseCsv('a,a\n1,2')).toThrow(/duplicate/);
  });
});

const sheet = (rows: Array<Record<string, string>>, headers = ['pair_id', 'key_a', 'key_b', PAIR_DECISION_COL, 'note']) => toCsv(headers, rows, { neutralizeFormulas: false });

describe('parseDecisionSheet', () => {
  it('reads marked rows, skips blanks, is case/space tolerant on the exact words', () => {
    const p = parseDecisionSheet(sheet([
      { pair_id: '1', key_a: 'a', key_b: 'b', [PAIR_DECISION_COL]: ' MERGE ', note: 'same person' },
      { pair_id: '2', key_a: 'a', key_b: 'c', [PAIR_DECISION_COL]: 'keep_separate', note: '' },
      { pair_id: '3', key_a: 'a', key_b: 'd', [PAIR_DECISION_COL]: '', note: 'skip me' },
    ]));
    expect(p.kind).toBe('merge');
    expect(p.blank).toBe(1);
    expect(p.rows.map((r) => [r.id, r.decision, r.note])).toEqual([[1, 'merge', 'same person'], [2, 'keep_separate', '']]);
  });
  it('refuses ambiguous / free-text values for the whole file, naming line numbers only', () => {
    for (const bad of ['yes', 'm', 'merge?', 'keep separate', 'merge/keep_separate', 'maybe', 'unsure', 'revert', 'accept']) {
      expect(() => parseDecisionSheet(sheet([{ pair_id: '1', key_a: 'a', key_b: 'b', [PAIR_DECISION_COL]: 'merge', note: '' }, { pair_id: '2', key_a: 'a', key_b: 'b', [PAIR_DECISION_COL]: bad, note: '' }]))).toThrow(/line 3: decision is not one of merge\/keep_separate/);
    }
  });
  it('refuses a missing/non-numeric id and conflicting duplicate ids; tolerates identical duplicates', () => {
    expect(() => parseDecisionSheet(sheet([{ pair_id: '', key_a: '', key_b: '', [PAIR_DECISION_COL]: 'merge', note: '' }]))).toThrow(/pair_id missing/);
    expect(() => parseDecisionSheet(sheet([{ pair_id: '1', key_a: '', key_b: '', [PAIR_DECISION_COL]: 'merge', note: '' }, { pair_id: '1', key_a: '', key_b: '', [PAIR_DECISION_COL]: 'keep_separate', note: '' }]))).toThrow(/already marked differently/);
    expect(parseDecisionSheet(sheet([{ pair_id: '1', key_a: '', key_b: '', [PAIR_DECISION_COL]: 'merge', note: '' }, { pair_id: '1', key_a: '', key_b: '', [PAIR_DECISION_COL]: 'merge', note: '' }])).rows).toHaveLength(1);
  });
  it('detects link sheets and refuses merge words in them', () => {
    const h = ['link_id', 'video_id', LINK_DECISION_COL, 'note'];
    expect(parseDecisionSheet(sheet([{ link_id: '4', video_id: 'v', [LINK_DECISION_COL]: 'accept', note: '' }], h)).kind).toBe('link');
    expect(() => parseDecisionSheet(sheet([{ link_id: '4', video_id: 'v', [LINK_DECISION_COL]: 'merge', note: '' }], h))).toThrow(/accept\/reject/);
    expect(() => parseDecisionSheet('a,b\n1,2')).toThrow(/not a review sheet/);
  });
});

describe('planImport', () => {
  const p = parseDecisionSheet(sheet([
    { pair_id: '1', key_a: 'profile:1', key_b: 'profile:2', [PAIR_DECISION_COL]: 'merge', note: '' },
    { pair_id: '2', key_a: 'profile:1', key_b: 'profile:3', [PAIR_DECISION_COL]: 'keep_separate', note: 'n' },
  ]));
  const known = new Map([[1, { keyA: 'profile:1', keyB: 'profile:2' }], [2, { keyA: 'profile:1', keyB: 'profile:3' }]]);
  it('inserts new decisions; skips an identical earlier human decision', () => {
    const plan = planImport(p, known, new Map([[1, { decision: 'merge', decided_by: 'human' }]]));
    expect(plan.insert.map((r) => r.id)).toEqual([2]);
    expect(plan.skippedSame).toBe(1);
    // an auto decision with the same value is still recorded as the human's
    expect(planImport(p, known, new Map([[1, { decision: 'merge', decided_by: 'auto:haiku+sonnet' }]])).insert.map((r) => r.id)).toEqual([1, 2]);
  });
  it('reports unknown ids and stale/edited keys', () => {
    expect(planImport(p, new Map([[1, { keyA: 'profile:1', keyB: 'profile:2' }]]), new Map()).problems[0]).toMatch(/does not exist/);
    expect(planImport(p, new Map([[1, { keyA: 'profile:9', keyB: 'profile:2' }], [2, { keyA: 'profile:1', keyB: 'profile:3' }]]), new Map()).problems[0]).toMatch(/do not match/);
  });
});

// ---- full round trip: build-links + candidates + judgments -> export -> human marks -> import ----

const prof = (id: number, full_name: string, video_ids: string[] = []) => ({ id, slug: `p${id}`, full_name, summary: null, video_ids, first_shared_year: null });
const vm = (videoId: string, name: string | null) => ({ videoId, title: `title ${videoId}`, channelName: 'c', channelId: 'c', experiencerFullName: name });
const world = (): Record<string, Row[]> => ({
  experiencer_profiles: [prof(1, 'William Jones', ['v1', 'v2']), prof(2, 'Bob Lee', ['v2']), prof(3, 'Robert Lee'), prof(4, 'Wil Jones')],
  nde_vids: [vm('v1', null), vm('v2', null), vm('u1', 'Bill Jones'), vm('u2', 'Rob Lee')],
  nde_analysis: ['v1', 'v2', 'u1', 'u2'].map((v) => ({ video_id: v, experience_type: 'nde' })),
  bt_merge_candidates: [
    { id: 1, key_a: 'profile:1', key_b: 'profile:4', rule: 'last_and_first_similar', features: { keys: ['profile:1', 'profile:4'], names: ['William Jones', 'Wil Jones'], slugs: ['p1', 'p4'], profile_ids: [1, 4], channels: [['c'], []] } },
    { id: 2, key_a: 'profile:2', key_b: 'profile:3', rule: 'last_and_first_similar', features: { keys: ['profile:2', 'profile:3'], names: ['Bob Lee', 'Robert Lee'], slugs: ['p2', 'p3'], profile_ids: [2, 3], channels: [[], []] } },
  ],
  bt_merge_judgments: [
    { id: 1, candidate_id: 1, judge: 'haiku', verdict: 'same', reason: 'hr1' }, { id: 2, candidate_id: 1, judge: 'sonnet', verdict: 'different', reason: 'sr1' },
    { id: 3, candidate_id: 2, judge: 'haiku', verdict: 'same', reason: 'hr2' }, { id: 4, candidate_id: 2, judge: 'sonnet', verdict: 'same', reason: 'sr2' },
  ],
  bt_merge_decisions: [{ id: 1, candidate_id: 2, decision: 'merge', decided_by: 'auto:haiku+sonnet' }],
});

describe('export -> mark -> import round trip (mock database)', () => {
  let tick = 0;
  const deps = (fake: ReturnType<typeof fakeDb>, outDir: string) => ({ db: fake.db, log: () => undefined, outDir, now: () => new Date(Date.UTC(2026, 10, 18, 11, 0, tick++)) });

  it('export lists review pairs and auto merges; marked sheets import as human decisions, idempotently', async () => {
    const fake = fakeDb(world());
    const dir = mkdtempSync(path.join(tmpdir(), 'rt-'));
    await buildLinks([], deps(fake, dir));
    await exportReview([], deps(fake, dir));

    const pairs = parseCsv(readFileSync(path.join(dir, 'dedup_review_pairs.csv'), 'utf8'));
    expect(pairs.headers).toEqual(PAIR_HEADERS);
    expect(pairs.rows.map((r) => r.pair_id)).toEqual(['1']); // Haiku same / Sonnet different
    expect(pairs.rows[0]).toMatchObject({ name_a: 'William Jones', name_b: 'Wil Jones', haiku_verdict: 'same', sonnet_verdict: 'different', haiku_reason: 'hr1', [PAIR_DECISION_COL]: '' });
    const auto = parseCsv(readFileSync(path.join(dir, 'dedup_auto_merges.csv'), 'utf8'));
    expect(auto.rows.map((r) => r.pair_id)).toEqual(['2']);

    const links = parseCsv(readFileSync(path.join(dir, 'link_proposals_review.csv'), 'utf8'));
    const kinds = links.rows.map((r) => r.kind).sort();
    expect(kinds).toEqual(['ambiguous_core', 'core', 'multi_profile', 'multi_profile']);
    expect(links.rows.filter((r) => r.kind === 'multi_profile').every((r) => r.video_id === 'v2' && r.link_id !== '')).toBe(true);
    expect(links.rows.find((r) => r.kind === 'ambiguous_core')!.link_id).toBe('');

    // human marks pair 1 merge, un-marks nothing, and flips auto merge 2 to keep_separate
    const markedPairs = pairs.rows.map((r) => ({ ...r, [PAIR_DECISION_COL]: 'merge', note: 'checked' }));
    const markedAuto = auto.rows.map((r) => ({ ...r, [PAIR_DECISION_COL]: 'keep_separate' }));
    writeFileSync(path.join(dir, 'p1.csv'), toCsv(pairs.headers, markedPairs));
    writeFileSync(path.join(dir, 'p2.csv'), toCsv(auto.headers, markedAuto));

    const writesBefore = fake.ops.filter((o) => o.op === 'insert').length;
    await importDecisions(['--file', path.join(dir, 'p1.csv'), '--dry-run'], deps(fake, dir));
    expect(fake.ops.filter((o) => o.op === 'insert').length).toBe(writesBefore);

    await importDecisions(['--file', path.join(dir, 'p1.csv')], deps(fake, dir));
    await importDecisions(['--file', path.join(dir, 'p2.csv')], deps(fake, dir));
    const human = fake.tables.bt_merge_decisions.filter((d) => d.decided_by === 'human');
    expect(human.map((d) => [d.candidate_id, d.decision, d.note])).toEqual([[1, 'merge', 'checked'], [2, 'keep_separate', null]]);

    await importDecisions(['--file', path.join(dir, 'p1.csv')], deps(fake, dir)); // idempotent
    await importDecisions(['--file', path.join(dir, 'p2.csv')], deps(fake, dir));
    expect(fake.tables.bt_merge_decisions.filter((d) => d.decided_by === 'human')).toHaveLength(2);

    // the pair is no longer in the review sheet; the auto-merge sheet no longer lists the reverted one
    await exportReview([], deps(fake, dir));
    expect(parseCsv(readFileSync(path.join(dir, 'dedup_review_pairs.csv'), 'utf8')).rows).toEqual([]);
    expect(parseCsv(readFileSync(path.join(dir, 'dedup_auto_merges.csv'), 'utf8')).rows).toEqual([]);

    // link sheet: accept the core proposal
    const core = links.rows.find((r) => r.kind === 'core')!;
    writeFileSync(path.join(dir, 'l.csv'), toCsv(links.headers, [{ ...core, [LINK_DECISION_COL]: 'accept' }]));
    await importDecisions(['--file', path.join(dir, 'l.csv')], deps(fake, dir));
    expect(fake.tables.bt_link_decisions.filter((d) => d.decided_by === 'human').map((d) => [d.link_id, d.decision])).toEqual([[Number(core.link_id), 'accept']]);
    // a decision on a row without a link id (ambiguous) is refused, nothing written
    const amb = links.rows.find((r) => r.kind === 'ambiguous_core')!;
    writeFileSync(path.join(dir, 'l2.csv'), toCsv(links.headers, [{ ...amb, [LINK_DECISION_COL]: 'accept' }]));
    await expect(importDecisions(['--file', path.join(dir, 'l2.csv')], deps(fake, dir))).rejects.toThrow(/link_id missing/);
  });

  it('a sheet with an ambiguous value or an unknown pair id writes nothing', async () => {
    const fake = fakeDb(world());
    const dir = mkdtempSync(path.join(tmpdir(), 'rt-'));
    const before = fake.tables.bt_merge_decisions.length;
    writeFileSync(path.join(dir, 'bad.csv'), sheet([{ pair_id: '1', key_a: 'profile:1', key_b: 'profile:4', [PAIR_DECISION_COL]: 'yes', note: '' }]));
    await expect(importDecisions(['--file', path.join(dir, 'bad.csv')], deps(fake, dir))).rejects.toThrow(/refusing to import/);
    writeFileSync(path.join(dir, 'unk.csv'), sheet([{ pair_id: '99', key_a: 'x', key_b: 'y', [PAIR_DECISION_COL]: 'merge', note: '' }]));
    await expect(importDecisions(['--file', path.join(dir, 'unk.csv')], deps(fake, dir))).rejects.toThrow(/does not exist/);
    writeFileSync(path.join(dir, 'stale.csv'), sheet([{ pair_id: '1', key_a: 'profile:1', key_b: 'profile:99', [PAIR_DECISION_COL]: 'merge', note: '' }]));
    await expect(importDecisions(['--file', path.join(dir, 'stale.csv')], deps(fake, dir))).rejects.toThrow(/do not match/);
    expect(fake.tables.bt_merge_decisions).toHaveLength(before);
    expect(fake.tables.bt_runs ?? []).toEqual([]);
  });
});
