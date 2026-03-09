import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Supabase client with service key for server-side operations
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/** Convert a URL slug back into a human-readable question */
function slugToQuestion(slug: string): string {
    return slug
        .split('-')
        .map((word, i) => (i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
        .join(' ')
        .replace(/\s*\?$/, '') + '?';
}

/** Generate a question-specific hypothetical ideal answer via GPT — used to produce a focused embedding (HyDE trick).
 *  This is the crucial step: a generic placeholder would make EVERY question return the same top chunks. */
async function buildHypotheticalAnswer(openai: OpenAI, question: string): Promise<string> {
    const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 200,
        messages: [
            {
                role: 'system',
                content:
                    'You are an expert in near-death experiences. Write a concise, specific 2-3 sentence ideal NDE account ' +
                    'that would perfectly answer the given question. Use first-person witnessing language as if you are an NDE researcher ' +
                    'summarising what experiencers report. Be concrete and specific to the question — do NOT give a generic NDE overview.',
            },
            { role: 'user', content: question },
        ],
    });
    return resp.choices[0].message.content ?? question;
}

/** Format large viewcount numbers as readable strings like "1.2M" */
function formatViewCount(count: number | null | bigint): string {
    if (!count) return '0';
    const n = typeof count === 'bigint' ? Number(count) : count;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return `${n}`;
}

// ─── Shape returned by nde_questions_match RPC ───────────────────────────────
interface MatchedMoment {
    id: number;
    content: string;
    similarity: number;
    start_time: number;    // Real column — always present
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

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;

    try {
        const openai = getOpenAI();
        const question = slugToQuestion(slug);

        // Step 1: Generate a question-specific hypothetical ideal answer for HyDE embedding
        // IMPORTANT: must be async + question-specific or every question gets the same embedding
        const hypotheticalAnswer = await buildHypotheticalAnswer(openai, question);
        const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: hypotheticalAnswer,
        });
        const embedding = embeddingResponse.data[0].embedding;

        // Step 2: Semantic search via nde_questions_match (queries nde_punctuated_embeddings)
        // This RPC returns start_time as a real column — no metadata parsing needed.
        const { data: matchedMoments, error: rpcError } = await supabase.rpc('nde_questions_match', {
            query_embedding: embedding,
            match_count: 20,
        });

        if (rpcError) {
            console.error('[Questions API] RPC error:', rpcError);
            return NextResponse.json({ error: 'Search failed', details: rpcError.message }, { status: 500 });
        }

        const moments = (matchedMoments ?? []) as MatchedMoment[];

        if (moments.length === 0) {
            return NextResponse.json({ error: 'No results found' }, { status: 404 });
        }

        // Step 3: Group moments by video_id, sort within each group by similarity desc
        const videoMomentsMap: Record<string, MatchedMoment[]> = {};
        for (const moment of moments) {
            const vid = moment.video_id;
            if (!vid) continue;
            if (!videoMomentsMap[vid]) videoMomentsMap[vid] = [];
            videoMomentsMap[vid].push(moment);
        }
        // Sort within each video group: highest similarity first
        for (const vid of Object.keys(videoMomentsMap)) {
            videoMomentsMap[vid].sort((a, b) => b.similarity - a.similarity);
        }

        // Step 4: Sort videos by their best moment similarity
        const sortedVideoIds = Object.entries(videoMomentsMap)
            .map(([vid, moms]) => ({
                vid,
                bestSimilarity: moms[0].similarity,  // already sorted, so first = best
                moments: moms,
                meta: moms[0],  // all moments for a video share same meta fields
            }))
            .sort((a, b) => b.bestSimilarity - a.bestSimilarity);

        const referencedVids = sortedVideoIds.slice(0, 4);
        const moreVids = sortedVideoIds.slice(4);

        // Step 5: Synthesize answer via GPT-4o using the top transcript snippets
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

        // Step 6: Build the response structure matching the existing QuestionAnswer interface
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
                start_time: m.start_time,  // Real column — no more 00:00
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
                // Cache for 24 hours
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
