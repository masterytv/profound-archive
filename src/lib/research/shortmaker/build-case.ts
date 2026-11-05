/**
 * Reads the rows behind a set of videos and maps them to the Short Maker Case shape.
 *
 * Read-only: only selects on nde_vids, nde_analysis, experiencer_profiles and channels.
 * Columns are listed explicitly so the large transcript columns are fetched only when a
 * detail request asks for them.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractSegments, type TimestampedSegment } from '@/lib/ai/format-timestamped-transcript';
import { matchQuoteToTimestamp } from '@/lib/ai/match-quote-timestamp';
import type { CaseFilters } from './params';
import {
    ELEMENT_LABELS,
    PERMISSION_NOTE,
    SITE_URL,
    type Case,
    type CaseDetail,
    type CaseElement,
    type Moment,
} from './types';

export const ELEMENT_MIN_CONFIDENCE = 60;
export const QUOTE_MAX_WORDS = 25;
export const MOMENT_MAX_CHARS = 300;

export interface VidRow {
    videoId: string;
    title: string | null;
    channelId: string | null;
    channelName: string | null;
    date: string | null;
    viewCount: number | null;
    experiencerFullName: string | null;
    isNde: string | null;
    analysis_nde_summary: string | null;
    rvnde_total_score: number | null;
    rvnde_level: string | null;
    rvnde_summary_reason: string | null;
    raw_timestamped_subtitles?: unknown;
}

export interface AnalysisRow {
    video_id: string;
    experience_type: string | null;
    trigger_category: string | null;
    trigger_description: string | null;
    overall_tone: string | null;
    intensity_rating: number | null;
    journey_nde_type: string | null;
    core_elements: unknown;
    total_greyson_score: number | null;
    transformation_score: number | null;
    content_safety: unknown;
    journey_sequence?: unknown;
    entities?: unknown;
}

export interface ProfileRow {
    slug: string;
    full_name: string | null;
    video_ids: string[] | null;
    social_links: unknown;
}

export interface ChannelRow {
    channel_id: string;
    name: string | null;
    custom_url: string | null;
    hidden: boolean | null;
}

export interface CaseRows {
    vid: VidRow;
    analysis: AnalysisRow | null;
    profile: ProfileRow | null;
    channel: ChannelRow | null;
}

const VID_COLUMNS =
    'videoId,title,channelId,channelName,date,viewCount,experiencerFullName,isNde,' +
    'analysis_nde_summary,rvnde_total_score,rvnde_level,rvnde_summary_reason';
const ANALYSIS_COLUMNS =
    'video_id,experience_type,trigger_category,trigger_description,overall_tone,intensity_rating,' +
    'journey_nde_type,core_elements,total_greyson_score,transformation_score,content_safety';

export const youtubeUrl = (videoId: string, seconds?: number | null) =>
    `https://www.youtube.com/watch?v=${videoId}` + (seconds != null ? `&t=${Math.floor(seconds)}s` : '');

export function channelUrl(channelId: string | null, customUrl: string | null): string | null {
    if (customUrl) return `https://www.youtube.com/${customUrl.startsWith('@') ? customUrl : '@' + customUrl}`;
    if (channelId) return `https://www.youtube.com/channel/${channelId}`;
    return null;
}

/** Cut text to at most `max` characters at a word boundary, adding an ellipsis when cut. */
export function clipText(text: string, max: number): string {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (clean.length <= max) return clean;
    const cut = clean.slice(0, max - 1);
    const space = cut.lastIndexOf(' ');
    return (space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, '') + '…';
}

/** Keep at most `max` words of a quote, adding an ellipsis when cut. */
export function clipWords(text: string, max: number): string {
    const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    if (words.length <= max) return words.join(' ');
    return words.slice(0, max).join(' ').replace(/[,;:.]+$/, '') + '…';
}

interface RawElement {
    name?: unknown;
    present?: unknown;
    confidence?: unknown;
    quote?: unknown;
}

/** core_elements is normally an array of {name,present,confidence,quote}; tolerate an object keyed by name. */
export function readCoreElements(raw: unknown): RawElement[] {
    let value = raw;
    if (typeof value === 'string') {
        try {
            value = JSON.parse(value);
        } catch {
            return [];
        }
    }
    if (Array.isArray(value)) return value as RawElement[];
    if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        if (Array.isArray(obj.elements)) return obj.elements as RawElement[];
        return Object.entries(obj).map(([name, v]) => ({ name, ...(v && typeof v === 'object' ? v : {}) }));
    }
    return [];
}

