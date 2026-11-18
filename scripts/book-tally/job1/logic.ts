/**
 * Pure Job 1 logic (no I/O): name matching, link planning, candidate pairs,
 * judging outcome, name-in-quote check. Everything here is unit-tested.
 *
 * Notes for the README (method limits a reviewer should be told):
 *  - Candidate rule 2 (same first name AND Jaro-Winkler(last) >= 0.90) compares CANONICAL first
 *    names, so a nickname family counts as "the same first name" (bill/will/liam/... are all
 *    "william"). It therefore also pairs different people who merely have different last names
 *    that are spelled alike. This is deliberately broad: candidates only enter judging, they
 *    never merge anything by themselves.
 *  - A self-stated name needs a verified quote of at least 5 normalized tokens (lib/quote).
 *    Apostrophes are deleted, so "I'm Jane Smith" is 3 tokens and a bare 4-token self-introduction
 *    ("my name is Jane Smith" = 5 tokens passes; "I am Jane Smith" = 4 tokens does not) fails the
 *    minimum unless the model quotes more surrounding words. This under-reports self-names; it
 *    never invents them.
 *  - The name must also be preceded immediately by a first-person introducer (SELF_INTRODUCERS).
 */
import {
  candidatePairRule, canonicalFirst, coreKey, exactKey, HONORIFICS, isInitialOf, jaroWinkler,
  nicknameEquivalent, parseName, type CandidateRule,
} from '../lib/names';
import { normalize as quoteNormalize, tokenize } from '../lib/quote';

// ---- inputs ---------------------------------------------------------------------

export interface ProfileRow {
  id: number;
  slug: string;
  full_name: string;
  summary: string | null;
  video_ids: string[] | null;
  first_shared_year: number | null;
}

export interface VideoMeta {
  videoId: string;
  title: string | null;
  channelName: string | null;
  channelId: string | null;
  experiencerFullName: string | null;
}

/**
 * Metadata values that look like names but are placeholders. A video carrying one of these
 * is treated as unnamed (it becomes anon:<videoId>), never merged into a shared `named:` person.
 */
export const PLACEHOLDER_NAMES = new Set([
  'anonymous', 'anon', 'unknown', 'unknown person', 'no name', 'noname', 'name unknown', 'unnamed', 'na', 'n a', 'none',
  'guest', 'anonymous guest', 'anonymous person', 'nde', 'test', 'tbd', 'undefined', 'null',
]);

/** exact_key of a metadata name, or null if blank / placeholder / single token (too ambiguous to key a person). */
export function usableNameKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const k = exactKey(raw);
  if (!k || PLACEHOLDER_NAMES.has(k)) return null;
  return k.includes(' ') ? k : null;
}

// ---- name -> profile matching (link proposals) ---------------------------------------

export interface ProfileIndex {
  byExact: Map<string, number[]>;
  byCore: Map<string, number[]>;
  profiles: Map<number, ProfileRow>;
}

export function indexProfiles(profiles: ProfileRow[]): ProfileIndex {
  const byExact = new Map<string, number[]>();
  const byCore = new Map<string, number[]>();
  const add = (m: Map<string, number[]>, k: string | null, id: number) => {
    if (!k) return;
    const arr = m.get(k);
    if (arr) { if (!arr.includes(id)) arr.push(id); } else m.set(k, [id]);
  };
  for (const p of profiles) {
    add(byExact, usableNameKey(p.full_name), p.id);
    add(byCore, coreKey(p.full_name), p.id);
  }
  return { byExact, byCore, profiles: new Map(profiles.map((p) => [p.id, p])) };
}

export type NameMatch =
  | { level: 'exact' | 'core'; profileId: number }
  | { level: 'ambiguous'; via: 'exact' | 'core'; profileIds: number[] }
  | { level: 'none' };

/**
 * SPEC step 2. exact: exact_key equal to exactly one profile. Otherwise core: core_key equal
 * to exactly one profile. More than one profile at the deciding level is ambiguous (not linked).
 * Names without a first and a last token never match.
 */
