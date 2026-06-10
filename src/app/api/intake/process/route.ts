/**
 * Video Intake Processing Route
 * 
 * POST /api/intake/process — Runs the full intake pipeline for a queued job.
 * 
 * Called by the browser's fire-and-forget fetch after the job is queued.
 * The browser doesn't throttle pending fetches, so this runs for up to 300s.
 * Cloudflare will 524 the browser's fetch, but that's fine — we don't read
 * the response. The frontend polls GET /api/intake?jobId=xxx for status.
 * 
 * Auth: Admin session (cookie) OR CRON_SECRET bearer token.
 */

import { isDebugBypass } from '@/lib/debug-mode';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { processVideoIntake } from '@/lib/pipeline/intake';

export const maxDuration = 300; // 5 minutes — Cloud Run timeout
export const dynamic = 'force-dynamic';

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

    // Method 2: Debug mode bypass (local dev only)
    if (isDebugBypass()) {
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

export async function POST(request: Request) {
    // Parse body early for error recovery
    let jobId: string | null = null;

    try {
        // Auth check
        const isAuthorized = await checkAuth(request);
        if (!isAuthorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        jobId = body.jobId;
        const url = body.url;

        if (!jobId || !url) {
            return NextResponse.json({ error: 'Missing jobId or url' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        console.log(`[Intake Process] Starting pipeline for job ${jobId}: ${url}`);

        // Run the full pipeline (this takes 60-120s)
        const result = await processVideoIntake(url);

        // Update the job record with the result
        const { error: updateError } = await supabase
            .from('jobs')
            .update({
                status: result.status,
                video_title: result.title || null,
                video_id: result.videoId || null,
                error_message: result.error || null,
                result: result, // Full IntakeResult as JSONB
                updated_at: new Date().toISOString(),
            })
            .eq('id', jobId);

        if (updateError) {
            console.error(`[Intake Process] Failed to update job ${jobId}:`, updateError);
        }

        console.log(`[Intake Process] Job ${jobId} finished with status: ${result.status}`);
        return NextResponse.json({ status: result.status, jobId });

    } catch (error: any) {
        console.error('[Intake Process] Unhandled error:', error);

        // Mark the job as failed in DB
        if (jobId) {
            try {
                const supabase = getSupabaseAdmin();
                await supabase
                    .from('jobs')
                    .update({
                        status: 'failed',
                        error_message: error.message || 'Unknown pipeline error',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', jobId);
            } catch {
                // Best-effort
            }
        }

        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
