import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Admin Scanner API
 * 
 * GET  - Returns scanner status, channel list, and queue stats
 * POST - Actions: enable/disable channel, trigger audit/tick
 */

function getAdminSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!,
    );
}

export async function GET() {
    const supabase = getAdminSupabase();

    // Fetch channels with scanner info + video counts
    const { data: channels, error: channelError } = await supabase
        .from('channels')
        .select('channel_id, name, avatar_url, custom_url, subscriber_count, scanner_enabled, last_scanned_at, uploads_playlist_id')
        .order('name');

    if (channelError) {
        return NextResponse.json({ error: channelError.message }, { status: 500 });
    }

    // Get video counts per channel
    const { data: videoCounts } = await supabase.rpc('get_channel_scanner_stats');

    // Get queue stats
    const { data: queueStats } = await supabase
        .from('scan_queue')
        .select('status')
        .then(({ data }: any) => {
            const stats = { pending: 0, processing: 0, complete: 0, failed: 0, skipped: 0, total: 0 };
            if (data) {
                for (const item of data) {
                    stats[item.status as keyof typeof stats] = (stats[item.status as keyof typeof stats] || 0) + 1;
                    stats.total++;
                }
            }
            return { data: stats };
        });

    // Get recent scan runs
    const { data: recentRuns } = await supabase
        .from('scan_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);

    // Aggregate stats from scan_runs
    const { data: aggregateStats } = await supabase
        .from('scan_runs')
        .select('videos_discovered, videos_processed, videos_accepted, videos_rejected, videos_failed')
        .then(({ data }: any) => {
            const totals = { discovered: 0, processed: 0, accepted: 0, rejected: 0, failed: 0 };
            if (data) {
                for (const run of data) {
                    totals.discovered += run.videos_discovered || 0;
                    totals.processed += run.videos_processed || 0;
                    totals.accepted += run.videos_accepted || 0;
                    totals.rejected += run.videos_rejected || 0;
                    totals.failed += run.videos_failed || 0;
                }
            }
            return { data: totals };
        });

    return NextResponse.json({
        channels,
        videoCounts,
        queueStats,
        recentRuns,
        aggregateStats,
    });
}

export async function POST(req: NextRequest) {
    const supabase = getAdminSupabase();
    const body = await req.json();

    switch (body.action) {
        case 'toggle_channel': {
            const { channelId, enabled } = body;
            const { error } = await supabase
                .from('channels')
                .update({ scanner_enabled: enabled })
                .eq('channel_id', channelId);

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ success: true });
        }

        case 'bulk_enable': {
            // Enable all channels with ≥N clear_nde videos
            const threshold = body.threshold || 10;
            const { data: qualifyingChannels } = await supabase
                .rpc('get_channels_above_nde_threshold', { threshold_count: threshold });

            if (qualifyingChannels && qualifyingChannels.length > 0) {
                const ids = qualifyingChannels.map((c: any) => c.channel_id);
                await supabase
                    .from('channels')
                    .update({ scanner_enabled: true })
                    .in('channel_id', ids);

                return NextResponse.json({ success: true, enabled: ids.length });
            }
            return NextResponse.json({ success: true, enabled: 0 });
        }

        default:
            return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
}
