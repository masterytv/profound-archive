import { describe, expect, it } from 'vitest';
import { jaroWinkler } from '../lib/names';
import {
  buildPersons, countByRule, findCandidatePairs, orientCandidate, type Person, type ProfileRow, type VideoMeta,
} from '../job1/logic';
import { insertCandidates } from '../job1/find-pairs';
import { fakeDb } from './job1-fakes';

const person = (key: string, name: string, extra: Partial<Person> = {}): Person => ({
  key, kind: key.startsWith('named:') ? 'named' : 'profile', name, slug: null, profile_id: null,
  channels: [], titles: [], first_shared_year: null, summary: null, video_count: 0, ...extra,
});
const rules = (names: string[]) => {
  const persons = names.map((n, i) => person(`profile:${i + 1}`, n));
  return findCandidatePairs(persons).map((p) => `${p.key_a}~${p.key_b}:${p.rule}`);
};

describe('candidate pair rules (SPEC step 3)', () => {
  it('nickname-equivalent first names with the same last name', () => {
    expect(rules(['Bill Smith', 'William Smith'])).toEqual(['profile:1~profile:2:last_and_first_similar']);
    expect(rules(['Liz Moore', 'Beth Moore'])).toHaveLength(1); // both canonicalize to elizabeth
  });
  it('first name that is an initial of the other', () => {
    expect(rules(['J. Smith', 'John Smith'])).toEqual(['profile:1~profile:2:last_and_first_similar']);
    expect(rules(['K Smith', 'John Smith'])).toEqual([]);
  });
  it('same last name needs a similar first name: Jaro-Winkler >= 0.85', () => {
    expect(jaroWinkler('katherine', 'catherine')).toBeGreaterThanOrEqual(0.85);
    expect(rules(['Katherine Lee', 'Catherine Lee'])).toHaveLength(1);
    expect(jaroWinkler('mary', 'peter')).toBeLessThan(0.85);
    expect(rules(['Mary Jones', 'Peter Jones'])).toEqual([]);
  });
  it('same first name with last-name JW >= 0.90 (spelling variants)', () => {
    expect(jaroWinkler('anderson', 'andersen')).toBeGreaterThanOrEqual(0.9);
    expect(rules(['Paul Anderson', 'Paul Andersen'])).toEqual(['profile:1~profile:2:first_and_last_similar']);
    expect(jaroWinkler('smith', 'jones')).toBeLessThan(0.9);
    expect(rules(['Paul Smith', 'Paul Jones'])).toEqual([]);
    // just below the threshold: no candidate
    expect(jaroWinkler('clark', 'clerk')).toBeLessThan(0.9);
    expect(jaroWinkler('marsh', 'marks')).toBeGreaterThanOrEqual(0.9);
    expect(rules(['Paul Clark', 'Paul Clerk'])).toEqual([]);
    expect(rules(['Paul Marsh', 'Paul Marks'])).toHaveLength(1);
  });
  it('nickname first names also count for the first-name side of the last-name rule', () => {
    expect(rules(['Bob Anderson', 'Robert Andersen'])).toEqual(['profile:1~profile:2:first_and_last_similar']);
  });
  it('swapped first/last', () => {
    expect(rules(['John Davis', 'Davis John'])).toEqual(['profile:1~profile:2:swapped']);
  });
  it('identical full names are candidates (duplicate profiles); a person never pairs with itself', () => {
    expect(rules(['Anita Moorjani', 'Anita Moorjani'])).toHaveLength(1);
    expect(rules(['Anita Moorjani'])).toEqual([]);
  });
  it('middle names and honorifics are ignored', () => {
    expect(rules(['Dr. John Q. Adams', 'John Adams'])).toHaveLength(1);
  });
  it('names without a last token never pair', () => {
    expect(rules(['Madonna', 'Madonna'])).toEqual([]);
  });
  it('orders keys (key_a < key_b) and returns a deterministic sorted list; named sorts before profile', () => {
    const persons = [person('profile:9', 'Bill Smith'), person('named:william smith', 'William Smith'), person('profile:2', 'Billy Smith')];
    const out = findCandidatePairs(persons);
    expect(out.map((p) => [p.key_a, p.key_b])).toEqual([
      ['named:william smith', 'profile:2'], ['named:william smith', 'profile:9'], ['profile:2', 'profile:9'],
    ]);
    for (const p of out) expect(p.key_a < p.key_b).toBe(true);
  });
  it('counts per rule', () => {
    const persons = ['Bill Smith', 'William Smith', 'Paul Anderson', 'Paul Andersen', 'John Davis', 'Davis John'].map((n, i) => person(`profile:${i}`, n));
    expect(countByRule(findCandidatePairs(persons))).toEqual({ last_and_first_similar: 1, first_and_last_similar: 1, swapped: 1 });
  });
  it('index-based generation finds exactly what a brute-force scan of the rule finds', async () => {
    const first = ['john', 'jon', 'bill', 'william', 'mary', 'marie', 'paul', 'pablo', 'anna', 'hana', 'j'];
    const last = ['smith', 'smyth', 'jones', 'john', 'paul', 'anderson', 'andersen', 'lee'];
    const persons: Person[] = [];
    for (const f of first) for (const l of last) persons.push(person(`profile:${persons.length + 1}`, `${f} ${l}`));
    const { candidatePairRule } = await import('../lib/names');
    let brute = 0;
    for (let i = 0; i < persons.length; i++) for (let j = i + 1; j < persons.length; j++) if (candidatePairRule(persons[i].name, persons[j].name)) brute++;
    expect(findCandidatePairs(persons)).toHaveLength(brute);
    expect(brute).toBeGreaterThan(40);
  });
});

