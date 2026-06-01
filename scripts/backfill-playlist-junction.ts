#!/usr/bin/env npx tsx
'use strict';

/**
 * Backfill uap_playlist_videos junction table
 * 
 * Fetches ALL video IDs from each enabled YouTube playlist and upserts them
 * into the junction table. This gives the get_uap_playlist_video_stats() RPC
 * complete data for accurate Processed/In Archive counts.
 * 
 * Run on Oracle VM (no Vercel timeout limits):
 *   npx tsx scripts/backfill-playlist-junction.ts
 * 
 * Safe to re-run — uses upsert with ON CONFLICT DO NOTHING.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
);

async function fetchAllPlaylistVideoIds(
    playlistId: string,
    apiKey: string,
    maxPages: number = 50,
): Promise<string[]> {
    const allIds: string[] = [];
    let nextPageToken: string | undefined;
    let pages = 0;

    while (pages < maxPages) {
        const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
        url.searchParams.set('part', 'snippet');
        url.searchParams.set('playlistId', playlistId);
        url.searchParams.set('maxResults', '50');
        url.searchParams.set('key', apiKey);
        if (nextPageToken) {
            url.searchParams.set('pageToken', nextPageToken);
        }

        const res = await fetch(url.toString());
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`YouTube API ${res.status}: ${body.slice(0, 200)}`);
        }

        const data = await res.json();
        const items = data.items || [];

        for (const item of items) {
            const videoId = item.snippet?.resourceId?.videoId;
            if (videoId) allIds.push(videoId);
        }

        nextPageToken = data.nextPageToken;
        pages++;

        if (!nextPageToken) break;
    }

    return allIds;
}

async function main() {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        console.error('❌ YOUTUBE_API_KEY not set');
        process.exit(1);
    }

    // Fetch all enabled playlists
    const { data: playlists, error } = await supabase
        .from('uap_playlists')
        .select('playlist_id, playlist_title, channel_id')
        .eq('scanner_enabled', true)
        .order('playlist_title');

    if (error) {
        console.error('❌ Failed to fetch playlists:', error.message);
        process.exit(1);
    }

    if (!playlists || playlists.length === 0) {
        console.log('No enabled playlists found.');
        return;
    }

    console.log(`📋 Found ${playlists.length} enabled playlists\n`);

    let totalMapped = 0;
    let totalErrors = 0;

    for (const pl of playlists) {
        process.stdout.write(`  ${pl.playlist_title} ... `);
        try {
            const videoIds = await fetchAllPlaylistVideoIds(pl.playlist_id, apiKey);

            if (videoIds.length > 0) {
                // Upsert in batches of 100
                const BATCH = 100;
                for (let i = 0; i < videoIds.length; i += BATCH) {
                    const batch = videoIds.slice(i, i + BATCH).map(vid => ({
                        playlist_id: pl.playlist_id,
                        video_id: vid,
                    }));
                    const { error: upsertErr } = await supabase
                        .from('uap_playlist_videos')
                        .upsert(batch, { onConflict: 'playlist_id,video_id', ignoreDuplicates: true });
                    if (upsertErr) {
                        console.error(`\n    ⚠️ Upsert error: ${upsertErr.message}`);
                    }
                }
            }

            // Update video_count on the playlist
            await supabase
                .from('uap_playlists')
                .update({ video_count: videoIds.length })
                .eq('playlist_id', pl.playlist_id);

            console.log(`${videoIds.length} videos`);
            totalMapped += videoIds.length;

            // Small delay between playlists to be polite to YouTube API
            await new Promise(r => setTimeout(r, 500));

        } catch (err: any) {
            console.log(`❌ ${err.message.slice(0, 80)}`);
            totalErrors++;
        }
    }

    console.log(`\n✅ Done: ${totalMapped} video mappings across ${playlists.length} playlists (${totalErrors} errors)`);

    // Verify
    const { data: countRow } = await supabase
        .from('uap_playlist_videos')
        .select('*', { count: 'exact', head: true });
    // Note: count is not returned this way, let's query directly
    const { count } = await supabase
        .from('uap_playlist_videos')
        .select('*', { count: 'exact', head: true });
    console.log(`📊 Total rows in uap_playlist_videos: ${count}`);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