export function presentElements(raw: unknown, segments: TimestampedSegment[] | null): CaseElement[] {
    return readCoreElements(raw)
        .filter((e) => e.present === true && typeof e.name === 'string')
        .map((e) => {
            const key = e.name as string;
            const confidence = typeof e.confidence === 'number' ? e.confidence : 0;
            const fullQuote = typeof e.quote === 'string' ? e.quote.trim() : '';
            return {
                key,
                label: ELEMENT_LABELS[key] ?? key,
                confidence,
                quote: clipWords(fullQuote, QUOTE_MAX_WORDS),
                start_seconds: segments && fullQuote ? (matchQuoteToTimestamp(fullQuote, segments) ?? null) : null,
            };
        })
        .filter((e) => e.confidence >= ELEMENT_MIN_CONFIDENCE)
        .sort((a, b) => b.confidence - a.confidence);
}

export function safetyFlags(raw: unknown): { warning_level: string | null; flags: string[] } {
    let value = raw;
    if (typeof value === 'string') {
        try {
            value = JSON.parse(value);
        } catch {
            value = null;
        }
    }
    const obj = (value && typeof value === 'object' ? value : {}) as {
        warning_level?: unknown;
        flags?: Record<string, unknown>;
    };
    const flags = obj.flags && typeof obj.flags === 'object' ? obj.flags : {};
    return {
        warning_level: typeof obj.warning_level === 'string' ? obj.warning_level : null,
        flags: Object.entries(flags)
            .filter(([, v]) => v === true)
            .map(([k]) => k),
    };
}

function readLinks(raw: unknown): Record<string, string> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof v === 'string' && /^https?:\/\//.test(v)) out[k] = v;
    }
    return out;
}

const toNumber = (v: unknown): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

export function buildCase(rows: CaseRows, match: Case['match'] = null, segments: TimestampedSegment[] | null = null): Case {
    const { vid, analysis, profile, channel } = rows;
    const name = profile?.full_name?.trim() || vid.experiencerFullName?.trim() || null;
    return {
        case_id: `nde:${vid.videoId}`,
        video_id: vid.videoId,
        match,
        experiencer: {
            name,
            profile_slug: profile?.slug ?? null,
            profile_url: profile ? `${SITE_URL}/experiencer/${profile.slug}` : null,
            links: readLinks(profile?.social_links),
            other_video_count: profile?.video_ids ? Math.max(0, profile.video_ids.length - 1) : 0,
        },
        source: {
            platform: 'youtube',
            title: vid.title,
            channel_name: channel?.name ?? vid.channelName,
            channel_id: vid.channelId,
            channel_url: channelUrl(vid.channelId, channel?.custom_url ?? null),
            video_url: youtubeUrl(vid.videoId),
            published_at: vid.date ? vid.date.slice(0, 10) : null,
            views: toNumber(vid.viewCount),
            pp_url: `${SITE_URL}/video/${vid.videoId}`,
        },
        summary: vid.analysis_nde_summary,
        classification: {
            experience_type: analysis?.experience_type ?? null,
            trigger_category: analysis?.trigger_category ?? null,
            trigger_description: analysis?.trigger_description ?? null,
            overall_tone: analysis?.overall_tone ?? null,
            intensity: toNumber(analysis?.intensity_rating),
            journey_type: analysis?.journey_nde_type ?? null,
        },
        elements: presentElements(analysis?.core_elements, segments),
        scores: {
            greyson: toNumber(analysis?.total_greyson_score),
            transformation: toNumber(analysis?.transformation_score),
            veridical: toNumber(vid.rvnde_total_score),
            veridical_level: vid.rvnde_level,
            veridical_reason: vid.rvnde_summary_reason,
        },
        content_safety: safetyFlags(analysis?.content_safety),
        permission: { status: 'none_on_file', note: PERMISSION_NOTE },
    };
}

/** The filters that can only be applied after the rows are read. */
export function passesFilters(rows: CaseRows, built: Case, f: CaseFilters): boolean {
    const allowedNde = f.include_possible ? ['clear_nde', 'possible_nde'] : ['clear_nde'];
    if (!rows.vid.isNde || !allowedNde.includes(rows.vid.isNde)) return false;
    if (rows.channel?.hidden) return false;
    if (f.named_only && !built.experiencer.name) return false;
    const c = built.classification;
    if (f.experience_type.length && !f.experience_type.includes(c.experience_type ?? '')) return false;
    if (f.trigger.length && !f.trigger.includes(c.trigger_category ?? '')) return false;
    if (f.tone.length && !f.tone.includes(c.overall_tone ?? '')) return false;
    if (f.min_intensity != null && (c.intensity ?? 0) < f.min_intensity) return false;
    if (f.min_veridical != null && (built.scores.veridical ?? 0) < f.min_veridical) return false;
    if (f.element.length) {
        const have = new Set(built.elements.map((e) => e.key));
        if (!f.element.every((k) => have.has(k))) return false;
    }
    if (f.exclude_flags.length && built.content_safety.flags.some((fl) => f.exclude_flags.includes(fl))) return false;
    return true;
}

export interface FetchOptions {
    transcript?: boolean;
    journey?: boolean;
    encounters?: boolean;
}

