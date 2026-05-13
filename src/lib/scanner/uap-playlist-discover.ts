'use strict';

/**
 * UAP YouTube Playlist Video Discovery
 * 
 * Sprint 8, Story 8.2.2
 * 
 * Discovers new videos from standalone YouTube playlists (e.g., History Channel's
 * "Ancient Aliens") without requiring the parent channel to be in uap_channels.
 * 
 * Uses the same YouTube playlistItems.list API as channel discovery — playlist IDs
 * work identically whether they're uploads playlists (UU...) or custom playlists (PL...).
 */

import { discoverNewUapVideos, getExistingUapVideoIds } from './uap-discover';

export interface PlaylistDiscoverResult {
    playlist: { id: string; title: string; channelName: string | null } | null;
    discovered: number;
    queued: number;
    durationMs: number;
}

/**
 * Pick the least-recently-scanned enabled playlist, discover new videos,
 * and queue them in uap_scan_queue with source_type = 'playlist'.
 */
export async function runUapPlaylistDiscoverTick(supabase: any): Promise<PlaylistDiscoverResult> {
    const startTime = Date.now();

    // Pick the next playlist to scan (least recently scanned)
    const { data: playlists, error: playlistError } = await supabase
        .from('uap_playlists')
        .select('playlist_id, playlist_title, channel_id, channel_name, priority')
        .eq('scanner_enabled', true)
        .order('last_scanned_at', { ascending: true, nullsFirst: true })
        .limit(1);

    if (playlistError) throw new Error(`Playlist fetch: ${playlistError.message}`);

    const playlist = playlists?.[0];

    let discovered = 0;
    let queued = 0;

    if (playlist) {
        try {
            // Get all existing video IDs for deduplication (across ALL channels)
            const existingIds = await getExistingUapVideoIds(supabase);

            // Also exclude videos already in the queue
            const { data: queuedVideos } = await supabase
                .from('uap_scan_queue')
                .select('video_id');

            if (queuedVideos) {
                for (const qv of queuedVideos) {
                    if (qv.video_id) existingIds.add(qv.video_id);
                }
            }

            // Discover new videos from the playlist
            // Uses same playlistItems.list API — works for both PL... and UU... playlist IDs
            const discovery = await discoverNewUapVideos(
                playlist.channel_id || 'unknown',
                playlist.playlist_id,     // This is the key difference: custom playlist ID instead of uploads playlist
                playlist.playlist_title,
                existingIds,
                50,                       // maxResults per page
                10,                       // maxPages (500 videos per scan — playlists can be large)
            );

            discovered = discovery.newVideos.length;

            if (discovery.newVideos.length > 0) {
                const queueItems = discovery.newVideos.map((v) => ({
                    video_url: `https://www.youtube.com/watch?v=${v.videoId}`,
                    video_id: v.videoId,
                    channel_id: playlist.channel_id || null,
                    title: v.title || null,
                    duration_seconds: v.duration_seconds ?? null,
                    status: 'pending',
                    // Sprint 8: source tracking + priority
                    source_type: 'playlist',
                    source_id: playlist.playlist_id,
                    priority: playlist.priority ?? 1,
                }));

                // Insert individually, ignoring duplicates
                for (const item of queueItems) {
                    const { error: insertError } = await supabase
                        .from('uap_scan_queue')
                        .upsert(item, { onConflict: 'video_url', ignoreDuplicates: true });

                    if (!insertError) queued++;
                }
            }

            // Update video count + last_scanned_at
            await supabase
                .from('uap_playlists')
                .update({
                    last_scanned_at: new Date().toISOString(),
                    video_count: discovered + (discovery.alreadyInDb || 0),
                })
                .eq('playlist_id', playlist.playlist_id);

        } catch (err: any) {
            console.error(`[UAP Scanner/PlaylistDiscover] Error for ${playlist.playlist_title}:`, err.message);
            await supabase.from('uap_scan_runs').insert({
                channel_id: playlist.channel_id || null,
                run_type: 'playlist_discover',
                completed_at: new Date().toISOString(),
                videos_discovered: 0,
                error: err.message,
            });
        }
    }

    // Log the run
    await supabase.from('uap_scan_runs').insert({
        channel_id: playlist?.channel_id || null,
        run_type: 'playlist_discover',
        completed_at: new Date().toISOString(),
        videos_discovered: discovered,
        videos_processed: 0,
        videos_accepted: 0,
        videos_rejected: 0,
        videos_failed: 0,
    });

    console.log(`[UAP Scanner/PlaylistDiscover] ${playlist?.playlist_title ?? 'no playlist'}: ${discovered} discovered, ${queued} queued (${Date.now() - startTime}ms)`);

    return {
        playlist: playlist ? { id: playlist.playlist_id, title: playlist.playlist_title, channelName: playlist.channel_name } : null,
        discovered,
        queued,
        durationMs: Date.now() - startTime,
    };
}

/**
 * Resolve a YouTube playlist URL or ID to metadata.
 * Fetches the first page to get playlist title and channel info.
 */
export async function resolvePlaylistMetadata(playlistId: string): Promise<{
    playlistId: string;
    title: string;
    channelId: string | null;
    channelName: string | null;
    videoCount: number;
} | null> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error('YOUTUBE_API_KEY environment variable is not set');

    // Use playlists.list to get metadata
    const url = new URL('https://www.googleapis.com/youtube/v3/playlists');
    url.searchParams.set('part', 'snippet,contentDetails');
    url.searchParams.set('id', playlistId);
    url.searchParams.set('key', apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`YouTube playlists.list error (${res.status}): ${body}`);
    }

    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;

    return {
        playlistId: item.id,
        title: item.snippet?.title || 'Untitled Playlist',
        channelId: item.snippet?.channelId || null,
        channelName: item.snippet?.channelTitle || null,
        videoCount: item.contentDetails?.itemCount || 0,
    };
}

/**
 * Extract a playlist ID from various YouTube URL formats.
 * Handles:
 *   - https://www.youtube.com/playlist?list=PLxxxxxx
 *   - https://youtube.com/watch?v=xxx&list=PLxxxxxx
 *   - Raw playlist ID: PLxxxxxx
 */
export function extractPlaylistId(input: string): string | null {
    const trimmed = input.trim();

    // Direct playlist ID (PL..., OL..., UU..., etc.)
    if (/^[A-Za-z0-9_-]{10,}$/.test(trimmed) && !trimmed.includes('/')) {
        return trimmed;
    }

    try {
        const url = new URL(trimmed);
        return url.searchParams.get('list') || null;
    } catch {
        // Not a URL — treat as raw ID if it looks plausible
        if (trimmed.startsWith('PL') || trimmed.startsWith('UU') || trimmed.startsWith('OL')) {
            return trimmed;
        }
        return null;
    }
}
