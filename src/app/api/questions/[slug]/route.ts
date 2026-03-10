import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Use service key — needed to read nde_questions and user_questions
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

// OpenRouter client — OpenAI SDK-compatible, just different baseURL + key.
// Switch model here to change the synthesis model.
const getOpenRouter = () => new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY!,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
        'HTTP-Referer': 'https://projectprofound.org',
        'X-Title': 'Project Profound',
    },
});

/** Format large view counts as readable strings like "1.2M" */
function formatViewCount(count: number | null | bigint): string {
    if (!count) return '0';
    const n = typeof count === 'bigint' ? Number(count) : count;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return `${n}`;
}

// ─── Shape returned by search_punctuated_embeddings_filtered RPC ─────────────
interface FilteredChunk {
    id: number;
    content: string;
    start_time: number;
    similarity: number;
    video_id: string;
    url: string;
    title: string | null;
    thumbnailUrl: string | null;
    date: string | null;
    viewCount: number | null;
    channelName: string | null;
    analysis_nde_summary: string | null;
}

/**
 * Similarity thresholds:
 * Both curated and user questions now use 0.50.
 * - Curated: backed by a pre-written HyDE passage (LEARNINGS.md §17C).
 * - User: backed by a GPT-4o-mini HyDE passage generated at submission time.
 * Both are rich NDE passages in the same vector space as the corpus.
 */
const MIN_SIMILARITY_CURATED = 0.50;
const MIN_SIMILARITY_USER    = 0.50;

// ─── Deduplication helpers ────────────────────────────────────────────────────

interface VideoGroup {
    video_id: string;
    bestSimilarity: number;
    meta: FilteredChunk;
    chunks: FilteredChunk[];
}

/**
 * Deduplicate chunk-level RPC results into unique videos.
 *
 * - Groups all chunks by video_id.
 * - Caps transcript snippets per video at MAX_CHUNKS_PER_VIDEO to prevent
 *   one very popular video from dominating the transcript section.
 * - Sorts the deduplicated video list by best chunk similarity (DESC).
 */
const MAX_CHUNKS_PER_VIDEO = 3;