describe('buildPersons and pair input', () => {
  const vm = (videoId: string, title: string, channelName: string, name: string | null): VideoMeta => ({ videoId, title, channelName, channelId: channelName, experiencerFullName: name });
  const profiles: ProfileRow[] = [
    { id: 1, slug: 'bill-smith', full_name: 'Bill Smith', summary: 'x'.repeat(2000), video_ids: ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7'], first_shared_year: 2015 },
    { id: 2, slug: 'madonna', full_name: 'Madonna', summary: null, video_ids: [], first_shared_year: null },
  ];
  const videos = new Map<string, VideoMeta>([
    ...['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7'].map((v, i) => [v, vm(v, `Title ${i}`, i < 4 ? 'Chan A' : 'Chan B', null)] as [string, VideoMeta]),
    ['n1', vm('n1', 'T n1', 'Chan C', 'William Smith')],
    ['n2', vm('n2', 'T n2', 'Chan C', 'william smith')],
    ['n3', vm('n3', 'T n3', 'Chan D', 'Bill Smith')], // exact profile name: not a named person
    ['n4', vm('n4', 'T n4', 'Chan D', 'Cher')], // single token: not a named person
    ['n5', vm('n5', 'T n5', 'Chan D', 'Anonymous')],
  ]);
  const { persons, skippedNoFirstLast } = buildPersons({ profiles, ndeVideoIds: [...videos.keys()], videos });

  it('skips single-token profiles, excludes named persons equal to a profile name', () => {
    expect(skippedNoFirstLast).toBe(1);
    expect(persons.map((p) => p.key)).toEqual(['profile:1', 'named:william smith']);
  });
  it('judge input: distinct channels, at most 5 titles, summary clipped to 1500 chars', () => {
    const p = persons[0];
    expect(p.channels).toEqual(['Chan A', 'Chan B']);
    expect(p.titles).toHaveLength(5);
    expect(p.summary).toHaveLength(1500);
    const out = findCandidatePairs(persons);
    expect(out).toHaveLength(1);
    const input = out[0].features.pair_input as { profile_1: { name: string; summary: string | null; slug: string | null }; profile_2: { name: string; first_shared_year: number | null } };
    expect(JSON.stringify(Object.keys(input))).toBe('["profile_1","profile_2"]');
    expect(input.profile_1.name).toBe('William Smith'); // named: sorts first
    expect(input.profile_1.summary).toBeNull();
    expect(input.profile_2.first_shared_year).toBe(2015);
  });
  it('named person: two raw spellings of the same key group into one person (2 videos)', () => {
    expect(persons[1].video_count).toBe(2);
  });
});

describe('insertCandidates', () => {
  const cand = (a: string, b: string) => ({ key_a: a, key_b: b, rule: 'swapped' as const, features: { keys: [a, b], names: ['A', 'B'], slugs: [null, null], profile_ids: [null, null], channels: [[], []] } });
  it('retries a pair swapped when the database collation rejects the key order', async () => {
    const { db, tables } = fakeDb({ experiencer_profiles: [{ id: 1 }] }, { check: (t, r) => (t === 'bt_merge_candidates' && r.key_a === 'named:ann marie lee' ? 'violates check constraint "bt_merge_candidates_ordered"' : null) });
    const n = await insertCandidates(db, [cand('named:ann marie lee', 'named:anna lee'), cand('named:b x', 'profile:1')], 'run1');
    expect(n).toBe(2);
    expect(tables.bt_merge_candidates.map((r) => [r.key_a, r.key_b])).toEqual([['named:anna lee', 'named:ann marie lee'], ['named:b x', 'profile:1']]);
  });
  it('orientCandidate follows the stored keys after a swap', () => {
    const f = cand('named:ann marie lee', 'named:anna lee');
    f.features.names = ['Ann Marie Lee', 'Anna Lee'];
    f.features.keys = ['named:ann marie lee', 'named:anna lee'];
    const [a, b] = orientCandidate({ key_a: 'named:anna lee', key_b: 'named:ann marie lee', features: f.features });
    expect([a.name, b.name]).toEqual(['Anna Lee', 'Ann Marie Lee']);
  });
});
