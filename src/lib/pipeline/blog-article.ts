/**
 * Blog Article Pipeline Orchestrator
 *
 * Generates a research-backed, Gladwellian-voice blog article from an
 * nde_questions slug. Designed as a pure function callable from:
 * - Admin UI (via /api/admin/blog/generate)
 * - GitHub Actions cron (via /api/cron/blog-questions)
 * - CLI scripts
 *
 * 5 steps (mirrors intake.ts pattern):
 * 1. Context assembly   — Supabase question + top NDE chunks
 * 2. Perplexity research — sonar-pro with domain filter
 * 3. Claude draft       — full MDX article via OpenRouter
 * 4. Voice pass         — strip AI tics, enforce Gladwellian rhythm
 * 5. Publish            — insert blog_posts row (status = 'draft')
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { researchQuestion, researchGuideTopic, type ResearchResult } from './blog-research';
import { generateHeroImage } from './blog-image';
import { verifyArticle, type ArticleReference } from './blog-verify';
import {
    buildDraftSystemPrompt,
    buildDraftUserPrompt,
    buildGuideDraftSystemPrompt,
    buildGuideDraftUserPrompt,
    buildVoicePassSystemPrompt,
    SEO_REFRESH_PROMPT,
} from './blog-prompts';




// ─── Types ────────────────────────────────────────────────────────────────────

export type ArticleStepStatus = 'pending' | 'running' | 'success' | 'skipped' | 'failed';

export interface ArticleStep {
    name: string;
    status: ArticleStepStatus;
    message?: string;
    duration_ms?: number;
}

export type BlogArticleStatus =
    | 'assembling'
    | 'researching'
    | 'drafting'
    | 'imaging'
    | 'polishing'
    | 'publishing'
    | 'complete'
    | 'already_exists'
    | 'failed';

export interface BlogArticleResult {
    status: BlogArticleStatus;
    questionSlug: string;
    articleSlug?: string;
    articleId?: number;
    wordCount?: number;
    error?: string;
    steps: ArticleStep[];
}

// ─── Clients ──────────────────────────────────────────────────────────────────

function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase environment variables');
    return createClient(url, key);
}

function getOpenRouter() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY environment variable');
    return new OpenAI({
        apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
            'HTTP-Referer': 'https://projectprofound.org',
            'X-Title': 'Project Profound Blog Pipeline',
        },
    });
}

// ─── Step Helpers ─────────────────────────────────────────────────────────────

function makeStep(name: string): ArticleStep {
    return { name, status: 'pending' };
}

function startStep(step: ArticleStep, cb?: (s: ArticleStep) => void): ArticleStep {
    step.status = 'running';
    cb?.(step);
    return step;
}

function finishStep(
    step: ArticleStep,
    status: ArticleStepStatus,
    message: string,
    startTime: number,
    cb?: (s: ArticleStep) => void
): ArticleStep {
    step.status = status;
    step.message = message;
    step.duration_ms = Date.now() - startTime;
    cb?.(step);
    return step;
}

// ─── Step 1: Context Assembly ─────────────────────────────────────────────────

interface ArticleContext {
    question: string;
    consumerQuestion: string;
    hydePassage: string;
    questionSlug: string;
    videoCount: number;
    topChunks: Array<{ content: string; videoId: string; title: string; channelName: string; startTime?: number }>;
    videoReferences: Array<{ videoId: string; title: string; url: string; experiencerName?: string; channelName?: string }>;
    relatedQuestionSlugs: Array<{ slug: string; question: string }>;
    authorName: string;
}

async function assembleContext(questionSlug: string): Promise<ArticleContext> {
    const supabase = getSupabaseAdmin();

    // Fetch the question row
    const { data: q, error: qErr } = await supabase
        .from('nde_questions')
        .select('consumer_question, ai_query, slug')
        .eq('slug', questionSlug)
        .single();

    if (qErr || !q) {
        throw new Error(`Question not found: ${questionSlug} — ${qErr?.message}`);
    }

    // Fetch top-similarity NDE transcript chunks for this question's HyDE passage
    // Uses the existing search RPC — if unavailable, fall back to empty array
    let topChunks: ArticleContext['topChunks'] = [];
    let videoReferences: ArticleContext['videoReferences'] = [];
    try {
        // Get embedding for the HyDE passage first
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
        const embRes = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: q.ai_query,
        });
        const embedding = embRes.data[0].embedding;

        const { data: chunks } = await supabase.rpc('search_punctuated_embeddings_filtered', {
            query_embedding: embedding,
            similarity_threshold: 0.5,
            page_limit: 8,
            page_offset: 0,
            sort_column: 'similarity',
            sort_direction: 'DESC',
            filter_greyson_min: 0,
            filter_transformation_min: 0,
            filter_veridical_min: 0,
        });

        const rawChunks = (chunks ?? []) as Array<{ content: string; video_id: string; title: string; url: string; channelName: string; start_time: number | null }>;

        // Extract text chunks WITH video metadata so the AI can link each quote to its source
        topChunks = rawChunks.slice(0, 5).map((c) => ({
            content: c.content,
            videoId: c.video_id,
            title: c.title ?? '',
            channelName: c.channelName ?? '',
            startTime: c.start_time ?? undefined,
        }));

        // Deduplicate video references (pick top 3 distinct videos)
        const seenVideoIds = new Set<string>();
        for (const chunk of rawChunks) {
            if (chunk.video_id && !seenVideoIds.has(chunk.video_id)) {
                seenVideoIds.add(chunk.video_id);
                videoReferences.push({
                    videoId: chunk.video_id,
                    title: chunk.title ?? '',
                    url: chunk.url ?? '',
                    channelName: chunk.channelName ?? '',
                });
                if (videoReferences.length >= 3) break;
            }
        }
    } catch {
        // Non-fatal — pipeline continues without experiencer quotes
        console.warn('[blog-article] Could not fetch NDE chunks — continuing without quotes');
    }

    // Get approximate NDE video count for the "based on X accounts" copy
    const { count } = await supabase
        .from('nde_vids')
        .select('id', { count: 'exact', head: true })
        .eq('intake_status', 'complete');

    // Find related question slugs for internal cross-linking
    let relatedQuestionSlugs: ArticleContext['relatedQuestionSlugs'] = [];
    try {
        const keywords = q.consumer_question.toLowerCase()
            .replace(/[^a-z\s]/g, '')
            .split(/\s+/)
            .filter((w: string) => w.length > 3 && !['what', 'when', 'where', 'that', 'were', 'have', 'been', 'does', 'near', 'death', 'experience', 'experiences'].includes(w));

        if (keywords.length > 0) {
            const { data: questions } = await supabase
                .from('nde_questions')
                .select('slug, consumer_question')
                .eq('is_active', true)
                .neq('slug', questionSlug) // exclude self
                .or(keywords.slice(0, 3).map((k: string) => `consumer_question.ilike.%${k}%`).join(','))
                .limit(5);

            relatedQuestionSlugs = (questions ?? []).map((rq) => ({
                slug: rq.slug,
                question: rq.consumer_question,
            }));
        }
    } catch {
        console.warn('[blog-article] Could not fetch related questions');
    }

    return {
        question: q.consumer_question,
        consumerQuestion: q.consumer_question,
        hydePassage: q.ai_query,
        questionSlug: q.slug,
        videoCount: count ?? 5000,
        topChunks,
        videoReferences,
        relatedQuestionSlugs,
        authorName: await getNextAuthor(),
    };
}

// ─── Step 3: Claude Draft ─────────────────────────────────────────────────────

interface ArticleDraft {
    title: string;
    slug: string;
    subtitle: string;
    lead_paragraph: string;
    body_mdx: string;
    read_time_mins: number;
    word_count: number;
    tags: string[];
    seo_title: string;
    seo_description: string;
    references: ArticleReference[];
}

async function draftArticle(
    context: ArticleContext,
    research: ResearchResult,

): Promise<ArticleDraft> {
    const openRouter = getOpenRouter();

    const researchText = [
        research.rawText,
        research.citations.length > 0
            ? '\n\nSOURCES:\n' + research.citations.map((c, i) => `[${i + 1}] ${c.title} — ${c.url}`).join('\n')
            : '',
    ].join('');

    const response = await openRouter.chat.completions.create({
        model: 'anthropic/claude-sonnet-4-5',
        messages: [
            { role: 'system', content: buildDraftSystemPrompt() },
            {
                role: 'user',
                content: buildDraftUserPrompt({
                    question: context.question,
                    consumerQuestion: context.consumerQuestion,
                    hydePassage: context.hydePassage,
                    research: researchText,
                    topChunks: context.topChunks,
                    authorName: context.authorName,
                    videoReferences: context.videoReferences,
                    relatedQuestionSlugs: context.relatedQuestionSlugs,
                }),
            },
            // Assistant prefill forces JSON output (Claude-specific)
            { role: 'assistant', content: '{' },
        ],
        max_tokens: 16000,
        temperature: 0.7,
    });

    const rawContent = '{' + (response.choices[0]?.message?.content ?? '{}');
    // Strip markdown code fences if model wraps JSON in ```json ... ```
    const cleaned = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let draft: ArticleDraft;
    try {
        draft = JSON.parse(cleaned);
    } catch {
        throw new Error(`Claude returned invalid JSON: ${cleaned.slice(0, 200)}`);
    }

    // Validate required fields
    if (!draft.title || !draft.slug || !draft.body_mdx) {
        throw new Error('Draft missing required fields (title, slug, body_mdx)');
    }

    return draft;
}

// ─── Step 4: Voice Pass ───────────────────────────────────────────────────────

async function voicePass(draft: ArticleDraft): Promise<ArticleDraft> {
    const openRouter = getOpenRouter();

    const voiceResponse = await openRouter.chat.completions.create({
        model: 'anthropic/claude-sonnet-4-5',
        messages: [
            { role: 'system', content: buildVoicePassSystemPrompt() },
            {
                role: 'user',
                content: `Article title: ${draft.title}\n\n${draft.body_mdx}`,
            },
        ],
        max_tokens: 6000,
        temperature: 0.3, // lower temp = more consistent voice enforcement
    });

    const revisedBody = voiceResponse.choices[0]?.message?.content ?? draft.body_mdx;

    // Re-generate lead_paragraph and seo_description from revised body
    const seoResponse = await openRouter.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [
            { role: 'user', content: `${SEO_REFRESH_PROMPT}\n\nQUESTION: ${draft.title}\n\nARTICLE BODY:\n${revisedBody.slice(0, 3000)}` },
            { role: 'assistant', content: '{' },
        ],
        max_tokens: 400,
        temperature: 0.2,
    });

    let seoFields = { lead_paragraph: draft.lead_paragraph, seo_description: draft.seo_description };
    try {
        seoFields = JSON.parse('{' + (seoResponse.choices[0]?.message?.content ?? '{}'));
    } catch {
        // Non-fatal — keep original fields
    }

    // Rough word count from revised body
    const wordCount = revisedBody.split(/\s+/).filter(Boolean).length;
    const readTimeMins = Math.max(1, Math.round(wordCount / 238));

    return {
        ...draft,
        body_mdx: revisedBody,
        lead_paragraph: seoFields.lead_paragraph ?? draft.lead_paragraph,
        seo_description: seoFields.seo_description ?? draft.seo_description,
        word_count: wordCount,
        read_time_mins: readTimeMins,
    };
}

// ─── Link Sanitizer (deterministic post-processing) ──────────────────────────

/**
 * Deterministic regex-based cleanup of malformed markdown links.
 * Catches patterns that LLMs consistently produce despite prompt instructions:
 *
 * 1. URL fragments leaked into anchor text:
 *    e.g., "The Lancet07100-8/fulltext)" → plain "The Lancet" (link stripped)
 *
 * 2. Malformed markdown where the URL contains unbalanced parentheses:
 *    e.g., [study](https://...PIIS0140-6736(01)07100-8/fulltext)
 *    The (01) closes the markdown link prematurely.
 *
 * 3. Bare URL fragments floating in prose (no markdown brackets at all).
 *
 * This runs AFTER voice pass and verify — it's the last line of defense.
 */
