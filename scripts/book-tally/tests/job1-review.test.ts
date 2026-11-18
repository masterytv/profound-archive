import { mkdtempSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { main as buildLinks } from '../job1/build-links';
import { parseCsv, toCsv } from '../job1/csv';
import { main as exportReview, pairSheets, resolveOutDir } from '../job1/export-review';
import { main as importDecisions } from '../job1/import-decisions';
import { findLinkDrift } from '../job1/logic';
import { computeMergeConflicts, effectiveDecisions, findMergeConflicts } from '../job1/merge-conflicts';
import { LINK_DECISION_COL, LINK_HEADERS, NOT_APPLICABLE, PAIR_DECISION_COL, parseDecisionSheet, unmappedAfter } from '../job1/sheets';
import { fakeDb, type Row } from './job1-fakes';

const cand = (id: number, a: string, b: string) => ({ id, key_a: a, key_b: b });
const dec = (id: number, candidate_id: number, decision: string, decided_by = 'human') => ({ id, candidate_id, decision, decided_by });

describe('merge conflicts (transitive merge vs keep_separate)', () => {
  const cands = [cand(1, 'profile:1', 'profile:2'), cand(2, 'profile:2', 'profile:3'), cand(3, 'profile:1', 'profile:3'), cand(4, 'profile:8', 'profile:9')];
  it('A~B and B~C merged while A,C decided keep_separate is a conflict', () => {
    const c = computeMergeConflicts(cands, [dec(1, 1, 'merge', 'auto:haiku+sonnet'), dec(2, 2, 'merge'), dec(3, 3, 'keep_separate')]);
    expect(c).toEqual([{ component: 'profile:1', keys: ['profile:1', 'profile:2', 'profile:3'], mergeEdges: [1, 2], conflicting: [3] }]);
  });
  it('no conflict when keep_separate pairs sit in different components, or the merge was reverted, or a later decision flipped it', () => {
    expect(computeMergeConflicts(cands, [dec(1, 1, 'merge'), dec(2, 4, 'keep_separate')])).toEqual([]);
    expect(computeMergeConflicts(cands, [dec(1, 1, 'merge'), dec(2, 2, 'merge'), dec(3, 3, 'keep_separate'), dec(4, 2, 'revert')])).toEqual([]);
    expect(computeMergeConflicts(cands, [dec(1, 1, 'merge'), dec(2, 2, 'merge'), dec(3, 3, 'keep_separate'), dec(4, 3, 'merge')])).toEqual([]);
    expect(effectiveDecisions([dec(1, 1, 'merge'), dec(2, 1, 'revert')]).has(1)).toBe(false);
  });
  it('findMergeConflicts(db) reads the tables (job2 rollup entry point)', async () => {
    const fake = fakeDb({ bt_merge_candidates: cands as Row[], bt_merge_decisions: [dec(1, 1, 'merge'), dec(2, 2, 'merge'), dec(3, 3, 'keep_separate')] });
    expect((await findMergeConflicts(fake.db)).map((c) => c.component)).toEqual(['profile:1']);
  });

  it('pairSheets lists every row of a conflicting component as flag=merge_conflict', () => {
    const features = (a: string, b: string) => ({ keys: [a, b], names: [a, b], slugs: [null, null], profile_ids: [1, 2], channels: [[], []] });
    const full = cands.map((c) => ({ ...c, rule: 'swapped', features: features(c.key_a, c.key_b) }));
    const s = pairSheets(full as never, [], [dec(1, 1, 'merge', 'auto:haiku+sonnet'), dec(2, 2, 'merge'), dec(3, 3, 'keep_separate')] as never);
    expect(s.counts).toMatchObject({ merge_conflicts: 1, merge_conflict_rows: 3 });
    expect(s.review.map((r) => [r.pair_id, r.flag, r.component])).toEqual([[1, 'merge_conflict', 'profile:1'], [2, 'merge_conflict', 'profile:1'], [3, 'merge_conflict', 'profile:1']]);
    expect(s.autoMerges.map((r) => r.pair_id)).toEqual([1]); // still listed for spot-checking
  });
});

describe('export-review: merge_conflict rows, n/a rows, out-dir restriction', () => {
  const features = (a: string, b: string) => ({ keys: [a, b], names: [a, b], slugs: [null, null], profile_ids: [1, 2], channels: [[], []] });
  const seed = (): Record<string, Row[]> => ({
    bt_merge_candidates: [cand(1, 'profile:1', 'profile:2'), cand(2, 'profile:2', 'profile:3'), cand(3, 'profile:1', 'profile:3')].map((c) => ({ ...c, rule: 'swapped', features: features(c.key_a, c.key_b) })),
    bt_merge_decisions: [dec(1, 1, 'merge', 'auto:haiku+sonnet'), dec(2, 2, 'merge'), dec(3, 3, 'keep_separate')],
    experiencer_profiles: [{ id: 1, slug: 'a', full_name: 'Al One', summary: null, video_ids: [], first_shared_year: null }, { id: 2 }, { id: 3 }].map((p) => ({ video_ids: [], ...p })),
    nde_analysis: [{ video_id: 'u1', experience_type: 'nde' }],
    nde_vids: [{ videoId: 'u1', title: 't', channelName: 'c', channelId: 'c', experiencerFullName: 'Zed Quark' }],
  });
  const deps = (fake: ReturnType<typeof fakeDb>, outDir: string, logs: string[] = []) => ({ db: fake.db, log: (l: string) => logs.push(l), outDir, now: () => new Date('2026-11-18T10:00:00Z') });

  it('writes merge_conflict rows to dedup_review_pairs.csv and warns', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'rv-'));
    const logs: string[] = [];
    await exportReview([], deps(fakeDb(seed()), dir, logs));
    const rows = parseCsv(readFileSync(path.join(dir, 'dedup_review_pairs.csv'), 'utf8')).rows;
    expect(rows.map((r) => [r.pair_id, r.flag, r.component])).toEqual([['1', 'merge_conflict', 'profile:1'], ['2', 'merge_conflict', 'profile:1'], ['3', 'merge_conflict', 'profile:1']]);
    expect(logs.join('\n')).toMatch(/WARNING: 1 merge conflict/);
  });

  it('rows without a link id get "n/a" in the decision column plus an explanatory note; the human is told', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'rv-'));
    const logs: string[] = [];
    const s = seed();
    s.experiencer_profiles = [
      { id: 1, slug: 'a', full_name: 'Zed Quark', summary: null, video_ids: [], first_shared_year: null },
      { id: 2, slug: 'b', full_name: 'Zed Quark', summary: null, video_ids: [], first_shared_year: null },
    ];
    s.nde_vids = [{ videoId: 'u1', title: 't', channelName: 'c', channelId: 'c', experiencerFullName: 'Zed Quark' }]; // exact name of two profiles: ambiguous
    await exportReview([], deps(fakeDb(s), dir, logs));
    const links = parseCsv(readFileSync(path.join(dir, 'link_proposals_review.csv'), 'utf8')).rows;
    const amb = links.find((r) => r.kind === 'ambiguous_exact')!;
    expect(amb.link_id).toBe('');
    expect(amb[LINK_DECISION_COL]).toBe(NOT_APPLICABLE);
    expect(amb.note).toMatch(/no link row exists/);
    expect(logs.join('\n')).toMatch(/NOTE: \d+ sheet row\(s\) have no link id/);
    // and import treats n/a as blank rather than refusing
    expect(parseDecisionSheet(toCsv(LINK_HEADERS, links as never, { neutralizeFormulas: false })).rows).toEqual([]);
  });

  it('--out-dir must stay inside the out root', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'root-'));
    expect(resolveOutDir(root, undefined)).toBe(path.resolve(root));
    expect(resolveOutDir(root, 'sub/dir')).toBe(path.join(path.resolve(root), 'sub', 'dir'));
    expect(() => resolveOutDir(root, '../elsewhere')).toThrow(/must stay inside/);
    expect(() => resolveOutDir(root, '/etc')).toThrow(/must stay inside/);
    expect(() => resolveOutDir(root, 'a/../../x')).toThrow(/must stay inside/);
    await expect(exportReview(['--out-dir', '../evil'], deps(fakeDb(seed()), root))).rejects.toThrow(/must stay inside/);
    await exportReview(['--out-dir', 'sub'], deps(fakeDb(seed()), root));
    expect(existsSync(path.join(root, 'sub', 'dedup_review_pairs.csv'))).toBe(true);
  });
});

