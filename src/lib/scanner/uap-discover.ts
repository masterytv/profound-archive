'use strict';

/**
 * UAP YouTube Channel Video Discovery
 * 
 * Copy-Modify from src/lib/scanner/discover.ts (NDE).
 * 
 * Key differences from NDE:
 * - Queries `uap_vids` instead of `nde_vids` for existing video deduplication
 * - Same shorts filter (≤180s) and YouTube API usage
 * - Same pagination pattern with Supabase 1000-row limit handling
 */

// Re-export shared types and helpers from the NDE discover module
// Why: parseIsoDuration and filterOutShorts are domain-agnostic
export { parseIsoDuration } from './discover';

export interface UapDiscoveryResult {
    channelId: string;
    channelName: string;
    totalFetched: number;
    alreadyInDb: number;
    /** All video IDs fetched from the playlist/channel (both new and existing) */
    allVideoIds: string[];
    newVideos: Array<{
        videoId: string;
        title: string;
        publishedAt: string;
        thumbnailUrl: string;
        duration_seconds: number | null;
    }>;
}

/**
 * Discover new videos from a UAP channel that aren't already in uap_vids.
 * 
 * @param channelId - YouTube channel ID (UC...)
 * @param uploadsPlaylistId - YouTube uploads playlist ID (UU...)
 * @param channelName - Channel display name (for reporting)
 * @param existingVideoIds - Set of videoIds already in the database
 * @param maxResults - Max videos to fetch per page (default 50, YouTube max)
 * @param maxPages - Max pages to paginate through (default 5 = 250 videos)
 */
export async function discoverNewUapVideos(
    channelId: string,
    uploadsPlaylistId: string,
    channelName: string,
    existingVideoIds: Set<string>,
    maxResults: number = 50,
    maxPages: number = 5,
): Promise<UapDiscoveryResult> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        throw new Error('YOUTUBE_API_KEY environment variable is not set');
    }

    const newVideos: UapDiscoveryResult['newVideos'] = [];
    const allVideoIds: string[] = [];
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
            allVideoIds.push(videoId);

            if (!existingVideoIds.has(videoId)) {
                newVideos.push({
                    videoId,
                    title: item.snippet.title || '',
                    publishedAt: item.snippet.publishedAt || '',
                    thumbnailUrl: item.snippet.thumbnails?.medium?.url || '',
                    duration_seconds: null,
                });
            }
        }

        nextPageToken = data.nextPageToken;
        pages++;

        if (!nextPageToken) break;
    }

    // Filter out YouTube Shorts (≤ 180s) — same threshold as NDE
    const filtered = await filterOutShorts(newVideos, apiKey, channelName);

    return {
        channelId,
        channelName,
        totalFetched,
        alreadyInDb: totalFetched - filtered.length,
        allVideoIds,
        newVideos: filtered,
    };
}

// ─── Shorts Filtering (identical to NDE) ──────────────────────────────────────

/**
 * Parse an ISO 8601 duration string into total seconds.
 */
function parseIsoDurationLocal(iso: string): number | null {
    if (!iso) return null;
    const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
    if (!match) return null;
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    const total = hours * 3600 + minutes * 60 + seconds;
    return total > 0 ? total : null;
}

async function filterOutShorts(
    videos: UapDiscoveryResult['newVideos'],
    apiKey: string,
    label: string,
): Promise<UapDiscoveryResult['newVideos']> {
    if (videos.length === 0) return videos;

    const SHORTS_MAX_SECONDS = 180;
    const BATCH_SIZE = 50;

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
            if (!res.ok) {
                console.warn(`[UAP Discovery/Shorts] API error ${res.status} — skipping filter for this batch`);
                continue;
            }

            const data = await res.json();
            const items: Array<{ id: string; contentDetails: { duration: string } }> = data.items || [];

            for (const item of items) {
                const secs = parseIsoDurationLocal(item.contentDetails?.duration || '');
                durationMap.set(item.id, secs);
            }
        } catch (err: any) {
            console.warn(`[UAP Discovery/Shorts] Duration check failed for batch — keeping all: ${err.message}`);
        }
    }

    const shortIds = new Set<string>();
    for (const [id, secs] of durationMap) {
        if (secs !== null && secs <= SHORTS_MAX_SECONDS) {
            shortIds.add(id);
        }
    }

    if (shortIds.size > 0) {
        console.log(`[UAP Discovery/Shorts] Filtered ${shortIds.size} Short(s) from ${label}: ${[...shortIds].join(', ')}`);
    }

    return videos
        .filter(v => !shortIds.has(v.videoId))
        .map(v => ({ ...v, duration_seconds: durationMap.get(v.videoId) ?? null }));
}

/**
 * Fetch all existing video IDs from uap_vids for deduplication.
 * Uses pagination to handle the Supabase 1000-row limit (LEARNINGS §5.B).
 */
export async function getExistingUapVideoIds(
    supabase: any,
    channelIds?: string[],
): Promise<Set<string>> {
    const videoIds = new Set<string>();
    const PAGE_SIZE = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        let query = supabase
            .from('uap_vids')
            .select('video_id')
            .range(offset, offset + PAGE_SIZE - 1);

        if (channelIds && channelIds.length > 0) {
            query = query.in('channel_id', channelIds);
        }

        const { data, error } = await query;
        if (error) throw new Error(`Failed to fetch UAP video IDs: ${error.message}`);

        if (!data || data.length === 0) {
            hasMore = false;
        } else {
            for (const row of data) {
                videoIds.add(row.video_id);
            }
            offset += PAGE_SIZE;
            hasMore = data.length === PAGE_SIZE;
        }
    }

    return videoIds;
}
