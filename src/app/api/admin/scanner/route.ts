import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { discoverNewVideos, getExistingVideoIds } from '@/lib/scanner/discover';
import { runScannerTick } from '@/lib/scanner/tick';

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

export async function GET(req: NextRequest) {
    const supabase = getAdminSupabase();
    const { searchParams } = new URL(req.url);

    // Queue inspector view: returns failed + skipped items with details
    if (searchParams.get('view') === 'queue') {
        const { data: items } = await supabase
            .from('scan_queue')
            .select(`
                id, video_id, video_url, channel_id, status, intake_result,
                error, processed_at, created_at,
                channels!scan_queue_channel_id_fkey(name, avatar_url)
            `)
            .in('status', ['failed', 'skipped'])
            .order('processed_at', { ascending: false })
            .limit(200);

        return NextResponse.json({ items: items || [] });
    }

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

        case 'run_audit': {
            try {
                const { data: channels } = await supabase
                    .from('channels')
                    .select('channel_id, name, uploads_playlist_id, subscriber_count')
                    .eq('scanner_enabled', true)
                    .order('name');

                if (!channels || channels.length === 0) {
                    return NextResponse.json({ results: [], totals: { channels: 0, newToImport: 0 } });
                }

                const channelIds = channels.map((c: any) => c.channel_id);
                const existingVideoIds = await getExistingVideoIds(supabase, channelIds);

                const results: any[] = [];
                for (const channel of channels) {
                    if (!channel.uploads_playlist_id) continue;
                    try {
                        const discovery = await discoverNewVideos(
                            channel.channel_id,
                            channel.uploads_playlist_id,
                            channel.name,
                            existingVideoIds,
                            50, 10,
                        );
                        results.push({
                            channelId: discovery.channelId,
                            channelName: discovery.channelName,
                            totalFetched: discovery.totalFetched,
                            alreadyInDb: discovery.alreadyInDb,
                            newToImport: discovery.newVideos.length,
                        });
                    } catch (err: any) {
                        results.push({
                            channelId: channel.channel_id,
                            channelName: channel.name,
                            totalFetched: 0, alreadyInDb: 0, newToImport: -1,
                        });
                    }
                }

                const totals = results.reduce((acc, r) => ({
                    channels: acc.channels + 1,
                    totalFetched: acc.totalFetched + r.totalFetched,
                    alreadyInDb: acc.alreadyInDb + r.alreadyInDb,
                    newToImport: acc.newToImport + Math.max(0, r.newToImport),
                }), { channels: 0, totalFetched: 0, alreadyInDb: 0, newToImport: 0 });

                const estimatedCost = totals.newToImport * 0.017;
                return NextResponse.json({
                    results: results.sort((a: any, b: any) => b.newToImport - a.newToImport),
                    totals,
                    estimate: {
                        totalEstimatedCost: `$${estimatedCost.toFixed(2)}`,
                        daysToComplete: Math.ceil(totals.newToImport / 60),
                    },
                });
            } catch (err: any) {
                return NextResponse.json({ error: err.message }, { status: 500 });
            }
        }

        case 'run_tick': {
            try {
                const videosPerTick = body.videosPerTick || 1;
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
                return NextResponse.json({ error: err.message }, { status: 500 });
            }
        }

        case 'reset_item': {
            // Reset a single queue item back to pending for manual retry
            const { queueId } = body;
            const { error } = await supabase
                .from('scan_queue')
                .update({ status: 'pending', error: null, processed_at: null, intake_result: null })
                .eq('id', queueId);

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ success: true });
        }

        case 'reset_all_skipped': {
            // Reset ALL skipped items back to pending (mass retry for no_captions)
            const { error } = await supabase
                .from('scan_queue')
                .update({ status: 'pending', error: null, processed_at: null, intake_result: null })
                .eq('status', 'skipped');

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ success: true });
        }

        default:
            return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
}
