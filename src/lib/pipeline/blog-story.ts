/**
 * Blog Story Pipeline — Orchestrator
 *
 * Generates long-form narrative articles retelling named experiencers' NDEs
 * using only our internal video transcripts. Designed as a pure function
 * callable from cron, admin UI, or CLI.
 *
 * 6 steps:
 * 1. Select     — pick next experiencer by total views
 * 2. Context    — assemble their video transcripts + metadata
 * 3. Draft      — Claude writes the narrative (JSON output)
 * 4. Voice pass — strip AI tics, enforce style
 * 5. Images     — thumbnail + 2 fal.ai paintings
 * 6. Publish    — insert blog_posts row
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import {
    STORY_DRAFT_SYSTEM_PROMPT,
    STORY_VOICE_PASS_SYSTEM,
    buildStoryDraftUserPrompt,
    buildDeathSceneImagePrompt,
    buildAfterlifeEncounterImagePrompt,
} from './blog-story-prompts';
import { sanitizeMarkdownLinks, stripMarkdownLinks } from './blog-article';
import { SEO_REFRESH_PROMPT } from './blog-prompts';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoryArticleResult {
    status: 'complete' | 'already_exists' | 'no_experiencers' | 'failed';
    experiencerSlug?: string;
    experiencerName?: string;
    articleSlug?: string;
    articleId?: number;
    error?: string;
}

interface StoryDraft {
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
    related_video_ids: string[];
    image_prompts: {
        death_scene: string;
        afterlife_encounter: string;
    };
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
        timeout: 6 * 60 * 1000, // 6-minute timeout — drafts with 24K max_tokens can take 3-4 minutes
        defaultHeaders: {
            'HTTP-Referer': 'https://projectprofound.org',
            'X-Title': 'Project Profound Story Pipeline',
        },
    });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert raw timestamped subtitle segments to a readable format with timestamps.
 * Input: JSON with {data: [{start, end, text}]} or [{text, start, duration}]
 * Output: "[0:00] text\n[0:05] text\n..."
 */
function formatTimestampedTranscript(rawJson: unknown): string {
    try {
        let segments: Array<{ text: string; start: number }>;

        if (Array.isArray(rawJson)) {
            // Format: [{text, start, duration}]
            segments = rawJson;
        } else if (rawJson && typeof rawJson === 'object' && 'data' in rawJson) {
            // Format: {data: [{start, end, text}]}
            segments = (rawJson as { data: Array<{ text: string; start: number }> }).data;
        } else {
            return '';
        }

        return segments
            .filter(s => s.text && s.text !== '[Music]' && s.text.trim().length > 0)
            .map(s => {
                const mins = Math.floor(s.start / 60);
                const secs = Math.floor(s.start % 60);
                const ts = `${mins}:${String(secs).padStart(2, '0')}`;
                // Clean HTML entities
                const text = s.text
                    .replace(/&#39;/g, "'")
                    .replace(/&quot;/g, '"')
                    .replace(/&amp;/g, '&')
                    .replace(/\\n/g, ' ')
                    .trim();
                return `[${ts}] ${text}`;
            })
            .join('\n');
    } catch {
        return '';
    }
}

/**
 * Generate experiencer slug from full name: "Betty Guadagno" → "betty-guadagno"
 */
function nameToSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
}

// ─── fal.ai Image Generation ─────────────────────────────────────────────────

interface FalResponse {
    images?: Array<{ url: string; width: number; height: number }>;
}

