import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { discoverNewUapVideos, getExistingUapVideoIds } from '@/lib/scanner/uap-discover';
import { runUapScannerTick } from '@/lib/scanner/uap-tick';
import { isAdminUser } from '@/lib/auth/admin-guard';
import { resolveChannelId, fetchChannelMetadata } from '@/lib/youtube/scraper';

/**
 * UAP Admin Scanner API
 * 
 * Copy-Modify from /api/admin/scanner (NDE).
 * 
 * GET  - Returns UAP scanner status, channel list, and queue stats
 * POST - Actions: enable/disable channel, trigger audit/tick, add channel
 *
 * Key differences from NDE:
 * - Queries uap_channels, uap_scan_queue, uap_scan_runs, uap_vids
 * - Channel schema uses channel_name instead of name
 */

function getAdminSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!,
    );
}

export async function GET(req: NextRequest) {
    if (!(await isAdminUser())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAdminSupabase();
    const { searchParams } = new URL(req.url);

    // Scan queue inspector: raw scan queue items (for /admin/uap/scanner/queue)
    if (searchParams.get('view') === 'scan_queue') {
        const filterStatus = searchParams.get('filter');
        let query = supabase
            .from('uap_scan_queue')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);

        if (filterStatus && filterStatus !== 'all') {
            query = query.eq('status', filterStatus);
        }

        const { data: items, error: sqErr } = await query;
        if (sqErr) return NextResponse.json({ error: sqErr.message }, { status: 500 });
        return NextResponse.json({ items: items || [] });
    }

    // Queue inspector: query uap_vids for real intake status
    if (searchParams.get('view') === 'queue') {
        const { data: items, error: qErr } = await supabase
            .from('uap_vids')
            .select('video_id, title, channel_id, channel_name, intake_status, intake_error')
            .in('intake_status', ['failed', 'no_captions', 'drm_protected', 'out_of_scope', 'embedding'])
            .order('classified_at', { ascending: false });

        if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
        return NextResponse.json({ items: items || [] });
    }

    // Fetch channels with scanner info
    const { data: channels, error: channelError } = await supabase
        .from('uap_channels')
        .select('channel_id, channel_name, avatar_url, custom_url, subscriber_count, scanner_enabled, last_scanned_at, uploads_playlist_id, track')
        .order('channel_name');

    if (channelError) {
        return NextResponse.json({ error: channelError.message }, { status: 500 });
    }

    // Get queue stats
    const countByStatus = async (status: string) => {
        const { count } = await supabase
            .from('uap_scan_queue')
            .select('*', { count: 'exact', head: true })
            .eq('status', status);
        return count ?? 0;
    };

    const [pendingCount, processingCount, completeCount, failedCount, skippedCount] = await Promise.all([
        countByStatus('pending'),
        countByStatus('processing'),
        countByStatus('complete'),
        countByStatus('failed'),
        countByStatus('skipped'),
    ]);

    const queueStats = {
        pending: pendingCount,
        processing: processingCount,
        complete: completeCount,
        failed: failedCount,
        skipped: skippedCount,
        total: pendingCount + processingCount + completeCount + failedCount + skippedCount,
    };

    // Get recent scan runs
    const { data: recentRuns } = await supabase
        .from('uap_scan_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);

    // Intake aggregate stats
    const { data: uapVidCounts } = await supabase
        .from('uap_vids')
        .select('intake_status')
        .not('intake_status', 'is', null);

    const intakeTotals = { accepted: 0, rejected: 0, failed: 0 };
    if (uapVidCounts) {
        for (const row of uapVidCounts) {
            if (row.intake_status === 'complete') intakeTotals.accepted++;
            else if (row.intake_status === 'out_of_scope') intakeTotals.rejected++;
            else if (['failed', 'no_captions', 'drm_protected', 'embedding'].includes(row.intake_status)) intakeTotals.failed++;
        }
    }

    return NextResponse.json({
        channels,
        queueStats,
        recentRuns,
        aggregateStats: intakeTotals,
    });
}

export async function POST(req: NextRequest) {
    const cronSecret = req.headers.get('x-cron-secret');
    const isCron = cronSecret === process.env.CRON_SECRET;
    if (!isCron && !(await isAdminUser())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAdminSupabase();
    const body = await req.json();

    switch (body.action) {
        case 'toggle_channel': {
            const { channelId, enabled } = body;
            const { error } = await supabase
                .from('uap_channels')
                .update({ scanner_enabled: enabled })
                .eq('channel_id', channelId);

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ success: true });
        }

        case 'run_audit': {
            try {
                const { data: channels } = await supabase
                    .from('uap_channels')
                    .select('channel_id, channel_name, uploads_playlist_id, subscriber_count')
                    .eq('scanner_enabled', true)
                    .order('channel_name');

                if (!channels || channels.length === 0) {
                    return NextResponse.json({ results: [], totals: { channels: 0, newToImport: 0 } });
                }

                const channelIds = channels.map((c: any) => c.channel_id);
                const existingVideoIds = await getExistingUapVideoIds(supabase, channelIds);

                const results: any[] = [];
                for (const channel of channels) {
                    if (!channel.uploads_playlist_id) continue;
                    try {
                        const discovery = await discoverNewUapVideos(
                            channel.channel_id,
                            channel.uploads_playlist_id,
                            channel.channel_name,
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
                            channelName: channel.channel_name,
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
            try {
                const { data: channels } = await supabase
                    .from('uap_channels')
                    .select('channel_id, channel_name, uploads_playlist_id')
                    .eq('scanner_enabled', true)
                    .order('channel_name');

                if (!channels || channels.length === 0) {
                    return NextResponse.json({ success: true, totalQueued: 0, channels: 0 });
                }

                const allChannelIds = channels.map((c: any) => c.channel_id);
                const existingVideoIds = await getExistingUapVideoIds(supabase, allChannelIds);

                let totalQueued = 0;
                const results: any[] = [];

                for (const channel of channels) {
                    if (!channel.uploads_playlist_id) continue;
                    try {
                        const discovery = await discoverNewUapVideos(
                            channel.channel_id,
                            channel.uploads_playlist_id,
                            channel.channel_name,
                            existingVideoIds,
                            500, 50,
                        );

                        if (discovery.newVideos.length > 0) {
                            const queueItems = discovery.newVideos.map(v => ({
                                video_id: v.videoId,
                                video_url: `https://www.youtube.com/watch?v=${v.videoId}`,
                                channel_id: channel.channel_id,
                                title: v.title || null,
                                duration_seconds: v.duration_seconds ?? null,
                                status: 'pending',
                            }));
                            await supabase
                                .from('uap_scan_queue')
                                .upsert(queueItems, { onConflict: 'video_url', ignoreDuplicates: true });
                            totalQueued += discovery.newVideos.length;
                        }

                        await supabase
                            .from('uap_channels')
                            .update({ last_scanned_at: new Date().toISOString() })
                            .eq('channel_id', channel.channel_id);

                        results.push({ channelId: channel.channel_id, channelName: channel.channel_name, queued: discovery.newVideos.length });
                    } catch (err: any) {
                        results.push({ channelId: channel.channel_id, channelName: channel.channel_name, queued: 0, error: err.message });
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
                const result = await runUapScannerTick(supabase, videosPerTick);
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

        case 'skip_item': {
            const { id } = body;
            if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

            const { error } = await supabase
                .from('uap_scan_queue')
                .update({ status: 'skipped' })
                .eq('id', id);

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ success: true });
        }

        case 'reset_item': {
            const { videoId } = body;
            if (!videoId) return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });

            const { data: vid } = await supabase
                .from('uap_vids')
                .select('video_id, channel_id')
                .eq('video_id', videoId)
                .single();

            await supabase
                .from('uap_vids')
                .update({ intake_status: null, intake_error: null })
                .eq('video_id', videoId);

            await supabase.from('uap_scan_queue').upsert({
                video_id: videoId,
                video_url: `https://www.youtube.com/watch?v=${videoId}`,
                channel_id: vid?.channel_id || null,
                status: 'pending',
                error: null,
                processed_at: null,
                intake_result: null,
            }, { onConflict: 'video_url', ignoreDuplicates: false });

            return NextResponse.json({ success: true });
        }

        case 'add_channel': {
            const { input, enableScanner, track } = body;
            if (!input || typeof input !== 'string') {
                return NextResponse.json({ error: 'Missing or invalid channel input' }, { status: 400 });
            }

            try {
                const channelId = await resolveChannelId(input);
                if (!channelId) {
                    return NextResponse.json({
                        error: `Could not resolve "${input}" to a YouTube channel.`,
                    }, { status: 404 });
                }

                const { data: existing } = await supabase
                    .from('uap_channels')
                    .select('channel_id, channel_name')
                    .eq('channel_id', channelId)
                    .single();

                if (existing) {
                    return NextResponse.json({
                        error: `Channel "${existing.channel_name}" is already in the system.`,
                        existing: true,
                        channel: existing,
                    }, { status: 409 });
                }

                const metadata = await fetchChannelMetadata(channelId);
                if (!metadata) {
                    return NextResponse.json({
                        error: `Channel ID ${channelId} resolved but metadata fetch failed.`,
                    }, { status: 500 });
                }

                const channelRow = {
                    channel_id: metadata.channel_id,
                    channel_name: metadata.name,
                    description: metadata.description,
                    avatar_url: metadata.avatar_url,
                    banner_url: metadata.banner_url,
                    custom_url: metadata.custom_url,
                    subscriber_count: metadata.subscriber_count,
                    total_video_count: metadata.total_video_count,
                    total_view_count: metadata.total_view_count,
                    published_at: metadata.published_at,
                    fetched_at: metadata.fetched_at,
                    uploads_playlist_id: metadata.uploads_playlist_id,
                    scanner_enabled: enableScanner ?? true,
                    track: track || 'mixed',
                };

                const { error: insertError } = await supabase
                    .from('uap_channels')
                    .insert(channelRow);

                if (insertError) {
                    return NextResponse.json({ error: insertError.message }, { status: 500 });
                }

                return NextResponse.json({
                    success: true,
                    channel: channelRow,
                });
            } catch (err: any) {
                return NextResponse.json({ error: err.message }, { status: 500 });
            }
        }

        case 'retry_all_failed': {
            // Bulk re-queue all failed intake videos
            const { data: failedVids, error: fetchErr } = await supabase
                .from('uap_vids')
                .select('video_id, channel_id')
                .eq('intake_status', 'failed');

            if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
            if (!failedVids || failedVids.length === 0) {
                return NextResponse.json({ success: true, count: 0 });
            }

            // Reset intake_status and intake_error for each video
            const videoIds = failedVids.map((v: any) => v.video_id);
            await supabase
                .from('uap_vids')
                .update({ intake_status: null, intake_error: null })
                .in('video_id', videoIds);

            // Re-add to scan queue
            const queueItems = failedVids.map((v: any) => ({
                video_id: v.video_id,
                video_url: `https://www.youtube.com/watch?v=${v.video_id}`,
                channel_id: v.channel_id || null,
                status: 'pending',
                error: null,
                processed_at: null,
                intake_result: null,
            }));
            await supabase
                .from('uap_scan_queue')
                .upsert(queueItems, { onConflict: 'video_url', ignoreDuplicates: false });

            return NextResponse.json({ success: true, count: failedVids.length });
        }

        default:
            return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
}
