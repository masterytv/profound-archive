/**
 * Deterministic Quote-to-Timestamp Matcher
 *
 * Matches extracted quotes against raw YouTube caption segments to find
 * the exact timestamp where that quote appears in the video.
 *
 * This replaces the unreliable "ask the LLM to return timestamps" approach.
 * The LLM extracts quotes from clean punctuated text (what it's good at),
 * then this code matches them against caption segments (deterministic).
 *
 * Proven pattern from NDE pipeline's extractPullQuote() —
 * see src/app/video/[id]/page.tsx L156-L194.
 */

import { extractSegments, type TimestampedSegment } from './format-timestamped-transcript';
import type { UapProgramIntelResult } from './uap-program-intel';
import type { UapPhenomenologyResult } from './uap-phenomenology';

// ─── Core Matcher ────────────────────────────────────────────────────────────

/**
 * Normalize text for fuzzy matching: lowercase, strip punctuation, collapse whitespace.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[''""]/g, '')         // smart quotes
    .replace(/[^\w\s]/g, ' ')       // punctuation → space
    .replace(/\s+/g, ' ')           // collapse whitespace
    .trim();
}

/**
 * Match a quote against caption segments and return the timestamp (seconds).
 *
 * Strategy:
 *   1. Take the first 6-8 words of the quote as a search key
 *      (quotes may be paraphrased at the end, but beginnings are reliable)
 *   2. Build a sliding window of concatenated segments (window size 1→6)
 *   3. Check if the search key appears in the concatenated window text
 *   4. Return the start time of the first segment in the matching window
 *
 * Falls back to a word-overlap scoring if exact substring isn't found.
 *
 * @returns Integer seconds, or undefined if no match found
 */
export function matchQuoteToTimestamp(
  quote: string,
  segments: TimestampedSegment[],
): number | undefined {
  if (!quote || !segments?.length) return undefined;

  const normalizedQuote = normalize(quote);
  if (normalizedQuote.length < 5) return undefined;

  // Use the first 6-8 words as the search key (more reliable than full quote)
  const quoteWords = normalizedQuote.split(' ');
  const searchKeyWords = quoteWords.slice(0, Math.min(8, quoteWords.length));
  const searchKey = searchKeyWords.join(' ');

  // Also try a shorter key (first 5 words) as fallback
  const shortKey = quoteWords.slice(0, Math.min(5, quoteWords.length)).join(' ');

  // Pre-normalize all segment texts
  const normalizedSegs = segments.map(s => ({
    text: normalize(s.text || ''),
    start: s.start,
  }));

  // Strategy 1: Sliding window substring match
  for (const key of [searchKey, shortKey]) {
    for (let windowSize = 1; windowSize <= 8; windowSize++) {
      for (let i = 0; i <= normalizedSegs.length - windowSize; i++) {
        const windowText = normalizedSegs
          .slice(i, i + windowSize)
          .map(s => s.text)
          .join(' ');

        if (windowText.includes(key)) {
          return Math.floor(segments[i].start);
        }
      }
    }
  }

  // Strategy 2: Word-overlap scoring (fuzzy fallback)
  // Score each segment position by how many quote words appear nearby
  const searchWords = new Set(searchKeyWords.filter(w => w.length > 3));
  if (searchWords.size < 2) return undefined;

  let bestScore = 0;
  let bestIdx = -1;

  for (let i = 0; i < normalizedSegs.length; i++) {
    // Build a window of 8 consecutive segments
    const windowEnd = Math.min(i + 8, normalizedSegs.length);
    const windowText = normalizedSegs.slice(i, windowEnd).map(s => s.text).join(' ');
    const windowWords = new Set(windowText.split(' '));

    let overlap = 0;
    for (const word of searchWords) {
      if (windowWords.has(word)) overlap++;
    }

    // Require at least 60% word overlap for a fuzzy match
    const score = overlap / searchWords.size;
    if (score > bestScore && score >= 0.6) {
      bestScore = score;
      bestIdx = i;
    }
  }

  if (bestIdx >= 0) {
    return Math.floor(segments[bestIdx].start);
  }

  return undefined;
}

// ─── Post-Processors ─────────────────────────────────────────────────────────
// These walk the LLM result and add timestamp_seconds fields by matching
// quotes against caption segments. They mutate the result in place.

/**
 * Add timestamps to Program Intel result.
 * Matches: persons[].quote, claims[].claim_text, legislative_events[].quote
 */
export function addTimestampsToProgramIntel(
  result: UapProgramIntelResult,
  rawTimestamped: unknown,
): UapProgramIntelResult {
  const segments = extractSegments(rawTimestamped);
  if (!segments?.length) return result;

  // Persons — match quote field
  if (result.persons) {
    for (const person of result.persons) {
      if (person.quote && !person.quote_timestamp_seconds) {
        person.quote_timestamp_seconds = matchQuoteToTimestamp(person.quote, segments);
      }
    }
  }

  // Claims — match claim_text field
  if (result.claims) {
    for (const claim of result.claims) {
      if (claim.claim_text && !claim.timestamp_seconds) {
        claim.timestamp_seconds = matchQuoteToTimestamp(claim.claim_text, segments);
      }
    }
  }

  // Legislative events — match quote field
  if (result.legislative_events) {
    for (const event of result.legislative_events) {
      if (event.quote && !event.quote_timestamp_seconds) {
        event.quote_timestamp_seconds = matchQuoteToTimestamp(event.quote, segments);
      }
    }
  }

  return result;
}

/**
 * Add timestamps to Phenomenology result.
 * Matches: encounter_flow[].key_quote, entities[].message_quote,
 *          consciousness_alteration.reality_quote
 */
export function addTimestampsToPhenomenology(
  result: UapPhenomenologyResult,
  rawTimestamped: unknown,
): UapPhenomenologyResult {
  const segments = extractSegments(rawTimestamped);
  if (!segments?.length) return result;

  // Encounter flow — match key_quote
  if (result.encounter_flow) {
    for (const phase of result.encounter_flow) {
      if (phase.key_quote && !phase.key_quote_timestamp_seconds) {
        phase.key_quote_timestamp_seconds = matchQuoteToTimestamp(phase.key_quote, segments);
      }
    }
  }

  // Entities — match message_quote
  if (result.entities) {
    for (const entity of result.entities) {
      if (entity.message_quote && !entity.message_quote_timestamp_seconds) {
        entity.message_quote_timestamp_seconds = matchQuoteToTimestamp(entity.message_quote, segments);
      }
    }
  }

  // Consciousness — match reality_quote
  if (result.consciousness_alteration?.reality_quote) {
    const ca = result.consciousness_alteration;
    if (!ca.reality_quote_timestamp_seconds) {
      ca.reality_quote_timestamp_seconds = matchQuoteToTimestamp(ca.reality_quote, segments);
    }
  }

  return result;
}
