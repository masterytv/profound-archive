'use strict';

/**
 * Scanner Tick Orchestrator
 *
 * Provides three exported functions:
 *
 * - runDiscoverTick(supabase)
 *     Pick the least-recently-scanned channel, discover new videos, and queue
 *     them in scan_queue. Fast (~5-10s). Called hourly.
 *
 * - runProcessTick(supabase, count)
 *     Pull `count` videos from the pending queue and run each through the full
 *     14-step intake pipeline. Can be slow (30-90s per video). Called every
 *     10 minutes with count=1 to stay well under Cloudflare's 100s timeout.
 *
 * - runScannerTick(supabase, videosPerTick)
 *     Legacy combined wrapper — calls runDiscoverTick then runProcessTick.
 *     Used by the admin panel's manual trigger and /api/scanner/tick.
 */

import { discoverNewVideos, getExistingVideoIds } from './discover';
import { processVideoIntake } from '../pipeline/intake';

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

            await supabase
                .from('channels')
                .update({ last_scanned_at: new Date().toISOString() })
                .eq('channel_id', channel.channel_id);

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
