/**
 * Regression tests for the auth callback host derivation. The callback must
 * redirect back to the SAME public host that received it (staging or prod), so
 * the session cookie set during the code exchange matches the redirect target —
 * and must reject a spoofed forwarded host. Supabase is mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ exchange: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(async () => ({ auth: { exchangeCodeForSession: h.exchange } })),
}));

import { GET } from '@/app/auth/callback/route';

const call = (host: string, code = 'abc') =>
    GET(new Request(`https://internal-cloud-run.example/auth/callback?code=${code}`, {
        headers: { 'x-forwarded-host': host },
    }));

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('auth callback host derivation', () => {
    it('on success, redirects to the SAME host that received the callback (staging)', async () => {
        h.exchange.mockResolvedValue({ data: { session: { user: {} } }, error: null });
        const res = await call('staging.projectprofound.org');
        const loc = new URL(res.headers.get('location')!);
        expect(loc.host).toBe('staging.projectprofound.org');
        expect(loc.protocol).toBe('https:');
    });

    it('production host stays on production', async () => {
        h.exchange.mockResolvedValue({ data: { session: { user: {} } }, error: null });
        const res = await call('projectprofound.org');
        expect(new URL(res.headers.get('location')!).host).toBe('projectprofound.org');
    });

    it('on a failed exchange, the error page is on the same (staging) host', async () => {
        h.exchange.mockResolvedValue({ data: {}, error: { message: 'login link expired' } });
        const res = await call('staging.projectprofound.org');
        expect(res.headers.get('location')).toBe('https://staging.projectprofound.org/auth/auth-code-error');
    });

    it('a spoofed/unknown forwarded host falls back to the canonical production host', async () => {
        h.exchange.mockResolvedValue({ data: {}, error: { message: 'x' } });
        const res = await call('evil.example.com');
        expect(new URL(res.headers.get('location')!).host).toBe('projectprofound.org');
    });
});
