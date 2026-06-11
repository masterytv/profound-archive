import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { generateHyde, slugToQuestion } from '@/lib/questions/question-utils';
import { checkRateLimit } from '@/lib/rate-limit';
import { wrapAiClient } from '@/lib/ai/usage-tracker';
import { assertWithinBudget } from '@/lib/ai/budget';

export const dynamic = 'force-dynamic';

// Use service key — needed to read nde_questions and user_questions
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

// OpenRouter client — OpenAI SDK-compatible, just different baseURL + key.
// Switch model here to change the synthesis model. Wrapped so every call is
// recorded under the 'questions-autogen' operation (S-13 cost driver).
const getOpenRouter = () => wrapAiClient(new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY!,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
        'HTTP-Referer': 'https://projectprofound.org',
        'X-Title': 'Project Profound',
    },
}), { provider: 'openrouter', operation: 'questions-autogen' });

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

// ─── Auto-generation rate limiter (S-13) ──────────────────────────────────────
// The global cap is enforced against the database, not process memory: every
// generation inserts a row into user_questions, so counting rows created in the
// trailing hour IS the shared store. It survives cold starts and is shared
// across instances under autoscaling. (The count also includes questions
// submitted via /api/questions/custom — both paths spend AI credits, so one
// global generation budget is the point.) A cheap per-IP in-memory limiter
// runs first so a single client can't even reach the DB check repeatedly.
const AUTO_GEN_LIMIT = 10; // max per hour, global
const PER_IP_LIMIT = { name: 'questions-autogen', windowMs: 60_000, max: 5 };

/**
 * Global persistent cap. Fails CLOSED on query errors — an unknown count must
 * not open unbounded paid generation.
 *
 * Known bounded race: requests that pass this check concurrently (before any
 * of their inserts land) can overshoot the cap by the number in flight during
 * one generation's latency; every overshoot still inserts a row, so the
 * window self-corrects. Acceptable for a 10/hr spend bound.
 */
async function checkAutoGenRateLimit(): Promise<{ allowed: boolean; count: number }> {
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count, error } = await supabase
        .from('user_questions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', oneHourAgo);

    if (error) {
        console.error('[Questions API] Auto-gen limit query failed (failing closed):', error.message);
        return { allowed: false, count: -1 };
    }
    return { allowed: (count ?? 0) < AUTO_GEN_LIMIT, count: count ?? 0 };
}