export function sanitizeMarkdownLinks(mdx: string): string {
    let result = mdx;

    // Pass 1: Fix markdown links where URL has unbalanced parens
    // [text](url-with-(parens)-inside) → the inner ) breaks markdown.
    // Strategy: find all [text]( patterns and match the URL greedily,
    // balancing parentheses.
    result = result.replace(
        /\[([^\]]+)\]\(([^)]*\([^)]*\)[^)]*(?:\([^)]*\)[^)]*)*)\)/g,
        (_match, text: string, url: string) => {
            // If the URL looks valid after reassembly, keep it; else strip
            const fullUrl = url.trim();
            if (fullUrl.startsWith('http') || fullUrl.startsWith('/')) {
                return `[${text}](${fullUrl})`;
            }
            return text;
        }
    );

    // Pass 2: Detect URL fragments leaked into anchor text.
    // Pattern: text immediately followed by a URL-path fragment like
    // "07100-8/fulltext)" or "articles/PMC123456)"
    // These appear when markdown [text](url) was mangled by the LLM.
    result = result.replace(
        /([A-Za-z\s]{3,})((?:\/[\w.-]+){1,}\))/g,
        (_match, text: string, fragment: string) => {
            // Only strip if it looks like a leaked path fragment
            if (fragment.includes('/') && fragment.endsWith(')')) {
                console.log(`[sanitize-links] Stripped leaked URL fragment: "${fragment}" from "${text.trim()}"`);
                return text.trimEnd();
            }
            return _match;
        }
    );

    // Pass 3: Remove any remaining markdown links with clearly broken URLs
    // (URLs not starting with http, /, or #)
    result = result.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        (_match, text: string, url: string) => {
            const trimmedUrl = url.trim();
            if (
                trimmedUrl.startsWith('http') ||
                trimmedUrl.startsWith('/') ||
                trimmedUrl.startsWith('#') ||
                trimmedUrl.startsWith('mailto:')
            ) {
                return _match; // valid link, keep it
            }
            console.log(`[sanitize-links] Stripped broken link: [${text}](${trimmedUrl})`);
            return text; // strip to plain text
        }
    );

    return result;
}

