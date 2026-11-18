import { describe, expect, it } from 'vitest';
import { csvCell, neutralizeFormula, parseCsv, parseCsvRows, toCsv } from '../job2/csv';
import { fmtProportion, goldStats, latestMarks, parseYN, selectGoldRows, youtubeLink, type GoldMark } from '../job2/gold';
import { agreement, modelAnswerStats, pilotStats, usageStats, type PilotAnswer } from '../job2/pilot-stats';
import { combineStances, tallyByQuestion, type FinalRow } from '../job2/tally';
import { parseGoldSheet } from '../job2/import-gold';
import type { Stance } from '../job2/answers';

const mk = (video_id: string, question_id: number, stance: Stance | null, o: Partial<PilotAnswer> = {}): PilotAnswer => ({
  video_id, question_id, valid: stance !== null, stance, confidence: stance ? 90 : null, quote_verified: stance !== null && stance !== 'not_addressed', error: null, ...o,
});

describe('pilot statistics (hand computed)', () => {
  // (Haiku, Sonnet): 3 x (yes,yes); 1 x (no,no); 4 x (NA,NA); 1 x (yes,mixed); 1 x (NA,yes)
  const H: Array<[string, number, Stance]> = [['A', 1, 'yes'], ['A', 2, 'yes'], ['A', 3, 'no'], ['A', 4, 'not_addressed'], ['A', 5, 'not_addressed'], ['B', 1, 'yes'], ['B', 2, 'not_addressed'], ['B', 3, 'yes'], ['B', 4, 'not_addressed'], ['B', 5, 'not_addressed']];
  const S: Stance[] = ['yes', 'yes', 'no', 'not_addressed', 'not_addressed', 'mixed', 'yes', 'yes', 'not_addressed', 'not_addressed'];
  const haiku = H.map(([v, q, s]) => mk(v, q, s, v === 'B' && q === 3 ? { quote_verified: false } : {}));
  const sonnet = H.map(([v, q], i) => mk(v, q, S[i]));
  const st = pilotStats(haiku, sonnet);

  it('agreement and kappa', () => {
    expect(st.pairedCells).toBe(10);
    expect(st.overall.agreement).toBeCloseTo(0.8, 12);
    // po 0.8; pe = (4*4 + 1*1 + 0*1 + 5*4)/100 = 0.37; kappa = 0.43/0.63
    expect(st.overall.kappa4.expected).toBeCloseTo(0.37, 12);
    expect(st.overall.kappa4.kappa).toBeCloseTo(0.43 / 0.63, 12);
    // addressed vs not: po 0.9; pe = .5*.6 + .5*.4 = 0.5; kappa 0.8
    expect(st.overall.kappaAddressed.kappa).toBeCloseTo(0.8, 12);
  });
  it('confusion matrix (rows Haiku, columns Sonnet; yes,no,mixed,not_addressed)', () => {
    expect(st.confusion.labels).toEqual(['yes', 'no', 'mixed', 'not_addressed']);
    expect(st.confusion.counts).toEqual([[3, 0, 1, 0], [0, 1, 0, 0], [0, 0, 0, 0], [1, 0, 0, 4]]);
  });
  it('per-question stats use only that question', () => {
    const q1 = st.perQuestion.find((q) => q.question_id === 1)!;
    expect(q1.n).toBe(2);
    expect(q1.agreement).toBe(0.5); // (yes,yes) and (yes,mixed)
    const q4 = st.perQuestion.find((q) => q.question_id === 4)!;
    expect(q4.kappa4.kappa).toBeNull(); // both constant and identical: p_e = 1 -> n/a
  });
  it('quote failure rate per model counts unverified claims among valid claims', () => {
    expect(st.haiku).toMatchObject({ cells: 10, invalid: 0, claims: 5, unverified: 1 });
    expect(st.haiku.quoteFailureRate).toBeCloseTo(0.2, 12);
    expect(st.sonnet.quoteFailureRate).toBe(0);
  });
  it('flagged and dispute shares for the projection', () => {
    // Haiku flagged: A3 (no) and B3 (unverified quote); Sonnet agrees with verified quotes on both -> no disputes
    expect(st.shares.flaggedCellShare).toBeCloseTo(0.2, 12);
    expect(st.shares.shareVideosWithFlag).toBe(1);
    expect(st.shares.meanFlaggedPerFlaggedVideo).toBe(1);
    expect(st.shares.disputeShareOfFlagged).toBe(0);
    expect(st.shares.shareVideosWithDispute).toBe(0);
  });
  it('invalid answers are excluded from agreement, counted in the invalid rate, and count as disputes when flagged', () => {
    const h2 = haiku.map((a) => (a.video_id === 'A' && a.question_id === 1 ? mk('A', 1, null, { error: 'missing_answer' }) : a));
    const s2 = pilotStats(h2, sonnet);
    expect(s2.pairedCells).toBe(9);
    expect(s2.excludedInvalidCells).toBe(1);
    expect(s2.haiku.invalidRate).toBeCloseTo(0.1, 12);
    expect(s2.haiku.errors).toEqual({ missing_answer: 1 });
    // A1 invalid is flagged and disputed (Sonnet verified yes does not agree with an invalid reader)
    expect(s2.shares.disputeShareOfFlagged).toBeCloseTo(1 / 3, 12);
    expect(s2.shares.shareVideosWithDispute).toBe(0.5);
  });
  it('agreement() on an empty set is n/a', () => {
    const e = agreement([]);
    expect(e.agreement).toBeNull();
    expect(e.kappa4.kappa).toBeNull();
  });
  it('modelAnswerStats handles an empty model', () => expect(modelAnswerStats([]).quoteFailureRate).toBeNull());
  it('usage stats price actual usage (batch) and the no-cache variant', () => {
    const u = usageStats('claude-haiku-5-5', [
      { input_tokens: 6000, output_tokens: 4000, cache_creation_input_tokens: 4000 },
      { input_tokens: 6000, output_tokens: 2000, cache_read_input_tokens: 4000 },
    ], 81);
    expect(u.totals).toMatchObject({ requests: 2, inputTokens: 12000, outputTokens: 6000, cacheReadTokens: 4000, cacheWriteTokens: 4000 });
    // r1: (6000*.1 + 4000*.1*1.25 + 4000*.5)/1e6*.5 = 0.00155 ; r2: (600 + 4000*.1*.1 + 1000)/1e6*.5 = 0.000820
    expect(u.totals.costUsd).toBeCloseTo(0.00155 + 0.00082, 10);
    expect(u.rates.meanPromptTokens).toBe(10000);
    expect(u.rates.meanOutputTokens).toBe(3000);
    expect(u.rates.meanOutputPerQuestion).toBeCloseTo(3000 / 81, 10);
    // no-cache: r1 (10000*.1 + 2000)/1e6*.5 = .0015 ; r2 (1000 + 1000)/1e6*.5 = .001
    expect(u.costNoCacheUsd).toBeCloseTo(0.0025, 10);
  });
});

