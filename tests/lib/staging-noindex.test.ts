/**
 * Staging noindex flag (NOINDEX_SITE) — set only in apphosting.staging.yaml.
 * Verifies the shared helper and that robots.txt flips to disallow-all on
 * staging while production allows search crawlers, blocks AI bots, and
 * keeps the sitemap.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

import { shouldNoindex } from '@/lib/seo/indexing';
import robots from '@/app/robots';
import { AI_BOTS } from '@/lib/seo/ai-bots';

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('shouldNoindex()', () => {
    it('is false when NOINDEX_SITE is unset (production)', () => {
        delete process.env.NOINDEX_SITE;
        expect(shouldNoindex()).toBe(false);
    });

    it('is false for any value other than the string "true"', () => {
        vi.stubEnv('NOINDEX_SITE', 'false');
        expect(shouldNoindex()).toBe(false);
        vi.stubEnv('NOINDEX_SITE', '1');
        expect(shouldNoindex()).toBe(false);
    });

    it('is true when NOINDEX_SITE="true" (staging)', () => {
        vi.stubEnv('NOINDEX_SITE', 'true');
        expect(shouldNoindex()).toBe(true);
    });
});

describe('robots.txt', () => {
    it('blocks AI bots, allows everyone else, and advertises the sitemap in production', () => {
        delete process.env.NOINDEX_SITE;
        expect(robots()).toEqual({
            rules: [
                { userAgent: AI_BOTS, disallow: '/' },
                { userAgent: '*', allow: '/' },
            ],
            sitemap: 'https://projectprofound.org/sitemap.xml',
        });
    });

    it('disallows everything and omits the sitemap on staging', () => {
        vi.stubEnv('NOINDEX_SITE', 'true');
        const result = robots();
        expect(result.rules).toEqual({ userAgent: '*', disallow: '/' });
        expect(result.sitemap).toBeUndefined();
    });
});
