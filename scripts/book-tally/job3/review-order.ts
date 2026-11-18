/**
 * A fixed, seeded review order for the gold sheet, so the owner can mark a short, balanced random
 * sample and stop after any whole block (or carry on block by block).
 *
 * Every sheet row belongs to one stratum:
 *   yes_no          a counted yes/no QUESTION answer
 *   multiple_choice a counted multiple-choice QUESTION answer
 *   fact            a counted fact (f0..f6, either type)
 *   not_addressed   a "not addressed" spot check
 * Each stratum is shuffled with its own seeded salt. The order is then built in blocks of
 * BLOCK_SIZE whose make-up is REVIEW_MIX, interleaved so each block mixes the types. When a
 * stratum runs out, its slots go to the next stratum in the pattern. The first N rows of the order
 * are therefore a stratified random sample of the sheet for any N. Within a stratum, every row
 * has the same chance of being reviewed, so per-stratum figures are unbiased. Figures that combine
 * strata mix different sampling rates (the report says so).
 */
import { seededShuffle } from '../job2/sampling';

export type Stratum = 'yes_no' | 'multiple_choice' | 'fact' | 'not_addressed';
export const STRATA: readonly Stratum[] = ['yes_no', 'multiple_choice', 'fact', 'not_addressed'];
/** Cards per block and the block's make-up (8 + 6 + 3 + 3 = 20). */
export const BLOCK_SIZE = 20;
export const REVIEW_MIX: Readonly<Record<Stratum, number>> = { yes_no: 8, multiple_choice: 6, fact: 3, not_addressed: 3 };
export const ORDER_SALT = 'codebook-review';

export interface OrderInput { coded_answer_id: number; isFact: boolean; kind: 'yn' | 'mc'; outcome: 'counted' | 'not_addressed' }

export function stratumOf(r: OrderInput): Stratum {
  if (r.outcome === 'not_addressed') return 'not_addressed';
  if (r.isFact) return 'fact';
  return r.kind === 'yn' ? 'yes_no' : 'multiple_choice';
}

/** The slot pattern of one block: smooth weighted round-robin over REVIEW_MIX, so the types interleave. */
export function blockPattern(mix: Readonly<Record<Stratum, number>> = REVIEW_MIX): Stratum[] {
  const total = STRATA.reduce((s, k) => s + mix[k], 0);
  const current = Object.fromEntries(STRATA.map((k) => [k, 0])) as Record<Stratum, number>;
  const out: Stratum[] = [];
  for (let i = 0; i < total; i++) {
    for (const k of STRATA) current[k] += mix[k];
    const pick = STRATA.reduce((best, k) => (current[k] > current[best] ? k : best), STRATA[0]);
    current[pick] -= total;
    out.push(pick);
  }
  return out;
}

/** coded_answer_id -> 0-based position in the review order. Deterministic for a seed. */
export function reviewOrder(rows: readonly OrderInput[], seed: number): Map<number, number> {
  const queues = new Map<Stratum, number[]>();
  for (const s of STRATA) {
    const ids = rows.filter((r) => stratumOf(r) === s).map((r) => r.coded_answer_id).sort((a, b) => a - b);
    queues.set(s, seededShuffle(ids, seed, `${ORDER_SALT}:${s}`));
  }
  const pattern = blockPattern();
  const order = new Map<number, number>();
  let slot = 0;
  while (order.size < rows.length) {
    const want = pattern[slot % pattern.length];
    // the wanted stratum, else the next ones in pattern order that still have rows
    const start = pattern.indexOf(want);
    let picked: number | undefined;
    for (let j = 0; j < pattern.length && picked === undefined; j++) {
      const q = queues.get(pattern[(start + j) % pattern.length])!;
      if (q.length) picked = q.shift();
    }
    order.set(picked!, order.size);
    slot++;
  }
  return order;
}
