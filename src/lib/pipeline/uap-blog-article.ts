/**
 * UAP Blog Article Pipeline Orchestrator
 * Copy-Modify from blog-article.ts → NDE → UAP domain.
 *
 * Key differences from NDE version:
 * - Reads from uap_questions instead of nde_questions
 * - Uses search_uap_punctuated_embeddings RPC (different filter params)
 * - Internal links: /uap/video/ instead of /video/
 * - Publishes with domain: 'uap' in blog_posts
 * - No NoeticMap integration (NDE-specific academic paper index)
 * - UAP-specific prompt templates from uap-blog-prompts.ts
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { researchQuestion, filterOverusedCitations, getCitationUsageCounts, type ResearchResult } from './blog-research';
import { generateHeroImage } from './blog-image';
import { verifyArticle, type ArticleReference } from './blog-verify';
import { sanitizeMarkdownLinks, stripMarkdownLinks } from './blog-article';
import { gatePublishStatus } from './content-quality';
import {
    buildUapDraftSystemPrompt,
    buildUapDraftUserPrompt,
    buildUapVoicePassSystemPrompt,
    UAP_SEO_REFRESH_PROMPT,
    buildUapResearchPrompt,
} from './uap-blog-prompts';

// ─── Types (reused from blog-article) ─────────────────────────────────────────

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
            'X-Title': 'Project Profound UAP Blog Pipeline',
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

// ─── Step 1: Context Assembly (UAP-specific) ──────────────────────────────────

interface UapArticleContext {
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

async function assembleUapContext(questionSlug: string): Promise<UapArticleContext> {
    const supabase = getSupabaseAdmin();

    // Fetch the question row from uap_questions (not nde_questions)
    const { data: q, error: qErr } = await supabase
        .from('uap_questions')
        .select('consumer_question, ai_query, slug')
        .eq('slug', questionSlug)
        .single();

    if (qErr || !q) {
        throw new Error(`UAP question not found: ${questionSlug} — ${qErr?.message}`);
    }

    // Fetch top-similarity UAP transcript chunks using UAP-specific RPC
    let topChunks: UapArticleContext['topChunks'] = [];
    let videoReferences: UapArticleContext['videoReferences'] = [];
    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
        const embRes = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: q.ai_query,
        });
        const embedding = embRes.data[0].embedding;

        // UAP RPC has different filter params: filter_tier, filter_track
        const { data: chunks } = await supabase.rpc('search_uap_punctuated_embeddings', {
            query_embedding: embedding,
            similarity_threshold: 0.5,
            page_limit: 8,
            page_offset: 0,
            sort_column: 'similarity',
            sort_direction: 'DESC',
            filter_tier: 0,        // no tier filter
            filter_track: '',      // no track filter
        });

        const rawChunks = (chunks ?? []) as Array<{
            content: string; video_id: string; title: string; url: string;
            channel_name: string; start_time: number | null;
        }>;

        // Extract text chunks WITH video metadata
        topChunks = rawChunks.slice(0, 5).map((c) => ({
            content: c.content,
            videoId: c.video_id,
            title: c.title ?? '',
            channelName: c.channel_name ?? '',
            startTime: c.start_time ?? undefined,
        }));

        // Deduplicate video references (top 3 distinct videos)
        const seenVideoIds = new Set<string>();
        for (const chunk of rawChunks) {
            if (chunk.video_id && !seenVideoIds.has(chunk.video_id)) {
                seenVideoIds.add(chunk.video_id);
                videoReferences.push({
                    videoId: chunk.video_id,
                    title: chunk.title ?? '',
                    url: chunk.url ?? '',
                    channelName: chunk.channel_name ?? '',
                });
                if (videoReferences.length >= 3) break;
            }
        }
    } catch {
        console.warn('[uap-blog-article] Could not fetch UAP chunks — continuing without quotes');
    }

    // Get approximate UAP video count
    const { count } = await supabase
        .from('uap_vids')
        .select('id', { count: 'exact', head: true })
        .eq('intake_status', 'complete');

    // Find related UAP question slugs for internal cross-linking
    let relatedQuestionSlugs: UapArticleContext['relatedQuestionSlugs'] = [];
    try {
        const keywords = q.consumer_question.toLowerCase()
            .replace(/[^a-z\s]/g, '')
            .split(/\s+/)
            .filter((w: string) => w.length > 3 && !['what', 'when', 'where', 'that', 'were', 'have', 'been', 'does', 'uaps', 'encounters'].includes(w));

        if (keywords.length > 0) {
            const { data: questions } = await supabase
                .from('uap_questions')
                .select('slug, consumer_question')
                .eq('is_active', true)
                .neq('slug', questionSlug)
                .or(keywords.slice(0, 3).map((k: string) => `consumer_question.ilike.%${k}%`).join(','))
                .limit(5);

            relatedQuestionSlugs = (questions ?? []).map((rq) => ({
                slug: rq.slug,
                question: rq.consumer_question,
            }));
        }
    } catch {
        console.warn('[uap-blog-article] Could not fetch related UAP questions');
    }

    return {
        question: q.consumer_question,
        consumerQuestion: q.consumer_question,
        hydePassage: q.ai_query,
        questionSlug: q.slug,
        videoCount: count ?? 500,
        topChunks,
        videoReferences,
        relatedQuestionSlugs,
        authorName: await getNextUapAuthor(),
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

async function draftUapArticle(
    context: UapArticleContext,
    research: ResearchResult,
    overusedWarning?: string,
): Promise<ArticleDraft> {
    const openRouter = getOpenRouter();

    const researchText = [
        research.rawText,
        research.citations.length > 0
            ? '\n\nSOURCES:\n' + research.citations.map((c, i) => `[${i + 1}] ${c.title} — ${c.url}`).join('\n')
            : '',
        overusedWarning ?? '',
    ].join('');

    const response = await openRouter.chat.completions.create({
        model: 'anthropic/claude-sonnet-4-5',
        messages: [
            { role: 'system', content: buildUapDraftSystemPrompt() },
            {
                role: 'user',
                content: buildUapDraftUserPrompt({
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
            { role: 'assistant', content: '{' },
        ],
        max_tokens: 24000,
        temperature: 0.7,
    });

    const rawContent = '{' + (response.choices[0]?.message?.content ?? '{}');
    const cleaned = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let draft: ArticleDraft;
    try {
        draft = JSON.parse(cleaned);
    } catch {
        throw new Error(`Claude returned invalid JSON: ${cleaned.slice(0, 200)}`);
    }

    // HARD BLOCK: Never publish a truncated article
    const finishReason = response.choices[0]?.finish_reason;
    if (finishReason === 'length') {
        throw new Error(
            `TRUNCATION DETECTED: Claude hit max_tokens (finish_reason: "length"). ` +
            `Output was ${cleaned.length} chars. The article would be incomplete.`
        );
    }

    if (!draft.title || !draft.slug || !draft.body_mdx) {
        throw new Error('Draft missing required fields (title, slug, body_mdx)');
    }

    return draft;
}

// ─── Step 5: Publish ──────────────────────────────────────────────────────────

async function publishUapDraft(
    draft: ArticleDraft,
    context: UapArticleContext,
    research: ResearchResult,
    heroImageUrl?: string,
    heroImagePrompt?: string,
): Promise<{ id: number; slug: string }> {
    const supabase = getSupabaseAdmin();

    // Quality gate (AI-6): damaged bodies are held as drafts, never published.
    const gate = gatePublishStatus(draft.body_mdx, draft.slug);

    const { data, error } = await supabase
        .from('blog_posts')
        .insert({
            slug: draft.slug,
            title: draft.title,
            subtitle: draft.subtitle,
            category: 'big-question',
            author_name: context.authorName,
            status: gate.status,
            published_at: new Date().toISOString(),
            lead_paragraph: stripMarkdownLinks(draft.lead_paragraph),
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
            domain: 'uap',  // ← KEY DIFFERENCE: domain isolation
        })
        .select('id, slug')
        .single();

    if (error) throw new Error(`Failed to insert UAP blog_posts: ${error.message}`);
    if (!data) throw new Error('Insert returned no data');

    return { id: data.id, slug: data.slug };
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

/**
 * Generate a UAP blog article from a uap_questions slug.
 */
