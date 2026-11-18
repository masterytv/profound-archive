/**
 * Quote verification and timestamp alignment (SPEC "Quote verification").
 *
 * A quote verifies iff normalize(quote) is a contiguous run of whole tokens in
 * normalize(transcript) AND has >= 5 tokens. No fuzzy matching, no ellipsis
 * joining. Verification is the ONLY gate for counting a stance.
 */
import type { TimestampedSegment } from './transcript';

export const MIN_QUOTE_TOKENS = 5;
export const TIMESTAMP_MATCH_TOKENS = 6;

const QUOTE_MAP: Array<[RegExp, string]> = [
  [/[‘’‚‛′´`]/g, "'"],
  [/[“”„‟″]/g, '"'],
  [/[‐-―−]/g, '-'],
];

/**
 * NFKC -> strip diacritics (NFKD, drop combining marks) -> lowercase -> map curly
 * quotes/dashes to ASCII -> every char that is not a letter or digit becomes a space
 * -> collapse whitespace -> trim.
 */
export function normalize(s: string): string {
  let t = s.normalize('NFKC').normalize('NFKD').replace(/\p{M}+/gu, '').toLowerCase();
  for (const [re, rep] of QUOTE_MAP) t = t.replace(re, rep);
  return t.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function tokenize(normalized: string): string[] {
  return normalized === '' ? [] : normalized.split(' ');
}

/** Ellipsis marks (… or 3+ dots, incl. "[...]") mean the quote joins spans. */
const ELLIPSIS = /…|\.{3,}|\.\s\.\s\./;

export type QuoteFailure = 'empty' | 'ellipsis' | 'too_short' | 'not_found';

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
  if (ELLIPSIS.test(quote)) return fail('ellipsis', nq, tokens);
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
    for (const tok of tokenize(normalize(String(seg.text ?? '')))) {
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