describe('person rollup', () => {
  it('combination rule', () => {
    expect(combineStances([])).toBe('not_addressed');
    expect(combineStances(['not_addressed', 'not_addressed'])).toBe('not_addressed');
    expect(combineStances(['yes', 'not_addressed'])).toBe('yes');
    expect(combineStances(['yes', 'yes'])).toBe('yes');
    expect(combineStances(['no', 'no', 'not_addressed'])).toBe('no');
    expect(combineStances(['yes', 'no'])).toBe('mixed');
    expect(combineStances(['yes', 'mixed'])).toBe('mixed');
    expect(combineStances(['mixed'])).toBe('mixed');
  });
  const q = [{ id: 1, category: 'c', consumer_question: 'Q1?' }];
  const f = (video_id: string, stance: Stance | null, status = 'final'): FinalRow => ({ video_id, question_id: 1, stance, status });
  const rows = [
    f('v1', 'yes'), f('v2', 'no'),            // P1: two videos, conflict -> mixed, counted once
    f('v3', 'yes'), f('v6', 'yes', 'pending_arbiter'), // P2: yes; the pending video is excluded
    f('v4', 'not_addressed'),                 // P3: all not_addressed
    f('v5', 'yes', 'unverified'),             // P4: only an excluded answer
  ];
  const personOf = new Map([['v1', 'P1'], ['v2', 'P1'], ['v3', 'P2'], ['v6', 'P2'], ['v4', 'P3'], ['v5', 'P4']]);
  it('counts each person once, excludes non-final answers, and gives Wilson intervals with n', () => {
    const [t] = tallyByQuestion(rows, personOf, q);
    expect(t).toMatchObject({ n_persons: 3, n_yes: 1, n_no: 0, n_mixed: 1, n_not_addressed: 1, n_addressed: 2 });
    expect(t.pct_yes).toBeCloseTo(100 / 3, 10);
    expect(t).toMatchObject({ n_excluded_unverified: 2, n_excl_unverified_quote: 1, n_excl_pending: 1, n_excl_invalid: 0, n_persons_all_excluded: 1 });
    expect(t.pct_yes_of_addressed).toBeCloseTo(50, 10);
    expect(t.yes_ci_lo).toBeCloseTo(9.45, 1);
    expect(t.yes_ci_hi).toBeCloseTo(90.55, 1);
    expect(t.pct_no_of_addressed).toBe(0);
  });
  it('sensitivity (each video its own person) counts the same videos separately', () => {
    const [t] = tallyByQuestion(rows, new Map(rows.map((r) => [r.video_id, r.video_id])), q);
    expect(t).toMatchObject({ n_persons: 4, n_yes: 2, n_no: 1, n_mixed: 0, n_not_addressed: 1, n_excluded_unverified: 2 });
  });
  it('a question with no data yields nulls, not NaN', () => {
    const [t] = tallyByQuestion([], new Map(), q);
    expect(t.n_persons).toBe(0);
    expect(t.pct_yes).toBeNull();
    expect(t.yes_ci_lo).toBeNull();
  });
  it('fails loudly for an unmapped video', () => {
    expect(() => tallyByQuestion([f('zzz', 'yes')], new Map(), q)).toThrow(/no person mapping/);
  });
});

