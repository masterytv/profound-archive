/**
 * Quote verification and timestamp alignment (SPEC "Quote verification").
 *
 * A quote verifies iff normalize(quote) is a contiguous run of whole tokens in
 * normalize(transcript) AND has >= 5 tokens. No fuzzy matching. There is no special
 * ellipsis handling: a quote that joins two spans only verifies if the joined text is
 * itself contiguous in the transcript (the substring match enforces contiguity).
 * Verification is the ONLY gate for counting a stance.
 */
import type { TimestampedSegment } from './transcript';

export const MIN_QUOTE_TOKENS = 5;
export const TIMESTAMP_MATCH_TOKENS = 6;

/** Apostrophes (straight, curly, modifier-letter) are DELETED so "didn't" stays one token. */
const APOSTROPHES = /['\u2018\u2019\u201B\u02BC]/g;

/** Curly double quotes and dashes become ASCII (then, like all punctuation, spaces). */
const QUOTE_MAP: Array<[RegExp, string]> = [
  [/[\u201C\u201D\u201E\u201F\u2033]/g, '"'],
  [/[\u2010-\u2015\u2212]/g, '-'],
];

/**
 * NFKC -> strip diacritics (NFKD, drop combining marks) -> lowercase -> delete
 * apostrophes -> map curly double quotes/dashes to ASCII -> every other char that is
 * not a letter or digit becomes a space -> collapse whitespace -> trim.
 * Example: "I didn't, I don't" -> "i didnt i dont" (4 tokens).
 */
export function normalize(s: string): string {
  let t = s.normalize('NFKC').normalize('NFKD').replace(/\p{M}+/gu, '').toLowerCase();
  t = t.replace(APOSTROPHES, '');
  for (const [re, rep] of QUOTE_MAP) t = t.replace(re, rep);
  return t.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function tokenize(normalized: string): string[] {
  return normalized === '' ? [] : normalized.split(' ');
}

export type QuoteFailure = 'empty' | 'too_short' | 'not_found';

export interface QuoteVerification {
  verified: boolean;
  reason: 'ok' | QuoteFailure;
  /** Char offset of the quote in the NORMALIZED transcript (null unless verified). */
  offset: number | null;
  /** Number of tokens in the normalized quote. */
  tokens: number;
  normalizedQuote: string;
}

export interface NormalizedTranscript {
  normalized: string;
}

export function prepareTranscript(text: string): NormalizedTranscript {
  return { normalized: normalize(text) };
}

/**
 * Pass either the raw transcript or a prepareTranscript() result (cheaper when
 * checking many quotes against one transcript, e.g. 81 per video).
 * Matching is at token boundaries so a quote cannot begin or end mid-word.
 */
export function verifyQuote(quote: string | null | undefined, transcript: string | NormalizedTranscript): QuoteVerification {
  const fail = (reason: QuoteFailure, nq = '', tokens = 0): QuoteVerification => ({
    verified: false, reason, offset: null, tokens, normalizedQuote: nq,
  });
  if (quote == null || quote.trim() === '') return fail('empty');
  const nq = normalize(quote);
  const tokens = tokenize(nq).length;
  if (tokens === 0) return fail('empty');
  if (tokens < MIN_QUOTE_TOKENS) return fail('too_short', nq, tokens);
  const nt = typeof transcript === 'string' ? normalize(transcript) : transcript.normalized;
  const at = (' ' + nt + ' ').indexOf(' ' + nq + ' ');
  if (at < 0) return fail('not_found', nq, tokens);
  return { verified: true, reason: 'ok', offset: at, tokens, normalizedQuote: nq };
}

/**
 * Convenience for the review sheet only (never used for verification): finds the
 * first 6 normalized tokens of the quote in the raw caption segments and returns the
 * start time (seconds) of the segment where the match begins, else null.
 */
export function alignTimestamp(
  quote: string,
  segments: TimestampedSegment[] | null | undefined,
): number | null {
  if (!segments || segments.length === 0) return null;
  const qTokens = tokenize(normalize(quote)).slice(0, TIMESTAMP_MATCH_TOKENS);
  if (qTokens.length < MIN_QUOTE_TOKENS) return null;

  const flat: string[] = [];
  const segOf: number[] = [];
  segments.forEach((seg, i) => {
    // Skip null / malformed elements (raw captions are external data).
    if (!seg || typeof seg !== 'object' || typeof seg.text !== 'string') return;
    for (const tok of tokenize(normalize(seg.text))) {
      flat.push(tok);
      segOf.push(i);
    }
  });
  outer: for (let i = 0; i + qTokens.length <= flat.length; i++) {
    for (let j = 0; j < qTokens.length; j++) if (flat[i + j] !== qTokens[j]) continue outer;
    const start = Number(segments[segOf[i]].start);
    return Number.isFinite(start) ? start : null;
  }
  return null;
}
