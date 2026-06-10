/**
 * Characterization tests for the shared admin API guard.
 * Captures the current decision logic of isAdminUser() with the Supabase
 * session + profiles.role lookup fully mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
    getUser: vi.fn(),
    single: vi.fn(),
}));

vi.mock('next/headers', () => ({
    cookies: vi.fn(async () => ({ getAll: () => [] })),
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

import { isAdminUser } from '@/lib/auth/admin-guard';

beforeEach(() => {
    vi.clearAllMocks();
    h.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    h.single.mockResolvedValue({ data: { role: 'user' } });
});

describe('isAdminUser', () => {
    it('returns false when there is no authenticated user', async () => {
        h.getUser.mockResolvedValue({ data: { user: null } });
        expect(await isAdminUser()).toBe(false);
        expect(h.single).not.toHaveBeenCalled();
    });

    it('returns true for role=admin', async () => {
        h.single.mockResolvedValue({ data: { role: 'admin' } });
        expect(await isAdminUser()).toBe(true);
    });

    it('returns true for role=super_admin', async () => {
        h.single.mockResolvedValue({ data: { role: 'super_admin' } });
        expect(await isAdminUser()).toBe(true);
    });

    it('returns false for any other role', async () => {
        h.single.mockResolvedValue({ data: { role: 'user' } });
        expect(await isAdminUser()).toBe(false);
    });

    it('returns false when the profile row is missing', async () => {
        h.single.mockResolvedValue({ data: null });
        expect(await isAdminUser()).toBe(false);
    });

    it('fails closed (returns false) when the auth lookup throws', async () => {
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        h.getUser.mockRejectedValue(new Error('network down'));
        expect(await isAdminUser()).toBe(false);
        errSpy.mockRestore();
    });
});