/** Batch-read everything needed to build cases for these video IDs. Missing videos are skipped. */
export async function fetchCaseRows(
    supabase: SupabaseClient,
    videoIds: string[],
    opts: FetchOptions = {},
): Promise<Map<string, CaseRows>> {
    const out = new Map<string, CaseRows>();
    if (!videoIds.length) return out;

    const vidCols = VID_COLUMNS + (opts.transcript ? ',raw_timestamped_subtitles' : '');
    const anCols =
        ANALYSIS_COLUMNS + (opts.journey ? ',journey_sequence' : '') + (opts.encounters ? ',entities' : '');

    const [vids, analyses, profiles] = await Promise.all([
        supabase.from('nde_vids').select(vidCols).in('videoId', videoIds),
        supabase.from('nde_analysis').select(anCols).in('video_id', videoIds),
        supabase
            .from('experiencer_profiles')
            .select('slug,full_name,video_ids,social_links')
            .not('published_at', 'is', null)
            .overlaps('video_ids', videoIds),
    ]);
    if (vids.error) throw new Error(`nde_vids read failed: ${vids.error.message}`);
    if (analyses.error) throw new Error(`nde_analysis read failed: ${analyses.error.message}`);
    if (profiles.error) throw new Error(`experiencer_profiles read failed: ${profiles.error.message}`);

    const vidRows = (vids.data ?? []) as unknown as VidRow[];
    const channelIds = [...new Set(vidRows.map((v) => v.channelId).filter((x): x is string => !!x))];
    const channels = channelIds.length
        ? await supabase.from('channels').select('channel_id,name,custom_url,hidden').in('channel_id', channelIds)
        : { data: [], error: null };
    if (channels.error) throw new Error(`channels read failed: ${channels.error.message}`);

    const analysisBy = new Map(((analyses.data ?? []) as unknown as AnalysisRow[]).map((a) => [a.video_id, a]));
    const channelBy = new Map(((channels.data ?? []) as ChannelRow[]).map((c) => [c.channel_id, c]));
    const profileRows = (profiles.data ?? []) as ProfileRow[];

    for (const vid of vidRows) {
        const profile = profileRows.find((p) => p.video_ids?.includes(vid.videoId)) ?? null;
        out.set(vid.videoId, {
            vid,
            analysis: analysisBy.get(vid.videoId) ?? null,
            profile,
            channel: vid.channelId ? (channelBy.get(vid.channelId) ?? null) : null,
        });
    }
    return out;
}

export function readJourney(raw: unknown): NonNullable<CaseDetail['journey']> {
    const list = Array.isArray(raw) ? raw : [];
    return list
        .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
        .map((s) => ({
            order: typeof s.order === 'number' ? s.order : 0,
            element: typeof s.element === 'string' ? s.element : 'unknown',
            excerpt: typeof s.excerpt === 'string' ? clipWords(s.excerpt, QUOTE_MAX_WORDS) : null,
        }))
        .sort((a, b) => a.order - b.order);
}

export function readEncounters(raw: unknown): NonNullable<CaseDetail['encounters']> {
    let value = raw;
    if (typeof value === 'string') {
        try {
            value = JSON.parse(value);
        } catch {
            value = null;
        }
    }
    const list = (value as { encounters?: unknown } | null)?.encounters;
    if (!Array.isArray(list)) return [];
    const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
    return list
        .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
        .map((e) => ({
            entity_type: str(e.entity_type),
            identity: str(e.identity),
            emotional_quality: str(e.emotional_quality),
            message_summary: str(e.message_summary),
            message_quote: str(e.message_quote) ? clipWords(String(e.message_quote), QUOTE_MAX_WORDS) : null,
        }));
}

/** A full Case with the optional detail sections. */
export function buildCaseDetail(rows: CaseRows, opts: FetchOptions): CaseDetail {
    const segments = extractSegments(rows.vid.raw_timestamped_subtitles);
    const detail: CaseDetail = buildCase(rows, null, segments);
    if (opts.journey) detail.journey = readJourney(rows.analysis?.journey_sequence);
    if (opts.encounters) detail.encounters = readEncounters(rows.analysis?.entities);
    if (opts.transcript) {
        detail.transcript = {
            segments: (segments ?? [])
                .filter((s) => typeof s?.text === 'string')
                .map((s) => ({ start: Number(s.start) || 0, end: Number(s.end) || 0, text: s.text })),
        };
    }
    return detail;
}

export function momentFrom(videoId: string, text: string, start: number | null, similarity: number | null): Moment {
    return {
        text: clipText(text, MOMENT_MAX_CHARS),
        start_seconds: start != null ? Math.floor(start) : null,
        url: youtubeUrl(videoId, start),
        similarity: similarity != null ? Math.round(similarity * 1000) / 1000 : null,
    };
}
