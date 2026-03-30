/**
 * Video Intake Processing Route (Internal)
 * 
 * POST /api/intake/process — Runs the full intake pipeline for a queued job.
 * 
 * Called internally by POST /api/intake via fire-and-forget fetch.
 * Auth: CRON_SECRET only (not browser-accessible).
 * 
 * Updates the jobs table when complete so the frontend can poll for results.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processVideoIntake } from '@/lib/pipeline/intake';

export const maxDuration = 300; // 5 minutes — Cloud Run timeout
export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase environment variables');
    return createClient(url, key);
}

export async function POST(request: Request) {
    // Parse body and capture jobId early for error recovery
    let jobId: string | null = null;

    try {
        // Auth: CRON_SECRET only (internal route)
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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

        // Run the full pipeline
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

        // Mark the job as failed in DB (if we have the jobId)
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
                // Best-effort — if this fails, the job will stay as "processing"
            }
        }

        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
