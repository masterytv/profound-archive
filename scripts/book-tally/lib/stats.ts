/** Agreement and interval statistics (SPEC "Statistics"). */

export type Pair<T extends string = string> = readonly [T, T];

export function percentAgreement(pairs: ReadonlyArray<Pair>): number | null {
  if (pairs.length === 0) return null;
  let agree = 0;
  for (const [a, b] of pairs) if (a === b) agree++;
  return agree / pairs.length;
}

export interface ConfusionMatrix {
  labels: string[];
  /** counts[i][j]: rater A said labels[i], rater B said labels[j]. */
  counts: number[][];
  n: number;
}

export function confusionMatrix(pairs: ReadonlyArray<Pair>, labels?: readonly string[]): ConfusionMatrix {
  const labs = labels ? [...labels] : [...new Set(pairs.flatMap(([a, b]) => [a, b]))].sort();
  const index = new Map(labs.map((l, i) => [l, i]));
  const counts = labs.map(() => labs.map(() => 0));
  let n = 0;
  for (const [a, b] of pairs) {
    const i = index.get(a);
    const j = index.get(b);
    if (i === undefined || j === undefined) throw new Error(`label outside category set: ${i === undefined ? a : b}`);
    counts[i][j]++;
    n++;
  }
  return { labels: labs, counts, n };
}

export interface Kappa {
  /** null when undefined (p_e = 1 or n = 0); report as "n/a". */
  kappa: number | null;
  observed: number | null;
  expected: number | null;
  n: number;
}

/** Cohen's kappa over k categories: (p_o - p_e) / (1 - p_e). */
export function cohensKappa(pairs: ReadonlyArray<Pair>, labels?: readonly string[]): Kappa {
  const cm = confusionMatrix(pairs, labels);
  const n = cm.n;
  if (n === 0) return { kappa: null, observed: null, expected: null, n };
  const k = cm.labels.length;
  let diag = 0;
  const rowSum = new Array<number>(k).fill(0);
  const colSum = new Array<number>(k).fill(0);
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      rowSum[i] += cm.counts[i][j];
      colSum[j] += cm.counts[i][j];
    }
    diag += cm.counts[i][i];
  }
  const po = diag / n;
  let pe = 0;
  for (let i = 0; i < k; i++) pe += (rowSum[i] / n) * (colSum[i] / n);
  // Float-safe check for p_e = 1 (both raters constant and identical).
  if (1 - pe < 1e-12) return { kappa: null, observed: po, expected: pe, n };
  return { kappa: (po - pe) / (1 - pe), observed: po, expected: pe, n };
}

export function formatKappa(k: Kappa, digits = 3): string {
  return k.kappa === null ? 'n/a' : k.kappa.toFixed(digits);
}

export interface Proportion {
  k: number;
  n: number;
  p: number | null;
  lo: number | null;
  hi: number | null;
}

const Z95 = 1.959963984540054;

/** Wilson score interval for k successes in n trials (default 95%). */
export function wilson(k: number, n: number, z = Z95): Proportion {
  if (n <= 0) return { k, n, p: null, lo: null, hi: null };
  if (k < 0 || k > n) throw new Error(`wilson: k=${k} outside [0, ${n}]`);
  const p = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return { k, n, p, lo: Math.max(0, centre - half), hi: Math.min(1, centre + half) };
}
