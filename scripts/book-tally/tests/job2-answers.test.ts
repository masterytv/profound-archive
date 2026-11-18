import { describe, expect, it } from 'vitest';
import { prepareTranscript } from '../lib/quote';
import { parseAnswers } from '../job2/answers';
import { validateSchema } from '../job2/schema';
import { loadStancePrompts } from '../job2/requests';

const { schema } = loadStancePrompts().first;
const TEXT = 'So I was lying on the table and I saw a bright light at the end of the tunnel and I felt total peace. The nurse asked are you okay.';
const T = prepareTranscript(TEXT);
const GOOD_QUOTE = 'I saw a bright light at the end of the tunnel';
const ctx = { transcript: T };
const ans = (question_id: number, stance: string, confidence: number, quote: string | null) => ({ question_id, stance, confidence, quote });
const parse = (answers: unknown[], ids: number[], c = ctx) => parseAnswers(JSON.stringify({ answers }), ids, c, schema);

describe('schema validator', () => {
  it('validates the stance schema and reports where it fails', () => {
    expect(validateSchema(schema, { answers: [ans(1, 'yes', 90, 'x')] })).toEqual([]);
    expect(validateSchema(schema, { answers: [ans(1, 'maybe', 90, null)] }).join()).toMatch(/answers\[0\]\.stance/);
    expect(validateSchema(schema, { answers: [{ question_id: 1.5, stance: 'yes', confidence: 1, quote: null }] }).join()).toMatch(/question_id/);
    expect(validateSchema(schema, { answers: [{ ...ans(1, 'yes', 90, null), extra: 1 }] }).join()).toMatch(/unexpected property/);
    expect(validateSchema(schema, { answers: [{ question_id: 1 }] }).join()).toMatch(/required property missing/);
    expect(validateSchema(schema, {}).join()).toMatch(/answers/);
  });
});