// ─── Step 5: Publish ──────────────────────────────────────────────────────────

async function publishDraft(
    draft: ArticleDraft,
    context: ArticleContext,
    research: ResearchResult,
    heroImageUrl?: string,
    heroImagePrompt?: string,
): Promise<{ id: number; slug: string }> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from('blog_posts')
        .insert({
            slug: draft.slug,
            title: draft.title,
            subtitle: draft.subtitle,
            category: 'big-question',
            author_name: context.authorName,
            status: 'published',
            published_at: new Date().toISOString(),  // prevent Unix epoch 1969 default
            lead_paragraph: draft.lead_paragraph,
            body_mdx: draft.body_mdx,
            read_time_mins: draft.read_time_mins,
            word_count: draft.word_count,
            tags: draft.tags,
            seo_title: draft.seo_title,
            seo_description: draft.seo_description,
            source_question_slug: context.questionSlug,
            refs: draft.references ?? null,
            research_raw: research.rawText ?? null,
            hero_image_url: heroImageUrl ?? null,
            hero_image_prompt: heroImagePrompt ?? null,
        })
        .select('id, slug')
        .single();

    if (error) throw new Error(`Failed to insert blog_posts: ${error.message}`);
    if (!data) throw new Error('Insert returned no data');

    return { id: data.id, slug: data.slug };
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

