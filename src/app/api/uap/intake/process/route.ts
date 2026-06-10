/**
 * UAP Video Intake Processing Route
 * 
 * POST /api/uap/intake/process — Runs the full UAP intake pipeline for a queued job.
 *
 * Copy-Modify from /api/intake/process (NDE).
 * Called by the browser's fire-and-forget fetch after the job is queued.
 * Uses processUapVideoIntake instead of processVideoIntake.
 * Updates uap_jobs instead of jobs.
 *
 * Auth: Admin session (cookie) OR CRON_SECRET bearer token.
 */

import { isDebugBypass } from '@/lib/debug-mode';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { processUapVideoIntake } from '@/lib/pipeline/intake-uap';

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

    // Method 2: Debug mode bypass
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
    let jobId: string | null = null;

    try {
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
        console.log(`[UAP Intake Process] Starting pipeline for job ${jobId}: ${url}`);

        // Run the full UAP pipeline
        const result = await processUapVideoIntake(url);

        // Update the job record with the result
        const { error: updateError } = await supabase
            .from('uap_jobs')
            .update({
                status: result.status,
                video_title: result.title || null,
                video_id: result.videoId || null,
                error_message: result.error || null,
                result: result,
                updated_at: new Date().toISOString(),
            })
            .eq('id', jobId);

        if (updateError) {
            console.error(`[UAP Intake Process] Failed to update job ${jobId}:`, updateError);
        }

        console.log(`[UAP Intake Process] Job ${jobId} finished with status: ${result.status}`);
        return NextResponse.json({ status: result.status, jobId });

    } catch (error: any) {
        console.error('[UAP Intake Process] Unhandled error:', error);

        if (jobId) {
            try {
                const supabase = getSupabaseAdmin();
                await supabase
                    .from('uap_jobs')
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