async function generateImageWithFal(prompt: string): Promise<{ url: string; width: number; height: number }> {
    const apiKey = process.env.FAL_API_KEY;
    if (!apiKey) throw new Error('Missing FAL_API_KEY');

    const submitRes = await fetch('https://queue.fal.run/fal-ai/flux/dev', {
        method: 'POST',
        headers: {
            'Authorization': `Key ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt,
            image_size: 'landscape_16_9',
            num_inference_steps: 28,
            guidance_scale: 3.5,
            num_images: 1,
            enable_safety_checker: true,
        }),
    });

    if (!submitRes.ok) throw new Error(`fal.ai submit error ${submitRes.status}`);

    const { request_id, status_url } = await submitRes.json() as { request_id: string; status_url: string };

    // Poll for completion (max 3 minutes)
    for (let i = 0; i < 36; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const pollRes = await fetch(status_url ?? `https://queue.fal.run/fal-ai/flux/dev/requests/${request_id}`, {
            headers: { 'Authorization': `Key ${apiKey}` },
        });
        if (!pollRes.ok) continue;
        const pollData = await pollRes.json() as { status: string; response_url?: string };
        if (pollData.status === 'COMPLETED' && pollData.response_url) {
            const resultRes = await fetch(pollData.response_url, {
                headers: { 'Authorization': `Key ${apiKey}` },
            });
            const result = await resultRes.json() as FalResponse;
            const img = result.images?.[0];
            if (!img) throw new Error('fal.ai returned no images');
            return img;
        }
        if (pollData.status === 'FAILED') throw new Error('fal.ai generation failed');
    }
    throw new Error('fal.ai timed out');
}

async function uploadToStorage(imageUrl: string, fileName: string): Promise<string> {
    const supabase = getSupabaseAdmin();
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) throw new Error(`Failed to fetch image: ${imageRes.status}`);
    const imageBuffer = await imageRes.arrayBuffer();

    const contentType = imageUrl.includes('.webp') ? 'image/webp'
        : imageUrl.includes('.png') ? 'image/png'
        : 'image/jpeg';

    const { error } = await supabase.storage
        .from('media')
        .upload(fileName, imageBuffer, { contentType, upsert: true });

    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
    return publicUrl;
}

// ─── Stage 1: Experiencer Selection ───────────────────────────────────────────

interface ExperiencerCandidate {
    experiencerFullName: string;
    totalViews: number;
    videoCount: number;
    slug: string;
}

async function selectNextExperiencer(specificSlug?: string): Promise<ExperiencerCandidate | null> {
    const supabase = getSupabaseAdmin();

    // Get already-generated experiencer slugs
    const { data: existing } = await supabase
        .from('blog_posts')
        .select('source_experiencer_slug')
        .not('source_experiencer_slug', 'is', null);

    const alreadyDone = (existing ?? []).map(r => r.source_experiencer_slug).filter(Boolean) as string[];

    if (specificSlug && !alreadyDone.includes(specificSlug)) {
        // Specific experiencer requested — use RPC with just that slug excluded
        const { data: candidates } = await supabase.rpc('get_top_experiencers_for_stories', {
            already_done_slugs: alreadyDone,
            result_limit: 200,
        });

        const match = (candidates ?? []).find(
            (c: { slug: string }) => c.slug === specificSlug
        );

        if (!match) {
            console.warn(`[story] ${specificSlug} not found or has no complete videos`);
            return null;
        }

        return {
            experiencerFullName: match.experiencer_full_name,
            totalViews: Number(match.total_views),
            videoCount: Number(match.video_count),
            slug: match.slug,
        };
    }

    // Auto-select: server-side aggregation across ALL 9,700+ videos
    const { data: candidates, error } = await supabase.rpc('get_top_experiencers_for_stories', {
        already_done_slugs: alreadyDone,
        result_limit: 10,
    });

    if (error) {
        console.error(`[story] RPC error: ${error.message}`);
        return null;
    }

    const top = (candidates ?? [])[0];
    if (!top) return null;

    console.log(`[story] Top 5 candidates: ${(candidates ?? []).slice(0, 5).map((c: { experiencer_full_name: string; total_views: number }) => `${c.experiencer_full_name} (${Number(c.total_views).toLocaleString()})`).join(', ')}`);

    return {
        experiencerFullName: top.experiencer_full_name,
        totalViews: Number(top.total_views),
        videoCount: Number(top.video_count),
        slug: top.slug,
    };
}


