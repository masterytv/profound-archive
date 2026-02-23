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
 */

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
                });
            }
        }

        nextPageToken = data.nextPageToken;
        pages++;

        // Stop if no more pages
        if (!nextPageToken) break;
    }

    return {
        channelId,
        channelName,
        totalFetched,
        alreadyInDb: totalFetched - newVideos.length,
        newVideos,
    };
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
