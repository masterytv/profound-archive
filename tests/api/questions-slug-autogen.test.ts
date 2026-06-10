/**
 * Regression tests for S-13: the auto-generation path of GET /api/questions/[slug]
 * must be bounded by a PERSISTENT global cap (counted from user_questions rows in
 * the trailing hour, shared across instances) plus a per-IP limiter — not by
 * per-instance memory. All I/O (Supabase, OpenRouter via the openai SDK) is mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({
    embeddingsCreate: vi.fn(),
    completionsCreate: vi.fn(),
    rpc: vi.fn(),
    // user_questions
    uqLookupMaybeSingle: vi.fn(),
    uqCountGte: vi.fn(),
    uqInsertSingle: vi.fn(),
    // nde_questions / question_synthesis / rate_limit_events
    ndeMaybeSingle: vi.fn(),
    synthMaybeSingle: vi.fn(),
    rateLimitEventInsert: vi.fn(),
    generateHyde: vi.fn(),
}));

vi.mock('openai', () => ({
    default: class MockOpenAI {
        embeddings = { create: h.embeddingsCreate };
        chat = { completions: { create: h.completionsCreate } };
    },
}));

vi.mock('@/lib/questions/question-utils', () => ({
    slugToQuestion: (slug: string) => slug.replace(/-/g, ' '),
    generateHyde: h.generateHyde,
    toSlug: (q: string) => q.toLowerCase().replace(/\s+/g, '-'),
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        rpc: h.rpc,
        from: vi.fn((table: string) => {
            if (table === 'nde_questions') {
                return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: h.ndeMaybeSingle }) }) }) };
            }
            if (table === 'user_questions') {
                return {
                    select: (_cols: string, opts?: { count?: string; head?: boolean }) => {
                        if (opts?.count) return { gte: h.uqCountGte };
                        return { eq: () => ({ maybeSingle: h.uqLookupMaybeSingle }) };
                    },
                    insert: () => ({ select: () => ({ single: h.uqInsertSingle }) }),
                };
            }
            if (table === 'question_synthesis') {
                return {
                    select: () => ({ eq: () => ({ maybeSingle: h.synthMaybeSingle }) }),
                    upsert: vi.fn(() => Promise.resolve({ error: null })),
                };
            }
            if (table === 'rate_limit_events') {
                return { insert: h.rateLimitEventInsert };
            }
            throw new Error(`unexpected table: ${table}`);
        }),
    })),
}));

import { GET } from '@/app/api/questions/[slug]/route';
import { resetRateLimit } from '@/lib/rate-limit';

const get = (slug: string, ip = '198.51.100.1') =>
    GET(
        new NextRequest(`https://example.org/api/questions/${slug}`, {
            headers: { 'x-forwarded-for': ip },
        }),
        { params: Promise.resolve({ slug }) }
    );

beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // Defaults: slug unknown everywhere → auto-generate path; cap not reached.
    h.ndeMaybeSingle.mockResolvedValue({ data: null });
    h.uqLookupMaybeSingle.mockResolvedValue({ data: null });
    h.synthMaybeSingle.mockResolvedValue({ data: null });
    h.uqCountGte.mockResolvedValue({ count: 0, error: null });
    h.uqInsertSingle.mockResolvedValue({
        data: { id: 77, question: 'generated question', ai_query: 'hyde passage' },
        error: null,
    });
    h.generateHyde.mockResolvedValue('hyde passage');
    h.rateLimitEventInsert.mockResolvedValue({ error: null });
    h.embeddingsCreate.mockResolvedValue({ data: [{ embedding: [0.1, 0.2] }] });
    // Empty search → route exits with no_results before any Claude call.
    h.rpc.mockResolvedValue({ data: [], error: null });
});

describe('GET /api/questions/[slug] auto-generation limits (S-13)', () => {
    it('unknown slug below the cap auto-generates: counts the window, inserts, no Claude call needed for this path', async () => {
        const res = await get('a-brand-new-question');
        expect(res.status).toBe(200);
        expect(h.uqCountGte).toHaveBeenCalledTimes(1);
        expect(h.generateHyde).toHaveBeenCalledTimes(1);
        expect(h.uqInsertSingle).toHaveBeenCalledTimes(1);
    });

    it('S-13 regression guard: at the global cap, returns 429 and never calls the model or inserts', async () => {
        h.uqCountGte.mockResolvedValue({ count: 10, error: null });
        const res = await get('another-new-question');
        expect(res.status).toBe(429);
        expect((await res.json()).error).toBe('Too many questions generated recently. Please try again later.');
        expect(h.generateHyde).not.toHaveBeenCalled();
        expect(h.uqInsertSingle).not.toHaveBeenCalled();
        expect(h.completionsCreate).not.toHaveBeenCalled();
        // Admins are notified with the window count.
        expect(h.rateLimitEventInsert).toHaveBeenCalledWith(
            expect.objectContaining({ event_type: 'auto_gen_question', count_in_window: 10 })
        );
    });

    it('S-13: the cap is persistent — it derives from the DB count, not process memory', async () => {
        // Simulate a fresh instance after cold start: first request of this
        // process still sees the DB count and blocks.
        h.uqCountGte.mockResolvedValue({ count: 25, error: null });
        const res = await get('cold-start-slug');
        expect(res.status).toBe(429);
    });

    it('S-13: fails closed — if the count query errors, generation is blocked', async () => {
        h.uqCountGte.mockResolvedValue({ count: null, error: { message: 'db unavailable' } });
        const res = await get('query-error-slug');
        expect(res.status).toBe(429);
        expect(h.generateHyde).not.toHaveBeenCalled();
        expect(h.uqInsertSingle).not.toHaveBeenCalled();
    });

    it('S-13: per-IP limiter blocks a single client before it reaches the DB check', async () => {
        for (let i = 0; i < 5; i++) {
            const res = await get(`fresh-slug-${i}`);
            expect(res.status).toBe(200);
        }
        const blocked = await get('fresh-slug-6');
        expect(blocked.status).toBe(429);
        // 5 DB checks happened, the 6th request was stopped by the in-memory IP limiter.
        expect(h.uqCountGte).toHaveBeenCalledTimes(5);

        // A different IP is unaffected.
        const other = await get('fresh-slug-7', '203.0.113.50');
        expect(other.status).toBe(200);
    });

    it('known slugs are NOT subject to the auto-gen limits', async () => {
        h.uqLookupMaybeSingle.mockResolvedValue({
            data: { id: 5, question: 'known question', ai_query: 'hyde', is_active: true },
        });
        const res = await get('known-slug');
        expect(res.status).toBe(200);
        expect(h.uqCountGte).not.toHaveBeenCalled();
        expect(h.uqInsertSingle).not.toHaveBeenCalled();
    });
});