// ─── Stage 2: Context Assembly ────────────────────────────────────────────────

interface StoryContext {
    experiencer: {
        fullName: string;
        slug: string;
        experienceType: string | null;
        triggerCategory: string | null;
        coreThemes: string[] | null;
        highlightQuote: string | null;
        hasProfile: boolean;
    };
    primaryVideos: Array<{
        videoId: string;
        title: string;
        viewCount: number;
        channelName: string;
        thumbnailUrl: string | null;
        transcript: string;
        timestampedSegments: string;
        analysisSummary: string | null;
    }>;
    otherVideos: Array<{
        videoId: string;
        title: string;
        viewCount: number;
        channelName: string;
    }>;
    heroThumbnailUrl: string | null;
}

async function assembleStoryContext(candidate: ExperiencerCandidate): Promise<StoryContext> {
    const supabase = getSupabaseAdmin();

    // Fetch all videos for this experiencer
    // Use raw_timestamped_subtitles_cleaned first, fall back to raw_timestamped_subtitles
    const { data: videos } = await supabase
        .from('nde_vids')
        .select('"videoId", title, "viewCount", "channelName", "thumbnailUrl", subtitles_punctuated, "raw_timestamped_subtitles_cleaned", raw_timestamped_subtitles, analysis_nde_summary')
        .eq('experiencerFullName', candidate.experiencerFullName)
        .eq('intake_status', 'complete')
        .order('viewCount', { ascending: false });

    const allVideos = (videos ?? []) as Array<{
        videoId: string;
        title: string;
        viewCount: number;
        channelName: string;
        thumbnailUrl: string | null;
        subtitles_punctuated: string | null;
        raw_timestamped_subtitles_cleaned: unknown | null;
        raw_timestamped_subtitles: unknown | null;
        analysis_nde_summary: string | null;
    }>;

    // Transcript caps — prevents prompt from exceeding model context / causing network timeouts
    // We send 1 primary video with full transcript (better to get 100% of one video
    // than 50% of two). Generous caps since it's only one video.
    const MAX_PUNCTUATED_CHARS = 60_000;
    const MAX_TIMESTAMPED_CHARS = 80_000;

    // Primary video: top 1 by views (with full transcript for context)
    const primaryVideos = allVideos.slice(0, 1).map(v => {
        let transcript = v.subtitles_punctuated ?? '';
        let timestampedSegments = formatTimestampedTranscript(
            v.raw_timestamped_subtitles_cleaned ?? v.raw_timestamped_subtitles
        );

        if (transcript.length > MAX_PUNCTUATED_CHARS) {
            console.warn(`    [story] Truncating punctuated transcript for ${v.videoId}: ${transcript.length} → ${MAX_PUNCTUATED_CHARS} chars`);
            transcript = transcript.slice(0, MAX_PUNCTUATED_CHARS) + '\n\n[...transcript truncated for length]';
        }
        if (timestampedSegments.length > MAX_TIMESTAMPED_CHARS) {
            console.warn(`    [story] Truncating timestamped transcript for ${v.videoId}: ${timestampedSegments.length} → ${MAX_TIMESTAMPED_CHARS} chars`);
            timestampedSegments = timestampedSegments.slice(0, MAX_TIMESTAMPED_CHARS) + '\n\n[...transcript truncated for length]';
        }

        return {
            videoId: v.videoId,
            title: v.title,
            viewCount: v.viewCount ?? 0,
            channelName: v.channelName ?? '',
            thumbnailUrl: v.thumbnailUrl,
            transcript,
            timestampedSegments,
            analysisSummary: v.analysis_nde_summary,
        };
    });

    // Other videos: metadata only (for linking) — includes 2nd video onward
    const otherVideos = allVideos.slice(1).map(v => ({
        videoId: v.videoId,
        title: v.title,
        viewCount: v.viewCount ?? 0,
        channelName: v.channelName ?? '',
    }));

    // Check for experiencer profile
    const { data: profile } = await supabase
        .from('experiencer_profiles')
        .select('slug, experience_type, trigger_category, core_themes, highlight_quote')
        .eq('slug', candidate.slug)
        .single();

    const heroThumbnailUrl = allVideos[0]?.thumbnailUrl ?? null;

    return {
        experiencer: {
            fullName: candidate.experiencerFullName,
            slug: candidate.slug,
            experienceType: profile?.experience_type ?? null,
            triggerCategory: profile?.trigger_category ?? null,
            coreThemes: profile?.core_themes ?? null,
            highlightQuote: profile?.highlight_quote ?? null,
            hasProfile: !!profile,
        },
        primaryVideos,
        otherVideos,
        heroThumbnailUrl,
    };
}

