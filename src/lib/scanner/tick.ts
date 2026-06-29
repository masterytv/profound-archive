'use strict';

/**
 * Scanner Tick Orchestrator
 *
 * Provides four exported functions:
 *
 * - runDiscoverTick(supabase)
 *     Pick the least-recently-scanned channel, discover new videos, and queue
 *     them in scan_queue. Fast (~5-10s). Kept for manual/admin use.
 *
 * - runDiscoverAllChannels(supabase)
 *     Scan ALL scanner-enabled channels in one pass and queue new videos.
 *     Called once daily at 3am ET via pg_cron → /api/scanner/discover-all.
 *     Takes ~1-3 minutes for 47 channels. Well within Firebase 600s timeout.
 *
 * - runProcessTick(supabase, count)
 *     Pull `count` videos from the pending queue and run each through the full
 *     14-step intake pipeline. Can be slow (300-465s per video). Called every
 *     10 minutes with count=1 to stay under the curl timeout.
 *
 * - runScannerTick(supabase, videosPerTick)
 *     Legacy combined wrapper — calls runDiscoverTick then runProcessTick.
 *     Used by the admin panel's manual trigger and /api/scanner/tick.
 */

import { discoverNewVideos, getExistingVideoIds } from './discover';
import { processVideoIntake } from '../pipeline/intake';
import { isPaused } from '../ops/switches';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface DiscoverResult {
    channel: { id: string; name: string } | null;
    discovered: number;
    queued: number;
    durationMs: number;
}

export interface ProcessedVideo {
    videoId: string;
    url: string;
    status: string;
    isNde: string | null;
    error: string | null;
}

export interface ProcessResult {
    processed: ProcessedVideo[];
    durationMs: number;
}

export interface TickResult {
    channel: { id: string; name: string } | null;
    discovered: number;
    queued: number;
    processed: ProcessedVideo[];
    totalDurationMs: number;
}

// ---------------------------------------------------------------------------
// runDiscoverTick — channel scan + queue population only
// ---------------------------------------------------------------------------

/**
 * Pick the least-recently-scanned scanner-enabled channel, discover new
 * videos, and add them to scan_queue. No video processing happens here.
 */
export async function runDiscoverTick(supabase: any): Promise<DiscoverResult> {
    const startTime = Date.now();

    // Cost kill-switch: honored by every caller (HTTP route, Oracle cron, pm2).
    if (await isPaused('video_ingestion')) {
        console.log('[scanner] runDiscoverTick skipped — video_ingestion paused');
        return { channel: null, discovered: 0, queued: 0, durationMs: 0 };
    }

    // Pick the next channel to scan (least recently scanned)
    const { data: channels, error: channelError } = await supabase
        .from('channels')
        .select('channel_id, name, uploads_playlist_id')
        .eq('scanner_enabled', true)
        .order('last_scanned_at', { ascending: true, nullsFirst: true })
        .limit(1);

    if (channelError) throw new Error(`Channel fetch: ${channelError.message}`);

    const channel = channels?.[0];

    let discovered = 0;
    let queued = 0;

    if (channel && channel.uploads_playlist_id) {
        try {
            const existingIds = await getExistingVideoIds(supabase, [channel.channel_id]);

            // Also exclude videos already in the queue
            const { data: queuedVideos } = await supabase
                .from('scan_queue')
                .select('video_id')
                .eq('channel_id', channel.channel_id);

            if (queuedVideos) {
                for (const qv of queuedVideos) {
                    if (qv.video_id) existingIds.add(qv.video_id);
                }
            }

            // Discover new videos (cap at 3 pages = 150 videos per tick scan)
            const discovery = await discoverNewVideos(
                channel.channel_id,
                channel.uploads_playlist_id,
                channel.name,
                existingIds,
                50,
                3,
            );

            discovered = discovery.newVideos.length;

            if (discovery.newVideos.length > 0) {
                const queueItems = discovery.newVideos.map((v) => ({
                    video_url: `https://www.youtube.com/watch?v=${v.videoId}`,
                    video_id: v.videoId,
                    channel_id: channel.channel_id,
                    title: v.title || null,
                    duration_seconds: v.duration_seconds ?? null,
                    status: 'pending',
                }));

                // Insert in batches, ignoring duplicates
                for (const item of queueItems) {
                    const { error: insertError } = await supabase
                        .from('scan_queue')
                        .upsert(item, { onConflict: 'video_url', ignoreDuplicates: true });

                    if (!insertError) queued++;
                }
            }

        } catch (err: any) {
            console.error(`Discovery error for ${channel.name}:`, err.message);
            await supabase.from('scan_runs').insert({
                channel_id: channel.channel_id,
                run_type: 'discover',
                completed_at: new Date().toISOString(),
                videos_discovered: 0,
                error: err.message,
            });
        }
    } else if (channel && !channel.uploads_playlist_id) {
        // Warn about missing playlist ID — don't let it block the queue
        console.warn(`[Scanner/Discover] ⚠️ Channel "${channel.name}" has no uploads_playlist_id — skipping but advancing queue`);
    }

    // ALWAYS update last_scanned_at so we don't get stuck on the same channel
    // (head-of-line blocking fix: even channels without playlist IDs advance the queue)
    if (channel) {
        await supabase
            .from('channels')
            .update({ last_scanned_at: new Date().toISOString() })
            .eq('channel_id', channel.channel_id);
    }

    await supabase.from('scan_runs').insert({
        channel_id: channel?.channel_id || null,
        run_type: 'discover',
        completed_at: new Date().toISOString(),
        videos_discovered: discovered,
        videos_processed: 0,
        videos_accepted: 0,
        videos_rejected: 0,
        videos_failed: 0,
    });

    console.log(`[Scanner/Discover] ${channel?.name ?? 'no channel'}: ${discovered} discovered, ${queued} queued (${Date.now() - startTime}ms)`);

    return {
        channel: channel ? { id: channel.channel_id, name: channel.name } : null,
        discovered,
        queued,
        durationMs: Date.now() - startTime,
    };
}

