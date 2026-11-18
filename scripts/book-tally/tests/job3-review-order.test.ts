import { describe, expect, it } from 'vitest';
import { blockPattern, BLOCK_SIZE, REVIEW_MIX, reviewOrder, STRATA, stratumOf, type OrderInput } from '../job3/review-order';
import { goldStats, renderReport, stratumSection, type ReportRow } from '../job3/gold-report';

let id = 1;
const mk = (n: number, isFact: boolean, kind: 'yn' | 'mc', outcome: 'counted' | 'not_addressed'): OrderInput[] =>
  Array.from({ length: n }, () => ({ coded_answer_id: id++, isFact, kind, outcome }));
// the real sheet's make-up: 337 yes/no + 170 multiple choice counted (facts among them), 75 not addressed
const sheet = [...mk(250, false, 'yn', 'counted'), ...mk(120, false, 'mc', 'counted'), ...mk(87, true, 'yn', 'counted'), ...mk(50, true, 'mc', 'counted'), ...mk(75, false, 'yn', 'not_addressed')];

describe('review order', () => {
  it('a block pattern has the agreed make-up and interleaves the types', () => {
    const p = blockPattern();
    expect(p).toHaveLength(BLOCK_SIZE);
    for (const s of STRATA) expect(p.filter((x) => x === s)).toHaveLength(REVIEW_MIX[s]);
    // no type fills more than 2 slots in a row
    for (let i = 2; i < p.length; i++) expect(p[i] === p[i - 1] && p[i] === p[i - 2]).toBe(false);
  });

  it('every row gets one position; each whole block of 20 has 8 yes/no, 6 multiple choice, 3 facts, 3 not addressed', () => {
    const order = reviewOrder(sheet, 20261118);
    expect(order.size).toBe(sheet.length);
    expect(new Set(order.values()).size).toBe(sheet.length);
    const byPos = new Map([...order].map(([cid, pos]) => [pos, sheet.find((r) => r.coded_answer_id === cid)!]));
    for (let b = 0; b < 3; b++) {
      const block = Array.from({ length: BLOCK_SIZE }, (_, i) => stratumOf(byPos.get(b * BLOCK_SIZE + i)!));
      for (const s of STRATA) expect(block.filter((x) => x === s)).toHaveLength(REVIEW_MIX[s]);
    }
  });

  it('is deterministic for a seed and different for another seed', () => {
    const a = reviewOrder(sheet, 20261118), b = reviewOrder(sheet, 20261118), c = reviewOrder(sheet, 7);
    expect([...a]).toEqual([...b]);
    expect([...a]).not.toEqual([...c]);
  });

  it('when a group runs out, its slots go to the other groups (every row still ordered)', () => {
    const small = [...mk(30, false, 'yn', 'counted'), ...mk(2, true, 'yn', 'counted'), ...mk(1, false, 'yn', 'not_addressed')];
    const order = reviewOrder(small, 1);
    expect(order.size).toBe(33);
    expect(Math.max(...order.values())).toBe(32);
  });
});

describe('gold report review sample section', () => {
  it('reports each group separately with k/n', () => {
    const rows: ReportRow[] = [
      { coded_answer_id: 1, kind: 'yn', isFact: false, outcome: 'counted', stance: 'yes', codes: [], confidence: 90 },
      { coded_answer_id: 2, kind: 'yn', isFact: false, outcome: 'counted', stance: 'no', codes: [], confidence: 80 },
      { coded_answer_id: 3, kind: 'mc', isFact: false, outcome: 'counted', stance: null, codes: ['love', 'learn_grow'], confidence: 85 },
      { coded_answer_id: 4, kind: 'yn', isFact: true, outcome: 'counted', stance: 'yes', codes: [], confidence: 95 },
      { coded_answer_id: 5, kind: 'yn', isFact: false, outcome: 'not_addressed', stance: null, codes: [], confidence: 90 },
    ];
    const mark = (over: Record<string, unknown>) => ({ id: 0, video_id: 'v', item_key: 'q', coded_answer_id: 0, addressed_correct: true, answer_correct: true, wrong_choices: null, missing_answer: null, quote_is_experiencer: true, note: null, ...over });
    const marks = new Map<number, any>([
      [1, mark({ coded_answer_id: 1 })], [2, mark({ coded_answer_id: 2, answer_correct: false })],
      [3, mark({ coded_answer_id: 3, answer_correct: false, wrong_choices: ['learn_grow'] })], [4, mark({ coded_answer_id: 4 })],
      [5, mark({ coded_answer_id: 5, addressed_correct: false, answer_correct: null, quote_is_experiencer: null })],
    ]);
    const by = Object.fromEntries(STRATA.map((k) => [k, goldStats(rows.filter((r) => stratumOf(r) === k), marks)])) as never;
    const text = stratumSection({ first: 5, sheetRows: 582, byStratum: by }).join('\n');
    expect(text).toMatch(/\| yes\/no questions \| stance correct \(of rightly addressed\) \| 50\.0% \(1\/2/);
    expect(text).toMatch(/\| multiple-choice questions \| listed answers right \| 50\.0% \(1\/2/);
    expect(text).toMatch(/\| not addressed \(spot check\) \| truly not addressed \| 0\.0% \(0\/1/);
    const full = renderReport(goldStats(rows, marks), { codebookVersion: 'codebook-v1', promptHash: 'x'.repeat(64), videos: 25, params: { n: 25, seed: 1, naPerVideo: 3 } }, false, { first: 5, sheetRows: 582, byStratum: by });
    expect(full).toMatch(/\*\*Review sample:\*\* the first 5 cards/);
  });
});