function deduplicateByVideo(chunks: FilteredChunk[]): VideoGroup[] {
    const map = new Map<string, VideoGroup>();

    for (const chunk of chunks) {
        const vid = chunk.video_id;
        if (!vid) continue;

        if (!map.has(vid)) {
            map.set(vid, {
                video_id: vid,
                bestSimilarity: chunk.similarity,
                meta: chunk,
                chunks: [chunk],
            });
        } else {
            const group = map.get(vid)!;
            if (chunk.similarity > group.bestSimilarity) {
                group.bestSimilarity = chunk.similarity;
                group.meta = chunk;
            }
            if (group.chunks.length < MAX_CHUNKS_PER_VIDEO) {
                group.chunks.push(chunk);
            }
        }
    }

    // RPC already returns chunks sorted by similarity DESC, but re-sort after
    // grouping to ensure deduplicated video order reflects best chunk score.
    return Array.from(map.values()).sort((a, b) => b.bestSimilarity - a.bestSimilarity);
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;

    try {
        const openai = getOpenRouter();

        // ── Step 1: Look up question + ai_query from either table ──────────────
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
            question  = curated.consumer_question;
            ai_query  = curated.ai_query;
            isCurated = true;
        } else {
            // Fall back to user_questions (custom questions submitted via the search bar)
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

        // Option A: embed question + ai_query combined so literal keywords from the
        // question (e.g. "accidents", "suddenly") anchor the vector alongside the HyDE passage.
        const embeddingInput = `${question} ${ai_query}`;
        const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: embeddingInput,
        });
        const embedding = embeddingResponse.data[0].embedding;

        // ── Step 3: Semantic search via search_punctuated_embeddings_filtered ───
        // This RPC applies the similarity threshold in SQL and has no hard chunk
        // cap (unlike the old nde_questions_match which always returned exactly 20).
        // We request up to 200 chunks, then deduplicate to unique videos in app code.
        const similarityThreshold = isCurated ? MIN_SIMILARITY_CURATED : MIN_SIMILARITY_USER;

        const { data: rawChunks, error: rpcError } = await supabase.rpc(
            'search_punctuated_embeddings_filtered',
            {
                query_embedding:         embedding,
                similarity_threshold:    similarityThreshold,
                sort_column:             'similarity',
                sort_direction:          'DESC',
                page_limit:              200,
                page_offset:             0,
                filter_experience_type:  null,
                filter_trigger_category: null,
                filter_overall_tone:     null,
                filter_intensity_min:    null,
                filter_intensity_max:    null,
                filter_greyson_min:      null,
                filter_transformation_min: null,
                filter_veridical_min:    null,
            }
        );

        if (rpcError) {
            console.error('[Questions API] RPC error:', rpcError);
            return NextResponse.json(
                { error: 'Search failed', details: rpcError.message },
                { status: 500 }
            );
        }

        const chunks = (rawChunks ?? []) as FilteredChunk[];

        // ── Step 4: No-results guard ───────────────────────────────────────────
        if (chunks.length === 0) {
            return NextResponse.json({ no_results: true, question, slug, best_similarity: 0 });
        }

        // ── Step 5: Deduplicate chunks → unique videos (sorted by similarity) ──
        const deduped = deduplicateByVideo(chunks);

        const referencedVids = deduped.slice(0, 4);   // hero section: top 4
        const moreVids       = deduped.slice(4, 20);  // table: next 16

        // ── Step 6: Synthesize answer via Claude ──────────────────────────────
        // Number the videos [1]-[N] so Claude cites by number only.
        // The page renderer replaces [1] → real /video/[id] link from structured data.
        // Claude never writes a URL or title — zero hallucination risk.
        const contextForGPT = referencedVids.map(({ meta, chunks: vidChunks }, i) => {
            const topSnippets = vidChunks.slice(0, 2).map(c => c.content).join('\n');
            return `[${i + 1}] ${meta.title ?? meta.video_id}\n${topSnippets}`;
        }).join('\n\n---\n\n');

        const systemPrompt = `You are a compassionate friend who has spent years reading thousands of near-death experience accounts.
Someone you truly care about just asked you a vulnerable question. You want to answer it honestly, warmly, and in a way they will actually feel.

You have access to real first-person NDE accounts, numbered [1] through [${referencedVids.length}].
Answer based ONLY on what those accounts say. Do not add spiritual commentary or theology of your own.

Voice and style:
- Write like Malcolm Gladwell if he were your best friend: concrete, specific, human, page-turning.
- Use real moments and names from the accounts, not vague summaries.
- Short sentences land hard. Use them. Then let a longer sentence open things up.
- Aim for 8th-grade reading level. No academic jargon. Plain, direct, vivid English.
- You are talking TO someone, not writing FOR publication.
- Do NOT start with "Based on the accounts" or "The accounts show". Start in the middle of an idea.
- Do NOT use em dashes (—) or double dashes (--). Use commas, parentheses, or colons instead.
- Do not moralize or editorialize. Let the accounts speak for themselves.

Paragraph structure:
- Write exactly 3 paragraphs, each 3 to 5 sentences.
- Paragraph 1: Start with one sentence of compassionate framing that acknowledges why this question matters (without restating the question or saying "you are asking"). This can be an observation about what NDErs report on this topic, or a gentle acknowledgment that many people carry this question. Then bring in one specific, vivid moment from the accounts that speaks to it. The framing sentence comes first, the story follows. Never start cold with a person's name or "One man/woman...".
- Paragraph 2: Broaden to what is consistent across multiple accounts. Find the pattern.
- Paragraph 3: End with what this means for the person asking. Human, grounded, never preachy.

Citations:
- When you draw on a specific account, insert its number marker immediately after the claim: [1], [2], etc.
- Use only numbers [1] through [${referencedVids.length}]. Do not write out video titles.
- Do not cite every sentence. Only cite when the detail genuinely comes from a specific account.

Return ONLY a valid JSON object in this exact structure, no markdown wrapping:
{
  "shortAnswer": "One self-contained sentence that directly answers the question. 20-30 words. Start with the subject, not 'NDEs show' or 'According to'. Must make sense if read alone, out of context.",
  "paragraphs": ["paragraph 1 text", "paragraph 2 text", "paragraph 3 text"]
}`;

        let shortAnswer = '';
        let paragraphs: string[] = [];

        try {
            // Pass an independent signal so the Claude call can't be killed by
            // the route handler's abort (triggered by Turbopack HMR in dev mode).
            const gptResponse = await getOpenRouter().chat.completions.create(
                {
                    model: 'anthropic/claude-sonnet-4-5',
                    temperature: 0.7,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        {
                            role: 'user',
                            content: `Question: ${question}\n\nNDE Accounts:\n\n${contextForGPT}`,
                        },
                        // ── Assistant prefill ──────────────────────────────────
                        // Claude ignores response_format. The only reliable way to
                        // force JSON output is to start the assistant turn with '{'
                        // so the model *continues* rather than starting fresh prose.
                        // The response will be the tail of the JSON (no opening brace),
                        // so we prepend '{' back before parsing below.
                        { role: 'assistant', content: '{' },
                    ],
                },
                // Claude Sonnet on OpenRouter is ~2-3× slower than GPT-4o.
                // Our context (4 videos × 2 chunks) is long; 55s timed out intermittently.
                // 90s gives adequate headroom without hanging the route for too long.
                { signal: AbortSignal.timeout(90_000) },
            );


            // Guard: OpenRouter can return empty choices on rate-limit or content filter
            if (!gptResponse.choices?.length) {
                console.error('[Questions API] Empty choices from OpenRouter. Full response:', JSON.stringify(gptResponse).substring(0, 500));
                paragraphs = ['Unable to generate answer at this time.'];
            } else {
                // Extract JSON by anchoring to the first '{' and last '}' in the response.
                // This handles ALL Claude formatting variants:
                //   - plain JSON
                //   - ```json ... ``` code fences
                //   - preamble text like "Here's the JSON:" before the brace
                //   - trailing notes after the closing brace
                // The assistant prefill sent '{' as the start; the model response is the
                // remainder of the JSON. Reconstruct the full JSON string before parsing.
                const rawContent = '{' + (gptResponse.choices[0].message.content ?? '');
                const firstBrace = rawContent.indexOf('{');
                const lastBrace  = rawContent.lastIndexOf('}');

                if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
                    console.error('[Questions API] No JSON object found in response. Raw (500 chars):', rawContent.substring(0, 500));
                    paragraphs = ['Unable to generate answer at this time.'];
                } else {
                    const jsonStr = rawContent.slice(firstBrace, lastBrace + 1);
                    try {
                        const parsed  = JSON.parse(jsonStr);
                        shortAnswer = parsed.shortAnswer ?? '';
                        paragraphs  = Array.isArray(parsed.paragraphs) ? parsed.paragraphs : [];
                    } catch (parseErr) {
                        // Separate parse failures from timeout failures so logs are actionable
                        console.error('[Questions API] JSON.parse failed. jsonStr (500 chars):', jsonStr.substring(0, 500));
                        console.error('[Questions API] Parse error:', parseErr instanceof Error ? parseErr.message : String(parseErr));
                        paragraphs = ['Unable to generate answer at this time.'];
                    }
                }
            }
        } catch (e) {
            // Log everything so we can see what OpenRouter actually returned
            const isAbort = e instanceof Error && e.name === 'AbortError';
            console.error(
                `[Questions API] Synthesis ${isAbort ? 'aborted' : 'failed'}:`,
                e instanceof Error ? `${e.name}: ${e.message}` : String(e),
            );
            paragraphs = ['Unable to generate answer at this time.'];
        }

        // ── Step 7: Build response shape (matches QuestionAnswer interface in page.tsx) ─
        const referencedVideos = referencedVids.map(({ video_id, meta, chunks: vidChunks }) => ({
            video_id,
            url: meta.url ?? `https://www.youtube.com/watch?v=${video_id}`,
            title: meta.title ?? 'NDE Account',
            thumbnailUrl: meta.thumbnailUrl ?? `https://i.ytimg.com/vi/${video_id}/hqdefault.jpg`,
            date: meta.date ?? null,
            viewCount: formatViewCount(meta.viewCount),
            channelName: meta.channelName ?? 'Unknown Channel',
            summary: meta.analysis_nde_summary ?? vidChunks[0]?.content ?? '',
            transcripts: vidChunks.slice(0, 3).map(c => ({
                content: c.content,
                start_time: c.start_time,
                similarity: c.similarity,
            })),
        }));

        const moreVideos = moreVids.map(({ video_id, meta, chunks: vidChunks }) => ({
            video_id,
            title: meta.title ?? 'NDE Account',
            channelName: meta.channelName ?? 'Unknown Channel',
            thumbnailUrl: meta.thumbnailUrl ?? `https://i.ytimg.com/vi/${video_id}/hqdefault.jpg`,
            viewCount: meta.viewCount ?? 0,
            date: meta.date ?? null,
            // Top matching chunk — DB-sourced, not LLM-generated.
            // The page renders this as a blockquote with a timestamped link.
            quote: vidChunks[0]?.content ?? null,
            startTime: vidChunks[0]?.start_time ?? null,
            relevance: vidChunks[0]?.similarity ?? 0,
        }));

        const result = {
            slug,
            question,
            ai_query,            // raw HyDE passage
            embedding_input: embeddingInput,  // ← question + ai_query combined (what was actually embedded)
            shortAnswer,
            answer: {
                paragraphs,
                citedVideoIds: referencedVids.map(v => v.video_id),
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