// ---------------------------------------------------------------------------
// runProcessTick — queue processing only
// ---------------------------------------------------------------------------

/**
 * Pull up to `videosPerTick` meaningful videos from the pending scan_queue
 * and run each through the full intake pipeline.
 *
 * "Meaningful" = classified by AI (accepted, rejected, failed).
 * "Skipped"    = no_captions or already_exists — pulled from queue but not
 *                counted toward the limit; the next item is tried immediately.
 *
 * Max total attempts = videosPerTick × 5 to prevent runaway loops.
 *
 * IMPORTANT: Keep videosPerTick=1 when called from the 10-minute cron to
 * stay under Cloudflare's 100s connection timeout.
 */
export async function runProcessTick(
    supabase: any,
    videosPerTick: number = 1,
): Promise<ProcessResult> {
    const startTime = Date.now();

    // Cost kill-switch: honored by every caller (HTTP route, Oracle cron, pm2).
    if (await isPaused('video_analysis')) {
        console.log('[scanner] runProcessTick skipped — video_analysis paused');
        return { processed: [], durationMs: 0 };
    }

    const processed: ProcessedVideo[] = [];
    let meaningfulCount = 0;
    let totalAttempts = 0;
    const maxAttempts = videosPerTick * 5;

    const touchedIds = new Set<number>();
    const touchedChannelIds = new Set<string>();

    while (meaningfulCount < videosPerTick && totalAttempts < maxAttempts) {
        // Round-robin: sample pending rows, pick a random untouched channel
        const { data: pendingRows } = await supabase
            .from('scan_queue')
            .select('channel_id')
            .eq('status', 'pending')
            .limit(500);

        if (!pendingRows || pendingRows.length === 0) break;

        const channelIds: string[] = [...new Set<string>(
            pendingRows.map((r: any) => r.channel_id).filter((id: any): id is string => typeof id === 'string')
        )];
        const untouchedChannels = channelIds.filter(id => !touchedChannelIds.has(id));
        const poolToPickFrom = untouchedChannels.length > 0 ? untouchedChannels : channelIds;
        const pickedChannelId = poolToPickFrom[Math.floor(Math.random() * poolToPickFrom.length)];

        const { data: items, error: queueError } = await supabase
            .from('scan_queue')
            .select('id, video_url, video_id, channel_id')
            .eq('status', 'pending')
            .eq('channel_id', pickedChannelId)
            .order('created_at', { ascending: true })
            .limit(1);

        touchedChannelIds.add(pickedChannelId);

        if (queueError) throw new Error(`Queue fetch: ${queueError.message}`);
        if (!items || items.length === 0) continue;

        const item = items[0];

        if (touchedIds.has(item.id)) break;
        touchedIds.add(item.id);
        totalAttempts++;

        await supabase
            .from('scan_queue')
            .update({ status: 'processing' })
            .eq('id', item.id);

        let finalStatus: string;
        let intakeStatus: string;
        let resultError: string | null = null;
        let isNde: string | null = null;

        try {
            const result = await processVideoIntake(item.video_url);
            intakeStatus = result.status;
            isNde = result.classification?.isNde_value || null;

            const isSkipped = result.status === 'no_captions' || result.status === 'already_exists';

            finalStatus = (result.status === 'complete' || result.status === 'already_exists')
                ? 'complete'
                : (result.status === 'not_profound' || result.status === 'no_captions')
                    ? 'skipped'
                    : 'failed';

            resultError = result.error
                || (finalStatus === 'failed' ? `Intake returned status: ${result.status}` : null);

            if (finalStatus === 'failed') {
                console.error(`[Scanner/Process] Video ${item.video_id} failed:`, resultError);
            }

            if (isSkipped) {
                console.log(`[Scanner/Process] Skipped ${item.video_id} (${result.status}) — pulling next`);
            } else {
                meaningfulCount++;
            }

        } catch (err: any) {
            const errorMsg = err.message || String(err);
            console.error(`[Scanner/Process] Video ${item.video_id} threw error:`, errorMsg);
            finalStatus = 'failed';
            intakeStatus = 'failed';
            resultError = errorMsg;
            meaningfulCount++;
        }

        await supabase
            .from('scan_queue')
            .update({
                status: finalStatus,
                processed_at: new Date().toISOString(),
                intake_result: intakeStatus,
                error: resultError,
            })
            .eq('id', item.id);

        processed.push({
            videoId: item.video_id,
            url: item.video_url,
            status: intakeStatus,
            isNde,
            error: resultError,
        });

        console.log(`[Scanner/Process] Progress: ${meaningfulCount}/${videosPerTick} meaningful (${totalAttempts}/${maxAttempts} attempts)`);
    }

    // Log to scan_runs
    const accepted = processed.filter((p) => p.isNde === 'clear_nde' || p.isNde === 'possible_nde').length;
    const rejected = processed.filter((p) => p.isNde === 'not_nde').length;
    const failed = processed.filter((p) => p.status === 'failed').length;

    await supabase.from('scan_runs').insert({
        channel_id: null, // process tick is not tied to a specific channel
        run_type: 'process',
        completed_at: new Date().toISOString(),
        videos_discovered: 0,
        videos_processed: processed.length,
        videos_accepted: accepted,
        videos_rejected: rejected,
        videos_failed: failed,
    });

    console.log(`[Scanner/Process] Done: ${accepted} accepted, ${rejected} rejected, ${failed} failed (${Date.now() - startTime}ms)`);

    return {
        processed,
        durationMs: Date.now() - startTime,
    };
}