export function matchName(raw: string | null | undefined, idx: ProfileIndex): NameMatch {
  const ek = usableNameKey(raw);
  if (!ek || !raw) return { level: 'none' };
  const ex = idx.byExact.get(ek) ?? [];
  if (ex.length === 1) return { level: 'exact', profileId: ex[0] };
  if (ex.length > 1) return { level: 'ambiguous', via: 'exact', profileIds: [...ex].sort((a, b) => a - b) };
  const ck = coreKey(raw);
  const co = ck ? idx.byCore.get(ck) ?? [] : [];
  if (co.length === 1) return { level: 'core', profileId: co[0] };
  if (co.length > 1) return { level: 'ambiguous', via: 'core', profileIds: [...co].sort((a, b) => a - b) };
  return { level: 'none' };
}

// ---- link planning ---------------------------------------------------------------

export type LinkSource = 'profile_video_ids' | 'exact_name_match' | 'transcript_self_name' | 'baseline';

export interface PlannedLink {
  video_id: string;
  person_key: string;
  profile_id: number | null;
  source: LinkSource;
  match_level: 'profile' | 'exact' | 'core' | 'self_name' | 'baseline';
  evidence: Record<string, unknown>;
  /** decided_by for an auto 'accept' decision row; null = left pending for a human. */
  autoAcceptBy: string | null;
}

export interface LinkPlan {
  links: PlannedLink[];
  ambiguous: Array<{ video_id: string; via: 'exact' | 'core'; profile_ids: number[] }>;
  /** NDE videos listed in two or more profiles' video_ids (links are written for each; a human decides). */
  multiProfile: Array<{ video_id: string; profile_ids: number[] }>;
  /** Unlinked, unnamed (or unusable-name) videos. These are the name-extraction targets. */
  anonVideoIds: string[];
  /** Subset of anonVideoIds whose experiencerFullName is blank/null (the ~639 default extraction targets). */
  anonBlankVideoIds: string[];
  stats: Record<string, number>;
}

export const AUTO_BY = {
  profile: 'auto:profile_video_ids',
  exact: 'auto:exact_name',
  baseline: 'auto:baseline',
} as const;

/**
 * profile_video_ids links (auto-accept) for NDE videos; exact/core proposals for unlinked
 * NDE videos; baseline named:/anon: links (auto-accept) for every unlinked NDE video.
 * `videos` is the nde_vids metadata; NDE videos absent from it are skipped and counted.
 */
