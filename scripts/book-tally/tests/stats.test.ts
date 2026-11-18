import { describe, expect, it } from 'vitest';
import { cohensKappa, confusionMatrix, formatKappa, percentAgreement, wilson, type Pair } from '../lib/stats';

const rep = (a: string, b: string, n: number): Pair[] => Array.from({ length: n }, () => [a, b] as Pair);

describe('cohensKappa', () => {
  // Classic 2x2: 20 yes/yes, 5 yes/no, 10 no/yes, 15 no/no (n = 50).
  // p_o = 35/50 = .70 ; A: yes 25 no 25 ; B: yes 30 no 20
  // p_e = .5*.6 + .5*.4 = .50 ; kappa = (.70-.50)/(1-.50) = 0.40
  const pairs = [...rep('yes', 'yes', 20), ...rep('yes', 'no', 5), ...rep('no', 'yes', 10), ...rep('no', 'no', 15)];
  it('2 categories, hand-computed', () => {
    const k = cohensKappa(pairs);
    expect(k.n).toBe(50);
    expect(k.observed).toBeCloseTo(0.7, 12);
    expect(k.expected).toBeCloseTo(0.5, 12);
    expect(k.kappa).toBeCloseTo(0.4, 12);
  });
  it('4 categories, hand-computed', () => {
    // n=10. A: y,y,y,n,n,m,m,x,x,x  B: y,y,n,n,n,m,x,x,x,y
    // matches at positions 0,1,3,4,5,7,8 -> 7/10 = .7
    // A counts y3 n2 m2 x3 ; B counts y3 n3 m1 x3
    // p_e = (9 + 6 + 2 + 9)/100 = .26 ; kappa = (.7-.26)/.74 = 0.594594...
    const a = ['y','y','y','n','n','m','m','x','x','x'];
    const b = ['y','y','n','n','n','m','x','x','x','y'];
    const k = cohensKappa(a.map((v, i) => [v, b[i]] as Pair), ['y', 'n', 'm', 'x']);
    expect(k.observed).toBeCloseTo(0.7, 12);
    expect(k.expected).toBeCloseTo(0.26, 12);
    expect(k.kappa).toBeCloseTo(0.44 / 0.74, 12);
  });
  it('perfect agreement with variation gives 1', () => {
    expect(cohensKappa([...rep('a', 'a', 3), ...rep('b', 'b', 7)]).kappa).toBeCloseTo(1, 12);
  });
  it('p_e = 1 (both raters constant and identical) is undefined -> null / "n/a"', () => {
    const k = cohensKappa(rep('not_addressed', 'not_addressed', 40), ['yes', 'no', 'mixed', 'not_addressed']);
    expect(k.expected).toBeCloseTo(1, 12);
    expect(k.kappa).toBeNull();
    expect(formatKappa(k)).toBe('n/a');
  });
  it('empty input is undefined', () => {
    expect(cohensKappa([]).kappa).toBeNull();
  });
  it('systematic disagreement gives negative kappa', () => {
    expect(cohensKappa([...rep('a', 'b', 5), ...rep('b', 'a', 5)]).kappa).toBeCloseTo(-1, 12);
  });
  it('rejects labels outside the category set', () => {
    expect(() => cohensKappa([['a', 'z']], ['a', 'b'])).toThrow();
  });
});

describe('confusion matrix / agreement', () => {
  it('counts rows = rater A, cols = rater B', () => {
    const cm = confusionMatrix([['yes', 'no'], ['yes', 'no'], ['no', 'no']], ['yes', 'no']);
    expect(cm.counts).toEqual([[0, 2], [0, 1]]);
    expect(percentAgreement([['a', 'a'], ['a', 'b']])).toBe(0.5);
    expect(percentAgreement([])).toBeNull();
  });
});

describe('wilson', () => {
  it('matches hand-computed 95% interval for 8/10', () => {
    // centre = (0.8 + z^2/20)/(1+z^2/10), z^2 = 3.841459 -> (0.8+0.192073)/1.384146 = 0.716729
    // half = z*sqrt(0.016 + 3.841459/400)/1.384146 = 1.959964*sqrt(0.0256036)/1.384146 = 0.226554
    const w = wilson(8, 10);
    expect(w.p).toBeCloseTo(0.8, 12);
    expect(w.lo).toBeCloseTo(0.4902, 3);
    expect(w.hi).toBeCloseTo(0.9433, 3);
  });
  it('0/n and n/n stay inside [0,1]; lower bound of 0/n is 0', () => {
    const z = wilson(0, 25);
    expect(z.lo).toBeCloseTo(0, 12);
    expect(z.hi).toBeCloseTo(0.1332, 3);
    const o = wilson(25, 25);
    expect(o.hi).toBeCloseTo(1, 12);
    expect(o.lo).toBeCloseTo(0.8668, 3);
  });
  it('n = 0 yields nulls', () => {
    expect(wilson(0, 0)).toEqual({ k: 0, n: 0, p: null, lo: null, hi: null });
  });
  it('rejects k > n', () => {
    expect(() => wilson(5, 3)).toThrow();
  });
});
