/**
 * Flagging, arbiter disputes, A/B blinding and the TypeScript mirror of the SQL view
 * bt_final_stances (supabase/migrations/20261118_001_book_tally.sql). Keep in sync.
 */
import { createHash } from 'crypto';
import type { Stance } from './answers';

export const CONFIDENCE_THRESHOLD = 70;

export interface AnswerLite {
  id?: number;
  valid: boolean;
  stance: Stance | null;
  confidence: number | null;
  quote: string | null;
  quoteVerified: boolean;
}

/**
 * A first-pass answer needs a second reader if it is invalid, says no/mixed, has
 * confidence < 70, or claims something with an unverified quote.
 */
export function isFlagged(a: AnswerLite): boolean {
  if (!a.valid || a.stance === null) return true;
  if (a.stance === 'no' || a.stance === 'mixed') return true;
  if (a.confidence === null || a.confidence < CONFIDENCE_THRESHOLD) return true;
  if (a.stance !== 'not_addressed' && !a.quoteVerified) return true;
  return false;
}

/** Both readers produced a valid answer with the same stance. */
export function stancesAgree(first: AnswerLite, recheck: AnswerLite): boolean {
  return first.valid && recheck.valid && first.stance !== null && first.stance === recheck.stance;
}

export type ResolvedBy = 'first' | 'recheck' | 'arbiter';
/** Statuses of the SQL view bt_final_stances. */
export type FinalStatus = 'final' | 'unverified' | 'pending_recheck' | 'pending_arbiter';

export interface Resolution {
  resolvedBy: ResolvedBy | null;
  chosen: AnswerLite | null;
  status: FinalStatus;
}

/** ok(x): valid AND (not_addressed OR verified quote). */
export function isOk(a: AnswerLite): boolean {
  return a.valid && (a.stance === 'not_addressed' || (a.stance !== null && a.quoteVerified));
}

/**
 * Mirror of bt_final_stances for one (video, question):
 *  - unflagged first answer -> final = first;
 *  - flagged, no recheck -> pending_recheck;
 *  - recheck agrees (both valid, same stance): ok(recheck) -> recheck; else ok(first) -> first;
 *  - otherwise the arbiter: none yet -> pending_arbiter; ok(arbiter) -> final; else 'unverified'.
 */
export function resolveFinal(first: AnswerLite, recheck?: AnswerLite, arbiter?: AnswerLite): Resolution {
  if (!isFlagged(first)) return { resolvedBy: 'first', chosen: first, status: 'final' };
  if (!recheck) return { resolvedBy: null, chosen: null, status: 'pending_recheck' };
  if (stancesAgree(first, recheck)) {
    if (isOk(recheck)) return { resolvedBy: 'recheck', chosen: recheck, status: 'final' };
    if (isOk(first)) return { resolvedBy: 'first', chosen: first, status: 'final' };
  }
  if (!arbiter) return { resolvedBy: null, chosen: null, status: 'pending_arbiter' };
  return { resolvedBy: 'arbiter', chosen: arbiter, status: isOk(arbiter) ? 'final' : 'unverified' };
}

/** The arbiter is needed exactly when the resolution is pending_arbiter. */
export function needsArbiter(first: AnswerLite, recheck: AnswerLite | undefined, arbiter?: AnswerLite): boolean {
  return resolveFinal(first, recheck, arbiter).status === 'pending_arbiter';
}

// ---- arbiter disputes and blinding ----

/** Deterministic per-video coin: true when the FIRST-pass model (Haiku) is shown as Reader A. */
export function firstPassIsReaderA(seed: number | string, videoId: string): boolean {
  const h = createHash('sha256').update(`${seed}:readerAB:${videoId}`).digest();
  return (h[0] & 1) === 1;
}

export interface DisputeInput {
  questionId: number;
  category: string | null;
  question: string;
  first: AnswerLite;
  recheck: AnswerLite;
}

export interface ReaderView {
  stance: Stance | null;
  confidence: number | null;
  quote: string | null;
  note?: string;
}

export interface DisputeEntry {
  question_id: number;
  category: string | null;
  question: string;
  reader_a: ReaderView;
  reader_b: ReaderView;
}

function readerView(a: AnswerLite): ReaderView {
  if (!a.valid || a.stance === null) {
    return { stance: null, confidence: null, quote: null, note: 'this reader gave no usable answer' };
  }
  return { stance: a.stance, confidence: a.confidence, quote: a.quote };
}

/**
 * Builds the DISPUTES_JSON entries for one video. Model identities and pass names never
 * appear; which model is Reader A is decided by firstPassIsReaderA (recorded in raw-response
 * metadata by the caller).
 */
export function buildDisputes(inputs: DisputeInput[], firstIsA: boolean): DisputeEntry[] {
  return inputs.map((d) => ({
    question_id: d.questionId,
    category: d.category,
    question: d.question,
    reader_a: readerView(firstIsA ? d.first : d.recheck),
    reader_b: readerView(firstIsA ? d.recheck : d.first),
  }));
}
