/**
 * Regression tests for S-3: POST /api/quiz-lead and POST /api/contact are
 * throttled per IP and per submitted email BEFORE any mail send or DB write.
 * All I/O (Resend, Supabase, email templates) is mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({
    resendSend: vi.fn(),
    upsertSelectSingle: vi.fn(),
    updateChain: vi.fn(),
    templateMaybeSingle: vi.fn(),
    sendFirstStory: vi.fn(),
}));

vi.mock('@/lib/email/resend', () => ({
    resend: { emails: { send: h.resendSend } },
    EMAIL_FROM: 'test@projectprofound.org',
}));

vi.mock('@react-email/render', () => ({
    render: vi.fn(async () => '<html></html>'),
}));

vi.mock('@/lib/email/sendFirstStory', () => ({
    sendFirstStory: h.sendFirstStory,
}));

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(async () => ({
        auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
    })),
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        from: vi.fn((table: string) => {
            if (table === 'quiz_leads') {
                return {
                    upsert: vi.fn(() => ({ select: vi.fn(() => ({ single: h.upsertSelectSingle })) })),
                    update: vi.fn(() => ({
                        eq: vi.fn(() => ({ eq: vi.fn(() => ({ not: h.updateChain })) })),
                    })),
                };
            }
            if (table === 'email_templates') {
                return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: h.templateMaybeSingle })) })) };
            }
            if (table === 'profiles') {
                return { update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })) };
            }
            throw new Error(`unexpected table: ${table}`);
        }),
    })),
}));

import { POST as quizLeadPost } from '@/app/api/quiz-lead/route';
import { POST as contactPost } from '@/app/api/contact/route';
import { resetRateLimit } from '@/lib/rate-limit';

const makeReq = (url: string, body: unknown, ip: string) =>
    new NextRequest(url, {
        method: 'POST',
        headers: { 'x-forwarded-for': ip },
        body: JSON.stringify(body),
    });

const postQuizLead = (body: unknown, ip = '198.51.100.1') =>
    quizLeadPost(makeReq('https://example.org/api/quiz-lead', body, ip));

const postContact = (body: unknown, ip = '198.51.100.1') =>
    contactPost(makeReq('https://example.org/api/contact', body, ip));

beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    h.resendSend.mockResolvedValue({ error: null });
    h.upsertSelectSingle.mockResolvedValue({
        data: { id: 1, email: 'a@b.com', archetype: 'newsletter_nde', frequency: 'weekly', unsubscribe_token: 'tok' },
        error: null,
    });
    h.updateChain.mockResolvedValue({ error: null });
    h.templateMaybeSingle.mockResolvedValue({ data: null });
    h.sendFirstStory.mockResolvedValue(undefined);
});

describe('POST /api/quiz-lead throttling (S-3)', () => {
    const body = { email: 'a@b.com', archetype: 'newsletter_nde', frequency: 'weekly' };

    it('a single subscribe request succeeds', async () => {
        const res = await postQuizLead(body);
        expect(res.status).toBe(200);
        expect(h.upsertSelectSingle).toHaveBeenCalledTimes(1);
    });

    it('S-3 regression guard: over the per-IP limit returns 429 with no DB write', async () => {
        for (let i = 0; i < 5; i++) {
            // Distinct emails so only the IP counter is exercised.
            expect((await postQuizLead({ ...body, email: `u${i}@b.com` })).status).toBe(200);
        }
        const blocked = await postQuizLead({ ...body, email: 'u6@b.com' });
        expect(blocked.status).toBe(429);
        expect(h.upsertSelectSingle).toHaveBeenCalledTimes(5);
    });

    it('S-3 regression guard: over the per-email limit returns 429 even from rotating IPs', async () => {
        for (let i = 0; i < 5; i++) {
            expect((await postQuizLead(body, `203.0.113.${i + 1}`)).status).toBe(200);
        }
        const blocked = await postQuizLead(body, '203.0.113.99');
        expect(blocked.status).toBe(429);
        // The blocked request performed no upsert and triggered no email.
        expect(h.upsertSelectSingle).toHaveBeenCalledTimes(5);
    });

    it('the email key is case-insensitive', async () => {
        for (let i = 0; i < 5; i++) await postQuizLead(body, `203.0.113.${i + 1}`);
        const blocked = await postQuizLead({ ...body, email: 'A@B.COM' }, '203.0.113.99');
        expect(blocked.status).toBe(429);
    });

    it('S-12: an over-long write_in is truncated, not rejected — the lead is still captured', async () => {
        const res = await postQuizLead({ ...body, archetype: 'seeker', write_in: 'x'.repeat(2000) });
        expect(res.status).toBe(200);
        expect(h.upsertSelectSingle).toHaveBeenCalledTimes(1);
    });

    it('S-12: invalid email, unknown frequency, and malformed JSON return 400 with no write', async () => {
        expect((await postQuizLead({ ...body, email: 'not-an-email' })).status).toBe(400);
        expect((await postQuizLead({ ...body, frequency: 'hourly' })).status).toBe(400);
        const malformed = await quizLeadPost(
            new NextRequest('https://example.org/api/quiz-lead', {
                method: 'POST',
                headers: { 'x-forwarded-for': '198.51.100.1' },
                body: 'not-json{',
            })
        );
        expect(malformed.status).toBe(400);
        expect(h.upsertSelectSingle).not.toHaveBeenCalled();
        expect(h.resendSend).not.toHaveBeenCalled();
    });
});

describe('POST /api/contact throttling (S-3)', () => {
    const body = { name: 'Sam', email: 'sam@example.org', message: 'Hello' };

    it('a single contact request sends the email', async () => {
        const res = await postContact(body);
        expect(res.status).toBe(200);
        expect(h.resendSend).toHaveBeenCalledTimes(1);
    });

    it('S-3 regression guard: over the per-IP limit returns 429 and sends no mail', async () => {
        for (let i = 0; i < 3; i++) {
            expect((await postContact({ ...body, email: `u${i}@x.com` })).status).toBe(200);
        }
        const blocked = await postContact({ ...body, email: 'u9@x.com' });
        expect(blocked.status).toBe(429);
        expect(h.resendSend).toHaveBeenCalledTimes(3);
    });

    it('S-3 regression guard: over the per-email limit returns 429 even from rotating IPs', async () => {
        for (let i = 0; i < 5; i++) {
            expect((await postContact(body, `203.0.113.${i + 10}`)).status).toBe(200);
        }
        const blocked = await postContact(body, '203.0.113.99');
        expect(blocked.status).toBe(429);
        expect(h.resendSend).toHaveBeenCalledTimes(5);
    });

    it('a different IP and email is unaffected by exhausted buckets', async () => {
        for (let i = 0; i < 3; i++) await postContact(body);
        const res = await postContact({ name: 'Other', email: 'other@example.org', message: 'hi' }, '203.0.113.200');
        expect(res.status).toBe(200);
    });

    it('S-12: invalid email and oversized message return 400 and send no mail', async () => {
        expect((await postContact({ ...body, email: 'nope' })).status).toBe(400);
        expect((await postContact({ ...body, message: 'x'.repeat(5001) })).status).toBe(400);
        expect(h.resendSend).not.toHaveBeenCalled();
    });
});
