/**
 * Person-level tally of codebook answers. Pure: the caller supplies rows and the person map.
 *
 * For one person and one item, over all of that person's coded videos:
 *   - addressed when at least one video has a COUNTED answer (job3/validate.rowOutcome):
 *       yes/no: every counted stance agreeing keeps it; any disagreement, or any "mixed", gives mixed;
 *       multiple choice: the union of the verified answer codes across the videos;
 *   - otherwise excluded when some video's answer failed (unverified quote, or invalid);
 *   - otherwise not addressed when every coded video says not addressed;
 *   - otherwise (no coded video at all) not coded.
 * Shares of "addressed" use addressed + not addressed as the base (excluded and not-coded people
 * are reported, never silently counted). Answer shares use the addressed people as the base. In a
 * multiple-choice item one person can give several answers, so its shares can add up to more than
 * 100%.
 *
 * A subgroup (e.g. q29 among people in severe suffering) is the people whose fact is "yes" (a
 * yes/no fact) or whose fact includes the given answer (f0). Mixed or excluded facts don't count.
 */
import { wilson, type Proportion } from '../lib/stats';
import { OTHER, type Codebook, type CodeItem, type Subgroup } from './codebook';
import { countedChoices, rowOutcome, type CheckedChoice, type RowOutcome } from './validate';

export interface TallyInputRow {
  id: number;
  video_id: string;
  item_key: string;
  kind: 'yn' | 'mc';
  attempt: number;
  addressed: boolean | null;
  stance: 'yes' | 'no' | 'mixed' | null;
  quote_verified: boolean;
  choices: CheckedChoice[] | null;
  valid: boolean;
}

/**
 * The latest row per (video, item): the highest id. Rows are only ever appended, so this is the most
 * recent answer, whether it came from a retry (attempt 2+) or from a later run that coded a video again
 * after its earlier response was rejected.
 */
export function latestRows(rows: readonly TallyInputRow[]): Map<string, TallyInputRow> {
  const out = new Map<string, TallyInputRow>();
  for (const r of rows) {
    const k = `${r.video_id}\u0000${r.item_key}`;
    const cur = out.get(k);
    if (!cur || r.id > cur.id) out.set(k, r);
  }
  return out;
}

export type PersonState =
  | { state: 'addressed'; stance?: 'yes' | 'no' | 'mixed'; choices?: string[] }
  | { state: 'not_addressed' }
  | { state: 'excluded_unverified' }
  | { state: 'excluded_invalid' }
  | { state: 'not_coded' };

export function combineStances(stances: ReadonlyArray<'yes' | 'no' | 'mixed'>): 'yes' | 'no' | 'mixed' {
  const set = new Set(stances);
  return set.size === 1 ? stances[0] : 'mixed';
}

/** One person's state for one item, from the latest rows of that person's videos. */
export function personState(item: Pick<CodeItem, 'type'>, rows: ReadonlyArray<TallyInputRow | undefined>): PersonState {
  const coded = rows.filter((r): r is TallyInputRow => r !== undefined);
  if (coded.length === 0) return { state: 'not_coded' };
  const outcomes: Array<[RowOutcome, TallyInputRow]> = coded.map((r) => [rowOutcome(r), r]);
  const counted = outcomes.filter(([o]) => o === 'counted').map(([, r]) => r);
  if (counted.length) {
    if (item.type === 'yn') return { state: 'addressed', stance: combineStances(counted.map((r) => r.stance!)) };
    return { state: 'addressed', choices: [...new Set(counted.flatMap((r) => countedChoices(r)))].sort() };
  }
  if (outcomes.some(([o]) => o === 'unverified_quote')) return { state: 'excluded_unverified' };
  if (outcomes.some(([o]) => o === 'invalid')) return { state: 'excluded_invalid' };
  return { state: 'not_addressed' };
}

export interface ItemTally {
  item_key: string;
  /** 'all', or the subgroup's description, e.g. "f0 = suicide_attempt". */
  group: string;
  n_people: number;
  n_addressed: number;
  n_not_addressed: number;
  n_excluded_unverified: number;
  n_excluded_invalid: number;
  n_not_coded: number;
  addressed: Proportion;
  /** yes/no: yes, no, mixed. Multiple choice: every listed code plus "other". Base: addressed people. */
  answers: Array<{ answer: string; label: string; share: Proportion }>;
}