// ─── Stage 3: Claude Draft ────────────────────────────────────────────────────

async function generateStoryDraft(context: StoryContext): Promise<StoryDraft> {
    const openRouter = getOpenRouter();

    const userPrompt = buildStoryDraftUserPrompt({
        experiencer: context.experiencer,
        primaryVideos: context.primaryVideos,
        otherVideos: context.otherVideos,
    });

    console.log(`    [story] Sending draft request to Claude (${userPrompt.length} chars)...`);

    const response = await openRouter.chat.completions.create({
        model: 'anthropic/claude-sonnet-4-5',
        messages: [
            { role: 'system', content: STORY_DRAFT_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
            { role: 'assistant', content: '{' },
        ],
        max_tokens: 24000, // Must be high enough to never truncate a 4K-word story in JSON. Truncation = broken article.
        temperature: 0.7,
    });

    const rawContent = response?.choices?.[0]?.message?.content;
    const finishReason = response?.choices?.[0]?.finish_reason ?? 'unknown';

    if (!rawContent || rawContent.trim().length === 0) {
        throw new Error(`Claude returned empty content (finish_reason: ${finishReason}). Model may be overloaded or the request was filtered.`);
    }

    // HARD BLOCK: Never publish a truncated story. If Claude hit max_tokens, the article is incomplete.
    if (finishReason === 'length') {
        throw new Error(
            `TRUNCATION DETECTED: Claude hit max_tokens and stopped mid-output (finish_reason: "length"). ` +
            `Output was ${rawContent.length} chars. The story would be incomplete. ` +
            `Increase max_tokens or reduce input context size.`
        );
    }

    let jsonStr = '{' + rawContent;
    // Strip markdown code fence if present
    jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    let draft: StoryDraft;
    try {
        draft = JSON.parse(jsonStr) as StoryDraft;
    } catch (parseErr) {
        // Attempt JSON repair for truncated output (unterminated strings/objects)
        console.warn(`[story] JSON parse failed, attempting repair: ${String(parseErr).slice(0, 100)}`);
        try {
            let repaired = jsonStr;
            // Close any unterminated string
            const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
            if (quoteCount % 2 !== 0) {
                repaired += '"';
            }
            // Close open braces/brackets
            const openBraces = (repaired.match(/{/g) || []).length;
            const closeBraces = (repaired.match(/}/g) || []).length;
            const openBrackets = (repaired.match(/\[/g) || []).length;
            const closeBrackets = (repaired.match(/]/g) || []).length;
            for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += ']';
            for (let i = 0; i < openBraces - closeBraces; i++) repaired += '}';
            draft = JSON.parse(repaired) as StoryDraft;
            console.log('[story] JSON repair succeeded');
        } catch {
            throw new Error(`Claude returned invalid JSON (repair failed): ${jsonStr.slice(0, 200)}`);
        }
    }

    if (!draft.body_mdx || draft.body_mdx.length < 500) {
        throw new Error('Draft body too short or missing');
    }

    return draft;
}

// ─── Stage 4: Voice Pass ──────────────────────────────────────────────────────

async function applyVoicePass(draft: StoryDraft): Promise<StoryDraft> {
    const openRouter = getOpenRouter();

    const voiceResponse = await openRouter.chat.completions.create({
        model: 'anthropic/claude-sonnet-4-5',
        messages: [
            { role: 'system', content: STORY_VOICE_PASS_SYSTEM },
            { role: 'user', content: `Apply the voice pass to this story article. Return ONLY the corrected body_mdx text (no JSON wrapper, no markdown fence).\n\nCurrent body_mdx:\n\n${draft.body_mdx}` },
        ],
        max_tokens: 6000,
        temperature: 0.3,
    });

    const voiceContent = voiceResponse?.choices?.[0]?.message?.content;
    const revisedBody = (voiceContent && voiceContent.trim().length > 100)
        ? voiceContent
        : draft.body_mdx; // Fall back to original if voice pass returned empty/short
    if (!voiceContent) {
        console.warn('[story] Voice pass returned empty content, keeping original body');
    }

    // Refresh SEO fields
    const seoResponse = await openRouter.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [
            { role: 'user', content: `${SEO_REFRESH_PROMPT}\n\nTITLE: ${draft.title}\n\nARTICLE BODY:\n${revisedBody.slice(0, 3000)}` },
            { role: 'assistant', content: '{' },
        ],
        max_tokens: 400,
        temperature: 0.2,
    });

    let seoFields = { lead_paragraph: draft.lead_paragraph, seo_description: draft.seo_description };
    try {
        seoFields = JSON.parse('{' + (seoResponse.choices[0]?.message?.content ?? '{}'));
    } catch { /* keep original */ }

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