describe('import-decisions refuses a link file that would leave an NDE video unmapped', () => {
  it('unmappedAfter: only accepted links count; revert/reject/pending do not', () => {
    const links = [{ id: 1, video_id: 'v1' }, { id: 2, video_id: 'v1' }, { id: 3, video_id: 'v2' }];
    const latest = new Map([[1, 'accept'], [3, 'accept']]);
    expect(unmappedAfter(links, latest, [{ id: 1, decision: 'reject' }], new Set(['v1']))).toEqual(['v1']);
    expect(unmappedAfter(links, latest, [{ id: 1, decision: 'reject' }, { id: 2, decision: 'accept' }], new Set(['v1']))).toEqual([]);
    expect(unmappedAfter(links, latest, [{ id: 3, decision: 'revert' }], new Set(['v2']))).toEqual(['v2']);
  });

  const world = (): Record<string, Row[]> => ({
    nde_analysis: [{ video_id: 'v1', experience_type: 'nde' }, { video_id: 'v2', experience_type: 'nde' }],
    nde_vids: [{ videoId: 'v1' }, { videoId: 'v2' }],
    experiencer_profiles: [{ id: 1 }],
    bt_person_links: [
      { id: 1, video_id: 'v1', person_key: 'profile:1', source: 'profile_video_ids' },
      { id: 2, video_id: 'v1', person_key: 'named:zed quark', source: 'baseline' },
      { id: 3, video_id: 'v2', person_key: 'anon:v2', source: 'baseline' },
    ],
    bt_link_decisions: [{ id: 1, link_id: 1, decision: 'accept', decided_by: 'auto:profile_video_ids' }, { id: 2, link_id: 3, decision: 'accept', decided_by: 'auto:baseline' }],
  });
  const sheetOf = (rows: Array<[number, string, string]>) => toCsv(['link_id', 'video_id', LINK_DECISION_COL, 'note'], rows.map(([id, v, d]) => ({ link_id: id, video_id: v, [LINK_DECISION_COL]: d, note: '' })), { neutralizeFormulas: false });
  const run = async (fake: ReturnType<typeof fakeDb>, rows: Array<[number, string, string]>) => {
    const dir = mkdtempSync(path.join(tmpdir(), 'im-'));
    const file = path.join(dir, 's.csv');
    require('fs').writeFileSync(file, sheetOf(rows));
    return importDecisions(['--file', file], { db: fake.db, log: () => undefined, now: () => new Date(Date.UTC(2026, 10, 18, 10, 0, fake.ops.length)) });
  };

  it('rejecting the only accepted link of a video is refused and writes nothing', async () => {
    const fake = fakeDb(world());
    await expect(run(fake, [[3, 'v2', 'reject']])).rejects.toThrow(/would leave 1 NDE video\(s\) with no accepted link/);
    expect(fake.ops.filter((o) => o.op === 'insert')).toEqual([]);
    expect(fake.tables.bt_link_decisions).toHaveLength(2);
  });
  it('rejecting one of two links is fine when another accepted link remains; accepting a replacement in the same file is fine', async () => {
    const fake = fakeDb(world());
    await run(fake, [[2, 'v1', 'accept'], [1, 'v1', 'reject']]); // swap: accept the baseline, reject the profile link
    expect(fake.tables.bt_link_decisions.filter((d) => d.decided_by === 'human').map((d) => [d.link_id, d.decision]).sort()).toEqual([[1, 'reject'], [2, 'accept']]);
  });
  it('rejecting the profile link when no replacement is accepted is refused', async () => {
    const fake = fakeDb(world());
    await expect(run(fake, [[1, 'v1', 'reject']])).rejects.toThrow(/no accepted link/);
  });
});

