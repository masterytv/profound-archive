/**
 * Supabase access for Share Your Experience.
 *
 * - `shareAdmin()` uses the service role and bypasses RLS. Only server code
 *   may call it, and every caller checks ownership or admin rights first.
 * - `currentUser()` reads the signed-in user from the request cookies.
 */
import { createClient as createServiceClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { createClient as createCookieClient } from '@/lib/supabase/server';

let cached: SupabaseClient | null = null;

export function shareAdmin(): SupabaseClient {
    if (cached) return cached;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase service credentials are not configured');
    cached = createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    return cached;
}

export async function currentUser(): Promise<User | null> {
    const supabase = await createCookieClient();
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
}

export async function isAdmin(userId: string): Promise<boolean> {
    const { data } = await shareAdmin().from('profiles').select('role').eq('id', userId).maybeSingle();
    return data?.role === 'admin' || data?.role === 'super_admin';
}

export async function requireUser(): Promise<User> {
    const user = await currentUser();
    if (!user) throw new Error('Please sign in first.');
    return user;
}

export async function requireAdmin(): Promise<User> {
    const user = await requireUser();
    if (!(await isAdmin(user.id))) throw new Error('Admins only.');
    return user;
}
