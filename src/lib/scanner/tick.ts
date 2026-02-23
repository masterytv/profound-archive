'use strict';

/**
 * Scanner Tick Orchestrator
 * 
 * Performs a single "tick" of the channel scanner:
 * 1. Pick the next scanner_enabled channel (round-robin by last_scanned_at)
 * 2. Discover new videos from that channel
 * 3. Queue them in scan_queue
 * 4. Process queue items until N *meaningful* results are achieved
 *    (no_captions and already_exists are skipped without counting toward the limit)
 * 5. Log results to scan_runs
 */

import { discoverNewVideos, getExistingVideoIds } from './discover';
import { processVideoIntake } from '../pipeline/intake';

export interface TickResult {
    channel: { id: string; name: string } | null;
    discovered: number;
    queued: number;
    processed: Array<{
        videoId: string;
        url: string;
        status: string;
        isNde: string | null;
        error: string | null;
    }>;
    totalDurationMs: number;
}

/**
 * Execute a single scanner tick.
 * 
 * @param supabase - Supabase client with service_role key
 * @param videosPerTick - Target number of MEANINGFUL results per tick (default 3)
 *   A "meaningful" result is one that was classified (accepted, rejected, or failed).
 *   no_captions and already_exists are skipped without counting toward this limit.
 *   Max total attempts = videosPerTick × 5 to prevent runaway loops.
 */
export async function runScannerTick(
    supabase: any,
    videosPerTick: number = 3,
): Promise<TickResult> {
    const startTime = Date.now();

    // 1. Pick the next channel to scan (least recently scanned)
    const { data: channels, error: channelError } = await supabase
        .from('channels')
        .select('channel_id, name, uploads_playlist_id')
        .eq('scanner_enabled', true)
        .order('last_scanned_at', { ascending: true, nullsFirst: true })
        .limit(1);

    if (channelError) throw new Error(`Channel fetch: ${channelError.message}`);

    const channel = channels?.[0];

    // 2. If we have a channel to scan, discover new videos
    let discovered = 0;
    let queued = 0;

    if (channel && channel.uploads_playlist_id) {
        try {
            // Get existing video IDs for this channel
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

            // Queue new videos
            if (discovery.newVideos.length > 0) {
                const queueItems = discovery.newVideos.map((v) => ({
                    video_url: `https://www.youtube.com/watch?v=${v.videoId}`,
                    video_id: v.videoId,
                    channel_id: channel.channel_id,
                    status: 'pending',
                }));

                // Insert in batches, ignoring duplicates (UNIQUE constraint on video_url)
                for (const item of queueItems) {
                    const { error: insertError } = await supabase
                        .from('scan_queue')
                        .upsert(item, { onConflict: 'video_url', ignoreDuplicates: true });

                    if (!insertError) queued++;
                }
            }

            // Update last_scanned_at
            await supabase
                .from('channels')
                .update({ last_scanned_at: new Date().toISOString() })
                .eq('channel_id', channel.channel_id);

        } catch (err: any) {
            console.error(`Discovery error for ${channel.name}:`, err.message);
            // Log error but continue to process queue items
            await supabase.from('scan_runs').insert({
                channel_id: channel.channel_id,
                run_type: 'tick',
                completed_at: new Date().toISOString(),
                videos_discovered: 0,
                error: err.message,
            });
        }
    }

    // 3. Process queue items until N meaningful classifications happen.
    //
    // "Meaningful" = the video went through the AI classifier (accepted, rejected, or failed).
    // "Skipped"    = no_captions or already_exists — we immediately grab the next video in queue.
    //
    // Max attempts = videosPerTick × 5 to prevent runaway loops in channels
    // where most videos have no captions.
    const processed: TickResult['processed'] = [];
    let meaningfulCount = 0;
    let totalAttempts = 0;
    const maxAttempts = videosPerTick * 5;

    // Track IDs we've already set to 'processing' to avoid re-grabbing them
    const touchedIds = new Set<number>();

    while (meaningfulCount < videosPerTick && totalAttempts < maxAttempts) {
        // Fetch the next pending item
        const { data: items, error: queueError } = await supabase
            .from('scan_queue')
            .select('id, video_url, video_id, channel_id')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(1);

        if (queueError) throw new Error(`Queue fetch: ${queueError.message}`);
        if (!items || items.length === 0) break; // Queue exhausted

        const item = items[0];

        // Safety: if somehow the same item appears again (race condition), stop
        if (touchedIds.has(item.id)) break;
        touchedIds.add(item.id);
        totalAttempts++;

        // Mark as processing immediately so concurrent ticks don't grab it
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
                console.error(`[Scanner] Video ${item.video_id} failed:`, resultError);
            }

            if (isSkipped) {
                console.log(`[Scanner] Skipped ${item.video_id} (${result.status}) — pulling next video from queue`);
            } else {
                // Only count as meaningful if the classifier ran
                meaningfulCount++;
            }

        } catch (err: any) {
            const errorMsg = err.message || String(err);
            console.error(`[Scanner] Video ${item.video_id} threw error:`, errorMsg);
            finalStatus = 'failed';
            intakeStatus = 'failed';
            resultError = errorMsg;
            meaningfulCount++; // A hard failure still counts as an attempt
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

        console.log(`[Scanner] Tick progress: ${meaningfulCount}/${videosPerTick} meaningful (${totalAttempts}/${maxAttempts} attempts)`);
    }

    // 4. Log the scan run
    const accepted = processed.filter((p) => p.isNde === 'clear_nde' || p.isNde === 'possible_nde').length;
    const rejected = processed.filter((p) => p.isNde === 'not_nde').length;
    const failed = processed.filter((p) => p.status === 'failed').length;
    const skipped = processed.filter((p) => p.status === 'no_captions' || p.status === 'already_exists').length;

    await supabase.from('scan_runs').insert({
        channel_id: channel?.channel_id || null,
        run_type: 'tick',
        completed_at: new Date().toISOString(),
        videos_discovered: discovered,
        videos_processed: processed.length,
        videos_accepted: accepted,
        videos_rejected: rejected,
        videos_failed: failed,
    });

    console.log(`[Scanner] Tick complete: ${accepted} accepted, ${rejected} rejected, ${failed} failed, ${skipped} skipped (${totalAttempts} total attempts, ${Date.now() - startTime}ms)`);

    return {
        channel: channel ? { id: channel.channel_id, name: channel.name } : null,
        discovered,
        queued,
        processed,
        totalDurationMs: Date.now() - startTime,
    };
}
