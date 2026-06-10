/**
 * Regression tests for S-11: POST/PATCH /api/ces-feedback are rate-limited
 * per IP (shared bucket) BEFORE any service-role write. Supabase is mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({
    insertSelectSingle: vi.fn(),
    updateEq: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        from: vi.fn((table: string) => {
            if (table !== 'ces_feedback') throw new Error(`unexpected table: ${table}`);
            return {
                insert: vi.fn(() => ({ select: vi.fn(() => ({ single: h.insertSelectSingle })) })),
                update: vi.fn(() => ({ eq: h.updateEq })),
            };
        }),
    })),
}));

import { POST, PATCH } from '@/app/api/ces-feedback/route';
import { resetRateLimit } from '@/lib/rate-limit';

const makeReq = (method: string, body: unknown, ip: string) =>
    new NextRequest('https://example.org/api/ces-feedback', {
        method,
        headers: { 'x-forwarded-for': ip },
        body: JSON.stringify(body),
    });

const post = (body: unknown, ip = '198.51.100.1') => POST(makeReq('POST', body, ip));
const patch = (body: unknown, ip = '198.51.100.1') => PATCH(makeReq('PATCH', body, ip));

beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    h.insertSelectSingle.mockResolvedValue({ data: { id: 1, session_id: 's-1' }, error: null });
    h.updateEq.mockResolvedValue({ error: null });
});

describe('ces-feedback throttling (S-11)', () => {
    it('a single POST and PATCH succeed', async () => {
        expect((await post({ score: 5, session_id: 's-1' })).status).toBe(200);
        expect((await patch({ session_id: 's-1', reason: 'great' })).status).toBe(200);
        expect(h.insertSelectSingle).toHaveBeenCalledTimes(1);
        expect(h.updateEq).toHaveBeenCalledTimes(1);
    });

    it('S-11 regression guard: over the shared per-IP limit returns 429 with no write', async () => {
        for (let i = 0; i < 10; i++) {
            expect((await post({ score: 3, session_id: `s-${i}` })).status).toBe(200);
        }
        const blockedPost = await post({ score: 3, session_id: 's-over' });
        expect(blockedPost.status).toBe(429);
        // PATCH shares the same bucket, so it is blocked too.
        const blockedPatch = await patch({ session_id: 's-1', reason: 'late' });
        expect(blockedPatch.status).toBe(429);
        expect(h.insertSelectSingle).toHaveBeenCalledTimes(10);
        expect(h.updateEq).not.toHaveBeenCalled();
    });

    it('a different IP is unaffected by an exhausted bucket', async () => {
        for (let i = 0; i < 11; i++) await post({ score: 3, session_id: `s-${i}` });
        const res = await post({ score: 7, session_id: 'other' }, '203.0.113.40');
        expect(res.status).toBe(200);
    });

    it('validation still rejects bad scores before any write', async () => {
        const res = await post({ score: 99, session_id: 's-1' });
        expect(res.status).toBe(400);
        expect(h.insertSelectSingle).not.toHaveBeenCalled();
    });

    it('S-12: malformed JSON and oversized reason return 400 with no write', async () => {
        const malformed = await POST(
            new NextRequest('https://example.org/api/ces-feedback', {
                method: 'POST',
                headers: { 'x-forwarded-for': '198.51.100.1' },
                body: 'not-json{',
            })
        );
        expect(malformed.status).toBe(400);
        expect((await patch({ session_id: 's-1', reason: 'x'.repeat(501) })).status).toBe(400);
        expect(h.insertSelectSingle).not.toHaveBeenCalled();
        expect(h.updateEq).not.toHaveBeenCalled();
    });
});
