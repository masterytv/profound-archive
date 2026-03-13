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
import { researchQuestion, type ResearchResult } from './blog-research';
import {
    buildDraftSystemPrompt,
    buildDraftUserPrompt,
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
    topChunks: string[];
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
    let topChunks: string[] = [];
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
            match_threshold: 0.5,
            match_count: 8,
            nde_types_filter: [],
            greyson_min: 0,
            transformation_min: 0,
            veridical_min: 0,
        });

        topChunks = ((chunks ?? []) as Array<{ content: string }>)
            .map((c) => c.content)
            .slice(0, 5);
    } catch {
        // Non-fatal — pipeline continues without experiencer quotes
        console.warn('[blog-article] Could not fetch NDE chunks — continuing without quotes');
    }

    // Get approximate NDE video count for the "based on X accounts" copy
    const { count } = await supabase
        .from('nde_vids')
        .select('id', { count: 'exact', head: true })
        .eq('intake_status', 'complete');

    return {
        question: q.consumer_question,
        consumerQuestion: q.consumer_question,
        hydePassage: q.ai_query,
        questionSlug: q.slug,
        videoCount: count ?? 5000,
        topChunks,
        authorName: 'Tom Wood', // default — can be made configurable later
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
    references: Array<{ text: string; url: string }>;
}

async function draftArticle(
    context: ArticleContext,
    research: ResearchResult
): Promise<ArticleDraft> {
    const openRouter = getOpenRouter();

    const researchText = [
        research.rawText,
        research.citations.length > 0
            ? '\n\nSOURCES:\n' + research.citations.map((c, i) => `[${i + 1}] ${c.title} — ${c.url}`).join('\n')
            : '',
    ].join('');

    const response = await openRouter.chat.completions.create({
        model: 'anthropic/claude-opus-4-5',
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
                }),
            },
            // Assistant prefill forces JSON output (LEARNINGS §15D)
            { role: 'assistant', content: '{' },
        ],
        max_tokens: 6000,
        temperature: 0.7,
    });

    const raw = '{' + (response.choices[0]?.message?.content ?? '{}');

    let draft: ArticleDraft;
    try {
        draft = JSON.parse(raw);
    } catch {
        throw new Error(`Claude returned invalid JSON: ${raw.slice(0, 200)}`);
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
        model: 'anthropic/claude-haiku-4-5',
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

// ─── Step 5: Publish ──────────────────────────────────────────────────────────

async function publishDraft(
    draft: ArticleDraft,
    context: ArticleContext,
    research: ResearchResult
): Promise<{ id: number; slug: string }> {
    const supabase = getSupabaseAdmin();

    // Build references JSON from Perplexity citations
    const references = research.citations.map((c) => ({
        text: c.title,
        url: c.url,
        snippet: c.snippet,
    }));

    const { data, error } = await supabase
        .from('blog_posts')
        .insert({
            slug: draft.slug,
            title: draft.title,
            subtitle: draft.subtitle,
            category: 'big-question',
            author_name: context.authorName,
            status: 'draft', // always draft — human publishes via admin UI
            lead_paragraph: draft.lead_paragraph,
            body_mdx: draft.body_mdx,
            read_time_mins: draft.read_time_mins,
            word_count: draft.word_count,
            tags: draft.tags,
            seo_title: draft.seo_title,
            seo_description: draft.seo_description,
            source_question_slug: context.questionSlug,
            // references stored as JSON in the body or a separate column if added later
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
        makeStep('Voice calibration pass'),
        makeStep('Save as draft'),
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
        research = await researchQuestion(context.question);
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
        draft = await draftArticle(context, research);
        finishStep(s3, 'success', `${draft.word_count} words · slug: ${draft.slug}`, t3, onStep);
    } catch (err) {
        finishStep(s3, 'failed', String(err), t3, onStep);
        return { ...result, status: 'failed', error: String(err) };
    }

    // ── Step 4 ────────────────────────────────────────────────────────────────
    const s4 = steps[3];
    startStep(s4, onStep);
    const t4 = Date.now();
    result.status = 'polishing';
    try {
        draft = await voicePass(draft);
        finishStep(s4, 'success', `Revised to ${draft.word_count} words`, t4, onStep);
    } catch (err) {
        // Voice pass failure is non-fatal — use the raw draft
        finishStep(s4, 'failed', `Voice pass failed (using raw draft): ${String(err)}`, t4, onStep);
    }

    // ── Step 5 ────────────────────────────────────────────────────────────────
    const s5 = steps[4];
    startStep(s5, onStep);
    const t5 = Date.now();
    result.status = 'publishing';
    try {
        const { id, slug } = await publishDraft(draft!, context!, research!);
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
