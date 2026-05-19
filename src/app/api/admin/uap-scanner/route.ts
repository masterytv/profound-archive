import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { discoverNewUapVideos, getExistingUapVideoIds } from '@/lib/scanner/uap-discover';
import { runUapScannerTick } from '@/lib/scanner/uap-tick';
import { runUapPlaylistDiscoverTick, resolvePlaylistMetadata, extractPlaylistId } from '@/lib/scanner/uap-playlist-discover';
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

/** Collapse verbose error strings into short, filterable patterns */
function normalizeErrorPattern(error: string): string {
    if (!error) return 'Unknown';
    const e = error.toLowerCase();
    if (e.includes('503')) return 'Server Error (503)';
    if (e.includes('502')) return 'Server Error (502)';
    if (e.includes('not found on youtube')) return 'Video Not Found';
    if (e.includes('region')) return 'Region Restricted';
    if (e.includes('age-restricted') || e.includes('age restricted')) return 'Age Restricted';
    if (e.includes('membership') || e.includes('members')) return 'Members Only';
    if (e.includes('live stream') || e.includes('live strea')) return 'Live Stream';
    if (e.includes('timed out') || e.includes('timeout')) return 'Timeout';
    if (e.includes('transcript unavailable')) return 'Transcript Unavailable';
    if (e.includes('is_short')) return 'Too Short';
    // Truncate anything else to first 40 chars
    return error.slice(0, 40);
}

