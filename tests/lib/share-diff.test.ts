import { describe, expect, it } from 'vitest';
import { wordDiff } from '@/lib/share/diff';

describe('wordDiff', () => {
    it('marks added and removed words and keeps the rest', () => {
        const parts = wordDiff('I went to the coach and watched', 'I went to the couch and watched');
        expect(parts).toEqual([
            { text: 'I went to the ', kind: 'same' },
            { text: 'coach ', kind: 'removed' },
            { text: 'couch ', kind: 'added' },
            { text: 'and watched', kind: 'same' },
        ]);
    });
    it('rebuilds both texts exactly', () => {
        const a = 'The videos recommended were normal for me: tech podcasts, dog videos.';
        const b = 'The recommended videos were normal for me: tech podcasts and dog videos.';
        const parts = wordDiff(a, b);
        expect(parts.filter((p) => p.kind !== 'added').map((p) => p.text).join('')).toBe(a);
        expect(parts.filter((p) => p.kind !== 'removed').map((p) => p.text).join('')).toBe(b);
    });
    it('handles identical and empty text', () => {
        expect(wordDiff('same text', 'same text')).toEqual([{ text: 'same text', kind: 'same' }]);
        expect(wordDiff('', 'new')).toEqual([{ text: 'new', kind: 'added' }]);
    });
});
