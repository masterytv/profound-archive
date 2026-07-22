import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { createClient } from './client';

/**
 * Single-flight session lookup shared by every auth-aware component on the page.
 *
 * Search pages render a FavoriteButton and a SaveToCollectionButton per result,
 * plus another SaveToCollectionButton per transcript timestamp — a large result
 * set mounts well over a hundred of them at once. When each one called
 * supabase.auth.getSession() for itself they all queued on the same
 * GoTrueClient navigator.lock, and if whichever call held the lock stalled,
 * every waiter stalled with it and their loading spinners never cleared.
 *
 * Routing them through one cached promise means a single lock acquisition no
 * matter how many components mount.
 */

/**
 * Upper bound on how long callers wait before we give up and treat the session
 * as absent. Without it a stalled lock leaves every button spinning forever,
 * which is the failure this module exists to prevent — degrading to the
 * signed-out UI is recoverable, an permanent spinner is not.
 */
const STALL_TIMEOUT_MS = 8000;

let cached: Promise<Session | null> | null = null;
let subscribed = false;

export function getSharedSession(): Promise<Session | null> {
  if (cached) return cached;

  const supabase = createClient();

  if (!subscribed) {
    subscribed = true;
    supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      // INITIAL_SESSION fires on subscribe and reflects the state we are already
      // reading; clearing on it would just cause a redundant second lookup.
      if (event === 'INITIAL_SESSION') return;
      cached = null;
    });
  }

  cached = new Promise<Session | null>((resolve) => {
    const timer = setTimeout(() => {
      // Drop the cache so the next mount retries rather than inheriting the stall.
      cached = null;
      resolve(null);
    }, STALL_TIMEOUT_MS);

    supabase.auth
      .getSession()
      .then(({ data }: { data: { session: Session | null } }) => {
        clearTimeout(timer);
        resolve(data.session ?? null);
      })
      .catch(() => {
        clearTimeout(timer);
        cached = null;
        resolve(null);
      });
  });

  return cached;
}

/**
 * Test seam: drops the memoised session *and* the subscription flag so each test
 * starts from a clean module state. Not called in production, where the
 * auth-state subscription is deliberately registered once per page lifetime.
 */
export function resetSharedSession() {
  cached = null;
  subscribed = false;
}
