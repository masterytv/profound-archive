import { describe, expect, it } from 'vitest';
import {
  goldOrder, hashSeed, mulberry32, pilotOrder, seededShuffle, stratifiedSample, stratify, takeFirstAvailable,
} from '../job2/sampling';

const ids = Array.from({ length: 1000 }, (_, i) => `v${String(i).padStart(4, '0')}`);

describe('seeded sampling', () => {
  it('PRNG and shuffle are reproducible, input-order independent, and seed dependent', () => {
    const r1 = mulberry32(42), r2 = mulberry32(42);
    expect([r1(), r1(), r1()]).toEqual([r2(), r2(), r2()]);
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
    const a = seededShuffle(ids, 7, 'x');
    expect(seededShuffle([...ids].reverse(), 7, 'x')).toEqual(a);
    expect(seededShuffle(ids, 8, 'x')).not.toEqual(a);
    expect([...a].sort()).toEqual([...ids].sort());
  });
  it('pilot (100) and gold (25) are disjoint for many seeds, and reproducible', () => {
    for (const seed of [1, 2, 3, 20261118, 99999]) {
      const pilot = takeFirstAvailable(pilotOrder(ids, seed), 100, () => true).chosen;
      const gold = takeFirstAvailable(goldOrder(ids, seed, pilot), 25, () => true).chosen;
      expect(pilot).toHaveLength(100);
      expect(gold).toHaveLength(25);
      expect(new Set(pilot).size).toBe(100);
      expect(pilot.filter((x) => gold.includes(x))).toEqual([]);
      expect(takeFirstAvailable(pilotOrder(ids, seed), 100, () => true).chosen).toEqual(pilot);
    }
  });
  it('videos without a transcript are skipped and replaced from the same seeded order', () => {
    const order = pilotOrder(ids, 5);
    const bad = new Set(order.slice(0, 3));
    const r = takeFirstAvailable(order, 10, (v) => !bad.has(v));
    expect(r.skipped).toEqual(order.slice(0, 3));
    expect(r.chosen).toEqual(order.slice(3, 13));
  });
  it('gold excludes skipped pilot candidates too when passed in', () => {
    const order = pilotOrder(ids, 5);
    const gold = goldOrder(ids, 5, order.slice(0, 120));
    expect(gold.some((g) => order.slice(0, 120).includes(g))).toBe(false);
    expect(gold).toHaveLength(880);
  });
});

describe('stratified sampling by size', () => {
  const items = Array.from({ length: 1000 }, (_, i) => ({ id: `v${i}`, size: (i % 97) * 100 + i }));
  it('stratifies into near-equal strata ordered by size', () => {
    const { strata } = stratify(items, 10);
    expect(strata).toHaveLength(10);
    expect(strata.map((s) => s.length)).toEqual(Array(10).fill(100));
    expect(Math.max(...strata[0].map((x) => x.size))).toBeLessThanOrEqual(Math.min(...strata[1].map((x) => x.size)));
  });
  it('sample is >= requested size, covers every stratum, is reproducible', () => {
    const s = stratifiedSample(items, 120, 10, 3);
    expect(s.length).toBeGreaterThanOrEqual(120);
    expect(new Set(s.map((x) => x.stratum)).size).toBe(10);
    expect(new Set(s.map((x) => x.item.id)).size).toBe(s.length);
    expect(stratifiedSample(items, 120, 10, 3).map((x) => x.item.id)).toEqual(s.map((x) => x.item.id));
    expect(stratifiedSample(items, 120, 10, 4).map((x) => x.item.id)).not.toEqual(s.map((x) => x.item.id));
  });
});