describe('parseAnswers', () => {
  it('accepts a verified claim, with offset', () => {
    const r = parse([ans(1, 'yes', 92, GOOD_QUOTE)], [1]);
    expect(r.rows[0]).toMatchObject({ questionId: 1, valid: true, stance: 'yes', confidence: 92, quoteVerified: true, error: null });
    expect(r.rows[0].quoteNormOffset).toBeGreaterThan(0);
    expect(r.extraIds).toEqual([]);
  });
  it('returns exactly one row per requested id, in requested order', () => {
    const r = parse([ans(2, 'not_addressed', 80, null), ans(1, 'not_addressed', 80, null)], [1, 2]);
    expect(r.rows.map((x) => x.questionId)).toEqual([1, 2]);
  });
  it('missing id -> that question invalid, others unaffected', () => {
    const r = parse([ans(1, 'not_addressed', 80, null)], [1, 2]);
    expect(r.rows[0].valid).toBe(true);
    expect(r.rows[1]).toMatchObject({ valid: false, stance: null, confidence: null, quote: null });
    expect(r.rows[1].error).toMatch(/missing/);
  });
  it('duplicate ids -> invalid (all copies discarded), even if identical', () => {
    const r = parse([ans(1, 'not_addressed', 80, null), ans(1, 'not_addressed', 80, null), ans(2, 'not_addressed', 80, null)], [1, 2]);
    expect(r.rows[0]).toMatchObject({ valid: false, stance: null });
    expect(r.rows[0].error).toMatch(/duplicate/);
    expect(r.rows[1].valid).toBe(true);
  });
  it('extra (unrequested) ids produce no row and are reported', () => {
    const r = parse([ans(1, 'not_addressed', 80, null), ans(99, 'yes', 80, GOOD_QUOTE)], [1]);
    expect(r.rows).toHaveLength(1);
    expect(r.extraIds).toEqual([99]);
  });
  it.each([[101], [-1], [85.5]])('confidence %s is invalid', (c) => {
    const r = parse([ans(1, 'not_addressed', c, null)], [1]);
    expect(r.rows[0]).toMatchObject({ valid: false, stance: null });
  });
  it('confidence 0 and 100 are valid', () => {
    expect(parse([ans(1, 'not_addressed', 0, null)], [1]).rows[0].valid).toBe(true);
    expect(parse([ans(1, 'not_addressed', 100, null)], [1]).rows[0].valid).toBe(true);
  });
  it('unknown stance is invalid', () => {
    expect(parse([ans(1, 'maybe', 80, null)], [1]).rows[0]).toMatchObject({ valid: false, stance: null });
  });
  it('a claim needs a non-empty quote (null, empty and blank all invalid)', () => {
    for (const q of [null, '', '   ']) {
      const row = parse([ans(1, 'yes', 90, q)], [1]).rows[0];
      expect(row).toMatchObject({ valid: false, stance: null, quote: null });
    }
  });
  it('not_addressed drops any quote', () => {
    const row = parse([ans(1, 'not_addressed', 90, GOOD_QUOTE)], [1]).rows[0];
    expect(row).toMatchObject({ valid: true, stance: 'not_addressed', quote: null, quoteVerified: false });
  });
  it('quote not in the transcript: valid claim, unverified, reason recorded', () => {
    const row = parse([ans(1, 'yes', 90, 'I met my grandmother and she hugged me tightly')], [1]).rows[0];
    expect(row).toMatchObject({ valid: true, stance: 'yes', quoteVerified: false, quoteNormOffset: null, startSeconds: null, error: 'quote_not_found' });
  });
  it('quote shorter than 5 words is unverified', () => {
    expect(parse([ans(1, 'yes', 90, 'a bright light')], [1]).rows[0]).toMatchObject({ quoteVerified: false, error: 'quote_too_short' });
  });
  it('a gapped or joined quote (words skipped) is unverified; a verbatim span that contains "..." verifies', () => {
    expect(parse([ans(1, 'yes', 90, 'I saw a bright ... end of the tunnel')], [1]).rows[0]).toMatchObject({ quoteVerified: false, error: 'quote_not_found' });
    const withDots = { transcript: prepareTranscript('Well... I saw a bright light... and then it was over.') };
    expect(parse([ans(1, 'yes', 90, 'I saw a bright light... and then')], [1], withDots).rows[0]).toMatchObject({ quoteVerified: true, error: null });
  });
  it('verification ignores case, punctuation and whitespace differences', () => {
    const row = parse([ans(1, 'yes', 90, '  I SAW, a bright light -- at the end of the tunnel!  ')], [1]).rows[0];
    expect(row.quoteVerified).toBe(true);
  });
  it('speaker attribution is not detectable: an interviewer span that exists in the transcript verifies (reviewed via the gold sheet)', () => {
    const row = parse([ans(1, 'yes', 90, 'The nurse asked are you okay')], [1]).rows[0];
    expect(row.quoteVerified).toBe(true);
  });
  it('one bad item does not affect others', () => {
    const r = parse([ans(1, 'yes', 90, null), ans(2, 'yes', 90, GOOD_QUOTE), ans(3, 'zzz', 5, null)], [1, 2, 3]);
    expect(r.rows.map((x) => x.valid)).toEqual([false, true, false]);
  });
  it('item with an additional property fails the item schema', () => {
    const r = parse([{ ...ans(1, 'not_addressed', 80, null), note: 'x' }], [1]);
    expect(r.rows[0]).toMatchObject({ valid: false });
    expect(r.rows[0].error).toMatch(/schema/);
  });
  it('unparseable JSON, a missing answers array, truncation and refusal invalidate every question', () => {
    for (const [text, stop, err] of [
      ['not json', null, 'json_parse_error'],
      ['{"foo":1}', null, 'schema'],
      ['[]', null, 'schema'],
      ['{"answers":[', 'max_tokens', 'truncated_max_tokens'],
      ['{"answers":[]}', 'refusal', 'refusal'],
    ] as const) {
      const r = parseAnswers(text, [1, 2], { ...ctx, stopReason: stop }, schema);
      expect(r.rows.every((x) => !x.valid && x.stance === null)).toBe(true);
      expect(r.rows[0].error).toContain(err);
      expect(r.envelopeError).toContain(err);
    }
  });
  it('aligns a timestamp for verified quotes when segments are supplied', () => {
    const segments = [
      { start: 0, duration: 5, text: 'So I was lying on the table and' },
      { start: 5, duration: 5, text: 'I saw a bright light at the end of the tunnel' },
    ];
    const row = parse([ans(1, 'yes', 90, GOOD_QUOTE)], [1], { transcript: T, segments } as never).rows[0];
    expect(row.startSeconds).toBe(5);
  });
});