/** Log rate limit event so admins are notified (App Hosting logs + DB row for admin dashboard) */
async function notifyAdminsRateLimit(slug: string, countInWindow: number) {
    console.warn(`[Questions API] ⚠️ AUTO-GEN RATE LIMIT HIT — slug="${slug}", ${countInWindow} generations in the last hour`);
    try {
        await supabase.from('rate_limit_events').insert({
            endpoint: '/api/questions/[slug]',
            slug,
            event_type: 'auto_gen_question',
            count_in_window: countInWindow,
            window_hours: 1,
        });
    } catch (err) {
        // Non-fatal — table may not exist yet, log to console instead
        console.error('[Questions API] Failed to log rate limit event to DB:', err);
    }
}

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
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;

    try {
        const openai = getOpenRouter();

        // ── Step 1: Look up question + ai_query from either table ──────────────
        let question: string;
        let ai_query: string;
        let isCurated = false;
        let questionId: number | null = null;
        let userQuestionId: number | null = null;

        const { data: curated } = await supabase
            .from('nde_questions')
            .select('id, consumer_question, ai_query')
            .eq('slug', slug)
            .eq('is_active', true)
            .maybeSingle();

        if (curated) {
            question   = curated.consumer_question;
            ai_query   = curated.ai_query;
            isCurated  = true;
            questionId = curated.id;
        } else {
            // Fall back to user_questions (custom questions submitted via the search bar)
            const { data: userQ } = await supabase
                .from('user_questions')
                .select('id, question, ai_query, is_active')
                .eq('slug', slug)
                .maybeSingle();

            if (userQ) {
                // Soft-deleted / hidden by admin
                if (userQ.is_active === false) {
                    return NextResponse.json({ error: 'Question not available' }, { status: 404 });
                }
                question       = userQ.question;
                ai_query       = userQ.ai_query;
                userQuestionId = userQ.id;
            } else {
                // ── Auto-generate: slug not found anywhere → create it ────────────
                // Convert slug to question text, generate HyDE, persist to user_questions.
                // This makes internal links from blog posts "self-healing" — any
                // /questions/some-slug URL will auto-generate an answer on first visit.

                // Rate limit checks — per-IP first (cheap, in-memory), then the
                // global persistent cap counted from user_questions (S-13).
                const ipLimited = checkRateLimit(req, PER_IP_LIMIT);
                if (ipLimited) return ipLimited;

                const autoGen = await checkAutoGenRateLimit();
                if (!autoGen.allowed) {
                    await notifyAdminsRateLimit(slug, autoGen.count);
                    return NextResponse.json(
                        { error: 'Too many questions generated recently. Please try again later.' },
                        { status: 429 }
                    );
                }

                // Budget guard (cost protection): refuse paid generation when
                // the AI spend ceiling is reached. Fails open if untracked.
                try {
                    await assertWithinBudget('questions-autogen');
                } catch (e) {
                    return NextResponse.json(
                        { error: 'Question generation is temporarily unavailable. Please try again later.' },
                        { status: 503 }
                    );
                }

                const questionText = slugToQuestion(slug);
                console.log(`[Questions API] Auto-generating question from slug: "${slug}" → "${questionText}"`);

                const generatedHyde = await generateHyde(questionText);

                const { data: inserted, error: insertErr } = await supabase
                    .from('user_questions')
                    .insert({ slug, question: questionText, ai_query: generatedHyde })
                    .select('id, question, ai_query')
                    .single();

                if (insertErr) {
                    // Race condition: another request inserted the same slug simultaneously
                    if (insertErr.code === '23505') {
                        const { data: retry } = await supabase
                            .from('user_questions')
                            .select('id, question, ai_query, is_active')
                            .eq('slug', slug)
                            .maybeSingle();
                        if (retry) {
                            if (retry.is_active === false) {
                                return NextResponse.json({ error: 'Question not available' }, { status: 404 });
                            }
                            question       = retry.question;
                            ai_query       = retry.ai_query;
                            userQuestionId = retry.id;
                        } else {
                            return NextResponse.json({ error: 'Question creation failed' }, { status: 500 });
                        }
                    } else {
                        console.error('[Questions API] Auto-gen insert failed:', insertErr.message);
                        return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
                    }
                } else {
                    question       = inserted.question;
                    ai_query       = inserted.ai_query;
                    userQuestionId = inserted.id;
                    console.log(`[Questions API] Auto-generated question id=${inserted.id} for slug="${slug}"`);
                }
            }
        }

        // ── Step 1b: Cache-read — skip Claude if we already have a synthesis ────
        // Both curated AND user questions are now cached in question_synthesis.
        let cachedSynthesis: {
            shortAnswer:    string;
            paragraphs:     string[];
            citedVideoIds:  string[];  // order pins [1]-[4] citations
        } | null = null;

        if (isCurated && questionId !== null) {
            const { data: cached } = await supabase
                .from('question_synthesis')
                .select('short_answer, paragraphs, cited_video_ids')
                .eq('question_id', questionId)
                .maybeSingle();

            if (cached && Array.isArray(cached.paragraphs) && cached.paragraphs.length === 3) {
                console.log(`[Questions API] Serving cached synthesis for question_id=${questionId}`);
                cachedSynthesis = {
                    shortAnswer:   cached.short_answer,
                    paragraphs:    cached.paragraphs,
                    citedVideoIds: cached.cited_video_ids ?? [],
                };
            }
        } else if (userQuestionId !== null) {
            const { data: cached } = await supabase
                .from('question_synthesis')
                .select('short_answer, paragraphs, cited_video_ids')
                .eq('user_question_id', userQuestionId)
                .maybeSingle();

            if (cached && Array.isArray(cached.paragraphs) && cached.paragraphs.length === 3) {
                console.log(`[Questions API] Serving cached synthesis for user_question_id=${userQuestionId}`);
                cachedSynthesis = {
                    shortAnswer:   cached.short_answer,
                    paragraphs:    cached.paragraphs,
                    citedVideoIds: cached.cited_video_ids ?? [],
                };
            }
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

        // ── Step 6: Synthesize answer via Claude (or serve from cache) ──────────
        // Number the videos [1]-[N] so Claude cites by number only.
        // The page renderer replaces [1] → real /video/[id] link from structured data.
        // Claude never writes a URL or title — zero hallucination risk.
        const contextForGPT = referencedVids.map(({ meta, chunks: vidChunks }, i) => {
            const topSnippets = vidChunks.slice(0, 2).map(c => c.content).join('\n');
            return `[${i + 1}] ${meta.title ?? meta.video_id}\n${topSnippets}`;
        }).join('\n\n---\n\n');

        // ── When serving cached synthesis, reorder referencedVids to match the stored
        // cited_video_ids so citations [1]-[4] always point to the same videos.
        // Videos absent from the live search (e.g. deleted) are silently dropped.
        if (cachedSynthesis && cachedSynthesis.citedVideoIds.length > 0) {
            const liveMap = new Map(deduped.map(v => [v.video_id, v]));
            const reordered = cachedSynthesis.citedVideoIds
                .map(id => liveMap.get(id))
                .filter((v): v is VideoGroup => v !== undefined);
            // Replace the top 4 with pin-ordered videos (remaining moreVids unchanged)
            referencedVids.length = 0;
            referencedVids.push(...reordered);
        }

        // Check if we have a cached synthesis from Step 1b
        // (local variable — no globalThis needed, same function scope)

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

        let shortAnswer = cachedSynthesis?.shortAnswer ?? '';
        let paragraphs: string[] = cachedSynthesis?.paragraphs ?? [];

        // Skip the Claude call entirely if we have a valid cached synthesis
        if (!cachedSynthesis) try {
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

                        // ── Cache-write: persist to question_synthesis ─────────
                        // Applies to both curated AND user questions after a valid
                        // 3-paragraph response. This makes user question pages
                        // permanent — sharing the URL always returns the same answer.
                        const hasCurated = isCurated && questionId !== null;
                        const hasUser    = !isCurated && userQuestionId !== null;

                        if ((hasCurated || hasUser) && shortAnswer && paragraphs.length === 3) {
                            const upsertPayload = hasCurated
                                ? {
                                    question_id:      questionId,
                                    user_question_id: null,
                                    short_answer:     shortAnswer,
                                    paragraphs:       paragraphs,
                                    cited_video_ids:  referencedVids.map(v => v.video_id),
                                    answered_at:      new Date().toISOString(),
                                }
                                : {
                                    question_id:      null,
                                    user_question_id: userQuestionId,
                                    short_answer:     shortAnswer,
                                    paragraphs:       paragraphs,
                                    cited_video_ids:  referencedVids.map(v => v.video_id),
                                    answered_at:      new Date().toISOString(),
                                };

                            const conflictCol = hasCurated ? 'question_id' : 'user_question_id';
                            supabase.from('question_synthesis').upsert(upsertPayload, { onConflict: conflictCol })
                            .then(({ error: writeErr }) => {
                                if (writeErr) {
                                    console.error('[Questions API] Cache-write failed:', writeErr.message);
                                } else {
                                    const label = hasCurated
                                        ? `question_id=${questionId}`
                                        : `user_question_id=${userQuestionId} (slug=${slug})`;
                                    console.log(`[Questions API] Cached synthesis for ${label}`);
                                }
                            });
                        }
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
