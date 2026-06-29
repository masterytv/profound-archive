import { hasValidCronSecret } from '@/lib/auth/cron-auth';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runUapProcessTick } from '@/lib/scanner/uap-tick';
import { pauseGate } from '@/lib/ops/gate';

export const dynamic = 'force-dynamic';
export const maxDuration = 540; // 9 min — 3 sequential videos × ~90s each + overhead

/**
 * GET|POST /api/uap/scanner/process
 *
 * Processes up to 3 videos (configurable via videosPerTick) from the pending
 * uap_scan_queue through the full UAP intake pipeline. Returns results
 * synchronously.
 *
 * Copy-Modify from /api/scanner/process (NDE).
 * Called via APP_DIRECT_URL to bypass Cloudflare's 100s timeout.
 * Secured with CRON_SECRET.
 */
async function handleProcess(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    // Header-only credential (S-5): never via query string or body.
    if (!hasValidCronSecret(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cost kill-switch (mirrors NDE /api/scanner/process). The lib gates too;
    // this returns a clean 200 "skipped" so cron callers don't retry-storm.
    const gated = await pauseGate('video_analysis');
    if (gated) return gated;

    const videosPerTick = body.videosPerTick ?? 1;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!,
    );

    try {
        const result = await runUapProcessTick(supabase, videosPerTick);

        return NextResponse.json({
            success: true,
            processed: result.processed.length,
            results: result.processed,
            durationMs: result.durationMs,
        });
    } catch (err: any) {
        console.error('UAP Scanner process error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    return handleProcess(req);
}

export async function POST(req: NextRequest) {
    return handleProcess(req);
}
