/**
 * Archive counts for Short Maker: "1,972 of 6,454 met a deceased relative".
 *
 * Every number on screen must be reproducible, so each response says exactly how it was
 * counted (method), what it is out of (total), when (as_of), the source line to show,
 * and a caveat. Counts are of distinct confirmed NDE videos.
 *
 * Read-only and migration-free: paged selects of IDs only, using jsonb containment on the
 * coded fields and the full-text index on transcript chunks. Results are cached in memory
 * for an hour because the archive changes only a few videos a day.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CountsParams } from './params';
import { API_VERSION, ELEMENT_LABELS, type CountsResponse } from './types';

const PAGE = 1000;
const MAX_PAGES = 60; // 60,000 rows: far above any count the archive can produce today
const CACHE_MS = 60 * 60 * 1000;
const cache = new Map<string, { at: number; value: CountsResponse }>();

/** Exposed for tests. */
export function clearCountsCache() {
    cache.clear();
}

type PageQuery = (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;

/** Read every page of a select. Returns the rows and whether the page cap was hit. */
export async function readAllPages<T>(query: PageQuery): Promise<{ rows: T[]; capped: boolean }> {
    const rows: T[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
        const { data, error } = await query(page * PAGE, page * PAGE + PAGE - 1);
        if (error) throw new Error(error.message);
        const batch = (data ?? []) as T[];
        rows.push(...batch);
        if (batch.length < PAGE) return { rows, capped: false };
    }
    return { rows, capped: true };
}

const monthYear = (d: Date) => d.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const fmt = (n: number) => n.toLocaleString('en-US');

export async function countArchive(supabase: SupabaseClient, p: CountsParams, now = new Date()): Promise<CountsResponse> {
    const key = JSON.stringify(p);
    const hit = cache.get(key);
    if (hit && now.getTime() - hit.at < CACHE_MS) return hit.value;

    const allowed = p.include_possible ? ['clear_nde', 'possible_nde'] : ['clear_nde'];

    // The confirmed videos, with views so examples can be the best-known ones.
    const vids = await readAllPages<{ videoId: string; viewCount: number | null }>((a, b) =>
        supabase.from('nde_vids').select('videoId,viewCount').in('isNde', allowed).order('videoId').range(a, b),
    );
    const views = new Map(vids.rows.map((v) => [v.videoId, Number(v.viewCount) || 0]));

    let matched: string[];
    let base: string[];
    let method: string;
    let caveat: string | null;
    let coded = true;
    let capped = vids.capped;

    if (p.element || p.entity_type) {
        const column = p.element ? 'core_elements' : 'entities';
        const containment = p.element
            ? JSON.stringify([{ name: p.element, present: true }])
            : JSON.stringify({ encounters: [{ entity_type: p.entity_type }] });

        const [all, hits] = await Promise.all([
            readAllPages<{ video_id: string }>((a, b) =>
                supabase.from('nde_analysis').select('video_id').not(column, 'is', null).order('video_id').range(a, b),
            ),
            readAllPages<{ video_id: string }>((a, b) =>
                supabase
                    .from('nde_analysis')
                    .select('video_id')
                    .filter(column, 'cs', containment)
                    .order('video_id')
                    .range(a, b),
            ),
        ]);
        capped = capped || all.capped || hits.capped;
        base = all.rows.map((r) => r.video_id).filter((id) => views.has(id));
        matched = hits.rows.map((r) => r.video_id).filter((id) => views.has(id));
        method = p.element
            ? `nde_analysis.core_elements: "${p.element}" (${ELEMENT_LABELS[p.element]}) marked present, out of confirmed NDE videos with coded core elements`
            : `nde_analysis.entities: at least one encounter coded "${p.entity_type}", out of confirmed NDE videos with coded encounters`;
        caveat =
            'Counted from AI coding of each transcript. Spot checks have found coding errors, so present it as ' +
            'what the archive reports, and treat breakdowns as estimates.';
    } else {
        const phrase = p.phrase as string;
        const hits = await readAllPages<{ video_id: string }>((a, b) =>
            supabase
                .from('nde_punctuated_embeddings')
                .select('video_id')
                .textSearch('search_vector', phrase, { type: 'phrase', config: 'english' })
                .order('id')
                .range(a, b),
        );
        capped = capped || hits.capped;
        base = [...views.keys()];
        matched = [...new Set(hits.rows.map((r) => r.video_id))].filter((id) => views.has(id));
        method = `transcripts containing the phrase "${phrase}" (English stemming), out of all confirmed NDE videos`;
        caveat = 'Counts only this wording; people who said it differently are not counted, so this is a floor.';
        coded = false;
    }

    if (capped) caveat = (caveat ? caveat + ' ' : '') + 'The read hit its page limit, so the count may be low.';

    const unique = [...new Set(matched)];
    const total = new Set(base).size;
    const value: CountsResponse = {
        api_version: API_VERSION,
        query: { ...p },
        count: unique.length,
        total,
        share: total ? Math.round((unique.length / total) * 1000) / 10 : 0,
        unit: 'videos',
        as_of: now.toISOString().slice(0, 10),
        method,
        source_line:
            `Project Profound archive · ${fmt(total)} confirmed NDE accounts · ` +
            (coded ? `AI-coded, ${monthYear(now)}` : `transcript search, ${monthYear(now)}`),
        caveat,
        example_video_ids: unique.sort((a, b) => (views.get(b) ?? 0) - (views.get(a) ?? 0)).slice(0, 5),
    };
    cache.set(key, { at: now.getTime(), value });
    return value;
}
