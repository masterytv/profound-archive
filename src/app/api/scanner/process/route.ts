import { hasValidCronSecret } from '@/lib/auth/cron-auth';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runProcessTick } from '@/lib/scanner/tick';

/**
 * GET|POST /api/scanner/process
 *
 * Processes 1 video from the pending scan_queue through the full 14-step
 * intake pipeline. Returns the result synchronously.
 *
 * WHY SYNCHRONOUS (not fire-and-forget):
 * The full pipeline takes 140-180s. This exceeds Cloudflare's 100s cutoff,
 * but this endpoint is called via the Firebase App Hosting DIRECT URL
 * (*.hosted.app) from GitHub Actions — bypassing Cloudflare entirely.
 * Cloud Run's timeoutSeconds: 300 (in apphosting.yaml) is the real limit.
 *
 * DO NOT call this via the Cloudflare-proxied domain (projectprofound.org)
 * from automated jobs — use APP_DIRECT_URL in GitHub Actions secrets.
 *
 * Secured with CRON_SECRET.
 */
async function handleProcess(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    // Header-only credential (S-5): never via query string or body.
    if (!hasValidCronSecret(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Keep at 1 — Apify alone can take 100s, full pipeline is 140-180s.
    const videosPerTick = body.videosPerTick ?? 1;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!,
    );

    try {
        const result = await runProcessTick(supabase, videosPerTick);

        return NextResponse.json({
            success: true,
            processed: result.processed.length,
            results: result.processed,
            durationMs: result.durationMs,
        });
    } catch (err: any) {
        console.error('Scanner process error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    return handleProcess(req);
}

export async function POST(req: NextRequest) {
    return handleProcess(req);
}
