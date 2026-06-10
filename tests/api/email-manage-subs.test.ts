/**
 * Regression tests for POST /api/email/manage-subs — a service-role data-write
 * path. Pins the S-2 fix: the POST handler requires proof of control over the
 * target email (an unsubscribe token verified against it, mirroring the GET
 * guard) or an authenticated admin session, before any write.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({
    upsert: vi.fn(),
    updateEqEq: vi.fn(),
    verifyMaybeSingle: vi.fn(),
}));

vi.mock('@/lib/auth/admin-guard', () => ({
    isAdminUser: vi.fn(async () => false),
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        from: vi.fn((table: string) => {
            if (table !== 'quiz_leads') throw new Error(`unexpected table: ${table}`);
            return {
                // Token verification: select().eq(token).eq(email).maybeSingle()
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        eq: vi.fn(() => ({ maybeSingle: h.verifyMaybeSingle })),
                    })),
                })),
                upsert: h.upsert,
                update: vi.fn(() => ({
                    eq: vi.fn(() => ({ eq: h.updateEqEq })),
                })),
            };
        }),
    })),
}));

import { POST } from '@/app/api/email/manage-subs/route';
import { isAdminUser } from '@/lib/auth/admin-guard';

const post = (body: unknown) =>
    POST(
        new NextRequest('https://example.org/api/email/manage-subs', {
            method: 'POST',
            body: JSON.stringify(body),
        })
    );

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isAdminUser).mockResolvedValue(false);
    h.upsert.mockResolvedValue({ error: null });
    h.updateEqEq.mockResolvedValue({ error: null });
    // Default: token does not match any row.
    h.verifyMaybeSingle.mockResolvedValue({ data: null });
});

describe('POST /api/email/manage-subs (S-2: token or admin required)', () => {
    it('rejects requests missing email or updates with 400', async () => {
        expect((await post({ email: 'a@b.com' })).status).toBe(400);
        expect((await post({ updates: [{ archetype: 'seeker', active: true }] })).status).toBe(400);
        expect(h.upsert).not.toHaveBeenCalled();
    });

    it('S-2 regression guard: an unauthenticated POST (no token, no admin) returns 401 and writes nothing', async () => {
        const res = await post({
            email: 'victim@example.org',
            updates: [{ archetype: 'seeker', active: true, frequency: 'daily' }],
        });
        expect(res.status).toBe(401);
        expect(h.upsert).not.toHaveBeenCalled();
        expect(h.updateEqEq).not.toHaveBeenCalled();
    });

    it('S-2 regression guard: an unauthenticated deactivation attempt returns 401 and writes nothing', async () => {
        const res = await post({
            email: 'victim@example.org',
            updates: [{ archetype: 'seeker', active: false }],
        });
        expect(res.status).toBe(401);
        expect(h.updateEqEq).not.toHaveBeenCalled();
    });

    it('S-2: a token that does not belong to the email returns 401 and writes nothing', async () => {
        h.verifyMaybeSingle.mockResolvedValue({ data: null });
        const res = await post({
            email: 'victim@example.org',
            token: 'someone-elses-token',
            updates: [{ archetype: 'seeker', active: false }],
        });
        expect(res.status).toBe(401);
        expect(h.upsert).not.toHaveBeenCalled();
        expect(h.updateEqEq).not.toHaveBeenCalled();
    });

    it('S-2: a valid token for the email authorizes the write', async () => {
        h.verifyMaybeSingle.mockResolvedValue({ data: { email: 'me@example.org' } });
        const res = await post({
            email: 'me@example.org',
            token: 'my-real-token',
            updates: [{ archetype: 'seeker', active: true, frequency: 'daily' }],
        });
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true, results: [{ archetype: 'seeker', ok: true }] });
        expect(h.upsert).toHaveBeenCalledWith(
            { email: 'me@example.org', archetype: 'seeker', is_active: true, frequency: 'daily' },
            { onConflict: 'email,archetype', ignoreDuplicates: false }
        );
    });

    it('S-2: an admin session authorizes the write without a token', async () => {
        vi.mocked(isAdminUser).mockResolvedValue(true);
        const res = await post({
            email: 'member@example.org',
            updates: [{ archetype: 'seeker', active: false }],
        });
        expect(res.status).toBe(200);
        expect(h.updateEqEq).toHaveBeenCalled();
    });

    it('defaults new subscriptions to weekly frequency (authorized via token)', async () => {
        h.verifyMaybeSingle.mockResolvedValue({ data: { email: 'a@b.com' } });
        await post({
            email: 'a@b.com',
            token: 't',
            updates: [{ archetype: 'mystic', active: true }],
        });
        expect(h.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ frequency: 'weekly' }),
            expect.anything()
        );
    });

    it('reports per-archetype ok=false when the write fails (status stays 200)', async () => {
        h.verifyMaybeSingle.mockResolvedValue({ data: { email: 'a@b.com' } });
        h.upsert.mockResolvedValue({ error: { message: 'db down' } });
        const res = await post({
            email: 'a@b.com',
            token: 't',
            updates: [{ archetype: 'seeker', active: true }],
        });
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true, results: [{ archetype: 'seeker', ok: false }] });
    });
});
