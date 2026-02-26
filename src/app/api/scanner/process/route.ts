import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runProcessTick } from '@/lib/scanner/tick';

/**
 * GET|POST /api/scanner/process
 *
 * Picks 1 video from the pending scan_queue and runs it through the full
 * 14-step intake pipeline. Does NOT discover new videos.
 *
 * 1 video per call keeps response time under ~90s, safely within Cloudflare's
 * 100s timeout limit. Called every 10 minutes by GitHub Actions.
 *
 * Secured with CRON_SECRET.
 */
async function handleProcess(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const secret = searchParams.get('secret') || body.secret;

    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Default to 1 video per call — keeps latency under the Cloudflare limit.
    // Do NOT increase above 1 without re-evaluating pipeline duration.
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
