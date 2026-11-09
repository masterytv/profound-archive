import { describe, expect, it } from 'vitest';
import { shouldShowShareBanner } from '@/components/share/ShareBanner';

describe('share banner placement', () => {
    it('shows on normal pages, including the NDE section', () => {
        for (const p of ['/', '/nde', '/nde/videos', '/uap', '/video/abc', '/experiencer/maria', '/channels', '/shared-thing', '/experiencer']) {
            expect(shouldShowShareBanner(p)).toBe(true);
        }
    });
    it('hides where it would be redundant or out of place', () => {
        for (const p of ['/share', '/share/my-experiences', '/experiences', '/experiences/a-story', '/admin', '/admin/share', '/channels/directory', '/channels/join', '/login']) {
            expect(shouldShowShareBanner(p)).toBe(false);
        }
    });
});
