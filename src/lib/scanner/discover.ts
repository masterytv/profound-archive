'use strict';

/**
 * YouTube Channel Video Discovery
 * 
 * Uses YouTube Data API v3 to discover new videos from a channel's uploads playlist.
 * Compares against existing videos in nde_vids to find only truly new content.
 * 
 * Why: YouTube's uploads playlist (UU + channelId suffix) is the most reliable way
 * to enumerate all public uploads. The search endpoint is quota-heavy (100 units)
 * while playlistItems.list costs just 1 unit per call.
 *
 * Shorts filtering: After discovery, we batch-check durations via videos.list
 * (contentDetails) and drop any video ≤ 180 seconds. YouTube Shorts max length
 * is 3 minutes (180s) as of October 15 2024. This avoids burning Apify and OpenAI
 * quota on content that will never be an NDE account.
 */

import { logQuota } from '@/lib/ai/usage-tracker';

export interface DiscoveryResult {
    channelId: string;
    channelName: string;
    totalFetched: number;
    alreadyInDb: number;
    newVideos: Array<{
        videoId: string;
        title: string;
        publishedAt: string;
        thumbnailUrl: string;
        duration_seconds: number | null; // null = unknown (kept by default)
    }>;
}

/**
 * Discover new videos from a channel that aren't already in nde_vids.
 * 
 * @param channelId - YouTube channel ID (UC...)
 * @param uploadsPlaylistId - YouTube uploads playlist ID (UU...)
 * @param channelName - Channel display name (for reporting)
 * @param existingVideoIds - Set of videoIds already in the database
 * @param maxResults - Max videos to fetch per page (default 50, YouTube max)
 * @param maxPages - Max pages to paginate through (default 5 = 250 videos)
 */
export async function discoverNewVideos(
    channelId: string,
    uploadsPlaylistId: string,
    channelName: string,
    existingVideoIds: Set<string>,
    maxResults: number = 50,
    maxPages: number = 5,
): Promise<DiscoveryResult> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        throw new Error('YOUTUBE_API_KEY environment variable is not set');
    }

    const newVideos: DiscoveryResult['newVideos'] = [];
    let totalFetched = 0;
    let nextPageToken: string | undefined;
    let pages = 0;

    while (pages < maxPages) {
        const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
        url.searchParams.set('part', 'snippet');
        url.searchParams.set('playlistId', uploadsPlaylistId);
        url.searchParams.set('maxResults', String(maxResults));
        url.searchParams.set('key', apiKey);
        if (nextPageToken) {
            url.searchParams.set('pageToken', nextPageToken);
        }

        const response = await fetch(url.toString());
        void logQuota({ provider: 'youtube', operation: 'youtube.playlistItems', quantity: 1, status: response.ok ? 'success' : 'error', metadata: { op: 'scanner.discover', channelName } });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`YouTube API error (${response.status}): ${errorBody}`);
        }

        const data = await response.json();
        const items = data.items || [];
        totalFetched += items.length;

        for (const item of items) {
            const videoId = item.snippet?.resourceId?.videoId;
            if (!videoId) continue;

            if (!existingVideoIds.has(videoId)) {
                newVideos.push({
                    videoId,
                    title: item.snippet.title || '',
                    publishedAt: item.snippet.publishedAt || '',
                    thumbnailUrl: item.snippet.thumbnails?.medium?.url || '',
                    duration_seconds: null, // populated by filterOutShorts below
                });
            }
        }

        nextPageToken = data.nextPageToken;
        pages++;

        // Stop if no more pages
        if (!nextPageToken) break;
    }

    // Filter out YouTube Shorts (≤ 180s) before returning.
    // apiKey is already declared above and guaranteed non-null (throws if missing).
    // Cost: 1 quota unit per 50 videos — negligible.
    const filtered = await filterOutShorts(newVideos, apiKey, channelName);

    return {
        channelId,
        channelName,
        totalFetched,
        alreadyInDb: totalFetched - filtered.length,
        newVideos: filtered,
    };
}

// ─── Shorts Filtering ─────────────────────────────────────────────────────────