/**
 * Generate a blog article from an nde_questions slug.
 *
 * @param questionSlug  - slug from nde_questions (e.g. "do-ndes-prove-an-afterlife")
 * @param onStep        - optional real-time progress callback
 * @returns BlogArticleResult
 */
export async function generateBlogArticle(
    questionSlug: string,
    onStep?: (step: ArticleStep) => void
): Promise<BlogArticleResult> {
    const steps: ArticleStep[] = [
        makeStep('Context assembly'),
        makeStep('Perplexity research'),
        makeStep('Claude draft'),
        makeStep('Hero image'),
        makeStep('Voice calibration pass'),
        makeStep('Verify facts & links'),
        makeStep('Publish'),
    ];
    const result: BlogArticleResult = { status: 'assembling', questionSlug, steps };

    const supabase = getSupabaseAdmin();

    // ── Idempotency check ─────────────────────────────────────────────────────
    const { data: existing } = await supabase
        .from('blog_posts')
        .select('id, slug')
        .eq('source_question_slug', questionSlug)
        .maybeSingle();

    if (existing) {
        return {
            ...result,
            status: 'already_exists',
            articleId: existing.id,
            articleSlug: existing.slug,
            steps: steps.map((s) => ({ ...s, status: 'skipped', message: 'Already generated' })),
        };
    }

    let context: ArticleContext;
    let research: ResearchResult;
    let draft: ArticleDraft;
    let heroImageUrl: string | undefined;
    let heroImagePrompt: string | undefined;



    // ── Step 1 ────────────────────────────────────────────────────────────────
    const s1 = steps[0];
    startStep(s1, onStep);
    const t1 = Date.now();
    try {
        context = await assembleContext(questionSlug);
        finishStep(s1, 'success', `"${context.question}" · ${context.topChunks.length} NDE quotes`, t1, onStep);
    } catch (err) {
        finishStep(s1, 'failed', String(err), t1, onStep);
        return { ...result, status: 'failed', error: String(err) };
    }

    // ── Step 2 ────────────────────────────────────────────────────────────────
    const s2 = steps[1];
    startStep(s2, onStep);
    const t2 = Date.now();
    result.status = 'researching';
    try {
        research = await researchQuestion(context.question, context.consumerQuestion);
        finishStep(s2, 'success', `${research.citations.length} citations · ${research.keyFindings.length} key findings`, t2, onStep);
    } catch (err) {
        finishStep(s2, 'failed', String(err), t2, onStep);
        return { ...result, status: 'failed', error: String(err) };
    }

    // ── Step 3 ────────────────────────────────────────────────────────────────
    const s3 = steps[2];
    startStep(s3, onStep);
    const t3 = Date.now();
    result.status = 'drafting';
    try {
        draft = await draftArticle(context!, research!);
        finishStep(s3, 'success', `${draft.word_count} words · slug: ${draft.slug}`, t3, onStep);
    } catch (err) {
        finishStep(s3, 'failed', String(err), t3, onStep);
        return { ...result, status: 'failed', error: String(err) };
    }

    // ── Step 3b: Hero image (non-fatal) ───────────────────────────────────────
    const s3b = steps[3];
    startStep(s3b, onStep);
    const t3b = Date.now();
    result.status = 'imaging';
    try {
        const img = await generateHeroImage(draft!.title, draft!.slug, 'big-question', draft!.tags ?? []);
        heroImageUrl = img.url;
        heroImagePrompt = img.prompt;
        finishStep(s3b, 'success', `Generated · ${img.width}x${img.height}`, t3b, onStep);
    } catch (err) {
        // Non-fatal — article publishes without image if generation fails
        finishStep(s3b, 'failed', `Image skipped: ${String(err)}`, t3b, onStep);
    }

    // ── Step 4 ────────────────────────────────────────────────────────────────
    const s4 = steps[4];
    startStep(s4, onStep);
    const t4 = Date.now();
    result.status = 'polishing';
    try {
        draft = await voicePass(draft!);
        finishStep(s4, 'success', `Revised to ${draft.word_count} words`, t4, onStep);
    } catch (err) {
        finishStep(s4, 'failed', `Voice pass failed (using raw draft): ${String(err)}`, t4, onStep);
    }

    // ── Step 4b: Verify facts & links (non-fatal) ─────────────────────────────
    const s4b = steps[5];
    startStep(s4b, onStep);
    const t4b = Date.now();
    try {
        const verified = await verifyArticle(draft!.body_mdx, draft!.references);
        draft = {
            ...draft!,
            body_mdx: verified.body_mdx,
            references: verified.references,
        };
        const { stats } = verified;
        finishStep(s4b, 'success', `✓${stats.claims_correct} ✗${stats.claims_incorrect} claims · ${stats.links_ok}/${stats.links_checked} links OK`, t4b, onStep);
    } catch (err) {
        // Non-fatal: publish with unverified draft
        finishStep(s4b, 'failed', `Verification skipped: ${String(err)}`, t4b, onStep);
    }

    // ── Step 5 ────────────────────────────────────────────────────────────────
    const s5 = steps[6];
    startStep(s5, onStep);
    const t5 = Date.now();
    result.status = 'publishing';
    try {
        // Final deterministic link cleanup before publishing
        draft = { ...draft!, body_mdx: sanitizeMarkdownLinks(draft!.body_mdx) };
        const { id, slug } = await publishDraft(draft!, context!, research!, heroImageUrl, heroImagePrompt);
        finishStep(s5, 'success', `Saved as draft. ID: ${id}`, t5, onStep);
        return {
            ...result,
            status: 'complete',
            articleId: id,
            articleSlug: slug,
            wordCount: draft!.word_count,
        };
    } catch (err) {
        finishStep(s5, 'failed', String(err), t5, onStep);
        return { ...result, status: 'failed', error: String(err) };
    }
}

