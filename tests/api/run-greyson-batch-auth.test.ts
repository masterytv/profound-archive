/**
 * Characterization tests for the CRON_SECRET auth gate on a representative
 * AI batch route (GET /api/run-greyson-batch). The same pattern guards the
 * other run-*-batch routes.
 *
 * Pins the S-4 fix (docs/IMPROVEMENT_PLAN.md): the IS_DEBUG_MODE bypass
 * requires BOTH a non-production NODE_ENV and the exact string "true" —
 * any other value, or production, leaves auth fully enforced.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({
    single: vi.fn(),
}));

vi.mock('@/lib/ai/greyson', () => ({
    analyzeGreysonScore: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({ single: h.single })),
            })),
        })),
    })),
}));

import { GET } from '@/app/api/run-greyson-batch/route';

// verify=true short-circuits into a single read — lets us prove the auth gate's
// pass/fail behavior without executing the whole batch pipeline.
const VERIFY_URL = 'https://example.org/api/run-greyson-batch?verify=true&videoId=vid-1';

const get = (url: string, headers: Record<string, string> = {}) =>
    GET(new Request(url, { headers }));

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('CRON_SECRET', 'test-cron-secret');
    delete process.env.IS_DEBUG_MODE;
    h.single.mockResolvedValue({ data: { video_id: 'vid-1', greyson_score: 17 }, error: null });
});

afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.IS_DEBUG_MODE;
});

describe('GET /api/run-greyson-batch — auth gate (current behavior)', () => {
    it('rejects requests with no Authorization header (401)', async () => {
        const res = await get(VERIFY_URL);
        expect(res.status).toBe(401);
        expect(h.single).not.toHaveBeenCalled();
    });

    it('rejects requests with a wrong bearer token (401)', async () => {
        const res = await get(VERIFY_URL, { authorization: 'Bearer wrong-secret' });
        expect(res.status).toBe(401);
        expect(h.single).not.toHaveBeenCalled();
    });

    it('accepts the correct Bearer CRON_SECRET', async () => {
        const res = await get(VERIFY_URL, { authorization: 'Bearer test-cron-secret' });
        expect(res.status).toBe(200);
        expect((await res.json()).message).toBe('Verification Fetch');
        expect(h.single).toHaveBeenCalled();
    });

    it('returns 500 when CRON_SECRET is not configured on the server', async () => {
        vi.stubEnv('CRON_SECRET', '');
        const res = await get(VERIFY_URL, { authorization: 'Bearer anything' });
        expect(res.status).toBe(500);
    });

    it('S-4 regression guard: IS_DEBUG_MODE="false" (or any value other than "true") does NOT bypass auth', async () => {
        vi.stubEnv('IS_DEBUG_MODE', 'false');
        const res = await get(VERIFY_URL, { authorization: 'Bearer totally-wrong' });
        expect(res.status).toBe(401);
        expect(h.single).not.toHaveBeenCalled();
    });

    it('S-4 regression guard: even IS_DEBUG_MODE="true" does NOT bypass auth in production', async () => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('IS_DEBUG_MODE', 'true');
        const res = await get(VERIFY_URL, { authorization: 'Bearer totally-wrong' });
        expect(res.status).toBe(401);
        expect(h.single).not.toHaveBeenCalled();
    });

    it('S-4: IS_DEBUG_MODE="true" still bypasses auth outside production (local dev convenience)', async () => {
        // NODE_ENV is 'test' under vitest — i.e. not production.
        vi.stubEnv('IS_DEBUG_MODE', 'true');
        const res = await get(VERIFY_URL, { authorization: 'Bearer totally-wrong' });
        expect(res.status).toBe(200);
        expect(h.single).toHaveBeenCalled();
    });

    it('S-14 regression guard: the 401 body is generic — no credential length or other metadata', async () => {
        const res = await get(VERIFY_URL, { authorization: 'Bearer wrong' });
        expect(res.status).toBe(401);
        expect(await res.json()).toEqual({ error: 'Unauthorized' });
    });

    it('S-14: the misconfiguration 500 body does not reveal that the secret is missing', async () => {
        vi.stubEnv('CRON_SECRET', '');
        const res = await get(VERIFY_URL, { authorization: 'Bearer anything' });
        expect(res.status).toBe(500);
        expect(await res.json()).toEqual({ error: 'Server configuration error' });
    });
});
