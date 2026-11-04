/**
 * Case search for Short Maker: semantic, keyword or hybrid, grouped by video.
 *
 * The site's search RPCs return transcript moments, so one long interview can fill a
 * page. Here moments are grouped by video, each video keeps its best few, and videos are
 * ranked by their best match (hybrid merges the two rankings by reciprocal rank).
 * Read-only: two existing RPCs plus the selects in build-case.ts. No migration.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { wrapAiClient } from '@/lib/ai/usage-tracker';
import { buildCase, fetchCaseRows, momentFrom, passesFilters } from './build-case';
import type { SearchParams } from './params';
import type { Case, Moment } from './types';

export const EMBED_MODEL = 'text-embedding-3-small';
export const CANDIDATE_MOMENTS = 200;
export const MOMENTS_PER_CASE = 3;
const RRF_K = 60;

interface RpcMoment {
    content: string | null;
    start_time: number | null;
    video_id: string;
    similarity?: number | null;
}

export interface Grouped {
    videoId: string;
    score: number;
    moments: Moment[];
}

/** Group moments by video in rank order; each video keeps its first `perCase` moments. */
export function groupByVideo(rows: RpcMoment[], scoreOf: (row: RpcMoment, index: number) => number): Grouped[] {
    const by = new Map<string, Grouped>();
    rows.forEach((row, i) => {
        if (!row.video_id || !row.content) return;
        let g = by.get(row.video_id);
        if (!g) {
            g = { videoId: row.video_id, score: scoreOf(row, i), moments: [] };
            by.set(row.video_id, g);
        }
        if (g.moments.length < MOMENTS_PER_CASE) {
            g.moments.push(momentFrom(row.video_id, row.content, row.start_time, row.similarity ?? null));
        }
    });
    return [...by.values()];
}

/** Reciprocal-rank fusion of two video rankings; moments are merged, semantic first. */
export function mergeRankings(semantic: Grouped[], keyword: Grouped[]): Grouped[] {
    const out = new Map<string, Grouped>();
    const add = (list: Grouped[]) =>
        list.forEach((g, rank) => {
            const prev = out.get(g.videoId);
            const rrf = 1 / (RRF_K + rank + 1);
            if (!prev) {
                out.set(g.videoId, { videoId: g.videoId, score: rrf, moments: [...g.moments] });
                return;
            }
            prev.score += rrf;
            for (const m of g.moments) {
                if (prev.moments.length >= MOMENTS_PER_CASE) break;
                if (!prev.moments.some((x) => x.start_seconds === m.start_seconds)) prev.moments.push(m);
            }
        });
    add(semantic);
    add(keyword);
    return [...out.values()].sort((a, b) => b.score - a.score);
}

function rpcFilters(p: SearchParams) {
    return {
        filter_experience_type: p.experience_type.length ? p.experience_type : null,
        filter_trigger_category: p.trigger.length ? p.trigger : null,
        filter_overall_tone: p.tone.length ? p.tone : null,
        filter_intensity_min: p.min_intensity,
        filter_intensity_max: null,
        filter_greyson_min: null,
        filter_transformation_min: null,
        filter_veridical_min: p.min_veridical,
    };
}

async function semanticMoments(supabase: SupabaseClient, p: SearchParams): Promise<RpcMoment[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('Missing OpenAI API key');
    const openai = wrapAiClient(new OpenAI({ apiKey }), { provider: 'openai', operation: 'shortmaker-research' });
    const embedding = await openai.embeddings.create({ model: EMBED_MODEL, input: p.q, encoding_format: 'float' });
    const { data, error } = await supabase.rpc('search_punctuated_embeddings_filtered', {
        query_embedding: embedding.data[0].embedding,
        similarity_threshold: p.min_similarity,
        sort_column: 'similarity',
        sort_direction: 'DESC',
        page_limit: CANDIDATE_MOMENTS,
        page_offset: 0,
        ...rpcFilters(p),
    });
    if (error) throw new Error(`semantic search failed: ${error.message}`);
    return (data ?? []) as RpcMoment[];
}

async function keywordMoments(supabase: SupabaseClient, p: SearchParams): Promise<RpcMoment[]> {
    const { data, error } = await supabase.rpc('keyword_search_videos', {
        search_query: p.q,
        sort_column: 'relevance',
        sort_direction: 'DESC',
        page_limit: CANDIDATE_MOMENTS,
        page_offset: 0,
        filter_channel_name: null,
        ...rpcFilters(p),
    });
    if (error) throw new Error(`keyword search failed: ${error.message}`);
    return (data ?? []) as RpcMoment[];
}

export async function searchCases(supabase: SupabaseClient, p: SearchParams): Promise<Case[]> {
    const [sem, kw] = await Promise.all([
        p.mode === 'keyword' ? Promise.resolve([]) : semanticMoments(supabase, p),
        p.mode === 'semantic' ? Promise.resolve([]) : keywordMoments(supabase, p),
    ]);

    const semGroups = groupByVideo(sem, (row) => row.similarity ?? 0);
    const kwGroups = groupByVideo(kw, (_row, i) => 1 / (1 + i));
    const ranked =
        p.mode === 'semantic' ? semGroups : p.mode === 'keyword' ? kwGroups : mergeRankings(semGroups, kwGroups);

    // Over-read so filters applied after the read still leave `limit` cases.
    const candidates = ranked.slice(0, Math.min(100, p.limit * 4));
    const rows = await fetchCaseRows(
        supabase,
        candidates.map((c) => c.videoId),
    );

    const cases: Case[] = [];
    for (const c of candidates) {
        const r = rows.get(c.videoId);
        if (!r) continue;
        const built = buildCase(r, { score: Math.round(c.score * 10000) / 10000, moments: c.moments });
        if (passesFilters(r, built, p)) cases.push(built);
    }
    if (p.sort === 'views') cases.sort((a, b) => (b.source.views ?? 0) - (a.source.views ?? 0));
    return cases.slice(0, p.limit);
}
