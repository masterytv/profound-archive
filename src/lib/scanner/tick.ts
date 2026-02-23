'use strict';

/**
 * Scanner Tick Orchestrator
 * 
 * Performs a single "tick" of the channel scanner:
 * 1. Pick the next scanner_enabled channel (round-robin by last_scanned_at)
 * 2. Discover new videos from that channel
 * 3. Queue them in scan_queue
 * 4. Process up to N pending queue items through the intake pipeline
 * 5. Log results to scan_runs
 * 
 * Designed to complete in <60s to stay within serverless timeout limits.
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
 * @param videosPerTick - Max videos to process per tick (default 5)
 */
export async function runScannerTick(
    supabase: any,
    videosPerTick: number = 5,
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

    // 3. Process pending queue items (from ANY channel, oldest first)
    const { data: pendingItems, error: queueError } = await supabase
        .from('scan_queue')
        .select('id, video_url, video_id, channel_id')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(videosPerTick);

    if (queueError) throw new Error(`Queue fetch: ${queueError.message}`);

    const processed: TickResult['processed'] = [];

    if (pendingItems && pendingItems.length > 0) {
        // Process sequentially to stay within timeout (each ~20-40s, parallel would overshoot 60s)
        for (const item of pendingItems) {
            // Mark as processing
            await supabase
                .from('scan_queue')
                .update({ status: 'processing' })
                .eq('id', item.id);

            try {
                const result = await processVideoIntake(item.video_url);

                const finalStatus = result.status === 'complete' || result.status === 'already_exists'
                    ? 'complete'
                    : result.status === 'not_profound' || result.status === 'no_captions'
                        ? 'skipped'
                        : 'failed';

                // Capture error from intake result (soft failure — pipeline finished but with issues)
                const resultError = result.error
                    || (finalStatus === 'failed' ? `Intake returned status: ${result.status}` : null);

                if (finalStatus === 'failed') {
                    console.error(`[Scanner] Video ${item.video_id} failed:`, resultError);
                }

                await supabase
                    .from('scan_queue')
                    .update({
                        status: finalStatus,
                        processed_at: new Date().toISOString(),
                        intake_result: result.status,
                        error: resultError,
                    })
                    .eq('id', item.id);

                processed.push({
                    videoId: item.video_id,
                    url: item.video_url,
                    status: result.status,
                    isNde: result.classification?.isNde_value || null,
                    error: resultError,
                });

            } catch (err: any) {
                const errorMsg = err.message || String(err);
                console.error(`[Scanner] Video ${item.video_id} threw error:`, errorMsg);

                await supabase
                    .from('scan_queue')
                    .update({
                        status: 'failed',
                        processed_at: new Date().toISOString(),
                        error: errorMsg,
                    })
                    .eq('id', item.id);

                processed.push({
                    videoId: item.video_id,
                    url: item.video_url,
                    status: 'failed',
                    isNde: null,
                    error: errorMsg,
                });
            }
        }
    }

    // 4. Log the scan run
    const accepted = processed.filter((p) => p.isNde === 'clear_nde' || p.isNde === 'possible_nde').length;
    const rejected = processed.filter((p) => p.isNde === 'not_nde').length;
    const failed = processed.filter((p) => p.status === 'failed').length;

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

    return {
        channel: channel ? { id: channel.channel_id, name: channel.name } : null,
        discovered,
        queued,
        processed,
        totalDurationMs: Date.now() - startTime,
    };
}
