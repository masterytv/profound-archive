/**
 * Pure Job 1 logic (no I/O): name matching, link planning, candidate pairs,
 * judging outcome, name-in-quote check. Everything here is unit-tested.
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
  /** Unlinked, unnamed (or unusable-name) videos. These are the name-extraction targets. */
  anonVideoIds: string[];
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
  const profileCount = new Map<string, number>();
  for (const p of [...input.profiles].sort((a, b) => a.id - b.id)) {
    for (const vid of new Set(p.video_ids ?? [])) {
      inProfile.add(vid);
      profileCount.set(vid, (profileCount.get(vid) ?? 0) + 1);
      if (!nde.has(vid)) { stats.profile_video_ids_not_in_nde_set++; continue; }
      if (!input.videos.has(vid)) continue;
      links.push({
        video_id: vid, person_key: `profile:${p.id}`, profile_id: p.id, source: 'profile_video_ids',
        match_level: 'profile', evidence: {}, autoAcceptBy: AUTO_BY.profile,
      });
      stats.profile_links++;
    }
  }
  for (const c of profileCount.values()) if (c > 1) stats.videos_in_more_than_one_profile++;

  const ambiguous: LinkPlan['ambiguous'] = [];
  const anonVideoIds: string[] = [];
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
    }
  }
  return { links, ambiguous, anonVideoIds, stats };
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
 * comparison is consistent with quote verification ("O'Brien" -> "o brien" on both sides).
 */
export function nameInQuote(name: string, quote: string): boolean {
  const nameTokens = tokenize(quoteNormalize(name)).filter((t) => !HONORIFICS.has(t));
  if (nameTokens.length === 0) return false;
  const q = ` ${quoteNormalize(quote)} `;
  return q.includes(` ${nameTokens.join(' ')} `);
}
