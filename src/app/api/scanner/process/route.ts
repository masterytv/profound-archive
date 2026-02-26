import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runProcessTick } from '@/lib/scanner/tick';

/**
 * GET|POST /api/scanner/process
 *
 * Fire-and-forget: returns 202 immediately, then processes 1 video from the
 * pending scan_queue in the background.
 *
 * WHY FIRE-AND-FORGET:
 * The full intake pipeline (Apify caption fetch + 7 AI analysis passes) takes
 * 140-180s per video. Cloudflare hard-cuts HTTP connections at 100s, so a
 * synchronous response always times out. By returning 202 before the work
 * begins, the HTTP connection closes cleanly while Cloud Run continues
 * executing the promise in its event loop (up to timeoutSeconds: 300 in
 * apphosting.yaml).
 *
 * RESULT TRACKING:
 * Success/failure is tracked in scan_queue (status column) and scan_runs table,
 * not via HTTP response. Check those tables to monitor outcomes.
 *
 * Secured with CRON_SECRET. Called every 10 minutes by GitHub Actions.
 */
async function handleProcess(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const secret = searchParams.get('secret') || body.secret;

    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Default to 1 video per call. Do NOT increase — Apify alone can take 100s.
    const videosPerTick = body.videosPerTick ?? 1;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!,
    );

    // Fire processing in the background — do NOT await.
    // Cloud Run keeps the instance alive (up to 300s) until this resolves.
    runProcessTick(supabase, videosPerTick).catch((err) => {
        console.error('[Scanner/Process] Background tick error:', err?.message || err);
    });

    // Return immediately so GitHub Actions (and Cloudflare) don't time out.
    return NextResponse.json(
        { success: true, message: 'Processing dispatched', videosPerTick },
        { status: 202 },
    );
}

export async function GET(req: NextRequest) {
    return handleProcess(req);
}

export async function POST(req: NextRequest) {
    return handleProcess(req);
}
