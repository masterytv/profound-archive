/**
 * Person rollup (SPEC "Job 2" 7.). Pure: takes already-read rows.
 *
 * Per person per question, over that person's videos' answers with status 'final':
 * not_addressed is ignored; none addressed -> not_addressed; all addressed equal -> that
 * stance; any conflict or any mixed -> mixed. Each person counts once.
 * Answers with any other status (unverified, invalid, pending_*) are excluded and counted
 * in n_excluded_unverified (with a status breakdown). A person with no 'final' answer for a
 * question is not in that question's denominators (n_persons_all_excluded counts them).
 */
import { wilson } from '../lib/stats';
import type { Stance } from './answers';

export interface FinalRow { video_id: string; question_id: number; stance: Stance | null; status: string }
export interface QuestionMeta { id: number; category: string | null; consumer_question: string }

export function combineStances(stances: readonly Stance[]): Stance {
  const addressed = stances.filter((s) => s !== 'not_addressed');
  if (addressed.length === 0) return 'not_addressed';
  if (addressed.some((s) => s === 'mixed')) return 'mixed';
  return addressed.every((s) => s === addressed[0]) ? addressed[0] : 'mixed';
}

export interface TallyRow {
  question_id: number;
  category: string | null;
  consumer_question: string;
  n_persons: number;
  n_yes: number; pct_yes: number | null;
  n_no: number; pct_no: number | null;
  n_mixed: number; pct_mixed: number | null;
  n_not_addressed: number; pct_not_addressed: number | null;
  n_addressed: number;
  pct_yes_of_addressed: number | null; yes_ci_lo: number | null; yes_ci_hi: number | null;
  pct_no_of_addressed: number | null; no_ci_lo: number | null; no_ci_hi: number | null;
  pct_mixed_of_addressed: number | null; mixed_ci_lo: number | null; mixed_ci_hi: number | null;
  n_excluded_unverified: number;
  n_excl_unverified_quote: number;
  n_excl_invalid: number;
  n_excl_pending: number;
  n_persons_all_excluded: number;
}

export const TALLY_HEADERS: Array<keyof TallyRow> = [
  'question_id', 'category', 'consumer_question', 'n_persons',
  'n_yes', 'pct_yes', 'n_no', 'pct_no', 'n_mixed', 'pct_mixed', 'n_not_addressed', 'pct_not_addressed',
  'n_addressed',
  'pct_yes_of_addressed', 'yes_ci_lo', 'yes_ci_hi',
  'pct_no_of_addressed', 'no_ci_lo', 'no_ci_hi',
  'pct_mixed_of_addressed', 'mixed_ci_lo', 'mixed_ci_hi',
  'n_excluded_unverified', 'n_excl_unverified_quote', 'n_excl_invalid', 'n_excl_pending', 'n_persons_all_excluded',
];

const pct = (k: number, n: number): number | null => (n > 0 ? (100 * k) / n : null);
const pct1 = (x: number | null): number | null => (x === null ? null : 100 * x);

/**
 * @param personOf video id -> person key. In per-video (sensitivity) mode pass an identity map.
 * Videos missing from personOf are an error (the caller must have asserted full mapping).
 */
export function tallyByQuestion(
  rows: readonly FinalRow[],
  personOf: ReadonlyMap<string, string>,
  questions: readonly QuestionMeta[],
): TallyRow[] {
  // question -> person -> {final stances, excluded counts}
  type Cell = { final: Stance[]; unverified: number; invalid: number; pending: number };
  const byQ = new Map<number, Map<string, Cell>>();
  for (const r of rows) {
    const person = personOf.get(r.video_id);
    if (person === undefined) throw new Error(`tally: video ${r.video_id} has no person mapping`);
    let m = byQ.get(r.question_id);
    if (!m) byQ.set(r.question_id, (m = new Map()));
    let c = m.get(person);
    if (!c) m.set(person, (c = { final: [], unverified: 0, invalid: 0, pending: 0 }));
    if (r.status === 'final' && r.stance) c.final.push(r.stance);
    else if (r.status === 'unverified') c.unverified++;
    else if (r.status === 'invalid') c.invalid++;
    else c.pending++;
  }
  return questions.map((q): TallyRow => {
    const m = byQ.get(q.id) ?? new Map<string, Cell>();
    const n = { yes: 0, no: 0, mixed: 0, not_addressed: 0 };
    let persons = 0, allExcluded = 0, unv = 0, inv = 0, pend = 0;
    for (const c of m.values()) {
      unv += c.unverified; inv += c.invalid; pend += c.pending;
      if (c.final.length === 0) { allExcluded++; continue; }
      persons++;
      n[combineStances(c.final)]++;
    }
    const addressed = n.yes + n.no + n.mixed;
    const wy = wilson(n.yes, addressed), wn = wilson(n.no, addressed), wm = wilson(n.mixed, addressed);
    return {
      question_id: q.id, category: q.category, consumer_question: q.consumer_question,
      n_persons: persons,
      n_yes: n.yes, pct_yes: pct(n.yes, persons),
      n_no: n.no, pct_no: pct(n.no, persons),
      n_mixed: n.mixed, pct_mixed: pct(n.mixed, persons),
      n_not_addressed: n.not_addressed, pct_not_addressed: pct(n.not_addressed, persons),
      n_addressed: addressed,
      pct_yes_of_addressed: pct1(wy.p), yes_ci_lo: pct1(wy.lo), yes_ci_hi: pct1(wy.hi),
      pct_no_of_addressed: pct1(wn.p), no_ci_lo: pct1(wn.lo), no_ci_hi: pct1(wn.hi),
      pct_mixed_of_addressed: pct1(wm.p), mixed_ci_lo: pct1(wm.lo), mixed_ci_hi: pct1(wm.hi),
      n_excluded_unverified: unv + inv + pend,
      n_excl_unverified_quote: unv, n_excl_invalid: inv, n_excl_pending: pend,
      n_persons_all_excluded: allExcluded,
    };
  });
}