describe('gold set', () => {
  const cell = (video_id: string, question_id: number, stance: Stance, status = 'final') => ({ video_id, question_id, stance, status });
  const cells = [
    ...[1, 2].map((q) => cell('A', q, 'yes')), cell('A', 3, 'no', 'pending_arbiter'),
    ...[10, 11, 12, 13, 14].map((q) => cell('A', q, 'not_addressed')),
    cell('B', 1, 'no', 'unverified'), cell('B', 2, 'not_addressed'), cell('B', 3, 'not_addressed'),
  ];
  it('selects every final answer plus 3 seeded not_addressed rows per video', () => {
    const rows = selectGoldRows(cells, 1);
    expect(rows.filter((r) => r.video_id === 'A' && r.stance !== 'not_addressed')).toHaveLength(2);
    expect(rows.filter((r) => r.video_id === 'A' && r.stance === 'not_addressed')).toHaveLength(3);
    expect(rows.filter((r) => r.video_id === 'B')).toHaveLength(2); // only 2 not_addressed exist; unverified excluded
    expect(rows.some((r) => r.status !== 'final')).toBe(false);
    expect(selectGoldRows(cells, 1)).toEqual(rows);
    const other = selectGoldRows(cells, 2).filter((r) => r.stance === 'not_addressed' && r.video_id === 'A').map((r) => r.question_id);
    const same = rows.filter((r) => r.stance === 'not_addressed' && r.video_id === 'A').map((r) => r.question_id);
    expect([...other].sort()).not.toEqual([...same].sort());
  });
  const m = (video_id: string, question_id: number, final_stance: Stance, correct: boolean, q: boolean | null, id?: number): GoldMark => ({ id, video_id, question_id, final_stance, correct, quote_is_experiencer: q });
  const marks: GoldMark[] = [
    m('A', 1, 'yes', true, true, 1), m('A', 2, 'yes', true, true, 2), m('A', 3, 'yes', true, true, 3), m('A', 4, 'yes', false, false, 4),
    m('A', 5, 'no', true, true, 5), m('A', 6, 'no', true, null, 6),
    m('A', 7, 'not_addressed', true, null, 7), m('A', 8, 'not_addressed', true, null, 8), m('A', 9, 'not_addressed', false, null, 9),
  ];
  it('precision per stance with Wilson 95% CI and n; quote rate; not_addressed accuracy', () => {
    const s = goldStats(marks);
    expect(s.nMarked).toBe(9);
    expect(s.perStance.yes).toMatchObject({ k: 3, n: 4, p: 0.75 });
    expect(s.perStance.yes.lo).toBeCloseTo(0.3006, 3);
    expect(s.perStance.yes.hi).toBeCloseTo(0.9544, 3);
    expect(s.perStance.no).toMatchObject({ k: 2, n: 2 });
    expect(s.perStance.mixed).toMatchObject({ k: 0, n: 0, p: null });
    expect(s.allClaims).toMatchObject({ k: 5, n: 6 });
    expect(s.notAddressed).toMatchObject({ k: 2, n: 3 });
    expect(s.quoteIsExperiencer).toMatchObject({ k: 4, n: 5 });
    expect(s.quoteUnmarked).toBe(1);
    expect(fmtProportion(s.perStance.mixed)).toContain('n/a');
    expect(fmtProportion(s.perStance.yes)).toBe('75.0% (3/4; Wilson 95% CI 30.1-95.4%)');
  });
  it('the latest mark per cell wins', () => {
    const later = [...marks, m('A', 4, 'yes', true, true, 10)];
    expect(latestMarks(later)).toHaveLength(9);
    expect(goldStats(later).perStance.yes.k).toBe(4);
  });
  it('YouTube link uses &t=Ns only when a start time exists', () => {
    expect(youtubeLink('abc_DEF-123', 75.9)).toBe('https://www.youtube.com/watch?v=abc_DEF-123&t=75s');
    expect(youtubeLink('abc', null)).toBe('https://www.youtube.com/watch?v=abc');
  });
  it('parseYN accepts Y/N variants, blank is null, junk throws', () => {
    expect(parseYN('Y', 'c')).toBe(true);
    expect(parseYN(' no ', 'c')).toBe(false);
    expect(parseYN('', 'c')).toBeNull();
    expect(() => parseYN('maybe', 'c')).toThrow(/expected Y or N/);
  });
});

