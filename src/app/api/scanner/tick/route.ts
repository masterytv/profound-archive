import { hasValidCronSecret } from '@/lib/auth/cron-auth';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runScannerTick } from '@/lib/scanner/tick';
import { pauseGate } from '@/lib/ops/gate';

/**
 * GET|POST /api/scanner/tick
 * 
 * Executes a single scanner tick: discover new videos from 1 channel,
 * queue them, and process up to 5 pending items through the intake pipeline.
 * 
 * Secured with CRON_SECRET. Called by GitHub Actions cron (every 2h)
 * or manually from the admin panel.
 * 
 * Supports both GET (for simple cron triggers) and POST (for custom params).
 */

async function handleTick(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    // Header-only credential (S-5): never via query string or body.
    if (!hasValidCronSecret(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Combined tick spans discovery + analysis — skip if either half is paused.
    const gatedIngest = await pauseGate('video_ingestion');
    if (gatedIngest) return gatedIngest;
    const gatedAnalysis = await pauseGate('video_analysis');
    if (gatedAnalysis) return gatedAnalysis;

    const videosPerTick = body.videosPerTick || 5;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!,
    );

    try {
        const result = await runScannerTick(supabase, videosPerTick);

        return NextResponse.json({
            success: true,
            channel: result.channel,
            discovered: result.discovered,
            queued: result.queued,
            processed: result.processed.length,
            results: result.processed,
            durationMs: result.totalDurationMs,
        });
    } catch (err: any) {
        console.error('Scanner tick error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    return handleTick(req);
}

export async function POST(req: NextRequest) {
    return handleTick(req);
}
