import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Use service key — needed to read user_questions (RLS allows it, but anon key fine too)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/** Format large viewcount numbers as readable strings like "1.2M" */
function formatViewCount(count: number | null | bigint): string {
    if (!count) return '0';
    const n = typeof count === 'bigint' ? Number(count) : count;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return `${n}`;
}

// ─── Shape returned by nde_questions_match RPC ────────────────────────────────
interface MatchedMoment {
    id: number;
    content: string;
    similarity: number;
    start_time: number;
    video_id: string;
    video_url: string;
    title: string | null;
    thumbnail: string | null;
    view_count: number | null;
    channel: string | null;
    nde_summary: string | null;
    greyson: string | null;
    date: string | null;
}

/**
 * Similarity thresholds for the no-results guard:
 * - CURATED: lower bar (0.50) because ai_query is a hand-written NDE HyDE passage —
 *   we can trust it's NDE-relevant, so even a moderate match is real evidence.
 * - USER: higher bar (0.58) because ai_query is raw question text — off-topic queries
 *   (cooking, sports, etc.) need a steeper cutoff to fire the no-results page.
 */
const MIN_SIMILARITY_CURATED = 0.50;
const MIN_SIMILARITY_USER    = 0.58;


export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;

    try {
        const openai = getOpenAI();

        // ── Step 1: Look up the question + ai_query from either table ──────────
        // Check nde_questions first (curated, pre-written ai_query)
        let question: string;
        let ai_query: string;
        let isCurated = false;

        const { data: curated } = await supabase
            .from('nde_questions')
            .select('consumer_question, ai_query')
            .eq('slug', slug)
            .eq('is_active', true)
            .maybeSingle();

        if (curated) {
            question = curated.consumer_question;
            ai_query = curated.ai_query;
            isCurated = true;
        } else {
            // Fall back to user_questions
            const { data: userQ } = await supabase
                .from('user_questions')
                .select('question, ai_query')
                .eq('slug', slug)
                .maybeSingle();

            if (!userQ) {
                return NextResponse.json({ error: 'Question not found' }, { status: 404 });
            }
            question = userQ.question;
            ai_query = userQ.ai_query;
        }

        // ── Step 2: Embed the pre-written ai_query (no GPT HyDE call needed) ──
        const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: ai_query,
        });
        const embedding = embeddingResponse.data[0].embedding;

        // ── Step 3: Semantic search via nde_questions_match ───────────────────
        const { data: matchedMoments, error: rpcError } = await supabase.rpc('nde_questions_match', {
            query_embedding: embedding,
            match_count: 20,
        });

        if (rpcError) {
            console.error('[Questions API] RPC error:', rpcError);
            return NextResponse.json({ error: 'Search failed', details: rpcError.message }, { status: 500 });
        }

        const moments = (matchedMoments ?? []) as MatchedMoment[];

        // ── Step 4: No-results guard ──────────────────────────────────────────
        // If there are no moments, or the best similarity is below threshold, bail out
        const bestSimilarity = moments.length > 0 ? moments[0].similarity : 0;
        const minSimilarity = isCurated ? MIN_SIMILARITY_CURATED : MIN_SIMILARITY_USER;
        if (moments.length === 0 || bestSimilarity < minSimilarity) {
            return NextResponse.json({
                no_results: true,
                question,
                slug,
                best_similarity: bestSimilarity,
            });
        }

        // ── Step 5: Group moments by video, sort by similarity ────────────────
        const videoMomentsMap: Record<string, MatchedMoment[]> = {};
        for (const moment of moments) {
            const vid = moment.video_id;
            if (!vid) continue;
            if (!videoMomentsMap[vid]) videoMomentsMap[vid] = [];
            videoMomentsMap[vid].push(moment);
        }
        for (const vid of Object.keys(videoMomentsMap)) {
            videoMomentsMap[vid].sort((a, b) => b.similarity - a.similarity);
        }

        const sortedVideoIds = Object.entries(videoMomentsMap)
            .map(([vid, moms]) => ({
                vid,
                bestSimilarity: moms[0].similarity,
                moments: moms,
                meta: moms[0],
            }))
            .sort((a, b) => b.bestSimilarity - a.bestSimilarity);

        const referencedVids = sortedVideoIds.slice(0, 4);
        const moreVids = sortedVideoIds.slice(4);

        // ── Step 6: Synthesize answer via GPT-4o ──────────────────────────────
        const contextForGPT = referencedVids.map(({ meta, moments }) => {
            const topSnippets = moments.slice(0, 2).map(m => m.content).join('\n');
            return `VIDEO: ${meta.title ?? meta.video_id}\n${topSnippets}`;
        }).join('\n\n---\n\n');

        const systemPrompt = `You are a compassionate and evidence-based NDE (near-death experience) researcher and writer.
You have access to first-person NDE accounts from real people. Write a thoughtful, warm, and well-structured answer 
to the following research question based ONLY on the provided NDE transcript excerpts.

Rules:
- Write exactly 3 paragraphs. Each paragraph should be 3–5 sentences, detailed and rich.
- Ground your answer in the specific accounts provided. Reference experiencers by name when relevant and the accounts support it.
- Do NOT use em dashes (—) or double dashes (--). Use commas, parentheses, or other punctuation instead.
- Do NOT start with "Based on the accounts" or "The accounts show". Start with a direct, flowing statement.
- Use warm, conversational academic tone without jargon.
- Return ONLY a valid JSON object with this exact structure, no markdown wrapping:
{
  "shortAnswer": "one compelling sentence direct answer, 20-30 words",
  "paragraphs": ["paragraph 1 text", "paragraph 2 text", "paragraph 3 text"]
}`;

        const gptResponse = await openai.chat.completions.create({
            model: 'gpt-4o',
            temperature: 0.7,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: systemPrompt },
                {
                    role: 'user',
                    content: `Question: ${question}\n\nNDE Accounts:\n\n${contextForGPT}`
                }
            ]
        });

        let shortAnswer = '';
        let paragraphs: string[] = [];

        try {
            const parsed = JSON.parse(gptResponse.choices[0].message.content ?? '{}');
            shortAnswer = parsed.shortAnswer ?? '';
            paragraphs = Array.isArray(parsed.paragraphs) ? parsed.paragraphs : [];
        } catch {
            console.error('[Questions API] Failed to parse GPT response');
            paragraphs = ['Unable to generate answer at this time.'];
        }

        // ── Step 7: Build the QuestionAnswer response shape ───────────────────
        const referencedVideos = referencedVids.map(({ vid, meta, moments }) => ({
            video_id: vid,
            url: meta.video_url ?? `https://www.youtube.com/watch?v=${vid}`,
            title: meta.title ?? 'NDE Account',
            thumbnailUrl: meta.thumbnail ?? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
            date: meta.date ?? null,
            viewCount: formatViewCount(meta.view_count),
            channelName: meta.channel ?? 'Unknown Channel',
            summary: meta.nde_summary ?? moments[0]?.content ?? '',
            transcripts: moments.slice(0, 3).map(m => ({
                content: m.content,
                start_time: m.start_time,
                similarity: m.similarity,
            })),
        }));

        const moreVideos = moreVids.map(({ vid, meta, moments }) => ({
            video_id: vid,
            title: meta.title ?? 'NDE Account',
            channelName: meta.channel ?? 'Unknown Channel',
            thumbnailUrl: meta.thumbnail ?? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
            viewCount: meta.view_count ?? 0,
            date: meta.date ?? null,
            experienceType: 'NDE',
            tone: 'Positive',
            greysonScore: meta.greyson ? parseFloat(meta.greyson) : null,
            relevance: moments[0]?.similarity ?? 0,
        }));

        const result = {
            slug,
            question,
            shortAnswer,
            answer: {
                paragraphs,
                citedVideoIds: referencedVids.map(v => v.vid),
            },
            referencedVideos,
            moreVideos,
        };

        return NextResponse.json(result, {
            headers: {
                'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
            },
        });

    } catch (err) {
        console.error('[Questions API] Unhandled error:', err);
        return NextResponse.json(
            { error: 'Internal server error', details: err instanceof Error ? err.message : String(err) },
            { status: 500 }
        );
    }
}
