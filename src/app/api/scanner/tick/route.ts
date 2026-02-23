import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runScannerTick } from '@/lib/scanner/tick';

/**
 * POST /api/scanner/tick
 * 
 * Executes a single scanner tick: discover new videos from 1 channel,
 * queue them, and process up to 5 pending items through the intake pipeline.
 * 
 * Secured with CRON_SECRET. Called by GitHub Actions cron (every 2h)
 * or manually from the admin panel.
 */
export async function POST(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const secret = searchParams.get('secret') || body.secret;

    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
