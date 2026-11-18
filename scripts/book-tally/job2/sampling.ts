/** Seeded, reproducible sampling (no Math.random anywhere). */
import { createHash } from 'crypto';

/** 32-bit seed from any string (sha256 prefix). */
export function hashSeed(s: string): number {
  return createHash('sha256').update(s).digest().readUInt32BE(0);
}

/** mulberry32 PRNG: returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates over a lexicographically sorted copy, so input order never matters. */
export function seededShuffle<T extends string | number>(items: readonly T[], seed: number, salt: string): T[] {
  const a = [...items].sort((x, y) => (String(x) < String(y) ? -1 : String(x) > String(y) ? 1 : 0));
  const rnd = mulberry32(hashSeed(`${seed}:${salt}`));
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Takes the first k ids (in seeded order) that satisfy `available`; ids that fail are
 * returned in `skipped` and replaced by the next ones in the same seeded order.
 */
export function takeFirstAvailable(
  order: readonly string[],
  k: number,
  available: (id: string) => boolean,
): { chosen: string[]; skipped: string[] } {
  const chosen: string[] = [];
  const skipped: string[] = [];
  for (const id of order) {
    if (chosen.length >= k) break;
    if (available(id)) chosen.push(id);
    else skipped.push(id);
  }
  return { chosen, skipped };
}

export const PILOT_SALT = 'pilot';
export const GOLD_SALT = 'gold';

/** Shuffled candidate orders for the pilot and (given the pilot's actual ids) the gold set. */
export function pilotOrder(allIds: readonly string[], seed: number): string[] {
  return seededShuffle(allIds, seed, PILOT_SALT);
}

export function goldOrder(allIds: readonly string[], seed: number, excludeIds: Iterable<string>): string[] {
  const ex = new Set(excludeIds);
  return seededShuffle(allIds.filter((id) => !ex.has(id)), seed, GOLD_SALT);
}

// ---- stratified sampling by size (for token-count extrapolation) ----

export interface Sized { id: string; size: number }

export interface Strata<T extends Sized> {
  /** Items per stratum, ordered by size ascending. */
  strata: T[][];
}

export function stratify<T extends Sized>(items: readonly T[], nStrata: number): Strata<T> {
  const sorted = [...items].sort((a, b) => a.size - b.size || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const k = Math.max(1, Math.min(nStrata, sorted.length));
  const strata: T[][] = Array.from({ length: k }, () => []);
  sorted.forEach((it, i) => strata[Math.min(k - 1, Math.floor((i * k) / sorted.length))].push(it));
  return { strata };
}

/**
 * Seeded proportional-allocation sample: at least `sampleSize` items in total, every
 * stratum represented (at least min(3, stratum size)). Returns the sample with stratum index.
 */
export function stratifiedSample<T extends Sized>(
  items: readonly T[],
  sampleSize: number,
  nStrata: number,
  seed: number,
): Array<{ item: T; stratum: number }> {
  const { strata } = stratify(items, nStrata);
  const total = items.length;
  const out: Array<{ item: T; stratum: number }> = [];
  strata.forEach((s, h) => {
    const want = Math.min(s.length, Math.max(Math.min(3, s.length), Math.ceil((sampleSize * s.length) / total)));
    const order = seededShuffle(s.map((x) => x.id), seed, `stratum${h}`);
    const byId = new Map(s.map((x) => [x.id, x]));
    for (const id of order.slice(0, want)) out.push({ item: byId.get(id)!, stratum: h });
  });
  return out;
}
