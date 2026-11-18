import { describe, expect, it } from 'vitest';
import { alignTimestamp, normalize, prepareTranscript, verifyQuote } from '../lib/quote';

describe('normalize', () => {
  it('maps curly quotes, dashes and strips punctuation', () => {
    expect(normalize('I couldn’t believe it — really!')).toBe('i couldn t believe it really');
    expect(normalize('“Hello,” she said.')).toBe('hello she said');
  });
  it('strips diacritics and lowercases', () => {
    expect(normalize('Café Résumé NAÏVE')).toBe('cafe resume naive');
  });
  it('collapses whitespace and trims', () => {
    expect(normalize('  a \n\t b   c  ')).toBe('a b c');
  });
  it('applies NFKC (ligatures, full-width)', () => {
    expect(normalize('ﬁrst ＡBC')).toBe('first abc');
  });
  it('returns empty for punctuation-only input', () => {
    expect(normalize('...!?')).toBe('');
  });
});

const T = "So I was in the hospital, and I couldn't breathe. Then I felt myself rise — up out of my body! It was peaceful.";

describe('verifyQuote', () => {
  it('verifies exact quote and reports normalized offset', () => {
    const r = verifyQuote('I felt myself rise up out of my body', T);
    expect(r.verified).toBe(true);
    expect(r.reason).toBe('ok');
    const nt = normalize(T);
    expect(nt.slice(r.offset!, r.offset! + r.normalizedQuote.length)).toBe(r.normalizedQuote);
  });
  it('tolerates curly quotes, accents, punctuation and whitespace differences', () => {
    expect(verifyQuote('I couldn’t   breathe. THEN I felt myself', T).verified).toBe(true);
    expect(verifyQuote('i couldnt breathe then i felt', T).verified).toBe(false); // "couldnt" != "couldn t"
    expect(verifyQuote('Thén I felt myself rise up', T).verified).toBe(true);
  });
  it('rejects quotes under 5 tokens', () => {
    const r = verifyQuote('felt myself rise up', T);
    expect(r.verified).toBe(false);
    expect(r.reason).toBe('too_short');
    expect(verifyQuote('was in the hospital and', T).verified).toBe(true); // exactly 5
  });
  it('rejects ellipsis-joined quotes even if each part is in the transcript', () => {
    expect(verifyQuote('I was in the hospital ... I felt myself rise', T).reason).toBe('ellipsis');
    expect(verifyQuote('I was in the hospital … I felt myself rise', T).reason).toBe('ellipsis');
    expect(verifyQuote('I was in the hospital [...] I felt myself rise', T).verified).toBe(false);
  });
  it('rejects non-contiguous and reordered text', () => {
    expect(verifyQuote('I was in the hospital I felt myself rise', T).reason).toBe('not_found');
    expect(verifyQuote('myself felt I rise up out of', T).verified).toBe(false);
  });
  it('rejects mid-word starts (token boundaries)', () => {
    expect(verifyQuote('ospital and I couldn t breathe', T).verified).toBe(false);
  });
  it('rejects empty/null', () => {
    expect(verifyQuote('', T).reason).toBe('empty');
    expect(verifyQuote(null, T).reason).toBe('empty');
    expect(verifyQuote('...', T).reason).toBe('empty');
  });
  it('accepts a prepared transcript', () => {
    const p = prepareTranscript(T);
    expect(verifyQuote('It was peaceful', p).reason).toBe('too_short');
    expect(verifyQuote('up out of my body It was', p).verified).toBe(true);
  });
});

describe('alignTimestamp', () => {
  const segs = [
    { start: 0, duration: 2, text: 'so I was in the hospital' },
    { start: 2, duration: 3, text: "and I couldn't breathe then" },
    { start: 5, duration: 3.5, text: 'I felt myself rise up' },
    { start: 8.5, duration: 2, text: 'out of my body' },
  ];
  it('returns the start of the segment where the first 6 tokens begin', () => {
    expect(alignTimestamp('I felt myself rise up out of my body', segs)).toBe(5);
    expect(alignTimestamp("and I couldn't breathe then I felt myself", segs)).toBe(2);
  });
  it('matches a run that spans segments, reporting the first segment', () => {
    expect(alignTimestamp('breathe then I felt myself rise', segs)).toBe(2);
  });
  it('returns null when absent, when no segments, or when quote too short', () => {
    expect(alignTimestamp('nothing like this is in the captions at all', segs)).toBeNull();
    expect(alignTimestamp('I felt myself rise up', null)).toBeNull();
    expect(alignTimestamp('I felt myself', segs)).toBeNull();
  });
  it('uses only the first 6 tokens (tail may differ from raw captions)', () => {
    expect(alignTimestamp('I felt myself rise up out DIFFERENT TAIL words', segs)).toBe(5);
  });
});