describe('csv and gold sheet import parsing', () => {
  it('round-trips commas, quotes, newlines; handles BOM and CRLF', () => {
    const text = toCsv(['a', 'b'], [{ a: 'x,y', b: 'he said "hi"\nbye' }, { a: '', b: null }]);
    expect(parseCsv(text)).toEqual([{ a: 'x,y', b: 'he said "hi"\nbye' }, { a: '', b: '' }]);
    expect(parseCsvRows('﻿a,b\r\n1,2\r\n')).toEqual([['a', 'b'], ['1', '2']]);
    expect(() => parseCsvRows('a,"b')).toThrow(/unterminated/);
    expect(csvCell(NaN)).toBe('');
  });
  it('neutralizes spreadsheet formulas in free text', () => {
    expect(neutralizeFormula('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(neutralizeFormula('plain')).toBe('plain');
  });
  const head = 'video_id,title,question_id,category,question,final_stance,confidence,quote,youtube_link,deciding_model,deciding_pass,answer_id,correct (Y/N),quote_is_experiencer (Y/N),note';
  it('parses marks, skips unmarked rows, and reports row errors without throwing', () => {
    const csv = [
      head,
      'v1,t,1,c,q,yes,90,quote,link,m,first,11,Y,Y,fine',
      'v1,t,2,c,q,not_addressed,90,,link,m,first,12,N,,',
      'v1,t,3,c,q,yes,90,quote,link,m,first,13,,,',
      'v1,t,4,c,q,yes,90,quote,link,m,first,14,maybe,,',
      'v1,t,5,c,q,bogus,90,quote,link,m,first,15,Y,,',
      'v1,t,6,c,q,yes,90,quote,link,m,first,xx,Y,,',
      'v1,t,1,c,q,yes,90,quote,link,m,first,11,Y,Y,dup',
    ].join('\n');
    const r = parseGoldSheet(csv);
    expect(r.marks).toEqual([
      { video_id: 'v1', question_id: 1, stance_answer_id: 11, final_stance: 'yes', correct: true, quote_is_experiencer: true, note: 'fine' },
      { video_id: 'v1', question_id: 2, stance_answer_id: 12, final_stance: 'not_addressed', correct: false, quote_is_experiencer: null, note: null },
    ]);
    expect(r.unmarked).toBe(1);
    expect(r.errors).toHaveLength(4);
    expect(r.errors[0]).toMatch(/^line 5:/);
    expect(r.errors.join('\n')).toMatch(/duplicate row/);
  });
});
