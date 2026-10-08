import { describe, it, expect } from 'vitest';
import { FEATURED_VIDEO, isBannerActive } from '@/lib/featured-video';

describe('isBannerActive', () => {
    it('is active up to and including the last promotion day', () => {
        expect(isBannerActive(new Date('2026-10-08T12:00:00Z'))).toBe(true);
        expect(isBannerActive(new Date(`${FEATURED_VIDEO.bannerUntil}T23:00:00Z`))).toBe(true);
    });

    it('switches off after the promotion window', () => {
        expect(isBannerActive(new Date('2026-11-20T00:00:01Z'))).toBe(false);
    });
});

describe('FEATURED_VIDEO', () => {
    it('uses the requested button label', () => {
        expect(FEATURED_VIDEO.buttonLabel).toBe('NDE Music Video');
    });
});
