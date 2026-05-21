'use strict';

/**
 * UAP Scanner Tick Orchestrator
 * 
 * Copy-Modify from src/lib/scanner/tick.ts (NDE).
 *
 * Provides three exported functions:
 *
 * - runUapDiscoverTick(supabase)
 *     Pick the least-recently-scanned UAP channel, discover new videos, and queue
 *     them in uap_scan_queue. Fast (~5-10s). Called hourly.
 *
 * - runUapProcessTick(supabase, count)
 *     Pull `count` videos from the pending uap_scan_queue and run each through
 *     the UAP intake pipeline. Called every 10 minutes with count=1.
 *
 * - runUapScannerTick(supabase, videosPerTick)
 *     Combined wrapper — calls runUapDiscoverTick then runUapProcessTick.
 *
 * Key differences from NDE:
 * - Queries `uap_channels` instead of `channels`
 * - Queues to `uap_scan_queue` instead of `scan_queue`
 * - Logs to `uap_scan_runs` instead of `scan_runs`
 * - Calls `processUapVideoIntake()` instead of `processVideoIntake()`
 */

import { discoverNewUapVideos, getExistingUapVideoIds } from './uap-discover';
import { runUapPlaylistDiscoverTick, PlaylistDiscoverResult } from './uap-playlist-discover';
import { processUapVideoIntake } from '../pipeline/intake-uap';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface UapDiscoverResult {
    channel: { id: string; name: string } | null;
    discovered: number;
    queued: number;
    durationMs: number;
}

export interface UapProcessedVideo {
    videoId: string;
    url: string;
    status: string;
    tier: number | null;
    error: string | null;
}

export interface UapProcessResult {
    processed: UapProcessedVideo[];
    durationMs: number;
}

export interface UapTickResult {
    channel: { id: string; name: string } | null;
    playlist: PlaylistDiscoverResult | null;
    discovered: number;
    queued: number;
    processed: UapProcessedVideo[];
    totalDurationMs: number;
}

// ---------------------------------------------------------------------------
// runUapDiscoverTick — channel scan + queue population only
// ---------------------------------------------------------------------------

/**
 * Pick the least-recently-scanned UAP scanner-enabled channel, discover new
 * videos, and add them to uap_scan_queue. No video processing happens here.
 */
export async function runUapDiscoverTick(supabase: any): Promise<UapDiscoverResult> {
    const startTime = Date.now();

    // Pick the next channel to scan (least recently scanned)
    const { data: channels, error: channelError } = await supabase
        .from('uap_channels')
        .select('channel_id, channel_name, uploads_playlist_id')
        .eq('scanner_enabled', true)
        .order('last_scanned_at', { ascending: true, nullsFirst: true })
        .limit(1);

    if (channelError) throw new Error(`UAP Channel fetch: ${channelError.message}`);

    const channel = channels?.[0];

    let discovered = 0;
    let queued = 0;

    if (channel && channel.uploads_playlist_id) {
        try {
            const existingIds = await getExistingUapVideoIds(supabase, [channel.channel_id]);

            // Also exclude videos already in the queue
            const { data: queuedVideos } = await supabase
                .from('uap_scan_queue')
                .select('video_id')
                .eq('channel_id', channel.channel_id);

            if (queuedVideos) {
                for (const qv of queuedVideos) {
                    if (qv.video_id) existingIds.add(qv.video_id);
                }
            }

            // Discover new videos (cap at 3 pages = 150 videos per tick scan)
            const discovery = await discoverNewUapVideos(
                channel.channel_id,
                channel.uploads_playlist_id,
                channel.channel_name,
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
                    // Sprint 8: source tracking for channel-discovered videos
                    source_type: 'channel',
                    source_id: channel.channel_id,
                    priority: 5,
                }));

                // Insert individually, ignoring duplicates
                for (const item of queueItems) {
                    const { error: insertError } = await supabase
                        .from('uap_scan_queue')
                        .upsert(item, { onConflict: 'video_url', ignoreDuplicates: true });

                    if (!insertError) queued++;
                }
            }

            await supabase
                .from('uap_channels')
                .update({ last_scanned_at: new Date().toISOString() })
                .eq('channel_id', channel.channel_id);

        } catch (err: any) {
            console.error(`[UAP Scanner/Discover] Discovery error for ${channel.channel_name}:`, err.message);
            await supabase.from('uap_scan_runs').insert({
                channel_id: channel.channel_id,
                run_type: 'discover',
                completed_at: new Date().toISOString(),
                videos_discovered: 0,
                error: err.message,
            });
        }
    }

    await supabase.from('uap_scan_runs').insert({
        channel_id: channel?.channel_id || null,
        run_type: 'discover',
        completed_at: new Date().toISOString(),
        videos_discovered: discovered,
        videos_processed: 0,
        videos_accepted: 0,
        videos_rejected: 0,
        videos_failed: 0,
    });

    console.log(`[UAP Scanner/Discover] ${channel?.channel_name ?? 'no channel'}: ${discovered} discovered, ${queued} queued (${Date.now() - startTime}ms)`);

    return {
        channel: channel ? { id: channel.channel_id, name: channel.channel_name } : null,
        discovered,
        queued,
        durationMs: Date.now() - startTime,
    };
}

