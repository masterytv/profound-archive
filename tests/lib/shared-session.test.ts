/**
 * Regression tests for the shared single-flight session lookup.
 *
 * The bug this guards: search pages mount 100+ auth-aware buttons at once, and
 * when each called supabase.auth.getSession() for itself they queued on the same
 * GoTrueClient navigator.lock. A stalled holder left every button's loading
 * spinner up permanently.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
    createClient: vi.fn(() => ({
        auth: { getSession: h.getSession, onAuthStateChange: h.onAuthStateChange },
    })),
}));

import { getSharedSession, resetSharedSession } from '@/lib/supabase/session';

const session = { user: { id: 'u1' } };

beforeEach(() => {
    vi.clearAllMocks();
    resetSharedSession();
    h.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
});

afterEach(() => {
    vi.useRealTimers();
});

describe('getSharedSession', () => {
    it('collapses concurrent callers into a single getSession call', async () => {
        h.getSession.mockResolvedValue({ data: { session } });

        // Simulate a large result set mounting many buttons at once.
        const results = await Promise.all(
            Array.from({ length: 120 }, () => getSharedSession()),
        );

        expect(h.getSession).toHaveBeenCalledTimes(1);
        expect(results.every((r) => r === session)).toBe(true);
    });

    it('resolves every caller to null instead of hanging when the lock stalls', async () => {
        vi.useFakeTimers();
        // A getSession that never settles — the stalled-lock scenario.
        h.getSession.mockReturnValue(new Promise(() => {}));

        const pending = Promise.all([getSharedSession(), getSharedSession()]);
        await vi.advanceTimersByTimeAsync(8000);

        expect(await pending).toEqual([null, null]);
    });

    it('retries on the next call after a stall rather than caching the failure', async () => {
        vi.useFakeTimers();
        h.getSession.mockReturnValue(new Promise(() => {}));

        const stalled = getSharedSession();
        await vi.advanceTimersByTimeAsync(8000);
        expect(await stalled).toBeNull();

        h.getSession.mockResolvedValue({ data: { session } });
        expect(await getSharedSession()).toBe(session);
    });

    it('resolves to null when getSession rejects', async () => {
        h.getSession.mockRejectedValue(new Error('lock aborted'));
        expect(await getSharedSession()).toBeNull();
    });

    it('invalidates the cache on a real auth transition but not on INITIAL_SESSION', async () => {
        h.getSession.mockResolvedValue({ data: { session } });
        await getSharedSession();
        expect(h.getSession).toHaveBeenCalledTimes(1);

        const handler = h.onAuthStateChange.mock.calls[0][0];

        handler('INITIAL_SESSION');
        await getSharedSession();
        expect(h.getSession).toHaveBeenCalledTimes(1); // still cached

        handler('SIGNED_OUT');
        await getSharedSession();
        expect(h.getSession).toHaveBeenCalledTimes(2); // re-read
    });
});
