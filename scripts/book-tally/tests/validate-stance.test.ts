import { describe, expect, it } from 'vitest';
import { validateAnswerSet } from '../lib/validate-stance';

const Q = [1, 2, 3];
const good = (id: number, over: object = {}) => ({ question_id: id, stance: 'yes', confidence: 90, quote: 'a quote with five words', ...over });

describe('validateAnswerSet', () => {
  it('accepts a clean complete set, preserving requested order', () => {
    const r = validateAnswerSet({ answers: [good(3), good(1, { stance: 'not_addressed', quote: null }), good(2, { stance: 'mixed' })] }, Q);
    expect(r.complete).toBe(true);
    expect(r.problems).toEqual([]);
    expect(r.rows.map((x) => [x.question_id, x.valid, x.stance])).toEqual([[1, true, 'not_addressed'], [2, true, 'mixed'], [3, true, 'yes']]);
    expect(r.rows[2].quote).toBe('a quote with five words');
  });
  it('missing id -> invalid row with null stance', () => {
    const r = validateAnswerSet({ answers: [good(1), good(2)] }, Q);
    expect(r.rows[2]).toMatchObject({ question_id: 3, valid: false, stance: null, confidence: null, quote: null });
    expect(r.rows[2].error).toMatch(/missing/);
    expect(r.complete).toBe(false);
  });
  it('duplicate id -> invalid (all copies discarded), others untouched', () => {
    const r = validateAnswerSet({ answers: [good(1), good(1, { stance: 'no' }), good(2), good(3)] }, Q);
    expect(r.rows[0]).toMatchObject({ valid: false, stance: null });
    expect(r.rows[0].error).toMatch(/duplicate/);
    expect(r.rows[1].valid && r.rows[2].valid).toBe(true);
  });
  it('extra ids (unrequested or non-integer) are reported, never turned into rows', () => {
    const r = validateAnswerSet({ answers: [good(1), good(2), good(3), good(99), good(1.5), { stance: 'yes' }] }, Q);
    expect(r.rows).toHaveLength(3);
    expect(r.rows.every((x) => x.valid)).toBe(true);
    expect(r.extras.map((e) => e.question_id)).toEqual([99, 1.5, undefined]);
    expect(r.complete).toBe(false);
    expect(r.problems.join(' ')).toMatch(/extra/);
  });
  it('confidence must be an integer 0..100', () => {
    for (const c of [-1, 101, 55.5, '90', null, NaN, undefined]) {
      const r = validateAnswerSet({ answers: [good(1, { confidence: c }), good(2), good(3)] }, Q);
      expect(r.rows[0]).toMatchObject({ valid: false, stance: null });
      expect(r.rows[0].error).toMatch(/confidence/);
    }
    for (const c of [0, 100, 70]) expect(validateAnswerSet({ answers: [good(1, { confidence: c }), good(2), good(3)] }, Q).rows[0].valid).toBe(true);
  });
  it('yes/no/mixed without a quote (null, empty, whitespace, non-string) are invalid', () => {
    for (const stance of ['yes', 'no', 'mixed']) {
      for (const quote of [null, undefined, '', '   \n', 7]) {
        const r = validateAnswerSet({ answers: [good(1, { stance, quote }), good(2), good(3)] }, Q);
        expect(r.rows[0]).toMatchObject({ valid: false, stance: null, quote: null });
      }
    }
  });
  it('not_addressed with a quote: quote dropped, row stays valid, note recorded', () => {
    const r = validateAnswerSet({ answers: [good(1, { stance: 'not_addressed', quote: 'a stray quote here now' }), good(2), good(3)] }, Q);
    expect(r.rows[0]).toMatchObject({ valid: true, stance: 'not_addressed', quote: null });
    expect(r.rows[0].error).toMatch(/^note:/);
    expect(r.complete).toBe(true);
  });
  it('not_addressed without a quote has no note', () => {
    const r = validateAnswerSet({ answers: [good(1, { stance: 'not_addressed', quote: null }), good(2), good(3)] }, Q);
    expect(r.rows[0].error).toBeNull();
  });
  it('rejects unknown stance values (silence is never "no" by default)', () => {
    const r = validateAnswerSet({ answers: [good(1, { stance: 'unsure' }), good(2, { stance: undefined }), good(3)] }, Q);
    expect(r.rows[0].valid).toBe(false);
    expect(r.rows[1].valid).toBe(false);
  });
  it('trims quotes', () => {
    expect(validateAnswerSet({ answers: [good(1, { quote: '  padded quote with five words \n' }), good(2), good(3)] }, Q).rows[0].quote).toBe('padded quote with five words');
  });
  it('non-object / missing answers array invalidates every requested row', () => {
    for (const bad of [null, undefined, 'text', [], { answers: 'x' }, { nope: [] }]) {
      const r = validateAnswerSet(bad, Q);
      expect(r.rows).toHaveLength(3);
      expect(r.rows.every((x) => !x.valid && x.stance === null)).toBe(true);
      expect(r.complete).toBe(false);
    }
  });
  it('malformed elements are counted and the set is incomplete', () => {
    const r = validateAnswerSet({ answers: [good(1), null, 'x', good(2), good(3)] }, Q);
    expect(r.rows.every((x) => x.valid)).toBe(true);
    expect(r.complete).toBe(false);
    expect(r.problems.join(' ')).toMatch(/malformed/);
  });
  it('throws on a duplicate requested list (caller bug)', () => {
    expect(() => validateAnswerSet({ answers: [] }, [1, 1])).toThrow();
  });
});
