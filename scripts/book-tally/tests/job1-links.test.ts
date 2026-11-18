import { mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { main as buildLinks } from '../job1/build-links';
import { classifySelfName, indexProfiles, linkInvariantViolations, matchName, planLinks, usableNameKey, type ProfileRow, type VideoMeta } from '../job1/logic';
import { fakeDb, type Row } from './job1-fakes';

const prof = (id: number, full_name: string, video_ids: string[] = []): ProfileRow => ({ id, slug: `p${id}`, full_name, summary: null, video_ids, first_shared_year: null });
const vid = (videoId: string, name: string | null): VideoMeta => ({ videoId, title: `t ${videoId}`, channelName: 'c', channelId: 'c', experiencerFullName: name });

const profiles = [
  prof(1, 'Anita Moorjani', ['v1', 'v2', 'x1']),
  prof(2, 'Bill Smith', ['v3']),
  prof(3, 'John Smith', ['v3']),
  prof(4, 'Robert Lee'),
  prof(5, 'Bob Lee'),
  prof(6, 'William Jones'),
];
const videoList: VideoMeta[] = [
  vid('v1', null), vid('v2', null), vid('v3', null), vid('x1', null),
  vid('u1', 'Anita Moorjani'), vid('u2', 'Dr. Robert Lee'), vid('u3', 'Rob Lee'), vid('u4', 'Bill Jones'),
  vid('u5', 'Zed Quark'), vid('u6', null), vid('u7', 'Anonymous'), vid('u8', 'Cher'), vid('u9', '  '), vid('u10', 'zed quark'),
];
const videos = new Map(videoList.map((v) => [v.videoId, v]));
const ndeIds = ['v1', 'v2', 'v3', 'u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u9', 'u10']; // x1 is not an NDE video

describe('matchName', () => {
  const idx = indexProfiles(profiles);
  it('exact: equal normalized full name matching one profile', () => {
    expect(matchName('Dr. Robert Lee', idx)).toEqual({ level: 'exact', profileId: 4 });
  });
  it('core: canonical first + last matching exactly one profile', () => {
    expect(matchName('Bill Jones', idx)).toEqual({ level: 'core', profileId: 6 });
    expect(matchName('William Q. Jones', idx)).toEqual({ level: 'core', profileId: 6 });
  });
  it('ambiguous: more than one profile at the deciding level', () => {
    expect(matchName('Rob Lee', idx)).toEqual({ level: 'ambiguous', via: 'core', profileIds: [4, 5] });
    const dup = indexProfiles([prof(1, 'Ann Poe'), prof(2, 'Ann Poe')]);
    expect(matchName('Ann Poe', dup)).toEqual({ level: 'ambiguous', via: 'exact', profileIds: [1, 2] });
  });
  it('titles and generational suffixes do not count as name tokens: "John Jr." is single-token', () => {
    for (const n of ['John Jr.', 'Dr. John', 'Mrs. Mary III', 'John Sr']) {
      expect(usableNameKey(n), n).toBeNull();
      expect(matchName(n, idx), n).toEqual({ level: 'none' });
      expect(classifySelfName(n, idx), n).toEqual({ kind: 'first_name_only' });
    }
    expect(usableNameKey('Zed Quark Jr.')).toBe('zed quark jr');
    expect(classifySelfName('Zed Quark Jr.', idx)).toEqual({ kind: 'named', key: 'zed quark jr' });
    const p = planLinks({ ndeVideoIds: ['x'], profiles: [], videos: new Map([['x', vid('x', 'John Jr.')]]) });
    expect(p.links.map((l) => l.person_key)).toEqual(['anon:x']);
    expect(p.anonVideoIds).toEqual(['x']);
  });
  it('none: no match, blank, placeholder or single-token names', () => {
    for (const n of ['Zed Quark', null, '', '  ', 'Anonymous', 'Cher', 'Unknown Person']) expect(matchName(n, idx)).toEqual({ level: 'none' });
    expect(usableNameKey('Cher')).toBeNull();
    expect(usableNameKey('Jane  Doe')).toBe('jane doe');
  });
});

describe('planLinks', () => {
  const plan = planLinks({ ndeVideoIds: ndeIds, profiles, videos });
  const find = (v: string, source?: string) => plan.links.filter((l) => l.video_id === v && (!source || l.source === source));

  it('profile links for NDE videos only, auto-accepted; multi-profile videos flagged', () => {
    expect(find('v1', 'profile_video_ids').map((l) => l.person_key)).toEqual(['profile:1']);
    expect(find('x1')).toEqual([]);
    expect(find('v3', 'profile_video_ids').map((l) => l.person_key)).toEqual(['profile:2', 'profile:3']);
    expect(find('v1')[0].autoAcceptBy).toBe('auto:profile_video_ids');
    expect(plan.multiProfile).toEqual([{ video_id: 'v3', profile_ids: [2, 3] }]);
    expect(plan.stats.profile_video_ids_not_in_nde_set).toBe(1);
  });
  it('exact match is auto-accepted, core match stays pending, ambiguous is not linked', () => {
    const ex = find('u2', 'exact_name_match');
    expect(ex).toHaveLength(1);
    expect(ex[0]).toMatchObject({ person_key: 'profile:4', match_level: 'exact', autoAcceptBy: 'auto:exact_name' });
    const core = find('u4', 'exact_name_match');
    expect(core[0]).toMatchObject({ person_key: 'profile:6', match_level: 'core', autoAcceptBy: null });
    expect(find('u3', 'exact_name_match')).toEqual([]);
    expect(plan.ambiguous).toEqual([{ video_id: 'u3', via: 'core', profile_ids: [4, 5] }]);
  });
  it('baseline: named:<exact key> for usable names, anon:<id> otherwise; all auto-accepted', () => {
    expect(find('u5', 'baseline')[0].person_key).toBe('named:zed quark');
    expect(find('u10', 'baseline')[0].person_key).toBe('named:zed quark'); // same person, two videos
    for (const v of ['u6', 'u7', 'u8', 'u9']) expect(find(v, 'baseline')[0].person_key).toBe(`anon:${v}`);
    expect(plan.anonVideoIds).toEqual(['u6', 'u7', 'u8', 'u9']);
    expect(plan.stats.baseline_anon_no_name).toBe(2);
    expect(plan.stats.baseline_anon_unusable_name).toBe(2);
    for (const l of plan.links.filter((x) => x.source === 'baseline')) expect(l.autoAcceptBy).toBe('auto:baseline');
  });
  it('INVARIANT: every NDE video has a profile link or exactly one baseline link (view bt_unmapped_nde_videos empty)', () => {
    expect(linkInvariantViolations(plan, ndeIds, videos)).toEqual([]);
    // each video: at least one accepted link
    for (const v of ndeIds) expect(plan.links.some((l) => l.video_id === v && l.autoAcceptBy)).toBe(true);
    // negative control: dropping a baseline link is detected
    const broken = { ...plan, links: plan.links.filter((l) => !(l.video_id === 'u5' && l.source === 'baseline')) };
    expect(linkInvariantViolations(broken, ndeIds, videos)).toEqual(['u5']);
    const doubled = { ...plan, links: [...plan.links, { ...find('u5', 'baseline')[0], person_key: 'anon:u5' }] };
    expect(linkInvariantViolations(doubled, ndeIds, videos)).toEqual(['u5']);
  });
  it('NDE videos missing from nde_vids are skipped and counted', () => {
    const p = planLinks({ ndeVideoIds: [...ndeIds, 'ghost'], profiles, videos });
    expect(p.stats.nde_videos_missing_in_nde_vids).toBe(1);
    expect(p.links.some((l) => l.video_id === 'ghost')).toBe(false);
  });
});

describe('classifySelfName', () => {
  const idx = indexProfiles(profiles);
  it('first-name-only never creates or joins a named: key', () => {
    expect(classifySelfName('Sarah', idx)).toEqual({ kind: 'first_name_only' });
    expect(classifySelfName('Dr. Sarah', idx)).toEqual({ kind: 'first_name_only' });
  });
  it('profile exact/core, ambiguous, placeholder, new named', () => {
    expect(classifySelfName('Robert Lee', idx)).toEqual({ kind: 'profile', level: 'exact', profileId: 4 });
    expect(classifySelfName('Bill Jones', idx)).toEqual({ kind: 'profile', level: 'core', profileId: 6 });
    expect(classifySelfName('Rob Lee', idx)).toEqual({ kind: 'ambiguous', profileIds: [4, 5] });
    expect(classifySelfName('Unknown Person', idx)).toEqual({ kind: 'unusable' });
    expect(classifySelfName('Zed Quark', idx)).toEqual({ kind: 'named', key: 'zed quark' });
  });
});

function seedWorld(): Record<string, Row[]> {
  return {
    experiencer_profiles: profiles.map((p) => ({ ...p })),
    nde_vids: videoList.map((v) => ({ ...v })),
    nde_analysis: [...ndeIds.map((v) => ({ video_id: v, experience_type: 'nde' })), { video_id: 'x1', experience_type: 'other' }],
  };
}

describe('build-links main (mock database)', () => {
  let tick = 0;
  const run = async (fake: ReturnType<typeof fakeDb>, argv: string[] = []) => {
    const logs: string[] = [];
    await buildLinks(argv, { db: fake.db, log: (l) => logs.push(l), outDir: mkdtempSync(path.join(tmpdir(), 'bl-')), now: () => new Date(Date.UTC(2026, 10, 18, 10, 0, tick++)) });
    return logs;
  };

  it('--dry-run reads only: no inserts, no bt_runs row, no files', async () => {
    const fake = fakeDb(seedWorld());
    fake.setMissing('bt_person_links');
    fake.setMissing('bt_link_decisions');
    const logs = await run(fake, ['--dry-run']);
    expect(fake.ops.filter((o) => o.op !== 'select')).toEqual([]);
    expect(logs.some((l) => l.includes('WARNING: 1 NDE video(s) are listed in 2+ profiles'))).toBe(true);
    expect(logs.at(-1)).toBe('dry-run: nothing written');
  });

  it('writes links + auto decisions once, only into bt_* tables, and is idempotent', async () => {
    const fake = fakeDb(seedWorld());
    await run(fake);
    const writes = fake.ops.filter((o) => o.op !== 'select');
    expect(writes.every((o) => o.table.startsWith('bt_'))).toBe(true);
    const links = fake.tables.bt_person_links;
    expect(links).toHaveLength(17);
    const bySource = (s: string) => links.filter((l) => l.source === s).length;
    expect(bySource('profile_video_ids')).toBe(4); // v1, v2, v3 x2
    expect(bySource('exact_name_match')).toBe(3); // u1 exact, u2 exact, u4 core
    expect(bySource('baseline')).toBe(10); // every unlinked NDE video (u1..u10) gets exactly one baseline link
    const decisions = fake.tables.bt_link_decisions;
    // everything except the single pending core link is auto-accepted
    expect(decisions).toHaveLength(links.length - 1);
    expect(decisions.every((d) => d.decision === 'accept' && String(d.decided_by).startsWith('auto:'))).toBe(true);
    const pending = links.find((l) => l.match_level === 'core')!;
    expect(decisions.some((d) => d.link_id === pending.id)).toBe(false);
    expect(fake.tables.bt_runs).toHaveLength(1);
    expect(fake.tables.bt_runs[0]).toMatchObject({ status: 'completed', job: 'other', model: 'none' });

    const before = { links: links.length, decisions: decisions.length };
    await run(fake); // second run: nothing new
    expect(fake.tables.bt_person_links).toHaveLength(before.links);
    expect(fake.tables.bt_link_decisions).toHaveLength(before.decisions);
    expect(fake.tables.bt_runs).toHaveLength(2);
  });

  it('records the multi-profile and ambiguous lists in the report file', async () => {
    const fake = fakeDb(seedWorld());
    const dir = mkdtempSync(path.join(tmpdir(), 'bl-'));
    await buildLinks([], { db: fake.db, log: () => undefined, outDir: dir, now: () => new Date('2026-11-18T10:00:00Z') });
    const rep = JSON.parse(readFileSync(path.join(dir, 'build_links_report.json'), 'utf8'));
    expect(rep.multi_profile).toEqual([{ video_id: 'v3', profile_ids: [2, 3] }]);
    expect(rep.ambiguous).toHaveLength(1);
  });
});