export async function generateUapBlogArticle(
    questionSlug: string,
    onStep?: (step: ArticleStep) => void
): Promise<BlogArticleResult> {
    const steps: ArticleStep[] = [
        makeStep('Context assembly'),
        makeStep('Research (Tavily)'),
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
        .eq('domain', 'uap')
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

    let context: UapArticleContext;
    let research: ResearchResult;
    let draft: ArticleDraft;
    let heroImageUrl: string | undefined;
    let heroImagePrompt: string | undefined;

    // ── Step 1 ────────────────────────────────────────────────────────────────
    const s1 = steps[0];
    startStep(s1, onStep);
    const t1 = Date.now();
    try {
        context = await assembleUapContext(questionSlug);
        finishStep(s1, 'success', `"${context.question}" · ${context.topChunks.length} UAP quotes`, t1, onStep);
    } catch (err) {
        finishStep(s1, 'failed', String(err), t1, onStep);
        return { ...result, status: 'failed', error: String(err) };
    }

    // ── Step 2: Research (Tavily + citation filtering — no NoeticMap for UAP) ─
    const s2 = steps[1];
    startStep(s2, onStep);
    const t2 = Date.now();
    result.status = 'researching';
    let overusedWarning = '';
    try {
        const [researchResult, citationCounts] = await Promise.all([
            researchQuestion(context.question, context.consumerQuestion),
            getCitationUsageCounts(),
        ]);

        research = researchResult;

        // Filter overused citations
        const originalCount = research.citations.length;
        research = {
            ...research,
            citations: filterOverusedCitations(
                research.citations,
                citationCounts,
                3, 5,
            ),
        };

        // Build overused-source warning for the draft prompt
        const overusedUrls = [...citationCounts.entries()]
            .filter(([, count]) => count >= 2)
            .map(([url]) => url);
        if (overusedUrls.length > 0) {
            overusedWarning = `\n\nPREVIOUSLY USED SOURCES (cited in ${overusedUrls.length} earlier articles — prefer NEW sources):\n` +
                overusedUrls.slice(0, 15).map(u => `- ${u}`).join('\n') +
                '\nUse these only if essential. Prefer less-cited sources.';
        }

        finishStep(s2, 'success',
            `${originalCount} Tavily citations · ${research.citations.length} after filtering · ${research.keyFindings.length} key findings`,
            t2, onStep);
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
        draft = await draftUapArticle(context!, research!, overusedWarning);
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
        finishStep(s3b, 'failed', `Image skipped: ${String(err)}`, t3b, onStep);
    }

    // Voice pass skipped — voice rules baked into draft prompt (one-pass mode)
    const s4 = steps[4];
    finishStep(s4, 'skipped', 'Voice rules applied during draft (one-pass mode)', Date.now(), onStep);

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
        finishStep(s4b, 'failed', `Verification skipped: ${String(err)}`, t4b, onStep);
    }

    // ── Step 5 ────────────────────────────────────────────────────────────────
    const s5 = steps[6];
    startStep(s5, onStep);
    const t5 = Date.now();
    result.status = 'publishing';
    try {
        draft = { ...draft!, body_mdx: sanitizeMarkdownLinks(draft!.body_mdx) };
        const { id, slug } = await publishUapDraft(draft!, context!, research!, heroImageUrl, heroImagePrompt);
        finishStep(s5, 'success', `Saved. ID: ${id}`, t5, onStep);
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

const UAP_AUTHOR_ROTATION = ['Tom Wood', 'Dr. Micul Love', 'Pamela Harris'];

async function getNextUapAuthor(): Promise<string> {
    try {
        const supabase = getSupabaseAdmin();
        const { data } = await supabase
            .from('blog_posts')
            .select('author_name')
            .eq('domain', 'uap')
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!data?.author_name) return UAP_AUTHOR_ROTATION[0];
        const lastIdx = UAP_AUTHOR_ROTATION.indexOf(data.author_name);
        return UAP_AUTHOR_ROTATION[(lastIdx + 1) % UAP_AUTHOR_ROTATION.length];
    } catch {
        return UAP_AUTHOR_ROTATION[0];
    }
}
