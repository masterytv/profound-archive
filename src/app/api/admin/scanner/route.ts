import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { discoverNewVideos, getExistingVideoIds } from '@/lib/scanner/discover';
import { runScannerTick } from '@/lib/scanner/tick';
import { isAdminUser } from '@/lib/auth/admin-guard';
import { resolveChannelId, fetchChannelMetadata } from '@/lib/youtube/scraper';

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

/** Collapse verbose error strings into short, filterable patterns */
function normalizeNdeErrorPattern(error: string): string {
    if (!error) return 'Unknown';
    const e = error.toLowerCase();
    if (e.includes('statement timeout')) return 'Statement Timeout';
    if (e.includes('not found on youtube')) return 'Video Not Found';
    if (e.includes('503')) return 'Server Error (503)';
    if (e.includes('502')) return 'Server Error (502)';
    if (e.includes('region')) return 'Region Restricted';
    if (e.includes('timed out') || e.includes('timeout')) return 'Timeout';
    if (e.includes('transcript unavailable')) return 'Transcript Unavailable';
    if (e.includes('no_captions')) return 'No Captions';
    return error.slice(0, 50);
}

export async function GET(req: NextRequest) {
    // Security: require authenticated admin session
    if (!(await isAdminUser())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAdminSupabase();
    const { searchParams } = new URL(req.url);

    // Queue inspector: paginated + filterable (for /admin/scanner/queue)
    if (searchParams.get('view') === 'queue') {
        const filterStatus = searchParams.get('filter');
        const subFilter = searchParams.get('subFilter');       // intake_result exact match
        const errorFilter = searchParams.get('errorFilter');   // error ILIKE pattern
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get('pageSize') || '50', 10)));
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
            .from('scan_queue')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);

        if (filterStatus && filterStatus !== 'all') {
            query = query.eq('status', filterStatus);
        }
        if (subFilter) {
            query = query.eq('intake_result', subFilter);
        }
        if (errorFilter) {
            query = query.ilike('error', `%${errorFilter}%`);
        }

        const { data: items, count: total, error: sqErr } = await query;
        if (sqErr) return NextResponse.json({ error: sqErr.message }, { status: 500 });

        // Build facets for sub-filter chips
        let facets: { byResult: Record<string, number>; byError: Record<string, number> } = { byResult: {}, byError: {} };
        if (filterStatus && filterStatus !== 'all') {
            const { data: facetRows } = await supabase
                .from('scan_queue')
                .select('intake_result, error')
                .eq('status', filterStatus);

            if (facetRows) {
                for (const row of facetRows) {
                    const r = row.intake_result || '__none__';
                    facets.byResult[r] = (facets.byResult[r] || 0) + 1;

                    if (row.error) {
                        const pattern = normalizeNdeErrorPattern(row.error);
                        facets.byError[pattern] = (facets.byError[pattern] || 0) + 1;
                    }
                }
            }
        }

        // Status tab badge counts
        const statuses = ['pending', 'processing', 'complete', 'failed', 'skipped'];
        const statusCounts: Record<string, number> = {};
        await Promise.all(statuses.map(async (s) => {
            const { count } = await supabase
                .from('scan_queue')
                .select('*', { count: 'exact', head: true })
                .eq('status', s);
            statusCounts[s] = count ?? 0;
        }));

        return NextResponse.json({
            items: items || [],
            total: total ?? 0,
            page,
            pageSize,
            facets,
            statusCounts,
        });
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

    // Get queue stats using server-side COUNT per status.
    // Why: Fetching all rows and counting in JS breaks above 1000 rows (Supabase default limit).
    // { count: 'exact', head: true } sends a HEAD request — zero row data transferred.
    const countByStatus = async (status: string) => {
        const { count } = await supabase
            .from('scan_queue')
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
    // Security: require either authenticated admin session OR valid CRON_SECRET
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
                                title: v.title || null,
                                duration_seconds: v.duration_seconds ?? null,
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

        case 'batch_retry_filtered': {
            // Retry a filtered subset of failed/skipped items
            const { status: targetStatus, intakeResult, errorPattern } = body;
            if (!targetStatus || !['failed', 'skipped'].includes(targetStatus)) {
                return NextResponse.json({ error: 'status must be "failed" or "skipped"' }, { status: 400 });
            }

            let matchQuery = supabase
                .from('scan_queue')
                .select('id, video_id, channel_id')
                .eq('status', targetStatus);

            if (intakeResult) {
                matchQuery = matchQuery.eq('intake_result', intakeResult);
            }
            if (errorPattern) {
                matchQuery = matchQuery.ilike('error', `%${errorPattern}%`);
            }

            const { data: matchingItems, error: matchErr } = await matchQuery;
            if (matchErr) return NextResponse.json({ error: matchErr.message }, { status: 500 });
            if (!matchingItems || matchingItems.length === 0) {
                return NextResponse.json({ success: true, count: 0 });
            }

            // Reset queue rows to pending (batch in groups of 100)
            const matchIds = matchingItems.map((s: any) => s.id);
            for (let i = 0; i < matchIds.length; i += 100) {
                const batch = matchIds.slice(i, i + 100);
                await supabase
                    .from('scan_queue')
                    .update({
                        status: 'pending',
                        error: null,
                        processed_at: null,
                        intake_result: null,
                    })
                    .in('id', batch);
            }

            // Also reset corresponding nde_vids rows
            const matchVideoIds = matchingItems.map((s: any) => s.video_id).filter(Boolean);
            if (matchVideoIds.length > 0) {
                for (let i = 0; i < matchVideoIds.length; i += 100) {
                    const batch = matchVideoIds.slice(i, i + 100);
                    await supabase
                        .from('nde_vids')
                        .update({ intake_status: null, intake_error: null, intake_completed_at: null })
                        .in('"videoId"', batch);
                }
            }

            return NextResponse.json({ success: true, count: matchingItems.length });
        }

        case 'add_channel': {
            // Add a new channel by YouTube URL, @handle, or channel ID
            const { input, enableScanner } = body;
            if (!input || typeof input !== 'string') {
                return NextResponse.json({ error: 'Missing or invalid channel input' }, { status: 400 });
            }

            try {
                // Step 1: Resolve input → channel_id
                const channelId = await resolveChannelId(input);
                if (!channelId) {
                    return NextResponse.json({
                        error: `Could not resolve "${input}" to a YouTube channel. Try a @handle, channel URL, or channel ID.`,
                    }, { status: 404 });
                }

                // Step 2: Check if channel already exists
                const { data: existing } = await supabase
                    .from('channels')
                    .select('channel_id, name')
                    .eq('channel_id', channelId)
                    .single();

                if (existing) {
                    return NextResponse.json({
                        error: `Channel "${existing.name}" is already in the system.`,
                        existing: true,
                        channel: existing,
                    }, { status: 409 });
                }

                // Step 3: Fetch full metadata from YouTube
                const metadata = await fetchChannelMetadata(channelId);
                if (!metadata) {
                    return NextResponse.json({
                        error: `Channel ID ${channelId} resolved but metadata fetch failed.`,
                    }, { status: 500 });
                }

                // Step 4: Insert into channels table
                const channelRow = {
                    channel_id: metadata.channel_id,
                    name: metadata.name,
                    description: metadata.description,
                    avatar_url: metadata.avatar_url,
                    banner_url: metadata.banner_url,
                    custom_url: metadata.custom_url,
                    country: metadata.country,
                    subscriber_count: metadata.subscriber_count,
                    total_video_count: metadata.total_video_count,
                    total_view_count: metadata.total_view_count,
                    published_at: metadata.published_at,
                    fetched_at: metadata.fetched_at,
                    uploads_playlist_id: metadata.uploads_playlist_id,
                    scanner_enabled: enableScanner ?? true,
                };

                const { error: insertError } = await supabase
                    .from('channels')
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

        default:
            return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
}
