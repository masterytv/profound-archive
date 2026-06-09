import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runDiscoverAllChannels } from '@/lib/scanner/tick';

/**
 * GET|POST /api/scanner/discover-all
 *
 * Scans ALL scanner-enabled NDE channels for new videos in one pass and
 * queues them in scan_queue. Replaces the hourly single-channel discover tick.
 *
 * Called once daily at 3am ET (7am UTC) via pg_cron → trigger_nde_channel_discovery_all().
 * Takes ~1-3 minutes for ~47 channels. Well within Firebase 600s timeout.
 *
 * The every-10-minute process tick (trigger_nde_video_processor) then drains
 * the queue automatically — typically done before 9am ET.
 *
 * Secured with CRON_SECRET.
 */
async function handleDiscoverAll(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const secret = searchParams.get('secret') || body.secret;

    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!,
    );

    try {
        const result = await runDiscoverAllChannels(supabase);

        return NextResponse.json({
            success: true,
            channelsScanned: result.channelsScanned,
            channelsWithNewVideos: result.channelsWithNewVideos,
            totalDiscovered: result.totalDiscovered,
            totalQueued: result.totalQueued,
            durationMs: result.durationMs,
            perChannel: result.perChannel.filter(c => c.discovered > 0),
        });
    } catch (err: any) {
        console.error('[DiscoverAll] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    return handleDiscoverAll(req);
}

export async function POST(req: NextRequest) {
    return handleDiscoverAll(req);
}
