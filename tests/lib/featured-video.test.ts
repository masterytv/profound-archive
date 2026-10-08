import { describe, it, expect } from 'vitest';
import { FEATURED_VIDEO, isNdeSectionPath } from '@/lib/featured-video';

describe('isNdeSectionPath', () => {
    it.each([
        '/nde',
        '/video/eQ86fFWLvys',
        '/video-explore',
        '/experiencer/scott-drummond',
        '/channels',
        '/channel/UCSrjs9KcP-Tg9wSKjsWS-jw',
        '/blog/hell-real-place-nde-evidence',
        '/explore/greyson',
        '/search3',
        '/questions/what-is-a-life-review',
        '/visualize/nde-elements',
    ])('shows the banner on NDE page %s', (path) => {
        expect(isNdeSectionPath(path)).toBe(true);
    });

    it.each([
        '/',
        '/uap',
        '/uap/video/abc',
        '/uap/blog/some-post',
        '/visualize',
        '/visualize/uap-timeline',
        '/about',
        '/admin',
        '/login',
        '/videos-not-a-real-prefix',
    ])('hides the banner on non-NDE page %s', (path) => {
        expect(isNdeSectionPath(path)).toBe(false);
    });
});

describe('FEATURED_VIDEO', () => {
    it('uses the requested button label', () => {
        expect(FEATURED_VIDEO.buttonLabel).toBe('NDE Music Video');
    });
});
