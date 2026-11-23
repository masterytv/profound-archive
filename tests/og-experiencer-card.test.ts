import { describe, expect, it } from 'vitest';
import { cardQuote, quoteSize, youtubeStills } from '../src/lib/og/experiencer-card';

describe('the experiencer preview card', () => {
  it('shows the quote without its quotation marks, cut at a word when long', () => {
    expect(cardQuote('"I had this amazing calmness inside me."')).toBe('I had this amazing calmness inside me.');
    const long = 'I saw every moment of my life, every word I said and every word said to me, and I felt what everyone around me felt, all at once, without end.';
    const q = cardQuote(long, 80);
    expect(q.endsWith('…')).toBe(true);
    expect(q.length).toBeLessThanOrEqual(81);
    expect(long.startsWith(q.slice(0, -1))).toBe(true);
    expect(cardQuote(null)).toBe('');
  });

  it("asks YouTube for the largest still first, and falls back to the profile's own", () => {
    expect(youtubeStills('https://i.ytimg.com/vi/6jN-xtjkxs4/hqdefault.jpg')).toEqual([
      'https://i.ytimg.com/vi/6jN-xtjkxs4/maxresdefault.jpg',
      'https://i.ytimg.com/vi/6jN-xtjkxs4/hqdefault.jpg',
    ]);
    expect(youtubeStills('https://example.com/a.jpg')).toEqual(['https://example.com/a.jpg']);
    expect(youtubeStills(null)).toEqual([]);
  });

  it('sizes a long quote smaller, and smaller again beside the photo', () => {
    expect(quoteSize('x'.repeat(40), true)).toBe(46);
    expect(quoteSize('x'.repeat(140), true)).toBe(34);
    expect(quoteSize('x'.repeat(140), false)).toBe(40);
  });
});
