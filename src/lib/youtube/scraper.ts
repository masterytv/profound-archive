/**
 * YouTube Video & Channel Metadata Scraper
 * 
 * Centralized module for YouTube API interactions.
 * Handles URL parsing, video metadata fetching, and channel enrichment.
 * 
 * Why: Consolidates YouTube API logic that was previously spread across
 * scripts/enrich-channels.ts and ad-hoc API calls.
 */

import { logQuota } from '@/lib/ai/usage-tracker';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VideoMetadata {
    videoId: string;
    title: string | null;
    description: string | null;
    channelId: string | null;
    channelName: string | null;
    channelUrl: string | null;
    channelUsername: string | null;
    viewCount: number | null;
    likes: number | null;
    commentsCount: number | null;
    duration: string | null;
    date: string | null;
    thumbnailUrl: string | null;
    url: string;
}

export interface ChannelMetadata {
    channel_id: string;
    name: string;
    description: string | null;
    avatar_url: string | null;
    banner_url: string | null;
    custom_url: string | null;
    country: string | null;
    subscriber_count: number | null;
    total_video_count: number | null;
    total_view_count: number | null;
    published_at: string | null;
    fetched_at: string;
    uploads_playlist_id: string | null;
}

// ─── URL Parsing ─────────────────────────────────────────────────────────────

/**
 * Extract a YouTube video ID from any common URL format.
 * Supports: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/, youtube.com/embed/
 * 
 * @returns The 11-character video ID, or null if parsing fails
 */
export function parseYouTubeUrl(url: string): string | null {
    if (!url) return null;

    const trimmed = url.trim();

    // Pattern 1: youtu.be/VIDEO_ID
    const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) return shortMatch[1];

    // Pattern 2: youtube.com/watch?v=VIDEO_ID
    const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch) return watchMatch[1];

    // Pattern 3: youtube.com/shorts/VIDEO_ID
    const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) return shortsMatch[1];

    // Pattern 4: youtube.com/embed/VIDEO_ID
    const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];

    // Pattern 5: youtube.com/v/VIDEO_ID
    const vMatch = trimmed.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/);
    if (vMatch) return vMatch[1];

    // Pattern 6: Bare video ID (exactly 11 chars, valid characters)
    const bareMatch = trimmed.match(/^[a-zA-Z0-9_-]{11}$/);
    if (bareMatch) return bareMatch[0];

    return null;
}

// ─── Video Metadata ──────────────────────────────────────────────────────────

/**
 * Fetch video metadata from YouTube Data API v3.
 * 
 * @throws Error if the API key is missing or the API call fails
 */
export async function fetchVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error('Missing YOUTUBE_API_KEY environment variable');

    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'snippet,statistics,contentDetails');
    url.searchParams.set('id', videoId);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    void logQuota({ provider: 'youtube', operation: 'youtube.videos', quantity: 1, status: response.ok ? 'success' : 'error', metadata: { videoId } });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`YouTube Videos API error ${response.status}: ${body}`);
    }

    const data = await response.json();
    const items = data.items;

    if (!items || items.length === 0) {
        // Video doesn't exist, is private, or has been removed
        return null;
    }

    const item = items[0];
    const snippet = item.snippet || {};
    const stats = item.statistics || {};
    const details = item.contentDetails || {};
    const thumbnails = snippet.thumbnails || {};

    return {
        videoId,
        title: snippet.title || null,
        description: snippet.description || null,
        channelId: snippet.channelId || null,
        channelName: snippet.channelTitle || null,
        channelUrl: snippet.channelId ? `https://www.youtube.com/channel/${snippet.channelId}` : null,
        channelUsername: null, // Resolved during channel enrichment
        viewCount: stats.viewCount ? parseInt(stats.viewCount, 10) : null,
        likes: stats.likeCount ? parseInt(stats.likeCount, 10) : null,
        commentsCount: stats.commentCount ? parseInt(stats.commentCount, 10) : null,
        duration: details.duration || null, // ISO 8601 format: PT1H2M3S
        date: snippet.publishedAt || null,
        thumbnailUrl: thumbnails.maxres?.url || thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || null,
        url: `https://www.youtube.com/watch?v=${videoId}`,
    };
}

// ─── Channel Metadata ────────────────────────────────────────────────────────

/**
 * Resolve a YouTube channel URL, @handle, or custom URL to a channel_id.
 * Supports:
 *   - Direct channel ID: UCxxxxxx
 *   - @handle: @NearDeathExperience
 *   - Channel URL: youtube.com/channel/UCxxxxxx
 *   - Custom URL: youtube.com/c/ChannelName or youtube.com/@Handle
 *
 * @returns The resolved channel_id, or null if not found
 */
