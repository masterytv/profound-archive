/**
 * Channel identity refresh
 *
 * YouTube channels can change their display name and @handle at any time; only
 * the channel ID is permanent. The `channels` row and every `nde_vids` row
 * store a copy of the name taken when the channel/video was first added, so a
 * rename never reached the site on its own (e.g. "About Freedom Show" →
 * "Sergei Davidoff").
 *
 * refreshChannelIdentities() batch-fetches the current title + handle for the
 * given channel IDs (50 per API call, 1 quota unit each) and, for any channel
 * whose name or handle changed, updates `channels` and that channel's
 * `nde_vids` rows. Video-row links are rewritten to the /channel/{id} form so
 * they survive future handle changes.
 */

import { logQuota } from '../ai/usage-tracker';

export interface ChannelIdentity {
    channel_id: string;
    name: string | null;
    custom_url: string | null;
}

export interface IdentityChange {
    channelId: string;
    oldName: string | null;
    newName: string;
    oldHandle: string | null;
    newHandle: string | null;
}

/** The permanent YouTube URL for a channel — unaffected by renames or handle changes. */
export function youtubeChannelUrl(channelId: string): string {
    return `https://www.youtube.com/channel/${channelId}`;
}

/** Fetch current title + handle for up to 50 channel IDs per request. */
export async function fetchChannelIdentities(
    channelIds: string[],
): Promise<Map<string, { title: string; customUrl: string | null }>> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error('Missing YOUTUBE_API_KEY environment variable');

    const result = new Map<string, { title: string; customUrl: string | null }>();
    for (let i = 0; i < channelIds.length; i += 50) {
        const batch = channelIds.slice(i, i + 50);
        const url = new URL('https://www.googleapis.com/youtube/v3/channels');
        url.searchParams.set('part', 'snippet');
        url.searchParams.set('id', batch.join(','));
        url.searchParams.set('maxResults', '50');
        url.searchParams.set('key', apiKey);

        const response = await fetch(url.toString());
        void logQuota({ provider: 'youtube', operation: 'youtube.channels', quantity: 1, status: response.ok ? 'success' : 'error', metadata: { identityRefresh: batch.length } });
        if (!response.ok) {
            throw new Error(`YouTube Channels API error ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();
        for (const item of data.items || []) {
            const title = item.snippet?.title;
            if (item.id && title) {
                result.set(item.id, { title, customUrl: item.snippet?.customUrl || null });
            }
        }
    }
    return result;
}

/** Compare stored identities with what YouTube reports now. Pure — exported for tests. */
export function diffChannelIdentities(
    stored: ChannelIdentity[],
    current: Map<string, { title: string; customUrl: string | null }>,
): IdentityChange[] {
    const changes: IdentityChange[] = [];
    for (const ch of stored) {
        const now = current.get(ch.channel_id);
        // Channel missing from the response (deleted/terminated) — leave it alone.
        if (!now) continue;
        const handleChanged = (now.customUrl || null)?.toLowerCase() !== (ch.custom_url || null)?.toLowerCase();
        if (now.title !== ch.name || handleChanged) {
            changes.push({
                channelId: ch.channel_id,
                oldName: ch.name,
                newName: now.title,
                oldHandle: ch.custom_url,
                newHandle: now.customUrl,
            });
        }
    }
    return changes;
}

/**
 * Refresh name/handle for the given channels. Non-fatal by design: callers
 * should catch and log, never let this block video discovery.
 */
export async function refreshChannelIdentities(
    supabase: any,
    stored: ChannelIdentity[],
): Promise<IdentityChange[]> {
    if (stored.length === 0) return [];

    const current = await fetchChannelIdentities(stored.map((c) => c.channel_id));
    const changes = diffChannelIdentities(stored, current);

    for (const change of changes) {
        const { error: channelError } = await supabase
            .from('channels')
            .update({ name: change.newName, custom_url: change.newHandle })
            .eq('channel_id', change.channelId);
        if (channelError) {
            console.error(`[ChannelIdentity] channels update failed for ${change.channelId}:`, channelError.message);
            continue;
        }

        const { error: vidsError } = await supabase
            .from('nde_vids')
            .update({
                channelName: change.newName,
                channelUrl: youtubeChannelUrl(change.channelId),
                channelUsername: change.newHandle,
            })
            .eq('channelId', change.channelId);
        if (vidsError) {
            console.error(`[ChannelIdentity] nde_vids update failed for ${change.channelId}:`, vidsError.message);
            continue;
        }

        console.log(`[ChannelIdentity] ${change.channelId}: "${change.oldName}" (${change.oldHandle}) → "${change.newName}" (${change.newHandle})`);
    }

    return changes;
}
