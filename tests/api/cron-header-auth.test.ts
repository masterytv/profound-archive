/**
 * Regression tests for S-5: the automation credential (CRON_SECRET) is
 * accepted ONLY via headers (x-cron-secret or Authorization: Bearer) — never
 * via the ?secret= query string or the request body. Uses /api/scanner/tick
 * as the representative route (same helper guards all scanner/batch routes)
 * plus direct unit coverage of the helper.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({
    runScannerTick: vi.fn(),
}));

vi.mock('@/lib/scanner/tick', () => ({
    runScannerTick: h.runScannerTick,
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({})),
}));

import { POST } from '@/app/api/scanner/tick/route';
import { hasValidCronSecret } from '@/lib/auth/cron-auth';

const SECRET = 'test-cron-secret'; // set in tests/setup.ts

const post = (url: string, headers: Record<string, string> = {}, body: unknown = {}) =>
    POST(
        new NextRequest(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(body),
        })
    );

const TICK_URL = 'https://example.org/api/scanner/tick';

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    h.runScannerTick.mockResolvedValue({
        channel: 'chan',
        discovered: 0,
        queued: 0,
        processed: [],
        totalDurationMs: 5,
    });
});

describe('S-5: header-only CRON_SECRET on /api/scanner/tick', () => {
    it('accepts the credential via the x-cron-secret header', async () => {
        const res = await post(TICK_URL, { 'x-cron-secret': SECRET });
        expect(res.status).toBe(200);
        expect(h.runScannerTick).toHaveBeenCalledTimes(1);
    });

    it('accepts the credential via Authorization: Bearer', async () => {
        const res = await post(TICK_URL, { authorization: `Bearer ${SECRET}` });
        expect(res.status).toBe(200);
        expect(h.runScannerTick).toHaveBeenCalledTimes(1);
    });

    it('S-5 regression guard: a query-string-only credential is rejected', async () => {
        const res = await post(`${TICK_URL}?secret=${SECRET}`);
        expect(res.status).toBe(401);
        expect(h.runScannerTick).not.toHaveBeenCalled();
    });

    it('S-5 regression guard: a body-only credential is rejected', async () => {
        const res = await post(TICK_URL, {}, { secret: SECRET });
        expect(res.status).toBe(401);
        expect(h.runScannerTick).not.toHaveBeenCalled();
    });

    it('rejects a wrong header credential', async () => {
        const res = await post(TICK_URL, { 'x-cron-secret': 'wrong' });
        expect(res.status).toBe(401);
        expect(h.runScannerTick).not.toHaveBeenCalled();
    });
});

describe('S-5: hasValidCronSecret helper', () => {
    const reqWith = (headers: Record<string, string>) => ({
        headers: { get: (n: string) => headers[n.toLowerCase()] ?? null },
    });

    it('fails closed when CRON_SECRET is not configured', () => {
        const prev = process.env.CRON_SECRET;
        delete process.env.CRON_SECRET;
        try {
            expect(hasValidCronSecret(reqWith({ 'x-cron-secret': '' }))).toBe(false);
            expect(hasValidCronSecret(reqWith({}))).toBe(false);
        } finally {
            process.env.CRON_SECRET = prev;
        }
    });

    it('does not accept a malformed Authorization header', () => {
        expect(hasValidCronSecret(reqWith({ authorization: SECRET }))).toBe(false);
        expect(hasValidCronSecret(reqWith({ authorization: `bearer ${SECRET}` }))).toBe(false);
    });

    it('accepts exactly the configured secret via either header', () => {
        expect(hasValidCronSecret(reqWith({ 'x-cron-secret': SECRET }))).toBe(true);
        expect(hasValidCronSecret(reqWith({ authorization: `Bearer ${SECRET}` }))).toBe(true);
    });
});