/**
 * Parse an ISO 8601 duration string into total seconds.
 * Handles: PT45S, PT3M, PT1H2M3S, etc.
 * Returns null if the string cannot be parsed.
 */
export function parseIsoDuration(iso: string): number | null {
    if (!iso) return null;
    const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
    if (!match) return null;
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    const total = hours * 3600 + minutes * 60 + seconds;
    // Return null for zero (unparsed / live stream sentinel) to err on the side of inclusion
    return total > 0 ? total : null;
}

/**
 * Filter a list of discovered videos, removing YouTube Shorts (duration ≤ 180s).
 *
 * Calls YouTube Data API videos.list?part=contentDetails in batches of 50.
 * Videos whose duration cannot be determined are kept (safe default).
 * Duration is attached to each passing video for storage in scan_queue.
 *
 * @param videos  - The newly discovered video list from discoverNewVideos()
 * @param apiKey  - YouTube Data API key
 * @param label   - Channel name for log output
 */
async function filterOutShorts(
    videos: DiscoveryResult['newVideos'],
    apiKey: string,
    label: string,
): Promise<DiscoveryResult['newVideos']> {
    if (videos.length === 0) return videos;

    // YouTube Shorts max length as of October 15, 2024.
    const SHORTS_MAX_SECONDS = 180;
    const BATCH_SIZE = 50; // YouTube API max per call

    // Map videoId → duration in seconds (null = unparseable)
    const durationMap = new Map<string, number | null>();
    const ids = videos.map(v => v.videoId);

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);
        const url = new URL('https://www.googleapis.com/youtube/v3/videos');
        url.searchParams.set('part', 'contentDetails');
        url.searchParams.set('id', batch.join(','));
        url.searchParams.set('key', apiKey);

        try {
            const res = await fetch(url.toString());
            void logQuota({ provider: 'youtube', operation: 'youtube.videos', quantity: 1, status: res.ok ? 'success' : 'error', metadata: { op: 'scanner.discover.shorts', label } });
            if (!res.ok) {
                console.warn(`[Discovery/Shorts] API error ${res.status} — skipping filter for this batch`);
                continue;
            }

            const data = await res.json();
            const items: Array<{ id: string; contentDetails: { duration: string } }> = data.items || [];

            for (const item of items) {
                const secs = parseIsoDuration(item.contentDetails?.duration || '');
                durationMap.set(item.id, secs);
            }
        } catch (err: any) {
            // Non-fatal: if the check fails, keep all videos in this batch
            console.warn(`[Discovery/Shorts] Duration check failed for batch — keeping all: ${err.message}`);
        }
    }

    const shortIds = new Set<string>();
    for (const [id, secs] of durationMap) {
        if (secs !== null && secs <= SHORTS_MAX_SECONDS) {
            shortIds.add(id);
        }
    }

    if (shortIds.size > 0) {
        console.log(`[Discovery/Shorts] Filtered ${shortIds.size} Short(s) from ${label}: ${[...shortIds].join(', ')}`);
    }

    // Return passing videos with duration_seconds populated
    return videos
        .filter(v => !shortIds.has(v.videoId))
        .map(v => ({ ...v, duration_seconds: durationMap.get(v.videoId) ?? null }));
}

/**
 * Fetch all existing video IDs for a set of channel IDs from nde_vids.
 * Uses pagination to handle the Supabase 1000-row limit (LEARNINGS §5.B).
 */
export async function getExistingVideoIds(
    supabase: any,
    channelIds?: string[],
): Promise<Set<string>> {
    const videoIds = new Set<string>();
    const PAGE_SIZE = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        let query = supabase
            .from('nde_vids')
            .select('"videoId"')
            .range(offset, offset + PAGE_SIZE - 1);

        if (channelIds && channelIds.length > 0) {
            query = query.in('"channelId"', channelIds);
        }

        const { data, error } = await query;
        if (error) throw new Error(`Failed to fetch video IDs: ${error.message}`);

        if (!data || data.length === 0) {
            hasMore = false;
        } else {
            for (const row of data) {
                videoIds.add(row.videoId);
            }
            offset += PAGE_SIZE;
            hasMore = data.length === PAGE_SIZE;
        }
    }

    return videoIds;
}
