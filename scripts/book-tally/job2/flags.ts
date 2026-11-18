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

/** The arbiter is needed when the first answer was flagged, a recheck exists, and they do not agree. */
export function needsArbiter(first: AnswerLite, recheck: AnswerLite | undefined): boolean {
  return isFlagged(first) && recheck !== undefined && !stancesAgree(first, recheck);
}

export type ResolvedBy = 'first' | 'recheck' | 'arbiter';
export type FinalStatus = 'final' | 'unverified' | 'invalid' | 'pending_recheck' | 'pending_arbiter';

export interface Resolution {
  resolvedBy: ResolvedBy | null;
  chosen: AnswerLite | null;
  status: FinalStatus;
}

/** Mirror of bt_final_stances for one (video, question). */
export function resolveFinal(first: AnswerLite, recheck?: AnswerLite, arbiter?: AnswerLite): Resolution {
  let resolvedBy: ResolvedBy | null = null;
  let chosen: AnswerLite | null = null;
  if (!isFlagged(first)) {
    resolvedBy = 'first';
    chosen = first;
  } else if (recheck && stancesAgree(first, recheck)) {
    resolvedBy = 'recheck';
    chosen = recheck;
  } else if (recheck && arbiter) {
    resolvedBy = 'arbiter';
    chosen = arbiter;
  }
  if (!chosen) return { resolvedBy: null, chosen: null, status: recheck ? 'pending_arbiter' : 'pending_recheck' };
  if (!chosen.valid) return { resolvedBy, chosen, status: 'invalid' };
  if (chosen.stance !== 'not_addressed' && !chosen.quoteVerified) return { resolvedBy, chosen, status: 'unverified' };
  return { resolvedBy, chosen, status: 'final' };
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
