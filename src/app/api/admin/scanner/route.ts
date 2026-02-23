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

    // Queue inspector: query nde_vids (persistent source of truth) not scan_queue (transient)
    // scan_queue items get reset to 'pending' on retry — nde_vids always holds the real intake status
    if (searchParams.get('view') === 'queue') {
        const { data: items, error: qErr } = await supabase
            .from('nde_vids')
            .select('"videoId", title, "channelId", channelName, intake_status, intake_error, intake_submitted_at, intake_completed_at')
            .in('intake_status', ['failed', 'no_captions', 'not_profound', 'indexing'])
            .order('intake_completed_at', { ascending: false })
            .limit(200);

        if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
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

    // Live intake stats from nde_vids — same source as Queue Inspector.
    // Using nde_vids instead of scan_runs so numbers react to retries and match Queue Inspector.
    const { data: ndeVidCounts } = await supabase
        .from('nde_vids')
        .select('intake_status')
        .not('intake_status', 'is', null);

    const intakeTotals = { accepted: 0, rejected: 0, failed: 0 };
    if (ndeVidCounts) {
        for (const row of ndeVidCounts) {
            if (row.intake_status === 'complete') intakeTotals.accepted++;
            else if (row.intake_status === 'not_profound') intakeTotals.rejected++;
            else if (['failed', 'no_captions', 'indexing'].includes(row.intake_status)) intakeTotals.failed++;
        }
    }
    const aggregateStats = intakeTotals;

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

        case 'discover_all': {
            // Phase 1: Scan ALL enabled channels and queue all discovered videos.
            // Run this once to fill the pool before relying on per-tick discovery.
            try {
                const { data: channels } = await supabase
                    .from('channels')
                    .select('channel_id, name, uploads_playlist_id')
                    .eq('scanner_enabled', true)
                    .order('name');

                if (!channels || channels.length === 0) {
                    return NextResponse.json({ success: true, totalQueued: 0, channels: 0 });
                }

                const allChannelIds = channels.map((c: any) => c.channel_id);
                const existingVideoIds = await getExistingVideoIds(supabase, allChannelIds);

                let totalQueued = 0;
                const results: any[] = [];

                for (const channel of channels) {
                    if (!channel.uploads_playlist_id) continue;
                    try {
                        const discovery = await discoverNewVideos(
                            channel.channel_id,
                            channel.uploads_playlist_id,
                            channel.name,
                            existingVideoIds,
                            500,  // fetch more videos per channel than audit (no limit)
                            50,   // max new videos to queue per channel per run
                        );

                        // Queue discovered videos
                        if (discovery.newVideos.length > 0) {
                            const queueItems = discovery.newVideos.map(v => ({
                                video_id: v.videoId,
                                video_url: `https://www.youtube.com/watch?v=${v.videoId}`,
                                channel_id: channel.channel_id,
                                status: 'pending',
                            }));
                            await supabase
                                .from('scan_queue')
                                .upsert(queueItems, { onConflict: 'video_url', ignoreDuplicates: true });
                            totalQueued += discovery.newVideos.length;
                        }

                        // Mark channel as scanned
                        await supabase
                            .from('channels')
                            .update({ last_scanned_at: new Date().toISOString() })
                            .eq('channel_id', channel.channel_id);

                        results.push({ channelId: channel.channel_id, channelName: channel.name, queued: discovery.newVideos.length });
                    } catch (err: any) {
                        results.push({ channelId: channel.channel_id, channelName: channel.name, queued: 0, error: err.message });
                    }
                }

                return NextResponse.json({ success: true, totalQueued, channels: channels.length, results });
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
            // Reset a single video for retry:
            // 1. Clear intake_status in nde_vids so it can be re-processed
            // 2. Upsert back into scan_queue as pending
            const { videoId } = body;
            if (!videoId) return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });

            // Fetch the video's channel_id from nde_vids
            const { data: vid } = await supabase
                .from('nde_vids')
                .select('"videoId", "channelId"')
                .eq('"videoId"', videoId)
                .single();

            // Reset intake status
            await supabase
                .from('nde_vids')
                .update({ intake_status: null, intake_error: null, intake_completed_at: null })
                .eq('"videoId"', videoId);

            // Re-queue it
            await supabase.from('scan_queue').upsert({
                video_id: videoId,
                video_url: `https://www.youtube.com/watch?v=${videoId}`,
                channel_id: vid?.channelId || null,
                status: 'pending',
                error: null,
                processed_at: null,
                intake_result: null,
            }, { onConflict: 'video_url', ignoreDuplicates: false });

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