// ─── Stage 5: Images ──────────────────────────────────────────────────────────

interface StoryImages {
    heroUrl: string;
    deathSceneUrl: string | null;
    deathScenePrompt: string | null;
    afterlifeUrl: string | null;
    afterlifePrompt: string | null;
}

async function generateStoryImages(
    draft: StoryDraft,
    context: StoryContext,
): Promise<StoryImages> {
    const slug = draft.slug;

    // Image 1: YouTube thumbnail as hero
    let heroUrl = '';
    if (context.heroThumbnailUrl) {
        try {
            // Use maxresdefault if available, otherwise the provided URL
            const videoId = context.primaryVideos[0]?.videoId;
            const thumbnailUrl = videoId
                ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
                : context.heroThumbnailUrl;

            heroUrl = await uploadToStorage(thumbnailUrl, `blog/${slug}-hero.jpg`);
            console.log(`    [story] Hero thumbnail uploaded: ${heroUrl}`);
        } catch (err) {
            console.warn(`    [story] Failed to upload thumbnail, using direct URL: ${err}`);
            heroUrl = context.heroThumbnailUrl;
        }
    }

    // Images 2 & 3: Generate fal.ai paintings in PARALLEL (saves ~60s vs sequential)
    let deathSceneUrl: string | null = null;
    let deathScenePrompt: string | null = null;
    let afterlifeUrl: string | null = null;
    let afterlifePrompt: string | null = null;

    const imageJobs: Array<Promise<{ type: string; url: string; prompt: string }>> = [];

    if (draft.image_prompts?.death_scene) {
        deathScenePrompt = buildDeathSceneImagePrompt(draft.image_prompts.death_scene);
        imageJobs.push(
            generateImageWithFal(deathScenePrompt)
                .then(img => uploadToStorage(img.url, `blog/${slug}-death-scene.webp`))
                .then(url => ({ type: 'death_scene', url, prompt: deathScenePrompt! }))
        );
    }

    if (draft.image_prompts?.afterlife_encounter) {
        afterlifePrompt = buildAfterlifeEncounterImagePrompt(draft.image_prompts.afterlife_encounter);
        imageJobs.push(
            generateImageWithFal(afterlifePrompt)
                .then(img => uploadToStorage(img.url, `blog/${slug}-afterlife.webp`))
                .then(url => ({ type: 'afterlife', url, prompt: afterlifePrompt! }))
        );
    }

    const imageResults = await Promise.allSettled(imageJobs);
    for (const result of imageResults) {
        if (result.status === 'fulfilled') {
            if (result.value.type === 'death_scene') {
                deathSceneUrl = result.value.url;
                console.log(`    [story] Death scene image uploaded: ${deathSceneUrl}`);
            } else {
                afterlifeUrl = result.value.url;
                console.log(`    [story] Afterlife image uploaded: ${afterlifeUrl}`);
            }
        } else {
            console.warn(`    [story] Image generation failed: ${result.reason}`);
        }
    }

    return { heroUrl, deathSceneUrl, deathScenePrompt, afterlifeUrl, afterlifePrompt };
}

