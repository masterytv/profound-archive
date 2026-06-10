/**
 * Characterization tests for src/proxy.ts (Next 16 middleware).
 * Captures the current /admin gating decisions: login redirect, role check,
 * and banned-user redirect. Session-refresh cookie mechanics are out of scope.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({
    getUser: vi.fn(),
    single: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
    createServerClient: vi.fn(() => ({
        auth: { getUser: h.getUser },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({ single: h.single })),
            })),
        })),
    })),
}));

import { proxy } from '@/proxy';

// The proxy logs cookies/emails on every request (IMPROVEMENT_PLAN S-9);
// silence it so test output stays readable. Remove when S-9 is fixed.
vi.spyOn(console, 'log').mockImplementation(() => {});

const req = (path: string) => new NextRequest(`https://example.org${path}`);

beforeEach(() => {
    h.getUser.mockReset();
    h.single.mockReset();
});

describe('proxy — non-admin paths', () => {
    it('passes through anonymous requests without redirecting', async () => {
        h.getUser.mockResolvedValue({ data: { user: null } });
        const res = await proxy(req('/blog'));
        expect(res.status).toBe(200);
        expect(res.headers.get('location')).toBeNull();
        expect(h.single).not.toHaveBeenCalled();
    });
});

describe('proxy — /admin gating (current behavior)', () => {
    it('redirects anonymous users to /login', async () => {
        h.getUser.mockResolvedValue({ data: { user: null } });
        const res = await proxy(req('/admin'));
        expect(res.status).toBe(307);
        expect(new URL(res.headers.get('location')!).pathname).toBe('/login');
    });

    it('redirects authenticated non-admins to /', async () => {
        h.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'u@example.org' } } });
        h.single.mockResolvedValue({ data: { role: 'user', is_banned: false } });
        const res = await proxy(req('/admin/scanner'));
        expect(res.status).toBe(307);
        expect(new URL(res.headers.get('location')!).pathname).toBe('/');
    });

    it('redirects users with no profile row to /', async () => {
        h.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'u@example.org' } } });
        h.single.mockResolvedValue({ data: null });
        const res = await proxy(req('/admin'));
        expect(res.status).toBe(307);
        expect(new URL(res.headers.get('location')!).pathname).toBe('/');
    });

    it('redirects banned admins to /?error=banned', async () => {
        h.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'u@example.org' } } });
        h.single.mockResolvedValue({ data: { role: 'admin', is_banned: true } });
        const res = await proxy(req('/admin'));
        expect(res.status).toBe(307);
        const loc = new URL(res.headers.get('location')!);
        expect(loc.pathname).toBe('/');
        expect(loc.searchParams.get('error')).toBe('banned');
    });

    it('lets admins through', async () => {
        h.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@example.org' } } });
        h.single.mockResolvedValue({ data: { role: 'admin', is_banned: false } });
        const res = await proxy(req('/admin'));
        expect(res.status).toBe(200);
        expect(res.headers.get('location')).toBeNull();
    });

    it('lets super_admins through', async () => {
        h.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'sa@example.org' } } });
        h.single.mockResolvedValue({ data: { role: 'super_admin', is_banned: false } });
        const res = await proxy(req('/admin'));
        expect(res.status).toBe(200);
    });
});
