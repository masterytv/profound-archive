/** Shared plumbing for the Short Maker research routes. */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const NO_STORE = { 'Cache-Control': 'no-store' };

export function getReadClient(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) throw new Error('Missing Supabase configuration');
    return createClient(url, key, { auth: { persistSession: false } });
}

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

export const badRequest = (message: string) => json({ error: 'Bad request', message }, 400);

/** Never a 200 full of empty data: upstream failures are 503s with no internals leaked. */
export function upstreamError(route: string, err: unknown) {
    console.error(`[${route}]`, err instanceof Error ? err.message : err);
    return json({ error: 'Research data temporarily unavailable' }, 503);
}