export async function resolveChannelId(input: string): Promise<string | null> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error('Missing YOUTUBE_API_KEY environment variable');

    const trimmed = input.trim();

    // Pattern 1: Direct channel ID (starts with UC and is ~24 chars)
    if (/^UC[a-zA-Z0-9_-]{22}$/.test(trimmed)) {
        return trimmed;
    }

    // Pattern 2: youtube.com/channel/UCxxxxx URL
    const channelUrlMatch = trimmed.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/);
    if (channelUrlMatch) {
        return channelUrlMatch[1];
    }

    // Pattern 3: @handle (bare or in a URL)
    let handle: string | null = null;
    const handleFromUrl = trimmed.match(/youtube\.com\/@([a-zA-Z0-9_.-]+)/);
    if (handleFromUrl) {
        handle = handleFromUrl[1];
    } else if (trimmed.startsWith('@')) {
        handle = trimmed.slice(1);
    }

    if (handle) {
        // Use forHandle param (YouTube Data API v3)
        const url = new URL('https://www.googleapis.com/youtube/v3/channels');
        url.searchParams.set('part', 'id');
        url.searchParams.set('forHandle', handle);
        url.searchParams.set('key', apiKey);

        const response = await fetch(url.toString());
        void logQuota({ provider: 'youtube', operation: 'youtube.channels', quantity: 1, status: response.ok ? 'success' : 'error', metadata: { resolve: 'handle' } });
        if (response.ok) {
            const data = await response.json();
            if (data.items?.length > 0) {
                return data.items[0].id;
            }
        }
        return null;
    }

    // Pattern 4: youtube.com/c/CustomName (legacy custom URL)
    const customUrlMatch = trimmed.match(/youtube\.com\/c\/([a-zA-Z0-9_.-]+)/);
    if (customUrlMatch) {
        // Search by custom URL — use search API as fallback
        const url = new URL('https://www.googleapis.com/youtube/v3/search');
        url.searchParams.set('part', 'snippet');
        url.searchParams.set('q', customUrlMatch[1]);
        url.searchParams.set('type', 'channel');
        url.searchParams.set('maxResults', '1');
        url.searchParams.set('key', apiKey);

        const response = await fetch(url.toString());
        void logQuota({ provider: 'youtube', operation: 'youtube.search', quantity: 100, status: response.ok ? 'success' : 'error', metadata: { resolve: 'customUrl' } });
        if (response.ok) {
            const data = await response.json();
            if (data.items?.length > 0) {
                return data.items[0].snippet?.channelId || data.items[0].id?.channelId || null;
            }
        }
        return null;
    }

    // Pattern 5: Bare string — could be a handle without @, try forHandle
    if (/^[a-zA-Z0-9_.-]+$/.test(trimmed) && trimmed.length > 3) {
        const url = new URL('https://www.googleapis.com/youtube/v3/channels');
        url.searchParams.set('part', 'id');
        url.searchParams.set('forHandle', trimmed);
        url.searchParams.set('key', apiKey);

        const response = await fetch(url.toString());
        void logQuota({ provider: 'youtube', operation: 'youtube.channels', quantity: 1, status: response.ok ? 'success' : 'error', metadata: { resolve: 'bareHandle' } });
        if (response.ok) {
            const data = await response.json();
            if (data.items?.length > 0) {
                return data.items[0].id;
            }
        }
    }

    return null;
}

/**
 * Fetch channel metadata from YouTube Data API v3.
 * Includes contentDetails for uploads_playlist_id (required for scanner).
 */
export async function fetchChannelMetadata(channelId: string): Promise<ChannelMetadata | null> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error('Missing YOUTUBE_API_KEY environment variable');

    const url = new URL('https://www.googleapis.com/youtube/v3/channels');
    url.searchParams.set('part', 'snippet,brandingSettings,statistics,contentDetails');
    url.searchParams.set('id', channelId);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    void logQuota({ provider: 'youtube', operation: 'youtube.channels', quantity: 1, status: response.ok ? 'success' : 'error', metadata: { channelId } });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`YouTube Channels API error ${response.status}: ${body}`);
    }

    const data = await response.json();
    const items = data.items;

    if (!items || items.length === 0) return null;

    const ch = items[0];
    const snippet = ch.snippet || {};
    const thumbnails = snippet.thumbnails || {};
    const branding = ch.brandingSettings || {};
    const stats = ch.statistics || {};
    const contentDetails = ch.contentDetails || {};

    const avatar = thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || null;

    return {
        channel_id: channelId,
        name: snippet.title || 'Unknown',
        description: snippet.description || null,
        avatar_url: avatar,
        banner_url: branding.image?.bannerExternalUrl || null,
        custom_url: snippet.customUrl || null,
        country: snippet.country || null,
        subscriber_count: stats.subscriberCount ? parseInt(stats.subscriberCount, 10) : null,
        total_video_count: stats.videoCount ? parseInt(stats.videoCount, 10) : null,
        total_view_count: stats.viewCount ? parseInt(stats.viewCount, 10) : null,
        published_at: snippet.publishedAt || null,
        fetched_at: new Date().toISOString(),
        uploads_playlist_id: contentDetails.relatedPlaylists?.uploads || null,
    };
}
