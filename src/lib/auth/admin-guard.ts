// src/lib/auth/admin-guard.ts
// Shared admin auth guard for API routes.
// Why: Centralizes the admin check pattern so every /api/admin/* route
// can import a single function instead of duplicating the cookie + role logic.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Checks if the current request is from an authenticated admin or super_admin.
 * Uses the Supabase auth cookie (set by @supabase/ssr) to identify the user,
 * then verifies their role in the profiles table.
 *
 * @returns true if the caller is an admin or super_admin, false otherwise.
 */
export async function isAdminUser(): Promise<boolean> {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll(); },
                    setAll() { /* read-only in API routes */ },
                },
            }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        return profile?.role === 'admin' || profile?.role === 'super_admin';
    } catch (error) {
        // Why: Log auth failures for security monitoring instead of swallowing them.
        // A spike in failures could indicate a brute-force or session-hijacking attempt.
        console.error('[admin-guard] Auth check failed:', error instanceof Error ? error.message : error);
        return false;
    }
}