// ─── Stage 6: Publish ─────────────────────────────────────────────────────────

async function publishStory(
    draft: StoryDraft,
    experiencerSlug: string,
    images: StoryImages,
): Promise<{ id: number; slug: string }> {
    const supabase = getSupabaseAdmin();

    // Inject inline images into body_mdx as raw HTML (passes through markdownToHtml untouched)
    // Uses <figure><img> — same approach as the hero image, not markdown syntax.
    let body = draft.body_mdx;
    if (images.deathSceneUrl || images.afterlifeUrl) {
        const buildImageHtml = (url: string, caption: string) =>
            `<figure class="my-8"><img src="${url}" alt="${caption}" class="rounded-xl w-full shadow-md" loading="lazy" /><figcaption class="text-center text-sm text-slate-500 dark:text-slate-400 mt-3 italic">${caption}</figcaption></figure>`;

        // Find the first ## heading after the opening prose and inject the death scene image
        if (images.deathSceneUrl) {
            const firstHeadingIdx = body.indexOf('\n##');
            if (firstHeadingIdx > 0) {
                const caption = draft.image_prompts?.death_scene || 'The moment everything changed';
                body = body.slice(0, firstHeadingIdx) +
                    '\n\n' + buildImageHtml(images.deathSceneUrl, caption) + '\n' +
                    body.slice(firstHeadingIdx);
            }
        }

        // Inject afterlife image near the middle of the article
        if (images.afterlifeUrl) {
            const headings = [...body.matchAll(/\n##\s/g)];
            const midHeadingIdx = headings.length >= 3
                ? headings[Math.floor(headings.length / 2)]?.index
                : null;
            if (midHeadingIdx) {
                const caption = draft.image_prompts?.afterlife_encounter || 'What awaited on the other side';
                body = body.slice(0, midHeadingIdx) +
                    '\n\n' + buildImageHtml(images.afterlifeUrl, caption) + '\n' +
                    body.slice(midHeadingIdx);
            }
        }
    }

    const { data, error } = await supabase
        .from('blog_posts')
        .insert({
            slug: draft.slug,
            title: draft.title,
            subtitle: draft.subtitle,
            category: 'story',
            author_name: 'Thomas Wood',
            status: 'published',
            published_at: new Date().toISOString(),
            lead_paragraph: stripMarkdownLinks(draft.lead_paragraph),
            body_mdx: sanitizeMarkdownLinks(body),
            read_time_mins: draft.read_time_mins,
            word_count: draft.word_count,
            tags: draft.tags,
            seo_title: draft.seo_title,
            seo_description: draft.seo_description,
            source_experiencer_slug: experiencerSlug,
            related_video_ids: draft.related_video_ids,
            hero_image_url: images.heroUrl || null,
            hero_image_prompt: images.deathScenePrompt || null,
            refs: null, // Stories don't have external references
        })
        .select('id, slug')
        .single();

    if (error) throw new Error(`Failed to insert blog_posts: ${error.message}`);
    if (!data) throw new Error('Insert returned no data');
    return { id: data.id, slug: data.slug };
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

/** Step progress callback — compatible with ArticleStep from blog-article.ts */
export interface StoryStep {
    name: string;
    status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
    message?: string;
    duration_ms?: number;
}

/**
 * Generate a story article for a named NDE experiencer.
 *
 * @param experiencerSlug - optional slug (e.g. "betty-guadagno") to target specific experiencer.
 *                          If omitted, auto-selects the highest-view-count experiencer not yet done.
 * @param onStep - optional callback for real-time progress updates (SSE support)
 */
export async function generateStoryArticle(
    experiencerSlug?: string,
    onStep?: (step: StoryStep) => void,
): Promise<StoryArticleResult> {
    const emit = (name: string, status: StoryStep['status'], message?: string, duration_ms?: number) => {
        console.log(`[story] ${name}: ${status}${message ? ' — ' + message : ''}`);
        onStep?.({ name, status, message, duration_ms });
    };

    try {
        // ── Stage 1: Select experiencer ──
        let t0 = Date.now();
        emit('Select experiencer', 'running');
        const candidate = await selectNextExperiencer(experiencerSlug);

        if (!candidate) {
            emit('Select experiencer', 'failed', 'No eligible experiencers remaining');
            return { status: 'no_experiencers' };
        }

        emit('Select experiencer', 'success',
            `${candidate.experiencerFullName} (${candidate.totalViews.toLocaleString()} views, ${candidate.videoCount} videos)`,
            Date.now() - t0);

        // Check if already exists
        const supabase = getSupabaseAdmin();
        const { data: existing } = await supabase
            .from('blog_posts')
            .select('id')
            .eq('source_experiencer_slug', candidate.slug)
            .single();

        if (existing) {
            emit('Select experiencer', 'skipped', `Story already exists for ${candidate.experiencerFullName}`);
            return { status: 'already_exists', experiencerSlug: candidate.slug, experiencerName: candidate.experiencerFullName };
        }

        // ── Stage 2: Context assembly ──
        t0 = Date.now();
        emit('Assemble context', 'running', 'Fetching transcripts and metadata...');
        const context = await assembleStoryContext(candidate);
        emit('Assemble context', 'success',
            `${context.primaryVideos.length} primary + ${context.otherVideos.length} secondary videos`,
            Date.now() - t0);

        // ── Stage 3: Claude draft ──
        t0 = Date.now();
        emit('Generate draft', 'running', 'Claude is writing the narrative...');
        const rawDraft = await generateStoryDraft(context);
        emit('Generate draft', 'success',
            `"${rawDraft.title}" (${rawDraft.word_count} words)`,
            Date.now() - t0);

        // Voice pass removed — voice calibration rules are now baked into the
        // draft system prompt, eliminating the riskiest truncation point.
        // The draft IS the polished output.
        const polishedDraft = rawDraft;

        // ── Stage 5: Images ──
        t0 = Date.now();
        emit('Generate images', 'running', 'Creating hero + 2 oil paintings via fal.ai...');
        const images = await generateStoryImages(polishedDraft, context);
        emit('Generate images', 'success',
            `Hero: ${images.heroUrl ? '✓' : '✗'}, Death scene: ${images.deathSceneUrl ? '✓' : '✗'}, Afterlife: ${images.afterlifeUrl ? '✓' : '✗'}`,
            Date.now() - t0);

        // ── Stage 6: Publish ──
        t0 = Date.now();
        emit('Publish', 'running', 'Inserting into blog_posts...');
        const result = await publishStory(polishedDraft, candidate.slug, images);
        emit('Publish', 'success',
            `/blog/${result.slug} (id=${result.id})`,
            Date.now() - t0);

        return {
            status: 'complete',
            experiencerSlug: candidate.slug,
            experiencerName: candidate.experiencerFullName,
            articleSlug: result.slug,
            articleId: result.id,
        };
    } catch (err) {
        console.error(`[story] Pipeline failed: ${err}`);
        emit('Pipeline error', 'failed', String(err));
        return {
            status: 'failed',
            experiencerSlug: experiencerSlug,
            error: String(err),
        };
    }
}
