/**
 * Name normalization, keys, nickname canonicalization and similarity measures
 * for experiencer de-duplication (SPEC Job 1).
 */
import { readFileSync } from 'fs';
import path from 'path';

/** Tokens dropped after normalization (honorifics and suffixes). */
export const HONORIFICS = new Set([
  'dr', 'rev', 'reverend', 'mr', 'mrs', 'ms', 'miss', 'prof', 'phd', 'md', 'jr', 'sr', 'ii', 'iii', 'iv',
]);

/**
 * NFKD strip accents, lowercase, drop punctuation, drop honorifics/suffixes,
 * collapse whitespace. Apostrophes and periods are removed outright
 * ("O'Brien" -> "obrien", "Ph.D." -> "phd"); every other non-alphanumeric
 * character (hyphen, comma, ...) separates tokens ("Smith-Jones" -> "smith jones").
 */
export function normalizeName(raw: string): string {
  const t = raw
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/['‘’ʼ`.]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  if (t === '') return '';
  return t
    .split(' ')
    .filter((tok) => tok !== '' && !HONORIFICS.has(tok))
    .join(' ');
}

export interface ParsedName {
  /** Normalized full string (the exact_key). */
  full: string;
  tokens: string[];
  /** First token ('' if none). */
  first: string;
  /** Last token; '' when the name has a single token. */
  last: string;
  /** Tokens strictly between first and last (ignored for keys). */
  middle: string[];
}

export function parseName(raw: string): ParsedName {
  const full = normalizeName(raw);
  const tokens = full === '' ? [] : full.split(' ');
  return {
    full,
    tokens,
    first: tokens[0] ?? '',
    last: tokens.length > 1 ? tokens[tokens.length - 1] : '',
    middle: tokens.length > 2 ? tokens.slice(1, -1) : [],
  };
}

// ---- nicknames ------------------------------------------------------------

interface NicknameFile { _source: string; groups: string[][] }

let nickMap: Map<string, string> | null = null;

export function loadNicknames(file = path.join(__dirname, '..', 'data', 'nicknames.json')): Map<string, string> {
  const data = JSON.parse(readFileSync(file, 'utf8')) as NicknameFile;
  const map = new Map<string, string>();
  for (const group of data.groups) {
    const canonical = group[0];
    for (const variant of group) if (!map.has(variant)) map.set(variant, canonical);
  }
  return map;
}

/** Canonical form of a (normalized) given name; unknown names map to themselves. */
export function canonicalFirst(first: string, map: Map<string, string> = (nickMap ??= loadNicknames())): string {
  return map.get(first) ?? first;
}

// ---- keys -----------------------------------------------------------------

/** exact_key = normalized full string; null when the name is empty. */
export function exactKey(raw: string): string | null {
  const full = normalizeName(raw);
  return full === '' ? null : full;
}

/**
 * core_key = canonical(first) + ' ' + last (middle names and initials ignored).
 * null when there is no last name (single-token names are too ambiguous to key).
 */
export function coreKey(raw: string, map?: Map<string, string>): string | null {
  const p = parseName(raw);
  if (!p.first || !p.last) return null;
  return `${canonicalFirst(p.first, map)} ${p.last}`;
}

// ---- similarity -----------------------------------------------------------

export function jaroWinkler(a: string, b: string, prefixScale = 0.1): number {
  if (a === b) return a === '' ? 0 : 1;
  if (a === '' || b === '') return 0;
  const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatched = new Array<boolean>(a.length).fill(false);
  const bMatched = new Array<boolean>(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const lo = Math.max(0, i - range);
    const hi = Math.min(b.length - 1, i + range);
    for (let j = lo; j <= hi; j++) {
      if (!bMatched[j] && a[i] === b[j]) {
        aMatched[i] = bMatched[j] = true;
        matches++;
        break;
      }
    }
  }
  if (matches === 0) return 0;
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatched[i]) continue;
    while (!bMatched[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  const t = transpositions / 2;
  const jaro = (matches / a.length + matches / b.length + (matches - t) / matches) / 3;
  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length) && a[i] === b[i]; i++) prefix++;
  return jaro + prefix * prefixScale * (1 - jaro);
}

/** True when one name is a single letter and the other (longer) name starts with it. */
export function isInitialOf(a: string, b: string): boolean {
  if (a.length === 1 && b.length > 1) return b[0] === a;
  if (b.length === 1 && a.length > 1) return a[0] === b;
  return false;
}

export function nicknameEquivalent(a: string, b: string, map?: Map<string, string>): boolean {
  return a !== '' && b !== '' && canonicalFirst(a, map) === canonicalFirst(b, map);
}

export type CandidateRule = 'last_and_first_similar' | 'first_and_last_similar' | 'swapped';

export const THRESHOLDS = { firstJW: 0.85, lastJW: 0.9 } as const;

/**
 * SPEC Job 1 step 3 candidate rule for two raw names. Returns which rule fired
 * (first match in the order below) or null:
 *  - same last name AND (first names nickname-equivalent OR JW(first) >= 0.85 OR initial)
 *  - same (canonical) first name AND JW(last) >= 0.90
 *  - first/last swapped
 * Both names need a first and a last token.
 */
export function candidatePairRule(rawA: string, rawB: string, map?: Map<string, string>): CandidateRule | null {
  const a = parseName(rawA);
  const b = parseName(rawB);
  if (!a.first || !a.last || !b.first || !b.last) return null;
  if (a.last === b.last) {
    if (
      nicknameEquivalent(a.first, b.first, map) ||
      jaroWinkler(a.first, b.first) >= THRESHOLDS.firstJW ||
      isInitialOf(a.first, b.first)
    ) {
      return 'last_and_first_similar';
    }
  }
  if (canonicalFirst(a.first, map) === canonicalFirst(b.first, map) && jaroWinkler(a.last, b.last) >= THRESHOLDS.lastJW) {
    return 'first_and_last_similar';
  }
  if (a.first === b.last && a.last === b.first && a.first !== a.last) return 'swapped';
  return null;
}