// ---------------------------------------------------------------------------
// runUapProcessTick — queue processing only
// ---------------------------------------------------------------------------

/**
 * Pull up to `videosPerTick` meaningful videos from the pending uap_scan_queue
 * and run each through the full UAP intake pipeline.
 *
 * "Meaningful" = classified by AI (accepted, rejected, failed).
 * "Skipped"    = no_captions or already_exists — pulled from queue but not
 *                counted toward the limit.
 *
 * Max total attempts = videosPerTick × 5 to prevent runaway loops.
 */
export async function runUapProcessTick(
    supabase: any,
    videosPerTick: number = 1,
): Promise<UapProcessResult> {
    const startTime = Date.now();

    const processed: UapProcessedVideo[] = [];
    let meaningfulCount = 0;
    let totalAttempts = 0;
    const maxAttempts = videosPerTick * 15; // Increased to allow skipping long streaks of Tier 3s

    const touchedIds = new Set<number>();
    const touchedChannelIds = new Set<string>();

    while (meaningfulCount < videosPerTick && totalAttempts < maxAttempts) {
        // Round-robin: sample pending rows, pick a random untouched channel
        const { data: pendingRows } = await supabase
            .from('uap_scan_queue')
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
            .from('uap_scan_queue')
            .select('id, video_url, video_id, channel_id, retry_count')
            .eq('status', 'pending')
            .eq('channel_id', pickedChannelId)
            // Sprint 8: priority-aware ordering — lower priority number = processed first
            .order('priority', { ascending: true })
            .order('created_at', { ascending: true })
            .limit(1);

        touchedChannelIds.add(pickedChannelId);

        if (queueError) throw new Error(`UAP Queue fetch: ${queueError.message}`);
        if (!items || items.length === 0) continue;

        const item = items[0];

        if (touchedIds.has(item.id)) break;
        touchedIds.add(item.id);
        totalAttempts++;

        await supabase
            .from('uap_scan_queue')
            .update({ status: 'processing' })
            .eq('id', item.id);

        let finalStatus: string;
        let intakeStatus: string;
        let resultError: string | null = null;
        let tier: number | null = null;

        try {
            const result = await processUapVideoIntake(item.video_url);
            intakeStatus = result.status;
            tier = result.tier ?? null;

            const isSkipped = result.status === 'no_captions'
                || result.status === 'already_exists'
                || result.status === 'out_of_scope'
                || result.status === 'is_short'
                || result.status === 'drm_protected';
            // Note: caption_fetch_failed is NOT in isSkipped — it's a retryable failure

            finalStatus = (result.status === 'complete' || result.status === 'already_exists')
                ? 'complete'
                : isSkipped
                    ? 'skipped'
                    : 'failed';

            resultError = result.error
                || (finalStatus === 'failed' ? `Intake returned status: ${result.status}` : null);

            if (finalStatus === 'failed') {
                console.error(`[UAP Scanner/Process] Video ${item.video_id} failed:`, resultError);
            }

            if (isSkipped) {
                console.log(`[UAP Scanner/Process] Skipped ${item.video_id} (${result.status}) — pulling next`);
            } else {
                meaningfulCount++;
            }

            // Auto-retry for transient caption fetch failures (rate limit, timeout, etc.)
            if (result.status === 'caption_fetch_failed') {
                const currentRetries = item.retry_count || 0;
                const maxRetries = 3;
                if (currentRetries < maxRetries) {
                    // Exponential backoff: 30s, 60s, 120s
                    const backoffMs = 30000 * Math.pow(2, currentRetries);
                    console.log(`[UAP Scanner/Process] Auto-retrying ${item.video_id} — caption fetch failed (attempt ${currentRetries + 1}/${maxRetries}, backoff ${backoffMs / 1000}s)`);
                    await new Promise(resolve => setTimeout(resolve, backoffMs));
                    finalStatus = 'pending';  // Re-queue for another attempt
                }
            }

            // CRITICAL: Detect quota exhaustion and halt the entire processing loop
            if (result.status === 'quota_exceeded') {
                console.error(`[UAP Scanner/Process] ⛔ QUOTA EXCEEDED — Supadata monthly credits exhausted. Halting pipeline immediately.`);
                console.error(`[UAP Scanner/Process] Remaining queue items will stay as 'pending' for when credits refill.`);
                // Mark this specific video as failed (not pending) so we don't re-attempt immediately
                finalStatus = 'failed';
                resultError = 'Supadata quota exceeded — pipeline halted';

                // Update the queue item and break out of the loop
                await supabase
                    .from('uap_scan_queue')
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
                    tier,
                    error: resultError,
                });

                // BREAK — stop processing, preserve remaining queue
                break;
            }

        } catch (err: any) {
            const errorMsg = err.message || String(err);
            console.error(`[UAP Scanner/Process] Video ${item.video_id} threw error:`, errorMsg);
            finalStatus = 'failed';
            intakeStatus = 'failed';
            resultError = errorMsg;
            meaningfulCount++;
        }

        // Build the queue update payload
        const queueUpdate: Record<string, any> = {
            status: finalStatus,
            processed_at: new Date().toISOString(),
            intake_result: intakeStatus,
            error: resultError,
        };

        // Track retry count for auto-retry items reset to pending
        if (finalStatus === 'pending') {
            queueUpdate.retry_count = (item.retry_count || 0) + 1;
            queueUpdate.processed_at = null;  // Clear so it looks like a fresh queue item
        }

        await supabase
            .from('uap_scan_queue')
            .update(queueUpdate)
            .eq('id', item.id);

        processed.push({
            videoId: item.video_id,
            url: item.video_url,
            status: intakeStatus,
            tier,
            error: resultError,
        });

        console.log(`[UAP Scanner/Process] Progress: ${meaningfulCount}/${videosPerTick} meaningful (${totalAttempts}/${maxAttempts} attempts)`);
    }

    // Log to uap_scan_runs
    const accepted = processed.filter((p) => p.tier === 1 || p.tier === 2).length;
    const rejected = processed.filter((p) => p.tier === 3 || p.status === 'out_of_scope').length;
    const failed = processed.filter((p) => p.status === 'failed').length;

    await supabase.from('uap_scan_runs').insert({
        channel_id: null,
        run_type: 'process',
        completed_at: new Date().toISOString(),
        videos_discovered: 0,
        videos_processed: processed.length,
        videos_accepted: accepted,
        videos_rejected: rejected,
        videos_failed: failed,
    });

    console.log(`[UAP Scanner/Process] Done: ${accepted} accepted, ${rejected} rejected, ${failed} failed (${Date.now() - startTime}ms)`);

    return {
        processed,
        durationMs: Date.now() - startTime,
    };
}

// ---------------------------------------------------------------------------
// runUapScannerTick — combined wrapper
// ---------------------------------------------------------------------------

/**
 * Execute a single combined UAP scanner tick: discover (channels + playlists) then process.
 */
export async function runUapScannerTick(
    supabase: any,
    videosPerTick: number = 3,
): Promise<UapTickResult> {
    const startTime = Date.now();

    const discoverResult = await runUapDiscoverTick(supabase);

    // Sprint 8: Also discover from playlists
    let playlistResult: PlaylistDiscoverResult | null = null;
    try {
        playlistResult = await runUapPlaylistDiscoverTick(supabase);
    } catch (err: any) {
        console.error('[UAP Scanner/Tick] Playlist discover error:', err.message);
    }

    const processResult = await runUapProcessTick(supabase, videosPerTick);

    return {
        channel: discoverResult.channel,
        playlist: playlistResult,
        discovered: discoverResult.discovered + (playlistResult?.discovered ?? 0),
        queued: discoverResult.queued + (playlistResult?.queued ?? 0),
        processed: processResult.processed,
        totalDurationMs: Date.now() - startTime,
    };
}