// ─── Author Rotation ──────────────────────────────────────────────────────────

const AUTHOR_ROTATION = ['Tom Wood', 'Dr. Micul Love', 'Pamela Harris'];

async function getNextAuthor(): Promise<string> {
    try {
        const supabase = getSupabaseAdmin();
        const { data } = await supabase
            .from('blog_posts')
            .select('author_name')
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!data?.author_name) return AUTHOR_ROTATION[0];
        const lastIdx = AUTHOR_ROTATION.indexOf(data.author_name);
        return AUTHOR_ROTATION[(lastIdx + 1) % AUTHOR_ROTATION.length];
    } catch {
        return AUTHOR_ROTATION[0];
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GUIDE (PILLAR PAGE) ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

interface GuideContext {
    pillarTitle: string;
    targetQuery: string;
    authorName: string;
    videoCount: number;
    topChunks: ArticleContext['topChunks'];
    videoReferences: ArticleContext['videoReferences'];
    relatedQuestionSlugs: Array<{ slug: string; question: string }>;
    existingGuideSlugs: Array<{ slug: string; title: string }>;
}

async function assembleGuideContext(
    pillarTitle: string,
    targetQuery: string,
    authorName: string,
): Promise<GuideContext> {
    const supabase = getSupabaseAdmin();

    // Fetch top NDE transcript chunks using a broader query
    let topChunks: GuideContext['topChunks'] = [];
    let videoReferences: GuideContext['videoReferences'] = [];
    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
        const embRes = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: targetQuery,
        });
        const embedding = embRes.data[0].embedding;

        const { data: chunks } = await supabase.rpc('search_punctuated_embeddings_filtered', {
            query_embedding: embedding,
            similarity_threshold: 0.45, // slightly lower threshold for broader coverage
            page_limit: 12,
            page_offset: 0,
            sort_column: 'similarity',
            sort_direction: 'DESC',
            filter_greyson_min: 0,
            filter_transformation_min: 0,
            filter_veridical_min: 0,
        });

        const rawChunks = (chunks ?? []) as Array<{ content: string; video_id: string; title: string; url: string; channelName: string; start_time: number | null }>;

        topChunks = rawChunks.slice(0, 6).map((c) => ({
            content: c.content,
            videoId: c.video_id,
            title: c.title ?? '',
            channelName: c.channelName ?? '',
            startTime: c.start_time ?? undefined,
        }));

        const seenVideoIds = new Set<string>();
        for (const chunk of rawChunks) {
            if (chunk.video_id && !seenVideoIds.has(chunk.video_id)) {
                seenVideoIds.add(chunk.video_id);
                videoReferences.push({
                    videoId: chunk.video_id,
                    title: chunk.title ?? '',
                    url: chunk.url ?? '',
                    channelName: chunk.channelName ?? '',
                });
                if (videoReferences.length >= 4) break;
            }
        }
    } catch {
        console.warn('[guide-article] Could not fetch NDE chunks — continuing without quotes');
    }

    // Find related question slugs for internal cross-linking
    let relatedQuestionSlugs: GuideContext['relatedQuestionSlugs'] = [];
    try {
        // Simple keyword match: search for questions that contain key words from the title
        const keywords = pillarTitle.toLowerCase()
            .replace(/[^a-z\s]/g, '')
            .split(/\s+/)
            .filter((w) => w.length > 3 && !['what', 'when', 'where', 'that', 'were', 'have', 'been', 'does', 'near', 'death', 'experience', 'experiences'].includes(w));

        if (keywords.length > 0) {
            // Use ilike with OR for each keyword
            const { data: questions } = await supabase
                .from('nde_questions')
                .select('slug, consumer_question')
                .eq('is_active', true)
                .or(keywords.slice(0, 3).map((k) => `consumer_question.ilike.%${k}%`).join(','))
                .limit(8);

            relatedQuestionSlugs = (questions ?? []).map((q) => ({
                slug: q.slug,
                question: q.consumer_question,
            }));
        }
    } catch {
        console.warn('[guide-article] Could not fetch related questions');
    }

    // Find existing guide slugs for inter-pillar linking
    let existingGuideSlugs: GuideContext['existingGuideSlugs'] = [];
    try {
        const { data: guides } = await supabase
            .from('blog_posts')
            .select('slug, title')
            .eq('category', 'guide')
            .eq('status', 'published');

        existingGuideSlugs = (guides ?? []).map((g) => ({
            slug: g.slug,
            title: g.title,
        }));
    } catch {
        // Non-fatal
    }

    const { count } = await supabase
        .from('nde_vids')
        .select('id', { count: 'exact', head: true })
        .eq('intake_status', 'complete');

    return {
        pillarTitle,
        targetQuery,
        authorName,
        videoCount: count ?? 5000,
        topChunks,
        videoReferences,
        relatedQuestionSlugs,
        existingGuideSlugs,
    };
}