// ---------------------------------------------------------------------------
// runDiscoverAllChannels — daily full-sweep discovery (3am ET via pg_cron)
// ---------------------------------------------------------------------------

export interface DiscoverAllResult {
    channelsScanned: number;
    channelsWithNewVideos: number;
    totalDiscovered: number;
    totalQueued: number;
    durationMs: number;
    perChannel: Array<{ id: string; name: string; discovered: number; queued: number }>;
}

/**
 * Scan ALL scanner-enabled channels for new videos and queue them.
 * Runs sequentially to avoid YouTube API rate limits.
 * Called once daily at 3am ET via pg_cron → /api/scanner/discover-all.
 */
export async function runDiscoverAllChannels(supabase: any): Promise<DiscoverAllResult> {
    const startTime = Date.now();

    // Cost kill-switch: honored by every caller (HTTP route, Oracle cron, pm2).
    if (await isPaused('video_ingestion')) {
        console.log('[scanner] runDiscoverAllChannels skipped — video_ingestion paused');
        return { channelsScanned: 0, channelsWithNewVideos: 0, totalDiscovered: 0, totalQueued: 0, durationMs: 0, perChannel: [] };
    }

    const { data: channels, error: channelError } = await supabase
        .from('channels')
        .select('channel_id, name, uploads_playlist_id')
        .eq('scanner_enabled', true)
        .order('name');

    if (channelError) throw new Error(`Channel fetch: ${channelError.message}`);
    if (!channels || channels.length === 0) {
        return { channelsScanned: 0, channelsWithNewVideos: 0, totalDiscovered: 0, totalQueued: 0, durationMs: 0, perChannel: [] };
    }

    // Load all existing video IDs + already-queued IDs once (avoids N round-trips)
    const channelIds = channels.map((c: any) => c.channel_id);
    const existingIds = await getExistingVideoIds(supabase, channelIds);

    const { data: queuedRows } = await supabase
        .from('scan_queue')
        .select('video_id')
        .in('channel_id', channelIds);

    if (queuedRows) {
        for (const row of queuedRows) {
            if (row.video_id) existingIds.add(row.video_id);
        }
    }

    const perChannel: DiscoverAllResult['perChannel'] = [];
    let totalDiscovered = 0;
    let totalQueued = 0;
    let channelsWithNewVideos = 0;

    for (const channel of channels) {
        if (!channel.uploads_playlist_id) {
            console.warn(`[DiscoverAll] ⚠️ ${channel.name} has no uploads_playlist_id — skipping`);
            await supabase
                .from('channels')
                .update({ last_scanned_at: new Date().toISOString() })
                .eq('channel_id', channel.channel_id);
            continue;
        }

        let discovered = 0;
        let queued = 0;

        try {
            const result = await discoverNewVideos(
                channel.channel_id,
                channel.uploads_playlist_id,
                channel.name,
                existingIds,
                50,
                3, // 3 pages = 150 videos — sufficient for daily new-content sweeps
            );

            discovered = result.newVideos.length;

            if (result.newVideos.length > 0) {
                channelsWithNewVideos++;
                const queueItems = result.newVideos.map((v) => ({
                    video_url: `https://www.youtube.com/watch?v=${v.videoId}`,
                    video_id: v.videoId,
                    channel_id: channel.channel_id,
                    title: v.title || null,
                    duration_seconds: v.duration_seconds ?? null,
                    status: 'pending',
                }));

                for (const item of queueItems) {
                    const { error: insertError } = await supabase
                        .from('scan_queue')
                        .upsert(item, { onConflict: 'video_url', ignoreDuplicates: true });
                    if (!insertError) {
                        queued++;
                        // Add to existingIds so subsequent channels don't double-queue
                        existingIds.add(item.video_id);
                    }
                }
            }
        } catch (err: any) {
            console.error(`[DiscoverAll] Error scanning ${channel.name}:`, err.message);
        }

        await supabase
            .from('channels')
            .update({ last_scanned_at: new Date().toISOString() })
            .eq('channel_id', channel.channel_id);

        await supabase.from('scan_runs').insert({
            channel_id: channel.channel_id,
            run_type: 'discover',
            completed_at: new Date().toISOString(),
            videos_discovered: discovered,
            videos_processed: 0,
            videos_accepted: 0,
            videos_rejected: 0,
            videos_failed: 0,
        });

        totalDiscovered += discovered;
        totalQueued += queued;
        perChannel.push({ id: channel.channel_id, name: channel.name, discovered, queued });
        console.log(`[DiscoverAll] ${channel.name}: ${discovered} new, ${queued} queued`);
    }

    console.log(`[DiscoverAll] Complete: ${channels.length} channels, ${totalDiscovered} discovered, ${totalQueued} queued (${Date.now() - startTime}ms)`);

    return {
        channelsScanned: channels.length,
        channelsWithNewVideos,
        totalDiscovered,
        totalQueued,
        durationMs: Date.now() - startTime,
        perChannel,
    };
}

// ---------------------------------------------------------------------------
// runScannerTick — legacy combined wrapper (used by admin panel + /api/scanner/tick)
// ---------------------------------------------------------------------------

/**
 * Execute a single combined scanner tick: discover then process.
 *
 * @param supabase - Supabase client with service_role key
 * @param videosPerTick - Target number of meaningful results per tick (default 3)
 */
export async function runScannerTick(
    supabase: any,
    videosPerTick: number = 3,
): Promise<TickResult> {
    const startTime = Date.now();

    const discoverResult = await runDiscoverTick(supabase);
    const processResult = await runProcessTick(supabase, videosPerTick);

    return {
        channel: discoverResult.channel,
        discovered: discoverResult.discovered,
        queued: discoverResult.queued,
        processed: processResult.processed,
        totalDurationMs: Date.now() - startTime,
    };
}