export function tallyItem(item: CodeItem, group: string, states: readonly PersonState[]): ItemTally {
  const count = (s: PersonState['state']) => states.filter((x) => x.state === s).length;
  const addressedStates = states.filter((x): x is Extract<PersonState, { state: 'addressed' }> => x.state === 'addressed');
  const nA = addressedStates.length, nN = count('not_addressed');
  const answers = item.type === 'yn'
    ? (['yes', 'no', 'mixed'] as const).map((s) => ({
      answer: s,
      label: s === 'yes' ? `yes: ${item.yes_means}` : s === 'no' ? `no${item.no_means ? `: ${item.no_means}` : ''}` : `mixed${item.mixed_means ? `: ${item.mixed_means}` : ''}`,
      share: wilson(addressedStates.filter((x) => x.stance === s).length, nA),
    }))
    : [...item.choices!, { code: OTHER, label: 'Other' }].map((c) => ({
      answer: c.code, label: c.label, share: wilson(addressedStates.filter((x) => x.choices!.includes(c.code)).length, nA),
    }));
  return {
    item_key: item.key, group, n_people: states.length,
    n_addressed: nA, n_not_addressed: nN, n_excluded_unverified: count('excluded_unverified'), n_excluded_invalid: count('excluded_invalid'),
    n_not_coded: count('not_coded'), addressed: wilson(nA, nA + nN), answers,
  };
}

export function subgroupLabel(s: Subgroup): string {
  return s.choice ? `${s.fact} = ${s.choice}` : `${s.fact} = yes`;
}

export function inSubgroup(s: Subgroup, fact: PersonState): boolean {
  if (fact.state !== 'addressed') return false;
  return s.choice ? (fact.choices ?? []).includes(s.choice) : fact.stance === 'yes';
}

export interface TallyResult {
  /** One entry for every item ('all'), plus one per subgroup item; facts included. */
  tallies: ItemTally[];
  n_people: number;
  n_videos_coded: number;
}

/**
 * `unit` 'person' (the main tally) or 'video' (sensitivity: each video counted separately).
 * personOf maps video -> person; only videos in it are counted.
 */
export function tallyAll(cb: Codebook, rows: readonly TallyInputRow[], personOf: ReadonlyMap<string, string>, unit: 'person' | 'video' = 'person'): TallyResult {
  const latest = latestRows(rows);
  const videos = [...new Set([...latest.values()].map((r) => r.video_id))].filter((v) => personOf.has(v)).sort();
  const groups = new Map<string, string[]>();
  for (const v of videos) {
    const g = unit === 'person' ? personOf.get(v)! : v;
    groups.set(g, [...(groups.get(g) ?? []), v]);
  }
  const people = [...groups.keys()].sort();
  const stateOf = (it: CodeItem, person: string) => personState(it, groups.get(person)!.map((v) => latest.get(`${v}\u0000${it.key}`)));
  const facts = new Map(cb.facts.map((f) => [f.key, new Map(people.map((p) => [p, stateOf(f, p)]))]));
  const tallies: ItemTally[] = [];
  for (const it of [...cb.facts, ...cb.items]) {
    const states = people.map((p) => stateOf(it, p));
    tallies.push(tallyItem(it, 'all', states));
    if (it.subgroup) {
      const fs = facts.get(it.subgroup.fact)!;
      tallies.push(tallyItem(it, subgroupLabel(it.subgroup), people.filter((p) => inSubgroup(it.subgroup!, fs.get(p)!)).map((p) => stateOf(it, p))));
    }
  }
  return { tallies, n_people: people.length, n_videos_coded: videos.length };
}

const pct = (x: number | null) => (x === null ? '' : (100 * x).toFixed(1));

export const TALLY_HEADERS = [
  'item_key', 'question_id', 'type', 'ask', 'group', 'n_people', 'n_addressed', 'n_not_addressed', 'pct_addressed', 'addressed_ci_low', 'addressed_ci_high',
  'n_excluded_unverified', 'n_excluded_invalid', 'n_not_coded', 'answer', 'answer_label', 'n_answer', 'pct_of_addressed', 'answer_ci_low', 'answer_ci_high', 'note',
] as const;

/** Long format: one CSV row per (item, group, answer). */
export function tallyCsvRows(cb: Codebook, res: TallyResult): Array<Record<string, unknown>> {
  const meta = new Map([...cb.facts, ...cb.items].map((i) => [i.key, i]));
  return res.tallies.flatMap((t) => {
    const it = meta.get(t.item_key)!;
    return t.answers.map((a) => ({
      item_key: t.item_key, question_id: it.question_id ?? '', type: it.type === 'yn' ? 'yes_no' : 'multiple_choice', ask: it.ask, group: t.group,
      n_people: t.n_people, n_addressed: t.n_addressed, n_not_addressed: t.n_not_addressed,
      pct_addressed: pct(t.addressed.p), addressed_ci_low: pct(t.addressed.lo), addressed_ci_high: pct(t.addressed.hi),
      n_excluded_unverified: t.n_excluded_unverified, n_excluded_invalid: t.n_excluded_invalid, n_not_coded: t.n_not_coded,
      answer: a.answer, answer_label: a.label, n_answer: a.share.k, pct_of_addressed: pct(a.share.p), answer_ci_low: pct(a.share.lo), answer_ci_high: pct(a.share.hi),
      note: it.type === 'mc' ? 'several answers per person allowed: shares can add up to more than 100%' : '',
    }));
  });
}
