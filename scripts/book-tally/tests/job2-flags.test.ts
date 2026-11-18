import { describe, expect, it } from 'vitest';
import {
  buildDisputes, firstPassIsReaderA, isFlagged, needsArbiter, resolveFinal, stancesAgree, type AnswerLite, type DisputeInput,
} from '../job2/flags';

const a = (o: Partial<AnswerLite> = {}): AnswerLite => ({
  valid: true, stance: 'yes', confidence: 90, quote: 'q q q q q', quoteVerified: true, ...o,
});

describe('isFlagged (first-pass rule)', () => {
  it('passes a confident, verified yes and a confident not_addressed', () => {
    expect(isFlagged(a())).toBe(false);
    expect(isFlagged(a({ stance: 'not_addressed', quote: null, quoteVerified: false }))).toBe(false);
  });
  it.each([
    ['no', { stance: 'no' as const }],
    ['mixed', { stance: 'mixed' as const }],
    ['confidence 69', { confidence: 69 }],
    ['unverified quote', { quoteVerified: false }],
    ['invalid', { valid: false, stance: null, confidence: null, quote: null, quoteVerified: false }],
    ['low-confidence not_addressed', { stance: 'not_addressed' as const, quote: null, quoteVerified: false, confidence: 40 }],
  ])('flags %s', (_n, o) => expect(isFlagged(a(o))).toBe(true));
  it('confidence exactly 70 is not flagged', () => expect(isFlagged(a({ confidence: 70 }))).toBe(false));
});

describe('resolveFinal mirrors bt_final_stances', () => {
  const flagged = a({ stance: 'no' });
  it('unflagged first answer is final', () => expect(resolveFinal(a())).toMatchObject({ resolvedBy: 'first', status: 'final' }));
  it('flagged without recheck is pending_recheck', () => expect(resolveFinal(flagged).status).toBe('pending_recheck'));
  it('agreeing recheck with verified quote wins (recheck preferred)', () => {
    const r = a({ stance: 'no', quote: 'other quote here ok' });
    expect(resolveFinal(flagged, r)).toMatchObject({ resolvedBy: 'recheck', status: 'final', chosen: r });
  });
  it('agreeing recheck with unverified quote falls back to the first answer if its quote verified', () => {
    const f = a({ stance: 'mixed', confidence: 50 });
    const r = a({ stance: 'mixed', quoteVerified: false });
    expect(resolveFinal(f, r)).toMatchObject({ resolvedBy: 'first', status: 'final', chosen: f });
  });
  it('agreement with neither quote verified needs the arbiter', () => {
    const f = a({ stance: 'no', quoteVerified: false });
    const r = a({ stance: 'no', quoteVerified: false });
    expect(resolveFinal(f, r).status).toBe('pending_arbiter');
    expect(needsArbiter(f, r)).toBe(true);
  });
  it('disagreement needs the arbiter; the arbiter decides', () => {
    const r = a({ stance: 'yes' });
    expect(resolveFinal(flagged, r).status).toBe('pending_arbiter');
    const arb = a({ stance: 'mixed' });
    expect(resolveFinal(flagged, r, arb)).toMatchObject({ resolvedBy: 'arbiter', status: 'final', chosen: arb });
  });
  it('an invalid first answer is a disagreement even if the recheck is fine', () => {
    const f = a({ valid: false, stance: null, confidence: null, quote: null, quoteVerified: false });
    expect(stancesAgree(f, a())).toBe(false);
    expect(needsArbiter(f, a())).toBe(true);
  });
  it('an arbiter claim with an unverified quote is unverified (excluded from tallies)', () => {
    const r = a({ stance: 'yes' });
    expect(resolveFinal(flagged, r, a({ stance: 'no', quoteVerified: false })).status).toBe('unverified');
  });
  it('an invalid arbiter answer gives status invalid (mirrors the view)', () => {
    const r = a({ stance: 'yes' });
    const arb = a({ valid: false, stance: null, confidence: null, quote: null, quoteVerified: false });
    expect(resolveFinal(flagged, r, arb)).toMatchObject({ resolvedBy: 'arbiter', status: 'invalid' });
  });
  it('an arbiter not_addressed is final without a quote', () => {
    const arb = a({ stance: 'not_addressed', quote: null, quoteVerified: false });
    expect(resolveFinal(flagged, a({ stance: 'yes' }), arb).status).toBe('final');
  });
  it('needsArbiter is false once an arbiter answer exists or while the recheck is missing', () => {
    expect(needsArbiter(flagged, undefined)).toBe(false);
    expect(needsArbiter(flagged, a({ stance: 'yes' }), a())).toBe(false);
  });
});

describe('arbiter disputes and A/B blinding', () => {
  const inputs = (): DisputeInput[] => [
    { questionId: 7, category: 'c', question: 'Did you see a light?', first: a({ stance: 'no', quote: 'FIRSTQUOTE one two three' }), recheck: a({ stance: 'yes', quote: 'SECONDQUOTE one two three' }) },
    { questionId: 9, category: 'c', question: 'Did you meet someone?', first: a({ valid: false, stance: null, confidence: null, quote: null, quoteVerified: false }), recheck: a({ stance: 'mixed' }) },
  ];
  it('puts the first-pass answer under Reader A or B per the coin and records nothing identifying', () => {
    const asA = buildDisputes(inputs(), true);
    expect(asA[0].reader_a).toMatchObject({ stance: 'no', quote: 'FIRSTQUOTE one two three' });
    expect(asA[0].reader_b).toMatchObject({ stance: 'yes', quote: 'SECONDQUOTE one two three' });
    const asB = buildDisputes(inputs(), false);
    expect(asB[0].reader_a).toMatchObject({ stance: 'yes' });
    expect(asB[0].reader_b).toMatchObject({ stance: 'no' });
    const json = JSON.stringify([asA, asB]);
    expect(json).not.toMatch(/haiku|sonnet|opus|recheck|first.?pass|claude/i);
  });
  it('an invalid reader is shown as having no usable answer, without an error string', () => {
    const d = buildDisputes(inputs(), true)[1];
    expect(d.reader_a).toEqual({ stance: null, confidence: null, quote: null, note: 'this reader gave no usable answer' });
    expect(d.reader_b.stance).toBe('mixed');
  });
  it('the coin is deterministic per (seed, video) and roughly balanced', () => {
    const ids = Array.from({ length: 400 }, (_, i) => `vid${i}`);
    const run = (seed: number) => ids.map((v) => firstPassIsReaderA(seed, v));
    expect(run(1)).toEqual(run(1));
    const share = run(1).filter(Boolean).length / ids.length;
    expect(share).toBeGreaterThan(0.4);
    expect(share).toBeLessThan(0.6);
    expect(run(1)).not.toEqual(run(2));
  });
});