async function draftGuide(
    context: GuideContext,
    research: ResearchResult,
): Promise<ArticleDraft & { faq_data?: Array<{ question: string; answer: string }> }> {
    const openRouter = getOpenRouter();

    const researchText = [
        research.rawText,
        research.citations.length > 0
            ? '\n\nSOURCES:\n' + research.citations.map((c, i) => `[${i + 1}] ${c.title} — ${c.url}`).join('\n')
            : '',
    ].join('');

    const response = await openRouter.chat.completions.create({
        model: 'anthropic/claude-sonnet-4-5',
        messages: [
            { role: 'system', content: buildGuideDraftSystemPrompt() },
            {
                role: 'user',
                content: buildGuideDraftUserPrompt({
                    pillarTitle: context.pillarTitle,
                    targetQuery: context.targetQuery,
                    research: researchText,
                    topChunks: context.topChunks,
                    authorName: context.authorName,
                    relatedQuestionSlugs: context.relatedQuestionSlugs,
                    existingGuideSlugs: context.existingGuideSlugs,
                    videoReferences: context.videoReferences,
                }),
            },
            { role: 'assistant', content: '{' },
        ],
        max_tokens: 24000, // guides are longer than big-question articles
        temperature: 0.7,
    });

    const rawContent = '{' + (response.choices[0]?.message?.content ?? '{}');
    const cleaned = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let draft: ArticleDraft & { faq_data?: Array<{ question: string; answer: string }> };
    try {
        draft = JSON.parse(cleaned);
    } catch {
        throw new Error(`Claude returned invalid JSON for guide: ${cleaned.slice(0, 200)}`);
    }

    if (!draft.title || !draft.slug || !draft.body_mdx) {
        throw new Error('Guide draft missing required fields (title, slug, body_mdx)');
    }

    return draft;
}

