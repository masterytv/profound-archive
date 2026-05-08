import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runUapProcessTick } from '@/lib/scanner/uap-tick';

export const dynamic = 'force-dynamic';

/**
 * GET|POST /api/uap/scanner/process
 *
 * Processes 1 video from the pending uap_scan_queue through the full UAP
 * intake pipeline. Returns the result synchronously.
 *
 * Copy-Modify from /api/scanner/process (NDE).
 * Called via APP_DIRECT_URL to bypass Cloudflare's 100s timeout.
 * Secured with CRON_SECRET.
 */
async function handleProcess(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const secret = searchParams.get('secret') || body.secret;

    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