export function planLinks(input: {
  ndeVideoIds: string[];
  profiles: ProfileRow[];
  videos: Map<string, VideoMeta>;
}): LinkPlan {
  const nde = new Set(input.ndeVideoIds);
  const idx = indexProfiles(input.profiles);
  const links: PlannedLink[] = [];
  const stats: Record<string, number> = {
    nde_videos: nde.size, profiles: input.profiles.length,
    profile_links: 0, profile_video_ids_not_in_nde_set: 0, nde_videos_missing_in_nde_vids: 0,
    videos_in_more_than_one_profile: 0,
    unlinked_nde_videos: 0, exact_links: 0, core_links: 0, ambiguous: 0,
    baseline_named: 0, baseline_anon_no_name: 0, baseline_anon_unusable_name: 0,
  };

  const inProfile = new Set<string>();
  const profileIds = new Map<string, number[]>();
  for (const p of [...input.profiles].sort((a, b) => a.id - b.id)) {
    for (const vid of new Set(p.video_ids ?? [])) {
      inProfile.add(vid);
      (profileIds.get(vid) ?? profileIds.set(vid, []).get(vid)!).push(p.id);
      if (!nde.has(vid)) { stats.profile_video_ids_not_in_nde_set++; continue; }
      if (!input.videos.has(vid)) continue;
      links.push({
        video_id: vid, person_key: `profile:${p.id}`, profile_id: p.id, source: 'profile_video_ids',
        match_level: 'profile', evidence: {}, autoAcceptBy: AUTO_BY.profile,
      });
      stats.profile_links++;
    }
  }
  const multiProfile: LinkPlan['multiProfile'] = [];
  for (const [vid, ids] of [...profileIds.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (ids.length > 1 && nde.has(vid) && input.videos.has(vid)) multiProfile.push({ video_id: vid, profile_ids: ids });
  }
  stats.videos_in_more_than_one_profile = multiProfile.length;

  const ambiguous: LinkPlan['ambiguous'] = [];
  const anonVideoIds: string[] = [];
  const anonBlankVideoIds: string[] = [];
  for (const vid of [...nde].sort()) {
    const meta = input.videos.get(vid);
    if (!meta) { stats.nde_videos_missing_in_nde_vids++; continue; }
    if (inProfile.has(vid)) continue;
    stats.unlinked_nde_videos++;

    const m = matchName(meta.experiencerFullName, idx);
    if (m.level === 'exact' || m.level === 'core') {
      links.push({
        video_id: vid, person_key: `profile:${m.profileId}`, profile_id: m.profileId, source: 'exact_name_match',
        match_level: m.level,
        evidence: { experiencer_full_name: meta.experiencerFullName, profile_full_name: idx.profiles.get(m.profileId)?.full_name ?? null },
        autoAcceptBy: m.level === 'exact' ? AUTO_BY.exact : null,
      });
      stats[m.level === 'exact' ? 'exact_links' : 'core_links']++;
    } else if (m.level === 'ambiguous') {
      ambiguous.push({ video_id: vid, via: m.via, profile_ids: m.profileIds });
      stats.ambiguous++;
    }

    const key = usableNameKey(meta.experiencerFullName);
    if (key) {
      links.push({
        video_id: vid, person_key: `named:${key}`, profile_id: null, source: 'baseline', match_level: 'baseline',
        evidence: { experiencer_full_name: meta.experiencerFullName }, autoAcceptBy: AUTO_BY.baseline,
      });
      stats.baseline_named++;
    } else {
      const blank = !meta.experiencerFullName || !exactKey(meta.experiencerFullName);
      stats[blank ? 'baseline_anon_no_name' : 'baseline_anon_unusable_name']++;
      links.push({
        video_id: vid, person_key: `anon:${vid}`, profile_id: null, source: 'baseline', match_level: 'baseline',
        evidence: blank ? {} : { reason: 'placeholder_or_single_token_name' }, autoAcceptBy: AUTO_BY.baseline,
      });
      anonVideoIds.push(vid);
      if (blank) anonBlankVideoIds.push(vid);
    }
  }
  return { links, ambiguous, multiProfile, anonVideoIds, anonBlankVideoIds, stats };
}

// ---- persons and candidate pairs ----------------------------------------------------------

export interface Person {
  key: string;
  kind: 'profile' | 'named';
  name: string;
  slug: string | null;
  profile_id: number | null;
  channels: string[];
  titles: string[];
  first_shared_year: number | null;
  summary: string | null;
  video_count: number;
}

const MAX_TITLES = 5;
export const MAX_SUMMARY_CHARS = 1500;

export function clip(s: string | null | undefined, max = MAX_SUMMARY_CHARS): string | null {
  if (s == null) return null;
  const cp = Array.from(s);
  return cp.length <= max ? s : cp.slice(0, max).join('');
}

function channelsAndTitles(videoIds: string[], videos: Map<string, VideoMeta>) {
  const ids = [...new Set(videoIds)].filter((v) => videos.has(v)).sort();
  const channels = [...new Set(ids.map((v) => videos.get(v)!.channelName?.trim()).filter((c): c is string => !!c))].sort();
  const titles = [...new Set(ids.map((v) => videos.get(v)!.title?.trim()).filter((t): t is string => !!t))].slice(0, MAX_TITLES);
  return { channels, titles, count: ids.length };
}

/** Profiles plus `named:*` persons (unlinked NDE videos with a usable name that is not exactly a profile name). */
export function buildPersons(input: {
  profiles: ProfileRow[];
  ndeVideoIds: string[];
  videos: Map<string, VideoMeta>;
}): { persons: Person[]; skippedNoFirstLast: number } {
  const persons: Person[] = [];
  let skipped = 0;
  const inProfile = new Set<string>();
  for (const p of input.profiles) for (const v of p.video_ids ?? []) inProfile.add(v);
  const idx = indexProfiles(input.profiles);

  for (const p of [...input.profiles].sort((a, b) => a.id - b.id)) {
    const pn = parseName(p.full_name);
    if (!pn.first || !pn.last) { skipped++; continue; }
    const ct = channelsAndTitles(p.video_ids ?? [], input.videos);
    persons.push({
      key: `profile:${p.id}`, kind: 'profile', name: p.full_name, slug: p.slug, profile_id: p.id,
      channels: ct.channels, titles: ct.titles, first_shared_year: p.first_shared_year,
      summary: clip(p.summary), video_count: ct.count,
    });
  }

  const groups = new Map<string, string[]>();
  for (const vid of [...input.ndeVideoIds].sort()) {
    const meta = input.videos.get(vid);
    if (!meta || inProfile.has(vid)) continue;
    const key = usableNameKey(meta.experiencerFullName);
    if (!key) continue;
    if (idx.byExact.has(key)) continue; // exact profile-name equals: handled by link matching / profile-profile pairs
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(vid);
  }
  for (const [key, vids] of [...groups.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const counts = new Map<string, number>();
    for (const v of vids) {
      const n = input.videos.get(v)!.experiencerFullName!.trim();
      counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    const name = [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0];
    const ct = channelsAndTitles(vids, input.videos);
    persons.push({
      key: `named:${key}`, kind: 'named', name, slug: null, profile_id: null,
      channels: ct.channels, titles: ct.titles, first_shared_year: null, summary: null, video_count: ct.count,
    });
  }
  return { persons, skippedNoFirstLast: skipped };
}

export interface PairCandidate {
  key_a: string;
  key_b: string;
  rule: CandidateRule;
  features: Record<string, unknown>;
}

export interface PairInputProfile {
  name: string;
  slug: string | null;
  channels: string[];
  video_titles: string[];
  first_shared_year: number | null;
  summary: string | null;
}

export interface PairInput { profile_1: PairInputProfile; profile_2: PairInputProfile }

export function personInput(p: Person): PairInputProfile {
  return {
    name: p.name, slug: p.slug, channels: p.channels, video_titles: p.titles.slice(0, MAX_TITLES),
    first_shared_year: p.first_shared_year, summary: clip(p.summary),
  };
}

export function buildPairInput(a: Person, b: Person): PairInput {
  return { profile_1: personInput(a), profile_2: personInput(b) };
}

/**
 * SPEC step 3 over all persons. Candidate generation uses indexes (same last name, same
 * canonical first name, swapped) so it is not O(n^2) over the whole table; every candidate
 * is then classified by lib/names.candidatePairRule, the single definition of the rules.
 * Pairs are returned with key_a < key_b (JS string order), sorted.
 */
export function findCandidatePairs(persons: Person[], map?: Map<string, string>): PairCandidate[] {
  const n = persons.length;
  const parsed = persons.map((p) => parseName(p.name));
  const byLast = new Map<string, number[]>();
  const byFirst = new Map<string, number[]>();
  const bySwap = new Map<string, number[]>();
  const push = (m: Map<string, number[]>, k: string, i: number) => (m.get(k) ?? m.set(k, []).get(k)!).push(i);
  parsed.forEach((p, i) => {
    push(byLast, p.last, i);
    push(byFirst, canonicalFirst(p.first, map), i);
    push(bySwap, `${p.first} ${p.last}`, i);
  });

  const seen = new Set<number>();
  const pairs: Array<[number, number]> = [];
  const add = (i: number, j: number) => {
    if (i === j) return;
    const lo = Math.min(i, j), hi = Math.max(i, j);
    const id = lo * n + hi;
    if (!seen.has(id)) { seen.add(id); pairs.push([lo, hi]); }
  };
  for (const bucket of [...byLast.values(), ...byFirst.values()]) {
    for (let x = 0; x < bucket.length; x++) for (let y = x + 1; y < bucket.length; y++) add(bucket[x], bucket[y]);
  }
  parsed.forEach((p, i) => {
    for (const j of bySwap.get(`${p.last} ${p.first}`) ?? []) add(i, j);
  });

  const out: PairCandidate[] = [];
  for (const [i, j] of pairs) {
    const rule = candidatePairRule(persons[i].name, persons[j].name, map);
    if (!rule) continue;
    const [a, b] = persons[i].key <= persons[j].key ? [persons[i], persons[j]] : [persons[j], persons[i]];
    const pa = parseName(a.name), pb = parseName(b.name);
    const channelsA = new Set(a.channels);
    out.push({
      key_a: a.key,
      key_b: b.key,
      rule,
      features: {
        rule,
        keys: [a.key, b.key],
        names: [a.name, b.name],
        slugs: [a.slug, b.slug],
        profile_ids: [a.profile_id, b.profile_id],
        first_jw: round(jaroWinkler(pa.first, pb.first)),
        last_jw: round(jaroWinkler(pa.last, pb.last)),
        same_last: pa.last === pb.last,
        nickname_equivalent: nicknameEquivalent(pa.first, pb.first, map),
        initial_of: isInitialOf(pa.first, pb.first),
        first_shared_year: [a.first_shared_year, b.first_shared_year],
        shared_channels: b.channels.filter((c) => channelsA.has(c)).length,
        channels: [a.channels, b.channels],
        video_counts: [a.video_count, b.video_count],
        // Exactly what the judges are shown (profile fields only; no transcript text), so judging is reproducible.
        pair_input: buildPairInput(a, b),
      },
    });
  }
  return out.sort((x, y) => (x.key_a < y.key_a ? -1 : x.key_a > y.key_a ? 1 : x.key_b < y.key_b ? -1 : x.key_b > y.key_b ? 1 : 0));
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function countByRule(pairs: PairCandidate[]): Record<string, number> {
  const c: Record<string, number> = { last_and_first_similar: 0, first_and_last_similar: 0, swapped: 0 };
  for (const p of pairs) c[p.rule] = (c[p.rule] ?? 0) + 1;
  return c;
}

// ---- judging outcome -----------------------------------------------------------------

export type Verdict = 'same' | 'different' | 'unsure';

export type Outcome =
  | { status: 'awaiting_haiku'; decision: null; decidedBy: null }
  | { status: 'awaiting_sonnet'; decision: null; decidedBy: null }
  | { status: 'auto_merge'; decision: 'merge'; decidedBy: 'auto:haiku+sonnet' }
  | { status: 'auto_keep_separate'; decision: 'keep_separate'; decidedBy: 'auto:haiku' }
  | { status: 'review'; decision: null; decidedBy: null };

/**
 * SPEC step 4. Haiku different -> keep_separate. Haiku same AND Sonnet same -> merge.
 * Haiku same/unsure with no Sonnet verdict yet -> awaiting_sonnet. Everything else
 * (any disagreement, Sonnet unsure) -> review: no decision row is written.
 */
export function decideFromVerdicts(haiku: Verdict | undefined | null, sonnet: Verdict | undefined | null): Outcome {
  if (!haiku) return { status: 'awaiting_haiku', decision: null, decidedBy: null };
  if (haiku === 'different') return { status: 'auto_keep_separate', decision: 'keep_separate', decidedBy: 'auto:haiku' };
  if (!sonnet) return { status: 'awaiting_sonnet', decision: null, decidedBy: null };
  if (haiku === 'same' && sonnet === 'same') return { status: 'auto_merge', decision: 'merge', decidedBy: 'auto:haiku+sonnet' };
  return { status: 'review', decision: null, decidedBy: null };
}

// ---- self-stated name checks ----------------------------------------------------------------

/**
 * True iff the name's normalized tokens (honorifics dropped) occur as a contiguous run of
 * tokens inside the normalized quote. Uses lib/quote's normalization on BOTH sides so the
 * comparison is consistent with quote verification (apostrophes are deleted on both sides).
 */
export function nameInQuote(name: string, quote: string): boolean {
  return nameRunIndexes(name, quote).length > 0;
}

/** First-person introducers accepted immediately before a self-stated name (normalized, apostrophes deleted: "I'm" -> "im"). */
export const SELF_INTRODUCERS = ['my name is', 'my names', 'i m', 'im', 'i am', 'this is', 'call me', 'they call me'] as const;

/**
 * True iff, at some occurrence of the name inside the quote, the tokens immediately before it
 * (skipping honorifics such as "Dr") end with a first-person introducer. A name merely
 * mentioned ("my guest today is Jane Smith", "thanks Jane Smith") does not pass.
 */
export function selfIntroducerBefore(name: string, quote: string): boolean {
  const qt = tokenize(quoteNormalize(quote));
  for (const start of nameRunIndexes(name, quote)) {
    let j = start;
    while (j > 0 && HONORIFICS.has(qt[j - 1])) j--;
    const before = qt.slice(0, j).join(' ');
    if (SELF_INTRODUCERS.some((p) => before === p || before.endsWith(` ${p}`))) return true;
  }
  return false;
}

/** Token indexes in the normalized quote where the name's token run starts. */
function nameRunIndexes(name: string, quote: string): number[] {
  const nameTokens = tokenize(quoteNormalize(name)).filter((t) => !HONORIFICS.has(t));
  if (nameTokens.length === 0) return [];
  const qt = tokenize(quoteNormalize(quote));
  const out: number[] = [];
  for (let i = 0; i + nameTokens.length <= qt.length; i++) {
    if (nameTokens.every((t, k) => qt[i + k] === t)) out.push(i);
  }
  return out;
}

// ---- invariants -------------------------------------------------------------------------

/**
 * Every NDE video present in nde_vids must end up with a profile link, or exactly one baseline
 * link (named:/anon:), never both and never neither, so the bt_unmapped_nde_videos view is
 * empty. Returns the violating video ids (empty = invariant holds).
 */
export function linkInvariantViolations(plan: LinkPlan, ndeVideoIds: string[], videos: Map<string, VideoMeta>): string[] {
  const profile = new Map<string, number>();
  const baseline = new Map<string, number>();
  for (const l of plan.links) {
    const m = l.source === 'profile_video_ids' ? profile : l.source === 'baseline' ? baseline : null;
    if (m) m.set(l.video_id, (m.get(l.video_id) ?? 0) + 1);
  }
  const bad: string[] = [];
  for (const v of ndeVideoIds) {
    if (!videos.has(v)) continue;
    const p = profile.get(v) ?? 0;
    const b = baseline.get(v) ?? 0;
    if (!((p >= 1 && b === 0) || (p === 0 && b === 1))) bad.push(v);
  }
  return bad;
}

export interface OrientedSide { key: string; name: string | null; slug: string | null; profile_id: number | null; channels: string[] }

/**
 * Side-a / side-b view of a stored candidate in the orientation of its key_a / key_b columns
 * (insertCandidates may swap a pair when the database collation orders keys differently).
 */
export function orientCandidate(c: { key_a: string; key_b: string; features: Record<string, unknown> }): [OrientedSide, OrientedSide] {
  const f = c.features as {
    keys?: string[]; names?: Array<string | null>; slugs?: Array<string | null>;
    profile_ids?: Array<number | null>; channels?: string[][];
  };
  const keys = f.keys ?? [c.key_a, c.key_b];
  const side = (key: string): OrientedSide => {
    const i = Math.max(0, keys.indexOf(key));
    return { key, name: f.names?.[i] ?? null, slug: f.slugs?.[i] ?? null, profile_id: f.profile_ids?.[i] ?? null, channels: f.channels?.[i] ?? [] };
  };
  return [side(c.key_a), side(c.key_b)];
}

// ---- self-stated names -> person -------------------------------------------------------------

export type SelfNameClass =
  | { kind: 'first_name_only' }
  | { kind: 'unusable' }
  | { kind: 'profile'; level: 'exact' | 'core'; profileId: number }
  | { kind: 'ambiguous'; profileIds: number[] }
  | { kind: 'named'; key: string };

/**
 * What a verified self-stated name may link to. A name that normalizes to one token (first
 * name only) never creates or joins a named:* key (the video stays anon:<id>); placeholders are
 * unusable; a name matching one profile (exact, else core) proposes that profile; matching
 * several is ambiguous (no link); otherwise it proposes named:<exact_key>.
 */
export function classifySelfName(name: string, idx: ProfileIndex): SelfNameClass {
  const key = exactKey(name);
  if (!key) return { kind: 'unusable' };
  if (!key.includes(' ')) return { kind: 'first_name_only' };
  if (PLACEHOLDER_NAMES.has(key)) return { kind: 'unusable' };
  const m = matchName(name, idx);
  if (m.level === 'exact' || m.level === 'core') return { kind: 'profile', level: m.level, profileId: m.profileId };
  if (m.level === 'ambiguous') return { kind: 'ambiguous', profileIds: m.profileIds };
  return { kind: 'named', key };
}

// ---- drift ---------------------------------------------------------------------------------

export interface DriftRow {
  link_id: number;
  video_id: string;
  person_key: string;
  source: string;
  decided_by: string;
  reason: string;
  planned_person_keys: string;
}

const DRIFT_SOURCES = new Set(['profile_video_ids', 'exact_name_match', 'baseline']);

/**
 * Accepted links in the database that the CURRENT plan would not produce (the video left a
 * profile, a name changed, ...). Only sources build-links generates are considered
 * (transcript_self_name links are not part of the plan). Reported, never auto-reverted.
 */
export function findLinkDrift(
  planned: PlannedLink[],
  existing: Array<{ id: number; video_id: string; person_key: string; source: string }>,
  latest: Map<number, { decision: string; decided_by: string }>,
): DriftRow[] {
  const want = new Set(planned.map((l) => `${l.video_id}\u0000${l.person_key}\u0000${l.source}`));
  const byVideo = new Map<string, PlannedLink[]>();
  for (const l of planned) (byVideo.get(l.video_id) ?? byVideo.set(l.video_id, []).get(l.video_id)!).push(l);
  const out: DriftRow[] = [];
  for (const l of existing) {
    if (!DRIFT_SOURCES.has(l.source)) continue;
    const d = latest.get(l.id);
    if (!d || d.decision !== 'accept') continue;
    if (want.has(`${l.video_id}\u0000${l.person_key}\u0000${l.source}`)) continue;
    const now = byVideo.get(l.video_id) ?? [];
    const reason = l.source === 'profile_video_ids'
      ? 'no_longer_listed_in_profile_video_ids'
      : l.source === 'exact_name_match'
        ? 'name_no_longer_matches_this_profile'
        : now.some((p) => p.source === 'profile_video_ids') ? 'video_now_in_a_profile' : 'name_changed';
    out.push({
      link_id: l.id, video_id: l.video_id, person_key: l.person_key, source: l.source, decided_by: d.decided_by, reason,
      planned_person_keys: now.map((p) => p.person_key).join(' | '),
    });
  }
  return out.sort((a, b) => a.link_id - b.link_id);
}