/**
 * Generate a comprehensive guide (pillar page) article.
 *
 * @param pillarTitle - The H1 title for the guide
 * @param targetQuery - The primary search query this guide targets
 * @param authorName  - Author to attribute the guide to
 * @param onStep      - optional real-time progress callback
 */
export async function generateGuideArticle(
    pillarTitle: string,
    targetQuery: string,
    authorName: string,
    onStep?: (step: ArticleStep) => void
): Promise<BlogArticleResult> {
    const steps: ArticleStep[] = [
        makeStep('Context assembly'),
        makeStep('Perplexity research'),
        makeStep('Claude guide draft'),
        makeStep('Hero image'),
        makeStep('Voice calibration pass'),
        makeStep('Verify facts & links'),
        makeStep('Publish'),
    ];
    const result: BlogArticleResult = { status: 'assembling', questionSlug: pillarTitle, steps };

    const supabase = getSupabaseAdmin();

    // ── Idempotency: check if a guide with this title already exists ──────────
    const tentativeSlug = pillarTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const { data: existing } = await supabase
        .from('blog_posts')
        .select('id, slug')
        .eq('category', 'guide')
        .ilike('title', pillarTitle)
        .maybeSingle();

    if (existing) {
        return {
            ...result,
            status: 'already_exists',
            articleId: existing.id,
            articleSlug: existing.slug,
            steps: steps.map((s) => ({ ...s, status: 'skipped', message: 'Already generated' })),
        };
    }

    let context: GuideContext;
    let research: ResearchResult;
    let draft: ArticleDraft & { faq_data?: Array<{ question: string; answer: string }> };
    let heroImageUrl: string | undefined;
    let heroImagePrompt: string | undefined;

    // ── Step 1: Context Assembly ──────────────────────────────────────────────
    const s1 = steps[0];
    startStep(s1, onStep);
    const t1 = Date.now();
    try {
        context = await assembleGuideContext(pillarTitle, targetQuery, authorName);
        finishStep(s1, 'success', `${context.topChunks.length} NDE quotes · ${context.relatedQuestionSlugs.length} related questions`, t1, onStep);
    } catch (err) {
        finishStep(s1, 'failed', String(err), t1, onStep);
        return { ...result, status: 'failed', error: String(err) };
    }

    // ── Step 2: Research ──────────────────────────────────────────────────────
    const s2 = steps[1];
    startStep(s2, onStep);
    const t2 = Date.now();
    result.status = 'researching';
    try {
        research = await researchGuideTopic(pillarTitle, targetQuery);
        finishStep(s2, 'success', `${research.citations.length} citations · ${research.keyFindings.length} key findings`, t2, onStep);
    } catch (err) {
        finishStep(s2, 'failed', String(err), t2, onStep);
        return { ...result, status: 'failed', error: String(err) };
    }

    // ── Step 3: Guide Draft ───────────────────────────────────────────────────
    const s3 = steps[2];
    startStep(s3, onStep);
    const t3 = Date.now();
    result.status = 'drafting';
    try {
        draft = await draftGuide(context!, research!);
        finishStep(s3, 'success', `${draft.word_count} words · slug: ${draft.slug}`, t3, onStep);
    } catch (err) {
        finishStep(s3, 'failed', String(err), t3, onStep);
        return { ...result, status: 'failed', error: String(err) };
    }

    // ── Step 3b: Hero image (non-fatal) ──────────────────────────────────────
    const s3b = steps[3];
    startStep(s3b, onStep);
    const t3b = Date.now();
    result.status = 'imaging';
    try {
        const img = await generateHeroImage(draft!.title, draft!.slug, 'guide', draft!.tags ?? []);
        heroImageUrl = img.url;
        heroImagePrompt = img.prompt;
        finishStep(s3b, 'success', `Generated · ${img.width}x${img.height}`, t3b, onStep);
    } catch (err) {
        finishStep(s3b, 'failed', `Image skipped: ${String(err)}`, t3b, onStep);
    }

    // ── Step 4: Voice Pass ────────────────────────────────────────────────────
    const s4 = steps[4];
    startStep(s4, onStep);
    const t4 = Date.now();
    result.status = 'polishing';
    try {
        draft = { ...await voicePass(draft!), faq_data: draft!.faq_data };
        finishStep(s4, 'success', `Revised to ${draft.word_count} words`, t4, onStep);
    } catch (err) {
        finishStep(s4, 'failed', `Voice pass failed (using raw draft): ${String(err)}`, t4, onStep);
    }

    // ── Step 4b: Verify facts & links (non-fatal) ─────────────────────────────
    const s4b = steps[5];
    startStep(s4b, onStep);
    const t4b = Date.now();
    try {
        const verified = await verifyArticle(draft!.body_mdx, draft!.references);
        draft = {
            ...draft!,
            body_mdx: verified.body_mdx,
            references: verified.references,
            faq_data: draft!.faq_data,
        };
        const { stats } = verified;
        finishStep(s4b, 'success', `✓${stats.claims_correct} ✗${stats.claims_incorrect} claims · ${stats.links_ok}/${stats.links_checked} links OK`, t4b, onStep);
    } catch (err) {
        // Non-fatal: publish with unverified draft
        finishStep(s4b, 'failed', `Verification skipped: ${String(err)}`, t4b, onStep);
    }

    // ── Step 5: Publish as draft ──────────────────────────────────────────────
    const s5 = steps[6];
    startStep(s5, onStep);
    const t5 = Date.now();
    result.status = 'publishing';
    try {
        const { data, error } = await supabase
            .from('blog_posts')
            .insert({
                slug: draft!.slug,
                title: draft!.title,
                subtitle: draft!.subtitle,
                category: 'guide',
                author_name: authorName,
                status: 'draft', // guides always start as drafts for human review
                lead_paragraph: draft!.lead_paragraph,
                body_mdx: sanitizeMarkdownLinks(draft!.body_mdx),
                read_time_mins: draft!.read_time_mins,
                word_count: draft!.word_count,
                tags: draft!.tags,
                seo_title: draft!.seo_title,
                seo_description: draft!.seo_description,
                faq_data: draft!.faq_data ?? null,
                refs: draft!.references ?? null,
                hero_image_url: heroImageUrl ?? null,
                hero_image_prompt: heroImagePrompt ?? null,
            })
            .select('id, slug')
            .single();

        if (error) throw new Error(`Failed to insert guide: ${error.message}`);
        if (!data) throw new Error('Insert returned no data');

        finishStep(s5, 'success', `Saved as draft. ID: ${data.id}`, t5, onStep);
        return {
            ...result,
            status: 'complete',
            articleId: data.id,
            articleSlug: data.slug,
            wordCount: draft!.word_count,
        };
    } catch (err) {
        finishStep(s5, 'failed', String(err), t5, onStep);
        return { ...result, status: 'failed', error: String(err) };
    }
}
