/**
 * Characterization tests for POST /api/email/manage-subs — a service-role
 * data-write path.
 *
 * Pins the current behavior flagged as IMPROVEMENT_PLAN.md S-2: the POST
 * handler performs NO auth/token check before writing subscription state for
 * any email address. When S-2 is fixed, the "documents S-2" tests must flip
 * to expect 401 without a valid token.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({
    upsert: vi.fn(),
    updateEqEq: vi.fn(),
}));

vi.mock('@/lib/auth/admin-guard', () => ({
    isAdminUser: vi.fn(async () => false),
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        from: vi.fn((table: string) => {
            if (table !== 'quiz_leads') throw new Error(`unexpected table: ${table}`);
            return {
                upsert: h.upsert,
                update: vi.fn(() => ({
                    eq: vi.fn(() => ({ eq: h.updateEqEq })),
                })),
            };
        }),
    })),
}));

import { POST } from '@/app/api/email/manage-subs/route';

const post = (body: unknown) =>
    POST(
        new NextRequest('https://example.org/api/email/manage-subs', {
            method: 'POST',
            body: JSON.stringify(body),
        })
    );

beforeEach(() => {
    vi.clearAllMocks();
    h.upsert.mockResolvedValue({ error: null });
    h.updateEqEq.mockResolvedValue({ error: null });
});

describe('POST /api/email/manage-subs (current behavior)', () => {
    it('rejects requests missing email or updates with 400', async () => {
        expect((await post({ email: 'a@b.com' })).status).toBe(400);
        expect((await post({ updates: [{ archetype: 'seeker', active: true }] })).status).toBe(400);
        expect(h.upsert).not.toHaveBeenCalled();
    });

    it('documents S-2: activates subscriptions for ANY email with no auth or token', async () => {
        const res = await post({
            email: 'victim@example.org',
            updates: [{ archetype: 'seeker', active: true, frequency: 'daily' }],
        });
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true, results: [{ archetype: 'seeker', ok: true }] });
        expect(h.upsert).toHaveBeenCalledWith(
            { email: 'victim@example.org', archetype: 'seeker', is_active: true, frequency: 'daily' },
            { onConflict: 'email,archetype', ignoreDuplicates: false }
        );
    });

    it('documents S-2: deactivates subscriptions for ANY email with no auth or token', async () => {
        const res = await post({
            email: 'victim@example.org',
            updates: [{ archetype: 'seeker', active: false }],
        });
        expect(res.status).toBe(200);
        expect(h.updateEqEq).toHaveBeenCalled();
        expect(h.upsert).not.toHaveBeenCalled();
    });

    it('defaults new subscriptions to weekly frequency', async () => {
        await post({
            email: 'a@b.com',
            updates: [{ archetype: 'mystic', active: true }],
        });
        expect(h.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ frequency: 'weekly' }),
            expect.anything()
        );
    });

    it('reports per-archetype ok=false when the write fails (status stays 200)', async () => {
        h.upsert.mockResolvedValue({ error: { message: 'db down' } });
        const res = await post({
            email: 'a@b.com',
            updates: [{ archetype: 'seeker', active: true }],
        });
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true, results: [{ archetype: 'seeker', ok: false }] });
    });
});
