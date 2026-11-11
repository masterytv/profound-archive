/**
 * Short Maker research API: /api/research/cases, /api/research/cases/[videoId], /api/research/counts.
 * Supabase and OpenAI are mocked at the module boundary; nothing reaches a real service.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

type Call = { method: string; args: unknown[] };
type Handler = (table: string, calls: Call[]) => { data: unknown; error: { message: string } | null };

const h = vi.hoisted(() => ({
    handler: null as unknown as Handler,
    rpc: vi.fn(),
    embed: vi.fn(),
}));

function builder(table: string) {
    const calls: Call[] = [];
    const b: Record<string, unknown> = {};
    for (const m of ['select', 'in', 'not', 'overlaps', 'order', 'range', 'filter', 'textSearch', 'eq']) {
        b[m] = (...args: unknown[]) => {
            calls.push({ method: m, args });
            return b;
        };
    }
    b.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
        try {
            return Promise.resolve(h.handler(table, calls)).then(resolve, reject);
        } catch (e) {
            return Promise.reject(e).then(resolve, reject);
        }
    };
    return b;
}

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({ from: (t: string) => builder(t), rpc: h.rpc })),
}));

vi.mock('openai', () => ({
    default: class {
        embeddings = { create: h.embed };
    },
}));

vi.mock('@/lib/ai/usage-tracker', () => ({ wrapAiClient: (c: unknown) => c }));

import { GET as searchGET } from '@/app/api/research/cases/route';
import { GET as caseGET } from '@/app/api/research/cases/[videoId]/route';
import { GET as countsGET } from '@/app/api/research/counts/route';
import { GET as experiencersGET } from '@/app/api/research/experiencers/route';
import { resetRateLimit } from '@/lib/rate-limit';
import { clearCountsCache } from '@/lib/research/shortmaker/counts';
import { clipWords, mergeRankingsForTest } from './shortmaker-helpers';
import {
    CaseResponseSchema,
    CountsResponseSchema,
    ExperiencersResponseSchema,
    SearchResponseSchema,
} from '@/lib/research/shortmaker/types';

const KEY = 'test-shortmaker-key';
const AUTH = { authorization: `Bearer ${KEY}` };

const get = (url: string, headers: Record<string, string> = AUTH) =>
    new NextRequest(`https://example.org${url}`, { headers });

const ID_A = 'aaaaaaaaaaa';
const ID_B = 'bbbbbbbbbbb';
const ID_HIDDEN = 'hhhhhhhhhhh';
const ID_UNNAMED = 'uuuuuuuuuuu';

const longQuote = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen ' +
    'seventeen eighteen nineteen twenty twenty-one twenty-two twenty-three twenty-four twenty-five twenty-six twenty-seven';

const VIDS = [
    { videoId: ID_A, title: 'A', channelId: 'C1', channelName: 'Chan One', date: '2024-05-02T00:00:00Z', viewCount: 100, experiencerFullName: 'Anne Example', isNde: 'clear_nde', analysis_nde_summary: 'Summary A', rvnde_total_score: 12, rvnde_level: 'Strong', rvnde_summary_reason: 'Saw a shoe', raw_timestamped_subtitles: { data: [{ start: 10, end: 14, text: 'I saw my uncle there' }, { start: 14, end: 18, text: 'I did not know he had died' }] } },
    { videoId: ID_B, title: 'B', channelId: 'C1', channelName: 'Chan One', date: null, viewCount: 5000, experiencerFullName: 'Bob Example', isNde: 'clear_nde', analysis_nde_summary: 'Summary B', rvnde_total_score: 3, rvnde_level: null, rvnde_summary_reason: null },
    { videoId: ID_HIDDEN, title: 'H', channelId: 'C2', channelName: 'Gone', date: null, viewCount: 9, experiencerFullName: 'Hidden Person', isNde: 'clear_nde', analysis_nde_summary: null, rvnde_total_score: null, rvnde_level: null, rvnde_summary_reason: null },
    { videoId: ID_UNNAMED, title: 'U', channelId: 'C1', channelName: 'Chan One', date: null, viewCount: 1, experiencerFullName: null, isNde: 'clear_nde', analysis_nde_summary: null, rvnde_total_score: null, rvnde_level: null, rvnde_summary_reason: null },
];

const ANALYSES = [
    { video_id: ID_A, experience_type: 'nde', trigger_category: 'near_drowning', trigger_description: 'Drowned', overall_tone: 'very_positive', intensity_rating: 9, journey_nde_type: 'positive', total_greyson_score: 27, transformation_score: 34,
      core_elements: [
          { name: 'deceased_relatives', present: true, confidence: 90, quote: 'I saw my uncle there, I did not know he had died' },
          { name: 'life_review', present: true, confidence: 40, quote: 'low confidence' },
          { name: 'tunnel', present: false, confidence: 95, quote: '' },
      ],
      content_safety: { overall_safe: true, flags: { suicide_related: false, distressing_content: true }, warning_level: 'mild' },
      journey_sequence: [{ order: 2, element: 'deceased_relatives', excerpt: 'my uncle', confidence: 0.9 }, { order: 1, element: 'observing_body', excerpt: 'above me', confidence: 0.9 }],
      entities: { encounters: [{ entity_type: 'deceased_relative', identity: 'uncle', emotional_quality: 'loving', message_summary: 'go back', message_quote: longQuote }] } },
    { video_id: ID_B, experience_type: 'nde', trigger_category: 'surgery', trigger_description: null, overall_tone: 'positive', intensity_rating: 7, journey_nde_type: 'positive', total_greyson_score: 20, transformation_score: 20,
      core_elements: [{ name: 'life_review', present: true, confidence: 80, quote: longQuote }],
      content_safety: { flags: { suicide_related: true } } },
    { video_id: ID_HIDDEN, experience_type: 'nde', trigger_category: null, trigger_description: null, overall_tone: null, intensity_rating: null, journey_nde_type: null, total_greyson_score: null, transformation_score: null, core_elements: [], content_safety: null },
    { video_id: ID_UNNAMED, experience_type: 'nde', trigger_category: null, trigger_description: null, overall_tone: null, intensity_rating: null, journey_nde_type: null, total_greyson_score: null, transformation_score: null, core_elements: [], content_safety: null },
];

const PROFILES = [{ slug: 'anne-example', full_name: 'Anne Example', video_ids: [ID_A, 'zzzzzzzzzzz'], social_links: { website: 'https://anne.example', bad: 'javascript:alert(1)' } }];
const CHANNELS = [
    { channel_id: 'C1', name: 'Chan One', custom_url: '@chanone', hidden: false },
    { channel_id: 'C2', name: 'Gone', custom_url: null, hidden: true },
];

function inValues(calls: Call[], col: string): string[] | null {
    const c = calls.find((x) => x.method === 'in' && x.args[0] === col);
    return c ? (c.args[1] as string[]) : null;
}

function defaultHandler(table: string, calls: Call[]) {
    if (table === 'nde_vids') {
        const ids = inValues(calls, 'videoId');
        const isNde = inValues(calls, 'isNde');
        let rows = VIDS;
        if (ids) rows = rows.filter((v) => ids.includes(v.videoId));
        if (isNde) rows = rows.filter((v) => isNde.includes(v.isNde));
        return { data: rows, error: null };
    }
    if (table === 'nde_analysis') {
        const ids = inValues(calls, 'video_id');
        return { data: ids ? ANALYSES.filter((a) => ids.includes(a.video_id)) : ANALYSES, error: null };
    }
    if (table === 'experiencer_profiles') return { data: PROFILES, error: null };
    if (table === 'channels') return { data: CHANNELS, error: null };
    return { data: [], error: null };
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.SHORTMAKER_API_KEY = KEY;
    resetRateLimit();
    clearCountsCache();
    h.handler = defaultHandler;
    h.embed.mockResolvedValue({ data: [{ embedding: [0.1, 0.2] }] });
    h.rpc.mockImplementation(async (fn: string) => {
        if (fn === 'search_punctuated_embeddings_filtered') {
            return {
                data: [
                    { content: 'B moment one', start_time: 30.6, video_id: ID_B, similarity: 0.71 },
                    { content: 'A moment one', start_time: 10.2, video_id: ID_A, similarity: 0.66 },
                    { content: 'B moment two', start_time: 50, video_id: ID_B, similarity: 0.6 },
                    { content: 'hidden', start_time: 1, video_id: ID_HIDDEN, similarity: 0.59 },
                    { content: 'unnamed', start_time: 1, video_id: ID_UNNAMED, similarity: 0.58 },
                ],
                error: null,
            };
        }
        if (fn === 'keyword_search_videos') {
            return { data: [{ content: 'A keyword moment', start_time: 12, video_id: ID_A }], error: null };
        }
        return { data: null, error: { message: 'unknown rpc' } };
    });
});

describe('auth', () => {
    it('refuses a missing or wrong key on every route', async () => {
        for (const headers of [{}, { authorization: 'Bearer nope' }, { 'x-api-key': KEY }] as Record<string, string>[]) {
            expect((await searchGET(get('/api/research/cases?q=life review', headers))).status).toBe(401);
            expect((await caseGET(get(`/api/research/cases/${ID_A}`, headers), { params: Promise.resolve({ videoId: ID_A }) })).status).toBe(401);
            expect((await countsGET(get('/api/research/counts?element=life_review', headers))).status).toBe(401);
        }
        expect(h.rpc).not.toHaveBeenCalled();
    });

    it('is closed when SHORTMAKER_API_KEY is unset', async () => {
        delete process.env.SHORTMAKER_API_KEY;
        expect((await searchGET(get('/api/research/cases?q=life review'))).status).toBe(401);
    });
});

describe('GET /api/research/cases', () => {
    it('groups moments by video, ranks, and drops hidden and unnamed cases', async () => {
        const res = await searchGET(get('/api/research/cases?q=met a relative&mode=semantic'));
        expect(res.status).toBe(200);
        expect(res.headers.get('cache-control')).toBe('no-store');
        const body = SearchResponseSchema.parse(await res.json());
        expect(body.cases.map((c) => c.video_id)).toEqual([ID_B, ID_A]);
        const b = body.cases[0];
        expect(b.match?.moments.map((m) => m.start_seconds)).toEqual([30, 50]);
        expect(b.match?.moments[0].url).toBe(`https://www.youtube.com/watch?v=${ID_B}&t=30s`);
        expect(b.content_safety.flags).toEqual(['suicide_related']);
        expect(b.permission.status).toBe('none_on_file');
    });

    it('maps a case: experiencer, links, elements over the confidence floor, trimmed quotes', async () => {
        const body = SearchResponseSchema.parse(await (await searchGET(get('/api/research/cases?q=met a relative&mode=semantic'))).json());
        const a = body.cases.find((c) => c.video_id === ID_A)!;
        expect(a.experiencer).toEqual({
            name: 'Anne Example',
            profile_slug: 'anne-example',
            profile_url: 'https://projectprofound.org/experiencer/anne-example',
            links: { website: 'https://anne.example' },
            other_video_count: 1,
        });
        expect(a.source.channel_url).toBe('https://www.youtube.com/@chanone');
        expect(a.source.pp_url).toBe(`https://projectprofound.org/video/${ID_A}`);
        expect(a.source.published_at).toBe('2024-05-02');
        expect(a.elements.map((e) => e.key)).toEqual(['deceased_relatives']);
        const b = body.cases.find((c) => c.video_id === ID_B)!;
        expect(b.elements[0].quote.split(' ').length).toBe(25);
        expect(b.elements[0].quote.endsWith('…')).toBe(true);
    });

    it('applies element and safety filters, and can sort by views', async () => {
        const el = SearchResponseSchema.parse(await (await searchGET(get('/api/research/cases?q=relatives&mode=semantic&element=deceased_relatives'))).json());
        expect(el.cases.map((c) => c.video_id)).toEqual([ID_A]);
        const safe = SearchResponseSchema.parse(await (await searchGET(get('/api/research/cases?q=relatives&mode=semantic&exclude_flags=suicide_related'))).json());
        expect(safe.cases.map((c) => c.video_id)).toEqual([ID_A]);
        const named = SearchResponseSchema.parse(await (await searchGET(get('/api/research/cases?q=relatives&mode=semantic&named_only=false'))).json());
        expect(named.cases.map((c) => c.video_id)).toContain(ID_UNNAMED);
        expect(named.cases.map((c) => c.video_id)).not.toContain(ID_HIDDEN);
        const byViews = SearchResponseSchema.parse(await (await searchGET(get('/api/research/cases?q=relatives&mode=keyword&sort=views'))).json());
        expect(byViews.cases.map((c) => c.video_id)).toEqual([ID_A]);
    });

    it('hybrid mode merges both rankings', async () => {
        const body = SearchResponseSchema.parse(await (await searchGET(get('/api/research/cases?q=relatives'))).json());
        expect(body.cases[0].video_id).toBe(ID_A); // first in keyword, second in semantic
        expect(h.rpc).toHaveBeenCalledTimes(2);
    });

    it('validates input', async () => {
        for (const q of ['?q=ab', '?q=ok query&limit=99', '?q=ok query&mode=magic', '?q=ok query&element=nonsense', '?q=ok query&exclude_flags=foo']) {
            const res = await searchGET(get(`/api/research/cases${q}`));
            expect(res.status).toBe(400);
        }
    });

    it('returns 503 (not an empty 200) when the database fails', async () => {
        h.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
        const res = await searchGET(get('/api/research/cases?q=relatives&mode=semantic'));
        expect(res.status).toBe(503);
        expect(JSON.stringify(await res.json())).not.toContain('boom');
    });
});

describe('GET /api/research/cases/[videoId]', () => {
    const call = (id: string, qs = '') =>
        caseGET(get(`/api/research/cases/${id}${qs}`), { params: Promise.resolve({ videoId: id }) });

    it('returns the full case with journey, encounters, transcript and placed quotes', async () => {
        const res = await call(ID_A, '?include=journey,encounters,transcript');
        expect(res.status).toBe(200);
        const { case: c } = CaseResponseSchema.parse(await res.json());
        expect(c.match).toBeNull();
        expect(c.journey?.map((j) => j.element)).toEqual(['observing_body', 'deceased_relatives']);
        expect(c.encounters?.[0].identity).toBe('uncle');
        expect(c.encounters?.[0].message_quote?.split(' ').length).toBe(25);
        expect(c.transcript?.segments).toHaveLength(2);
        expect(c.elements[0].start_seconds).toBe(10);
    });

    it('leaves out detail sections that were not asked for', async () => {
        const { case: c } = CaseResponseSchema.parse(await (await call(ID_A)).json());
        expect(c.transcript).toBeUndefined();
        expect(c.journey).toBeUndefined();
    });

    it('404s unknown and hidden videos, 400s bad IDs and includes', async () => {
        expect((await call('zzzzzzzzzzz')).status).toBe(404);
        expect((await call(ID_HIDDEN)).status).toBe(404);
        expect((await call('bad id')).status).toBe(400);
        expect((await call(ID_A, '?include=everything')).status).toBe(400);
    });
});

describe('GET /api/research/counts', () => {
    it('counts an element with total, share, method and source line', async () => {
        h.handler = (table, calls) => {
            if (table === 'nde_vids') {
                return { data: [{ videoId: ID_A, viewCount: 100 }, { videoId: ID_B, viewCount: 5000 }, { videoId: ID_UNNAMED, viewCount: 1 }], error: null };
            }
            if (table === 'nde_analysis') {
                const contains = calls.find((c) => c.method === 'filter');
                if (contains) {
                    expect(contains.args).toEqual(['core_elements', 'cs', JSON.stringify([{ name: 'life_review', present: true }])]);
                    return { data: [{ video_id: ID_B }, { video_id: 'notconfirmed' }], error: null };
                }
                return { data: [{ video_id: ID_A }, { video_id: ID_B }], error: null };
            }
            return { data: [], error: null };
        };
        const res = await countsGET(get('/api/research/counts?element=life_review'));
        expect(res.status).toBe(200);
        const body = CountsResponseSchema.parse(await res.json());
        expect(body.count).toBe(1);
        expect(body.total).toBe(2);
        expect(body.share).toBe(50);
        expect(body.example_video_ids).toEqual([ID_B]);
        expect(body.source_line).toMatch(/^Project Profound archive · 2 confirmed NDE accounts · AI-coded, /);
        expect(body.method).toContain('life_review');
    });

    it('counts a phrase as distinct videos over all confirmed videos', async () => {
        h.handler = (table) => {
            if (table === 'nde_vids') return { data: [{ videoId: ID_A, viewCount: 1 }, { videoId: ID_B, viewCount: 2 }], error: null };
            if (table === 'nde_punctuated_embeddings') return { data: [{ video_id: ID_A }, { video_id: ID_A }, { video_id: 'other' }], error: null };
            return { data: [], error: null };
        };
        const body = CountsResponseSchema.parse(await (await countsGET(get('/api/research/counts?phrase=what did you learn'))).json());
        expect(body.count).toBe(1);
        expect(body.total).toBe(2);
        expect(body.source_line).toContain('transcript search');
        expect(body.caveat).toContain('floor');
    });

    it('needs exactly one known measure', async () => {
        for (const q of ['', '?element=life_review&phrase=hello', '?element=nope', '?entity_type=martian']) {
            expect((await countsGET(get(`/api/research/counts${q}`))).status).toBe(400);
        }
    });
});

describe('GET /api/research/experiencers', () => {
    const LIST = [
        { slug: 'bob-example', full_name: 'Bob Example', video_ids: [ID_B, ID_HIDDEN], total_views: '5009' },
        { slug: 'anne-example', full_name: 'Anne Example', video_ids: [ID_A, 'zzzzzzzzzzz'], total_views: 100 },
        { slug: 'no-name', full_name: '  ', video_ids: [], total_views: 1 },
    ];
    let profileCalls: Call[][] = [];
    beforeEach(() => {
        profileCalls = [];
        h.handler = ((table: string, calls: Call[]) => {
            if (table !== 'experiencer_profiles') return defaultHandler(table, calls);
            profileCalls.push(calls);
            const head = calls.some((c) => c.method === 'select' && (c.args[1] as { head?: boolean } | undefined)?.head);
            return head ? { data: null, error: null, count: 2536 } : { data: LIST, error: null };
        }) as Handler;
    });

    it('needs the key', async () => {
        expect((await experiencersGET(get('/api/research/experiencers', {}))).status).toBe(401);
    });

    it('lists published profiles by total views, with their served videos most viewed first', async () => {
        const res = await experiencersGET(get('/api/research/experiencers?page=2&limit=50'));
        expect(res.status).toBe(200);
        expect(res.headers.get('cache-control')).toBe('no-store');
        const body = ExperiencersResponseSchema.parse(await res.json());
        expect(body).toMatchObject({ total: 2536, page: 2, limit: 50 });
        expect(body.experiencers.map((e) => e.slug)).toEqual(['bob-example', 'anne-example']);
        const [bob, anne] = body.experiencers;
        expect(bob.total_views).toBe(5009);
        // The hidden channel's video is left out; flags come from the analysis.
        expect(bob.videos.map((v) => v.video_id)).toEqual([ID_B]);
        expect(bob.videos[0].safety_flags).toEqual(['suicide_related']);
        expect(anne.profile_url).toBe('https://projectprofound.org/experiencer/anne-example');
        expect(anne.videos[0]).toMatchObject({ video_id: ID_A, channel_name: 'Chan One', channel_url: 'https://www.youtube.com/@chanone', views: 100, published_at: '2024-05-02', pp_url: `https://projectprofound.org/video/${ID_A}` });
        const list = profileCalls.find((calls) => calls.some((c) => c.method === 'range'))!;
        expect(list.find((c) => c.method === 'range')?.args).toEqual([50, 99]);
        expect(list.find((c) => c.method === 'order')?.args[0]).toBe('total_views');
        expect(list.some((c) => c.method === 'not' && c.args[0] === 'published_at')).toBe(true);
    });

    it('validates paging and returns 503 when the database fails', async () => {
        expect((await experiencersGET(get('/api/research/experiencers?limit=500'))).status).toBe(400);
        h.handler = () => ({ data: null, error: { message: 'boom' } });
        expect((await experiencersGET(get('/api/research/experiencers'))).status).toBe(503);
    });
});

describe('helpers', () => {
    it('clipWords keeps short quotes whole', () => {
        expect(clipWords('a short quote', 25)).toBe('a short quote');
    });

    it('mergeRankings sums reciprocal ranks', () => {
        expect(mergeRankingsForTest()).toEqual(['x', 'y', 'z']);
    });
});
