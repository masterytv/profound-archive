import { describe, expect, it } from 'vitest';
import {
  candidatePairRule, canonicalFirst, coreKey, exactKey, isInitialOf, jaroWinkler,
  loadNicknames, normalizeName, parseName,
} from '../lib/names';

describe('normalizeName', () => {
  it('strips accents, case, punctuation, honorifics and suffixes', () => {
    expect(normalizeName('Dr. José  O’Brien, Jr.')).toBe('jose obrien');
    expect(normalizeName('REV. Mary-Ann Smith, Ph.D.')).toBe('mary ann smith');
    expect(normalizeName('Mr John Q. Public III')).toBe('john q public');
    expect(normalizeName('  ')).toBe('');
  });
});

describe('parseName / keys', () => {
  it('first/last ignore middle names and initials', () => {
    const p = parseName('John Quincy Adams');
    expect([p.first, p.last, p.middle]).toEqual(['john', 'adams', ['quincy']]);
    expect(coreKey('John Q. Adams')).toBe(coreKey('Jack Adams'));
  });
  it('exact key is the normalized full string', () => {
    expect(exactKey('Dr. Anita Moorjani')).toBe('anita moorjani');
    expect(exactKey('???')).toBeNull();
  });
  it('core key is null without a last name', () => {
    expect(coreKey('Madonna')).toBeNull();
  });
  it('exact differs but core matches across nickname', () => {
    expect(exactKey('Bill Smith')).not.toBe(exactKey('William Smith'));
    expect(coreKey('Bill Smith')).toBe(coreKey('William Smith'));
  });
});

describe('nicknames', () => {
  it('canonicalizes spec examples', () => {
    for (const n of ['bill', 'will', 'billy']) expect(canonicalFirst(n)).toBe('william');
    for (const n of ['bob', 'rob', 'bobby']) expect(canonicalFirst(n)).toBe('robert');
    for (const n of ['liz', 'beth']) expect(canonicalFirst(n)).toBe('elizabeth');
    expect(canonicalFirst('zelda')).toBe('zelda');
  });
  it('data file: ~100 groups, source cited, no variant in two groups, lowercase ascii', () => {
    const raw = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'data', 'nicknames.json'), 'utf8'));
    expect(typeof raw._source).toBe('string');
    expect(raw.groups.length).toBeGreaterThanOrEqual(90);
    const seen = new Set<string>();
    for (const g of raw.groups as string[][]) {
      expect(g.length).toBeGreaterThanOrEqual(2);
      for (const n of g) {
        expect(n).toMatch(/^[a-z]+$/);
        expect(seen.has(n)).toBe(false);
        seen.add(n);
      }
    }
    expect(loadNicknames().get('billy')).toBe('william');
  });
});

describe('jaroWinkler', () => {
  it('matches published reference values', () => {
    expect(jaroWinkler('martha', 'marhta')).toBeCloseTo(0.9611, 3);
    expect(jaroWinkler('dwayne', 'duane')).toBeCloseTo(0.84, 2);
    expect(jaroWinkler('dixon', 'dicksonx')).toBeCloseTo(0.8133, 3);
  });
  it('identity, empty, disjoint', () => {
    expect(jaroWinkler('anne', 'anne')).toBe(1);
    expect(jaroWinkler('', 'a')).toBe(0);
    expect(jaroWinkler('abc', 'xyz')).toBe(0);
  });
});

describe('isInitialOf', () => {
  it('detects initials in either direction', () => {
    expect(isInitialOf('j', 'john')).toBe(true);
    expect(isInitialOf('john', 'j')).toBe(true);
    expect(isInitialOf('j', 'mary')).toBe(false);
    expect(isInitialOf('j', 'j')).toBe(false);
  });
});

describe('candidatePairRule', () => {
  it('same last + nickname / JW / initial', () => {
    expect(candidatePairRule('Bill Jones', 'William Jones')).toBe('last_and_first_similar');
    expect(candidatePairRule('Katherine Doe', 'Katharine Doe')).toBe('last_and_first_similar');
    expect(candidatePairRule('J. Jones', 'John Jones')).toBe('last_and_first_similar');
  });
  it('same first + similar last (married-name / spelling variants)', () => {
    expect(candidatePairRule('Sarah Johnson', 'Sarah Jonson')).toBe('first_and_last_similar');
  });
  it('swapped first/last', () => {
    expect(candidatePairRule('Grant Ulysses', 'Ulysses Grant')).toBe('swapped');
  });
  it('rejects unrelated and single-token names', () => {
    expect(candidatePairRule('John Smith', 'Mary Jones')).toBeNull();
    expect(candidatePairRule('John Smith', 'Jane Smith')).toBeNull();
    expect(candidatePairRule('Madonna', 'Madonna')).toBeNull();
  });
});