export async function GET(req: NextRequest) {
    if (!(await isAdminUser())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAdminSupabase();
    const { searchParams } = new URL(req.url);

    // Scan queue inspector: paginated + filterable (for /admin/uap/scanner/queue)
    if (searchParams.get('view') === 'scan_queue') {
        const filterStatus = searchParams.get('filter');
        const subFilter = searchParams.get('subFilter');       // intake_result exact match
        const errorFilter = searchParams.get('errorFilter');   // error ILIKE pattern
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get('pageSize') || '50', 10)));
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
            .from('uap_scan_queue')
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

        // Build facets: count breakdowns by intake_result and error pattern for current status
        // Only compute when viewing a specific status (not "all") to keep it fast
        let facets: { byResult: Record<string, number>; byError: Record<string, number> } = { byResult: {}, byError: {} };
        if (filterStatus && filterStatus !== 'all') {
            const { data: facetRows } = await supabase
                .from('uap_scan_queue')
                .select('intake_result, error')
                .eq('status', filterStatus);

            if (facetRows) {
                for (const row of facetRows) {
                    const r = row.intake_result || '__none__';
                    facets.byResult[r] = (facets.byResult[r] || 0) + 1;

                    if (row.error) {
                        const pattern = normalizeErrorPattern(row.error);
                        facets.byError[pattern] = (facets.byError[pattern] || 0) + 1;
                    }
                }
            }
        }

        // Get total counts per status for tab badges
        const countByStatusForTabs = async () => {
            const statuses = ['pending', 'processing', 'complete', 'failed', 'skipped'];
            const counts: Record<string, number> = {};
            await Promise.all(statuses.map(async (s) => {
                const { count } = await supabase
                    .from('uap_scan_queue')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', s);
                counts[s] = count ?? 0;
            }));
            return counts;
        };
        const statusCounts = await countByStatusForTabs();

        return NextResponse.json({
            items: items || [],
            total: total ?? 0,
            page,
            pageSize,
            facets,
            statusCounts,
        });
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
        .select('channel_id, channel_name, avatar_url, custom_url, subscriber_count, total_video_count, scanner_enabled, last_scanned_at, uploads_playlist_id, track')
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
        .select('channel_id, intake_status')
        .not('intake_status', 'is', null);

    const intakeTotals = { accepted: 0, rejected: 0, failed: 0 };
    const channelAddedCounts = new Map<string, number>();

    if (uapVidCounts) {
        for (const row of uapVidCounts) {
            if (row.intake_status === 'complete') {
                intakeTotals.accepted++;
                if (row.channel_id) {
                    channelAddedCounts.set(row.channel_id, (channelAddedCounts.get(row.channel_id) || 0) + 1);
                }
            }
            else if (row.intake_status === 'out_of_scope') intakeTotals.rejected++;
            else if (['failed', 'no_captions', 'drm_protected', 'embedding'].includes(row.intake_status)) intakeTotals.failed++;
        }
    }

    // Sprint 8: Fetch playlists with scanner info
    const { data: playlists, error: playlistError } = await supabase
        .from('uap_playlists')
        .select('playlist_id, playlist_title, channel_id, channel_name, track, priority, scanner_enabled, last_scanned_at, video_count')
        .order('playlist_title');

    // Sprint 8: Fetch keyword monitors
    const { data: keywordMonitors, error: kwError } = await supabase
        .from('uap_keyword_monitors')
        .select('id, channel_id, channel_name, search_terms, scanner_enabled, last_scanned_at, priority, videos_found')
        .order('channel_name');

    // Sprint 8: Build channel-in-scanner lookup for playlists
    const enabledChannelIds = new Set(
        (channels || []).filter((c: any) => c.scanner_enabled).map((c: any) => c.channel_id)
    );

    // Sprint 8: Add playlist queue counts
    const playlistsWithCounts = await Promise.all(
        (playlists || []).map(async (p: any) => {
            const [
                { count: pending_count },
                { count: processed_count }
            ] = await Promise.all([
                supabase.from('uap_scan_queue').select('*', { count: 'exact', head: true }).eq('source_type', 'playlist').eq('source_id', p.playlist_id).eq('status', 'pending'),
                supabase.from('uap_scan_queue').select('*', { count: 'exact', head: true }).eq('source_type', 'playlist').eq('source_id', p.playlist_id).neq('status', 'pending')
            ]);

            return {
                ...p,
                pending_count: pending_count ?? 0,
                processed_count: processed_count ?? 0,
                added_count: p.channel_id ? (channelAddedCounts.get(p.channel_id) || 0) : 0,
                channel_in_scanner: p.channel_id ? enabledChannelIds.has(p.channel_id) : false,
            };
        })
    );

    const channelsWithCounts = await Promise.all(
        (channels || []).map(async (c: any) => {
            const [
                { count: pending_count },
                { count: processed_count }
            ] = await Promise.all([
                supabase.from('uap_scan_queue').select('*', { count: 'exact', head: true }).eq('channel_id', c.channel_id).in('source_type', ['channel', null]).eq('status', 'pending'),
                supabase.from('uap_scan_queue').select('*', { count: 'exact', head: true }).eq('channel_id', c.channel_id).in('source_type', ['channel', null]).neq('status', 'pending')
            ]);

            return {
                ...c,
                pending_count: pending_count ?? 0,
                processed_count: processed_count ?? 0,
                added_count: channelAddedCounts.get(c.channel_id) || 0,
                video_count: c.total_video_count ?? 0,
            };
        })
    );

    return NextResponse.json({
        channels: channelsWithCounts,
        playlists: playlistsWithCounts,
        keywordMonitors: keywordMonitors || [],
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

        case 'retry_all_skipped': {
            // Bulk re-queue all skipped scan queue items (mostly no_captions false negatives)
            const { data: skippedItems, error: skipFetchErr } = await supabase
                .from('uap_scan_queue')
                .select('id, video_id, channel_id')
                .eq('status', 'skipped');

            if (skipFetchErr) return NextResponse.json({ error: skipFetchErr.message }, { status: 500 });
            if (!skippedItems || skippedItems.length === 0) {
                return NextResponse.json({ success: true, count: 0 });
            }

            // Reset queue rows to pending
            const skippedIds = skippedItems.map((s: any) => s.id);
            await supabase
                .from('uap_scan_queue')
                .update({
                    status: 'pending',
                    error: null,
                    processed_at: null,
                    intake_result: null,
                })
                .in('id', skippedIds);

            // Also reset any uap_vids rows that were written with no_captions / drm_protected
            const skippedVideoIds = skippedItems.map((s: any) => s.video_id).filter(Boolean);
            if (skippedVideoIds.length > 0) {
                await supabase
                    .from('uap_vids')
                    .update({ intake_status: null, intake_error: null })
                    .in('video_id', skippedVideoIds)
                    .in('intake_status', ['no_captions', 'drm_protected', 'is_short', 'out_of_scope']);
            }

            return NextResponse.json({ success: true, count: skippedItems.length });
        }

        case 'batch_retry_filtered': {
            // Retry a filtered subset of failed/skipped items
            const { status: targetStatus, intakeResult, errorPattern } = body;
            if (!targetStatus || !['failed', 'skipped'].includes(targetStatus)) {
                return NextResponse.json({ error: 'status must be "failed" or "skipped"' }, { status: 400 });
            }

            // Build query to find matching items
            let matchQuery = supabase
                .from('uap_scan_queue')
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

            // Reset queue rows to pending
            const matchIds = matchingItems.map((s: any) => s.id);
            // Supabase .in() has a 100-item limit per call, batch if needed
            for (let i = 0; i < matchIds.length; i += 100) {
                const batch = matchIds.slice(i, i + 100);
                await supabase
                    .from('uap_scan_queue')
                    .update({
                        status: 'pending',
                        error: null,
                        processed_at: null,
                        intake_result: null,
                    })
                    .in('id', batch);
            }

            // Also reset corresponding uap_vids rows
            const matchVideoIds = matchingItems.map((s: any) => s.video_id).filter(Boolean);
            if (matchVideoIds.length > 0) {
                for (let i = 0; i < matchVideoIds.length; i += 100) {
                    const batch = matchVideoIds.slice(i, i + 100);
                    await supabase
                        .from('uap_vids')
                        .update({ intake_status: null, intake_error: null })
                        .in('video_id', batch);
                }
            }

            return NextResponse.json({ success: true, count: matchingItems.length });
        }

        // ─── Sprint 8: Playlist actions ─────────────────────────────────

        case 'run_playlist_tick': {
            try {
                const result = await runUapPlaylistDiscoverTick(supabase);
                return NextResponse.json({ success: true, ...result });
            } catch (err: any) {
                return NextResponse.json({ error: err.message }, { status: 500 });
            }
        }

        case 'audit_playlists': {
            try {
                const { data: pls } = await supabase
                    .from('uap_playlists')
                    .select('playlist_id, playlist_title, channel_id, channel_name, priority')
                    .eq('scanner_enabled', true)
                    .order('playlist_title');

                if (!pls || pls.length === 0) {
                    return NextResponse.json({ success: true, playlists: 0, totalNew: 0, results: [] });
                }

                const existingVideoIds = await getExistingUapVideoIds(supabase);
                const { data: queuedVids } = await supabase.from('uap_scan_queue').select('video_id');
                if (queuedVids) {
                    for (const qv of queuedVids) { if (qv.video_id) existingVideoIds.add(qv.video_id); }
                }

                let totalNew = 0;
                const results: any[] = [];

                for (const pl of pls) {
                    try {
                        const discovery = await discoverNewUapVideos(
                            pl.channel_id || 'unknown', pl.playlist_id, pl.playlist_title,
                            existingVideoIds, 50, 50,
                        );
                        totalNew += discovery.newVideos.length;
                        results.push({
                            playlistId: pl.playlist_id,
                            playlistTitle: pl.playlist_title,
                            channelName: pl.channel_name,
                            totalFetched: discovery.totalFetched,
                            newToImport: discovery.newVideos.length,
                            alreadyInDb: discovery.alreadyInDb,
                        });
                        // Add discovered IDs to prevent cross-playlist double-counting
                        for (const v of discovery.newVideos) { existingVideoIds.add(v.videoId); }
                    } catch (err: any) {
                        results.push({ playlistId: pl.playlist_id, playlistTitle: pl.playlist_title, error: err.message });
                    }
                }

                return NextResponse.json({ success: true, playlists: pls.length, totalNew, results });
            } catch (err: any) {
                return NextResponse.json({ error: err.message }, { status: 500 });
            }
        }

        case 'add_playlist': {
            const { input: plInput, track: plTrack, priority: plPriority } = body;
            if (!plInput || typeof plInput !== 'string') {
                return NextResponse.json({ error: 'Missing or invalid playlist input' }, { status: 400 });
            }

            try {
                const playlistId = extractPlaylistId(plInput);
                if (!playlistId) {
                    return NextResponse.json({ error: `Could not extract playlist ID from "${plInput}"` }, { status: 400 });
                }

                // Check if already exists
                const { data: existingPl } = await supabase
                    .from('uap_playlists')
                    .select('playlist_id, playlist_title')
                    .eq('playlist_id', playlistId)
                    .single();

                if (existingPl) {
                    return NextResponse.json({
                        error: `Playlist "${existingPl.playlist_title}" is already in the system.`,
                        existing: true,
                    }, { status: 409 });
                }

                // Resolve metadata from YouTube
                const meta = await resolvePlaylistMetadata(playlistId);
                if (!meta) {
                    return NextResponse.json({ error: `Playlist ID ${playlistId} not found on YouTube.` }, { status: 404 });
                }

                const playlistRow = {
                    playlist_id: meta.playlistId,
                    playlist_title: meta.title,
                    channel_id: meta.channelId,
                    channel_name: meta.channelName,
                    track: plTrack || 'mixed',
                    priority: plPriority ?? 1,
                    scanner_enabled: true,
                    video_count: meta.videoCount,
                };

                const { error: insertErr } = await supabase
                    .from('uap_playlists')
                    .insert(playlistRow);

                if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

                return NextResponse.json({ success: true, playlist: playlistRow });
            } catch (err: any) {
                return NextResponse.json({ error: err.message }, { status: 500 });
            }
        }

        case 'toggle_playlist': {
            const { playlistId: plId, enabled: plEnabled } = body;
            const { error } = await supabase
                .from('uap_playlists')
                .update({ scanner_enabled: plEnabled })
                .eq('playlist_id', plId);

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ success: true });
        }

        case 'remove_playlist': {
            const { playlistId: rmPlId } = body;
            if (!rmPlId) return NextResponse.json({ error: 'Missing playlistId' }, { status: 400 });

            const { error } = await supabase
                .from('uap_playlists')
                .delete()
                .eq('playlist_id', rmPlId);

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ success: true });
        }

        case 'discover_all_playlists': {
            try {
                const { data: pls } = await supabase
                    .from('uap_playlists')
                    .select('playlist_id, playlist_title, channel_id, channel_name, priority')
                    .eq('scanner_enabled', true)
                    .order('playlist_title');

                if (!pls || pls.length === 0) {
                    return NextResponse.json({ success: true, totalQueued: 0, playlists: 0 });
                }

                const existingVideoIds = await getExistingUapVideoIds(supabase);

                // Also exclude already-queued videos
                const { data: queuedVids } = await supabase
                    .from('uap_scan_queue')
                    .select('video_id');
                if (queuedVids) {
                    for (const qv of queuedVids) {
                        if (qv.video_id) existingVideoIds.add(qv.video_id);
                    }
                }

                let totalQueued = 0;
                const results: any[] = [];

                for (const pl of pls) {
                    try {
                        const discovery = await discoverNewUapVideos(
                            pl.channel_id || 'unknown',
                            pl.playlist_id,
                            pl.playlist_title,
                            existingVideoIds,
                            50, 50,
                        );

                        if (discovery.newVideos.length > 0) {
                            const plQueueItems = discovery.newVideos.map(v => ({
                                video_id: v.videoId,
                                video_url: `https://www.youtube.com/watch?v=${v.videoId}`,
                                channel_id: pl.channel_id || null,
                                title: v.title || null,
                                duration_seconds: v.duration_seconds ?? null,
                                status: 'pending',
                                source_type: 'playlist',
                                source_id: pl.playlist_id,
                                priority: pl.priority ?? 1,
                            }));
                            await supabase
                                .from('uap_scan_queue')
                                .upsert(plQueueItems, { onConflict: 'video_url', ignoreDuplicates: true });
                            totalQueued += discovery.newVideos.length;

                            // Add to existing set to prevent cross-playlist duplication
                            for (const v of discovery.newVideos) {
                                existingVideoIds.add(v.videoId);
                            }
                        }

                        await supabase
                            .from('uap_playlists')
                            .update({
                                last_scanned_at: new Date().toISOString(),
                                video_count: discovery.totalFetched,
                            })
                            .eq('playlist_id', pl.playlist_id);

                        results.push({
                            playlistId: pl.playlist_id,
                            playlistTitle: pl.playlist_title,
                            queued: discovery.newVideos.length,
                        });
                    } catch (err: any) {
                        results.push({
                            playlistId: pl.playlist_id,
                            playlistTitle: pl.playlist_title,
                            queued: 0,
                            error: err.message,
                        });
                    }
                }

                return NextResponse.json({ success: true, totalQueued, playlists: pls.length, results });
            } catch (err: any) {
                return NextResponse.json({ error: err.message }, { status: 500 });
            }
        }

        // ─── Sprint 8: Keyword monitor actions ──────────────────────────

        case 'add_keyword_monitor': {
            const { channelInput, searchTerms, priority: kwPriority } = body;
            if (!channelInput || !searchTerms || !Array.isArray(searchTerms) || searchTerms.length === 0) {
                return NextResponse.json({ error: 'Missing channelInput or searchTerms array' }, { status: 400 });
            }

            try {
                const kwChannelId = await resolveChannelId(channelInput);
                if (!kwChannelId) {
                    return NextResponse.json({ error: `Could not resolve "${channelInput}" to a channel.` }, { status: 404 });
                }

                const kwMetadata = await fetchChannelMetadata(kwChannelId);
                const { error: kwInsertErr } = await supabase
                    .from('uap_keyword_monitors')
                    .insert({
                        channel_id: kwChannelId,
                        channel_name: kwMetadata?.name || channelInput,
                        search_terms: searchTerms,
                        priority: kwPriority ?? 2,
                        scanner_enabled: false, // Disabled by default — expensive API
                    });

                if (kwInsertErr) return NextResponse.json({ error: kwInsertErr.message }, { status: 500 });
                return NextResponse.json({
                    success: true,
                    channel_name: kwMetadata?.name || channelInput,
                    note: 'Keyword monitor created but disabled by default. Enable only when channel/playlist scans are no longer adding new videos daily.',
                });
            } catch (err: any) {
                return NextResponse.json({ error: err.message }, { status: 500 });
            }
        }

        case 'toggle_keyword_monitor': {
            const { monitorId, enabled: kwEnabled } = body;
            const { error } = await supabase
                .from('uap_keyword_monitors')
                .update({ scanner_enabled: kwEnabled })
                .eq('id', monitorId);

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ success: true });
        }

        case 'remove_keyword_monitor': {
            const { monitorId: rmKwId } = body;
            if (!rmKwId) return NextResponse.json({ error: 'Missing monitorId' }, { status: 400 });

            const { error } = await supabase
                .from('uap_keyword_monitors')
                .delete()
                .eq('id', rmKwId);

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ success: true });
        }

        // ─── Sprint 8: Single video submission ──────────────────────────

        case 'add_single_video': {
            const { videoUrl } = body;
            if (!videoUrl || typeof videoUrl !== 'string') {
                return NextResponse.json({ error: 'Missing or invalid videoUrl' }, { status: 400 });
            }

            try {
                // Extract video ID from URL
                let videoId = '';
                try {
                    const urlObj = new URL(videoUrl);
                    videoId = urlObj.searchParams.get('v')
                        || urlObj.pathname.split('/').pop()
                        || '';
                } catch {
                    // Try treating as raw video ID
                    videoId = videoUrl.trim();
                }

                if (!videoId || videoId.length < 5) {
                    return NextResponse.json({ error: 'Could not extract video ID from URL' }, { status: 400 });
                }

                // Check if already in queue or DB
                const { data: existingQueue } = await supabase
                    .from('uap_scan_queue')
                    .select('id, status')
                    .eq('video_id', videoId)
                    .single();

                if (existingQueue) {
                    return NextResponse.json({
                        error: `Video ${videoId} is already in the queue (status: ${existingQueue.status})`,
                        existing: true,
                    }, { status: 409 });
                }

                const { data: existingVid } = await supabase
                    .from('uap_vids')
                    .select('video_id, title')
                    .eq('video_id', videoId)
                    .single();

                if (existingVid) {
                    return NextResponse.json({
                        error: `Video "${existingVid.title || videoId}" is already in the database`,
                        existing: true,
                    }, { status: 409 });
                }

                // Insert into queue with highest priority
                const { error: svQueueErr } = await supabase
                    .from('uap_scan_queue')
                    .insert({
                        video_url: `https://www.youtube.com/watch?v=${videoId}`,
                        video_id: videoId,
                        status: 'pending',
                        source_type: 'manual',
                        priority: 1,
                    });

                if (svQueueErr) return NextResponse.json({ error: svQueueErr.message }, { status: 500 });
                return NextResponse.json({ success: true, videoId });
            } catch (err: any) {
                return NextResponse.json({ error: err.message }, { status: 500 });
            }
        }

        default:
            return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
}
