/**
 * The experiencer list for Short Maker: published experiencer profiles by total views (as
 * projectprofound.org/experiencer shows them), a page at a time, each with the videos the research
 * API can serve. Read-only: selects on experiencer_profiles, nde_vids, nde_analysis and channels.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { channelUrl, safetyFlags, youtubeUrl } from './build-case';
import type { ExperiencersParams } from './params';
import { API_VERSION, SITE_URL, type Experiencer, type ExperiencerVideo, type ExperiencersResponse } from './types';

/** Videos per `.in()` read, to keep each request's URL short. */
const CHUNK = 150;
const SERVED_NDE = ['clear_nde', 'possible_nde'];

interface ProfileListRow {
    slug: string;
    full_name: string | null;
    video_ids: string[] | null;
    total_views: number | string | null;
}

interface VidListRow {
    videoId: string;
    title: string | null;
    channelId: string | null;
    channelName: string | null;
    date: string | null;
    viewCount: number | string | null;
    isNde: string | null;
    analysis_nde_summary: string | null;
}

const toNumber = (v: unknown): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

const chunks = <T>(list: T[], size: number): T[][] =>
    Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

async function readAll<T>(read: (ids: string[]) => PromiseLike<{ data: unknown; error: { message: string } | null }>, ids: string[], what: string): Promise<T[]> {
    const out: T[] = [];
    for (const part of chunks(ids, CHUNK)) {
        const { data, error } = await read(part);
        if (error) throw new Error(`${what} read failed: ${error.message}`);
        out.push(...((data ?? []) as T[]));
    }
    return out;
}

export async function listExperiencers(supabase: SupabaseClient, p: ExperiencersParams): Promise<ExperiencersResponse> {
    const from = (p.page - 1) * p.limit;
    const [count, page] = await Promise.all([
        supabase.from('experiencer_profiles').select('id', { count: 'exact', head: true }).not('published_at', 'is', null),
        supabase
            .from('experiencer_profiles')
            .select('slug,full_name,video_ids,total_views')
            .not('published_at', 'is', null)
            .order('total_views', { ascending: false, nullsFirst: false })
            .order('slug', { ascending: true })
            .range(from, from + p.limit - 1),
    ]);
    if (count.error) throw new Error(`experiencer_profiles count failed: ${count.error.message}`);
    if (page.error) throw new Error(`experiencer_profiles read failed: ${page.error.message}`);
    const profiles = (page.data ?? []) as ProfileListRow[];

    const ids = [...new Set(profiles.flatMap((r) => r.video_ids ?? []))];
    const [vids, analyses] = await Promise.all([
        readAll<VidListRow>(
            (part) => supabase.from('nde_vids').select('videoId,title,channelId,channelName,date,viewCount,isNde,analysis_nde_summary').in('videoId', part),
            ids,
            'nde_vids',
        ),
        readAll<{ video_id: string; content_safety: unknown }>(
            (part) => supabase.from('nde_analysis').select('video_id,content_safety').in('video_id', part),
            ids,
            'nde_analysis',
        ),
    ]);
    const channelIds = [...new Set(vids.map((v) => v.channelId).filter((x): x is string => !!x))];
    const channels = await readAll<{ channel_id: string; name: string | null; custom_url: string | null; hidden: boolean | null }>(
        (part) => supabase.from('channels').select('channel_id,name,custom_url,hidden').in('channel_id', part),
        channelIds,
        'channels',
    );

    const vidBy = new Map(vids.map((v) => [v.videoId, v]));
    const safetyBy = new Map(analyses.map((a) => [a.video_id, safetyFlags(a.content_safety).flags]));
    const channelBy = new Map(channels.map((c) => [c.channel_id, c]));

    const experiencers: Experiencer[] = profiles
        .filter((r) => r.full_name?.trim())
        .map((r) => {
            const videos: ExperiencerVideo[] = (r.video_ids ?? []).flatMap((id) => {
                const v = vidBy.get(id);
                const channel = v?.channelId ? channelBy.get(v.channelId) : undefined;
                if (!v || !v.isNde || !SERVED_NDE.includes(v.isNde) || channel?.hidden) return [];
                return [
                    {
                        video_id: v.videoId,
                        title: v.title,
                        channel_name: channel?.name ?? v.channelName,
                        channel_url: channelUrl(v.channelId, channel?.custom_url ?? null),
                        video_url: youtubeUrl(v.videoId),
                        pp_url: `${SITE_URL}/video/${v.videoId}`,
                        views: toNumber(v.viewCount),
                        published_at: v.date ? v.date.slice(0, 10) : null,
                        summary: v.analysis_nde_summary,
                        safety_flags: safetyBy.get(v.videoId) ?? [],
                    },
                ];
            });
            videos.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
            return {
                slug: r.slug,
                name: r.full_name!.trim(),
                profile_url: `${SITE_URL}/experiencer/${r.slug}`,
                total_views: toNumber(r.total_views) ?? 0,
                videos,
            };
        });

    return { api_version: API_VERSION, total: count.count ?? 0, page: p.page, limit: p.limit, experiencers };
}
