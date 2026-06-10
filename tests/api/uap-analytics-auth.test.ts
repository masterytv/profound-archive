/**
 * Regression tests for S-7: GET /api/uap/analytics no longer grants access
 * based on the client-controlled Referer header — only the CRON_SECRET
 * header credential is accepted.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
    computeAnalytics: vi.fn(),
}));

vi.mock('@/app/uap/intelligence/compute-analytics', () => ({
    computeAnalytics: h.computeAnalytics,
}));

import { GET } from '@/app/api/uap/analytics/route';

const SECRET = 'test-cron-secret'; // set in tests/setup.ts

const get = (headers: Record<string, string> = {}) =>
    GET(new Request('https://example.org/api/uap/analytics', { headers }));

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    h.computeAnalytics.mockResolvedValue({ totals: { videos: 42 } });
});

describe('GET /api/uap/analytics auth (S-7)', () => {
    it('S-7 regression guard: a crafted Referer with no credential is rejected', async () => {
        for (const referer of [
            'https://projectprofound.org/uap/intelligence',
            'http://localhost:3000/uap/intelligence',
        ]) {
            const res = await get({ referer });
            expect(res.status, `referer should not grant access: ${referer}`).toBe(401);
        }
        expect(h.computeAnalytics).not.toHaveBeenCalled();
    });

    it('rejects requests with no credential at all', async () => {
        const res = await get();
        expect(res.status).toBe(401);
        expect(h.computeAnalytics).not.toHaveBeenCalled();
    });

    it('accepts the CRON_SECRET via Authorization: Bearer', async () => {
        const res = await get({ authorization: `Bearer ${SECRET}` });
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ totals: { videos: 42 } });
    });

    it('accepts the CRON_SECRET via x-cron-secret', async () => {
        const res = await get({ 'x-cron-secret': SECRET });
        expect(res.status).toBe(200);
    });
});