describe('link drift (accepted links no longer in the current plan)', () => {
  it('findLinkDrift: profile link, name link and baseline drift; self-name links and pending links are not reported', () => {
    const planned = [
      { video_id: 'v1', person_key: 'profile:1', profile_id: 1, source: 'profile_video_ids' as const, match_level: 'profile' as const, evidence: {}, autoAcceptBy: 'x' },
      { video_id: 'u1', person_key: 'named:zed quark', profile_id: null, source: 'baseline' as const, match_level: 'baseline' as const, evidence: {}, autoAcceptBy: 'x' },
    ];
    const existing = [
      { id: 1, video_id: 'v1', person_key: 'profile:1', source: 'profile_video_ids' }, // still planned
      { id: 2, video_id: 'v1', person_key: 'profile:2', source: 'profile_video_ids' }, // left profile 2
      { id: 3, video_id: 'u1', person_key: 'named:old name', source: 'baseline' }, // name changed
      { id: 4, video_id: 'v1', person_key: 'anon:v1', source: 'baseline' }, // video now in a profile
      { id: 5, video_id: 'u1', person_key: 'profile:5', source: 'exact_name_match' },
      { id: 6, video_id: 'u1', person_key: 'named:x y', source: 'transcript_self_name' },
      { id: 7, video_id: 'v1', person_key: 'profile:9', source: 'profile_video_ids' }, // not accepted: pending/rejected
    ];
    const latest = new Map(existing.filter((l) => l.id !== 7).map((l) => [l.id, { decision: 'accept', decided_by: 'auto:x' }]));
    latest.set(7, { decision: 'reject', decided_by: 'human' });
    const drift = findLinkDrift(planned, existing, latest);
    expect(drift.map((d) => [d.link_id, d.reason])).toEqual([
      [2, 'no_longer_listed_in_profile_video_ids'], [3, 'name_changed'], [4, 'video_now_in_a_profile'], [5, 'name_no_longer_matches_this_profile'],
    ]);
  });

  it('build-links writes out/link_drift.csv, prints the count, and does not revert anything', async () => {
    const fake = fakeDb({
      experiencer_profiles: [{ id: 1, slug: 'a', full_name: 'Al One', summary: null, video_ids: ['v1'], first_shared_year: null }],
      nde_analysis: [{ video_id: 'v1', experience_type: 'nde' }],
      nde_vids: [{ videoId: 'v1', title: 't', channelName: 'c', channelId: 'c', experiencerFullName: null }],
      bt_person_links: [{ id: 1, video_id: 'v1', person_key: 'profile:2', profile_id: 2, source: 'profile_video_ids', match_level: 'profile', evidence: {} }],
      bt_link_decisions: [{ id: 1, link_id: 1, decision: 'accept', decided_by: 'auto:profile_video_ids' }],
    });
    const dir = mkdtempSync(path.join(tmpdir(), 'dr-'));
    const logs: string[] = [];
    await buildLinks([], { db: fake.db, log: (l) => logs.push(l), outDir: dir, now: () => new Date('2026-11-18T10:00:00Z') });
    const rows = parseCsv(readFileSync(path.join(dir, 'link_drift.csv'), 'utf8')).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ link_id: '1', person_key: 'profile:2', reason: 'no_longer_listed_in_profile_video_ids', planned_person_keys: 'profile:1' });
    expect(logs.join('\n')).toMatch(/drift: 1 accepted link/);
    expect(fake.tables.bt_link_decisions.some((d) => d.decision === 'revert' || d.decision === 'reject')).toBe(false);
  });
});

describe('sheet column constants stay in sync', () => {
  it('decision columns are the documented names', () => {
    expect(PAIR_DECISION_COL).toBe('decision (merge/keep_separate)');
    expect(LINK_DECISION_COL).toBe('decision (accept/reject)');
  });
});
