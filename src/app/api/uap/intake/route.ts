/**
 * UAP Video Intake API Route (Async Job Pattern)
 * 
 * POST /api/uap/intake — Queue a YouTube URL for UAP processing. Returns a jobId immediately.
 * GET  /api/uap/intake?jobId=xxx — Poll for job status/results.
 * 
 * Copy-Modify from /api/intake (NDE).
 * Uses `uap_jobs` table instead of `jobs`.
 * Auth: Admin role via Supabase session OR CRON_SECRET bearer token.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

// ─── GET: Poll for job status ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        const jobId = request.nextUrl.searchParams.get('jobId');
        if (!jobId) {
            return NextResponse.json({ error: 'Missing jobId parameter' }, { status: 400 });
        }

        const isAuthorized = await checkAuth(request);
        if (!isAuthorized) {
            return NextResponse.json(
                { error: 'Unauthorized. Admin access required.' },
                { status: 401 }
            );
        }

        const supabase = getSupabaseAdmin();
        const { data: job, error } = await supabase
            .from('uap_jobs')
            .select('id, youtube_url, video_title, status, error_message, result, video_id, created_at, updated_at')
            .eq('id', jobId)
            .single();

        if (error || !job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        return NextResponse.json(job);
    } catch (error: any) {
        console.error('[UAP Intake GET] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ─── POST: Queue a new intake job ────────────────────────────────────────────

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { url } = body;

        if (!url || typeof url !== 'string') {
            return NextResponse.json(
                { error: 'Missing required field: url' },
                { status: 400 }
            );
        }

        const isAuthorized = await checkAuth(request);
        if (!isAuthorized) {
            return NextResponse.json(
                { error: 'Unauthorized. Admin access or CRON_SECRET required.' },
                { status: 401 }
            );
        }

        const supabase = getSupabaseAdmin();

        const { data: job, error: insertError } = await supabase
            .from('uap_jobs')
            .insert({
                youtube_url: url.trim(),
                status: 'processing',
            })
            .select('id')
            .single();

        if (insertError || !job) {
            console.error('[UAP Intake POST] Failed to create job:', insertError);
            return NextResponse.json(
                { error: 'Failed to create job record' },
                { status: 500 }
            );
        }

        console.log(`[UAP Intake POST] Created job ${job.id} for URL: ${url}`);

        return NextResponse.json({
            jobId: job.id,
            status: 'processing',
            url: url.trim(),
        }, { status: 202 });

    } catch (error: any) {
        console.error('[UAP Intake POST] Unhandled error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase environment variables');
    return createClient(url, key);
}

async function checkAuth(request: Request): Promise<boolean> {
    // Method 1: CRON_SECRET bearer token
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
        return true;
    }

    // Method 2: Debug mode bypass
    if (process.env.IS_DEBUG_MODE) {
        return true;
    }

    // Method 3: Supabase session with admin role
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                },
            }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );

        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        return profile?.role === 'admin' || profile?.role === 'super_admin';
    } catch {
        return false;
    }
}
