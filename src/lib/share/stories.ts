/**
 * Story lifecycle for Share Your Experience (server only).
 *
 * draft → processing (audio/video, waiting for the transcript)
 *       → reviewing (editor suggestions ready)
 *       → published | held (crisis check) → published (admin approves)
 * published → removed (admin) | deleted (owner; hard delete)
 *
 * Every function that takes a `userId` checks that the story belongs to it.
 */
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { shareAdmin } from './db';
import {
    AGREEMENT_VERSION,
    AUDIO_MIME,
    MEDIA_BUCKET,
    MAX_TEXT_CHARS,
    STORIES_PER_DAY,
    TEXT_FILE_MIME,
    VIDEO_MIME,
    isTestEnvironment,
    siteUrl,
} from './config';
import { assembleText, slugify, splitSections, storySlug } from './text';
import { storyNeedsCrisisHold } from './crisis';
import { crisisSoftening, editorSuggestions } from './suggestions';
import { geminiConfigured } from '@/lib/ai/gemini';
import { assemblyConfigured, deleteRemoteTranscript, fetchTranscript, submitTranscription } from './assemblyai';
import { extractText } from './extract';
import { sendEmail } from './send';
import { storyHeldEmail, storyReadyEmail } from './emails';
import { randomSlugSuffix } from './tokens';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OwnStory {
    id: string;
    user_id: string;
    slug: string;
    status: 'draft' | 'processing' | 'reviewing' | 'held' | 'published' | 'removed';
    display_mode: 'named' | 'anonymous';
    display_name: string | null;
    anon_number: number;
    experience_type: string;
    title: string | null;
    year_approx: number | null;
    country: string | null;
    region: string | null;
    language: string;
    appearance_pref: string;
    media_kind: 'text' | 'audio' | 'video' | 'file';
    media_path: string | null;
    media_mime: string | null;
    original_text: string | null;
    transcript_id: string | null;
    body_text: string | null;
    summary: string | null;
    narration_path: string | null;
    image_url: string | null;
    crisis_flag: boolean;
    intro_mode: 'none' | 'all' | 'selected';
    experiencer_profile_id: number | null;
    is_test: boolean;
    published_at: string | null;
    youtube_status: string;
    youtube_video_id: string | null;
    processing_error: string | null;
    created_at: string;
    updated_at: string;
}

export interface Suggestion {
    id: number;
    story_id: string;
    section_index: number;
    original: string;
    suggested: string;
    reason: string | null;
    kind: 'style' | 'crisis';
    status: 'pending' | 'accepted' | 'rejected';
}

// ─── Validation ─────────────────────────────────────────────────────────────

const optionalText = (max: number) =>
    z
        .string()
        .trim()
        .max(max)
        .optional()
        .nullable()
        .transform((v) => (v ? v : null));

export const draftSchema = z
    .object({
        display_mode: z.enum(['named', 'anonymous']),
        display_name: optionalText(80),
        experience_type: z.enum(['nde', 'ste', 'uap', 'obe', 'adc', 'other']),
        title: optionalText(120),
        year_approx: z.coerce.number().int().min(1900).max(2100).optional().nullable().catch(null),
        country: optionalText(80),
        region: optionalText(80),
        language: z.string().trim().min(2).max(12).default('en'),
        appearance_pref: z.enum(['camera', 'audio_only', 'none']).default('none'),
        media_kind: z.enum(['text', 'audio', 'video', 'file']),
        intro_mode: z.enum(['none', 'all', 'selected']).default('none'),
        intro_channel_ids: z.array(z.string().trim().min(1).max(64)).max(300).default([]),
        text: optionalText(MAX_TEXT_CHARS),
    })
    .superRefine((v, ctx) => {
        if (v.display_mode === 'named' && !v.display_name) {
            ctx.addIssue({ code: 'custom', path: ['display_name'], message: 'Please enter the name to show with your story.' });
        }
        if (v.media_kind === 'text' && (!v.text || v.text.length < 20)) {
            ctx.addIssue({ code: 'custom', path: ['text'], message: 'Please write a little more before continuing.' });
        }
        if (v.intro_mode === 'selected' && v.intro_channel_ids.length === 0) {
            ctx.addIssue({ code: 'custom', path: ['intro_channel_ids'], message: 'Choose at least one channel, or pick "all channels".' });
        }
    });

export type DraftInput = z.input<typeof draftSchema>;

export function allowedMimeFor(kind: OwnStory['media_kind']): string[] {
    if (kind === 'audio') return AUDIO_MIME;
    if (kind === 'video') return VIDEO_MIME;
    if (kind === 'file') return TEXT_FILE_MIME;
    return [];
}

/** Base MIME type without codec parameters ("audio/webm;codecs=opus" → "audio/webm"). */
export function baseMime(mime: string): string {
    return mime.split(';')[0].trim().toLowerCase();
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const db = () => shareAdmin();

export async function getOwnStory(userId: string, storyId: string): Promise<OwnStory> {
    const { data, error } = await db().from('share_stories').select('*').eq('id', storyId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data || data.user_id !== userId) throw new Error('Story not found.');
    return data as OwnStory;
}

export async function getStoryById(storyId: string): Promise<OwnStory | null> {
    const { data } = await db().from('share_stories').select('*').eq('id', storyId).maybeSingle();
    return (data as OwnStory) ?? null;
}

export async function listOwnStories(userId: string): Promise<OwnStory[]> {
    const { data, error } = await db()
        .from('share_stories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as OwnStory[];
}

export async function getUserEmail(userId: string): Promise<string | null> {
    const { data } = await db().auth.admin.getUserById(userId);
    return data.user?.email ?? null;
}

async function update(storyId: string, patch: Partial<OwnStory>) {
    const { error } = await db().from('share_stories').update(patch).eq('id', storyId);
    if (error) throw new Error(error.message);
}

function revalidateStory(story: Pick<OwnStory, 'slug'>) {
    try {
        revalidatePath('/experiences');
        revalidatePath(`/experiences/${story.slug}`);
        revalidatePath('/share/my-experiences');
    } catch {
        /* outside a request (webhook/cron) revalidation is best-effort */
    }
}

// ─── Agreement ──────────────────────────────────────────────────────────────

export async function hasAcceptedAgreement(userId: string, kind: 'experiencer' | 'channel_conduct', version: string): Promise<boolean> {
    const { data } = await db()
        .from('share_agreements')
        .select('id')
        .eq('user_id', userId)
        .eq('kind', kind)
        .eq('version', version)
        .maybeSingle();
    return Boolean(data);
}

export async function recordAgreement(userId: string, kind: 'experiencer' | 'channel_conduct', version: string, ageConfirmed: boolean) {
    const { error } = await db()
        .from('share_agreements')
        .upsert({ user_id: userId, kind, version, age_confirmed: ageConfirmed, accepted_at: new Date().toISOString() }, { onConflict: 'user_id,kind,version' });
    if (error) throw new Error(error.message);
}

// ─── Create / upload ────────────────────────────────────────────────────────

export async function createDraft(userId: string, raw: DraftInput): Promise<{ story: OwnStory; uploadPrefix: string }> {
    const input = draftSchema.parse(raw);

    if (!(await hasAcceptedAgreement(userId, 'experiencer', AGREEMENT_VERSION))) {
        throw new Error('Please accept the Experiencer Agreement first.');
    }

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await db()
        .from('share_stories')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', since);
    if ((count ?? 0) >= STORIES_PER_DAY) {
        throw new Error(`You can share up to ${STORIES_PER_DAY} stories a day. Please come back tomorrow.`);
    }

    const { data, error } = await db()
        .from('share_stories')
        .insert({
            user_id: userId,
            slug: storySlug(input.title),
            status: 'draft',
            display_mode: input.display_mode,
            // Named: the full name. Not named: an optional first name / initials / nickname.
            display_name: input.display_name,
            experience_type: input.experience_type,
            title: input.title,
            year_approx: input.year_approx ?? null,
            country: input.country,
            region: input.region,
            language: input.language,
            appearance_pref: input.appearance_pref,
            media_kind: input.media_kind,
            original_text: input.media_kind === 'text' ? input.text : null,
            intro_mode: input.intro_mode,
            agreement_version: AGREEMENT_VERSION,
            is_test: isTestEnvironment(),
        })
        .select('*')
        .single();
    if (error || !data) throw new Error(error?.message ?? 'Could not save your story.');
    const story = data as OwnStory;

    if (input.intro_mode === 'selected' && input.intro_channel_ids.length) {
        const rows = [...new Set(input.intro_channel_ids)].map((channel_id) => ({ story_id: story.id, channel_id }));
        const { error: chErr } = await db().from('share_intro_channels').insert(rows);
        if (chErr) console.error('[share] intro channels insert failed:', chErr.message);
    }

    return { story, uploadPrefix: `${userId}/${story.id}/` };
}

/**
 * Record the uploaded file on the story. The browser uploaded it straight to
 * Storage with the user's own JWT; we only accept paths in their own folder
 * and confirm the object exists.
 */
export async function attachMedia(userId: string, storyId: string, path: string, mime: string) {
    const story = await getOwnStory(userId, storyId);
    if (story.status !== 'draft') throw new Error('This story has already been submitted.');
    const prefix = `${userId}/${storyId}/`;
    if (!path.startsWith(prefix) || path.includes('..')) throw new Error('Invalid upload path.');
    const clean = baseMime(mime);
    if (!allowedMimeFor(story.media_kind).includes(clean)) throw new Error('That file type is not supported here.');

    const fileName = path.slice(prefix.length);
    const { data: listed, error } = await db().storage.from(MEDIA_BUCKET).list(`${userId}/${storyId}`, { search: fileName });
    if (error || !listed?.some((o) => o.name === fileName)) throw new Error('Upload not found. Please try again.');

    await update(storyId, { media_path: path, media_mime: clean });
}

// ─── Submit → transcript → suggestions ─────────────────────────────────────

export async function submitStory(userId: string, storyId: string): Promise<OwnStory['status']> {
    const story = await getOwnStory(userId, storyId);
    if (story.status !== 'draft') return story.status;

    if (story.media_kind === 'text') {
        if (!story.original_text) throw new Error('Your story is empty.');
        await prepareReview(story.id, story.original_text);
        return 'reviewing';
    }

    if (!story.media_path) throw new Error('Please upload or record your story first.');

    if (story.media_kind === 'file') {
        const { data, error } = await db().storage.from(MEDIA_BUCKET).download(story.media_path);
        if (error || !data) throw new Error('Could not read the uploaded file.');
        const text = await extractText(new Uint8Array(await data.arrayBuffer()), story.media_mime ?? '', story.media_path);
        if (text.length < 20) throw new Error('We could not find any text in that file.');
        await update(story.id, { original_text: text });
        await prepareReview(story.id, text);
        return 'reviewing';
    }

    // Audio or video: transcribe asynchronously.
    if (!assemblyConfigured()) {
        await update(story.id, { status: 'processing', processing_error: 'Transcription is not configured yet (ASSEMBLYAI_API_KEY).' });
        return 'processing';
    }
    const { data: signed, error } = await db().storage.from(MEDIA_BUCKET).createSignedUrl(story.media_path, 24 * 3600);
    if (error || !signed?.signedUrl) throw new Error('Could not prepare your recording for transcription.');
    const transcriptId = await submitTranscription({
        audioUrl: signed.signedUrl,
        webhookUrl: `${siteUrl()}/api/share/webhooks/assemblyai`,
        language: story.language,
    });
    await update(story.id, { status: 'processing', transcript_id: transcriptId, processing_error: null });
    return 'processing';
}

/** Called by the AssemblyAI webhook (and the admin "retry" button). */
export async function completeTranscription(transcriptId: string): Promise<void> {
    const { data } = await db().from('share_stories').select('*').eq('transcript_id', transcriptId).maybeSingle();
    const story = data as OwnStory | null;
    if (!story || story.status !== 'processing') return;

    const result = await fetchTranscript(transcriptId);
    if (result.status === 'error') {
        await update(story.id, { processing_error: `Transcription failed: ${result.error ?? 'unknown error'}` });
        return;
    }
    if (result.status !== 'completed') return;

    await update(story.id, { original_text: result.text });
    await prepareReview(story.id, result.text);
    await deleteRemoteTranscript(transcriptId);

    const email = await getUserEmail(story.user_id);
    if (email) await sendEmail(storyReadyEmail(email));
}

/** Generate editor suggestions (best effort) and move the story to "reviewing". */
export async function prepareReview(storyId: string, text: string): Promise<void> {
    const sections = splitSections(text);
    let title: string | null = null;
    let summary: string | null = null;
    // Why there are no suggestions, if there are none (shown to the person and in /admin/share).
    let note: string | null = geminiConfigured() ? null : 'Editor suggestions are not available yet (GEMINI_API_KEY is not set).';

    try {
        const result = await editorSuggestions(sections);
        if (result) {
            title = result.title || null;
            summary = result.summary || null;
            await db().from('share_edit_suggestions').delete().eq('story_id', storyId).eq('kind', 'style');
            if (result.edits.length) {
                const { error } = await db()
                    .from('share_edit_suggestions')
                    .insert(
                        result.edits.map((e) => ({
                            story_id: storyId,
                            section_index: e.section_index,
                            original: sections[e.section_index],
                            suggested: e.suggested,
                            reason: e.reason,
                            kind: 'style',
                            model: result.model,
                        })),
                    );
                if (error) console.error('[share] suggestions insert failed:', error.message);
            }
        }
    } catch (err) {
        // Suggestions are a nicety: never block a story on them.
        const message = err instanceof Error ? err.message : String(err);
        console.error('[share] editor suggestions failed:', message);
        note = `Editor suggestions failed: ${message.slice(0, 300)}`;
    }

    const { data } = await db().from('share_stories').select('title, summary').eq('id', storyId).single();
    await update(storyId, {
        status: 'reviewing',
        processing_error: note,
        title: data?.title || title,
        summary: data?.summary || summary,
    });
}

export async function listSuggestions(storyId: string, kind: 'style' | 'crisis' = 'style'): Promise<Suggestion[]> {
    const { data } = await db()
        .from('share_edit_suggestions')
        .select('*')
        .eq('story_id', storyId)
        .eq('kind', kind)
        .order('section_index');
    return (data ?? []) as Suggestion[];
}

export async function setSuggestionStatus(userId: string, suggestionId: number, status: 'accepted' | 'rejected' | 'pending') {
    const { data } = await db().from('share_edit_suggestions').select('id, story_id, kind').eq('id', suggestionId).maybeSingle();
    if (!data || data.kind !== 'style') throw new Error('Suggestion not found.');
    const story = await getOwnStory(userId, data.story_id);
    if (story.status !== 'reviewing') throw new Error('This story is not being reviewed.');
    const { error } = await db().from('share_edit_suggestions').update({ status }).eq('id', suggestionId);
    if (error) throw new Error(error.message);
}

// ─── Publish / hold ─────────────────────────────────────────────────────────

/**
 * The experiencer finishes review and publishes (or the story is held).
 * The final text comes from the review page: their own edits plus any
 * suggestions they accepted. It is their story, so we take their text.
 */
export async function finishReview(userId: string, storyId: string, opts: { title?: string | null; text: string }): Promise<'published' | 'held'> {
    const story = await getOwnStory(userId, storyId);
    if (story.status !== 'reviewing') throw new Error('This story is not ready to publish.');
    const body = opts.text.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_TEXT_CHARS);
    if (body.length < 20) throw new Error('Your story is empty.');
    const title = (opts.title ?? story.title ?? '').trim().slice(0, 120) || 'My experience';
    return publishOrHold({ ...story, title }, body);
}

/** Edit the text of an already-published story (republishes, re-checks). */
export async function editStoryText(userId: string, storyId: string, newText: string, newTitle?: string | null): Promise<'published' | 'held'> {
    const story = await getOwnStory(userId, storyId);
    if (!['published', 'held'].includes(story.status)) throw new Error('Only published stories can be edited here.');
    const text = newText.replace(/\r\n?/g, '\n').trim().slice(0, MAX_TEXT_CHARS);
    if (text.length < 20) throw new Error('Your story is too short.');
    const title = (newTitle ?? story.title ?? '').trim().slice(0, 120) || story.title || 'My experience';
    return publishOrHold({ ...story, title }, text);
}

async function publishOrHold(story: OwnStory, body: string): Promise<'published' | 'held'> {
    const held = storyNeedsCrisisHold(body);
    let profileId = story.experiencer_profile_id;
    if (story.display_mode === 'named' && story.display_name && !profileId) {
        profileId = await ensureExperiencerProfile(story.user_id, story.display_name);
    }

    await update(story.id, {
        title: story.title,
        body_text: body,
        crisis_flag: held,
        status: held ? 'held' : 'published',
        published_at: held ? story.published_at : story.published_at ?? new Date().toISOString(),
        experiencer_profile_id: profileId,
        // Text changed: narration must be regenerated.
        narration_path: null,
    });
    await db().from('share_story_versions').insert({ story_id: story.id, body_text: body });
    if (story.narration_path) {
        await db().storage.from(MEDIA_BUCKET).remove([story.narration_path]);
    }

    if (held) {
        await prepareCrisisEdits(story.id, body);
        const email = await getUserEmail(story.user_id);
        if (email) await sendEmail(storyHeldEmail(email));
    }
    revalidateStory(story);
    return held ? 'held' : 'published';
}

async function prepareCrisisEdits(storyId: string, body: string) {
    try {
        const sections = splitSections(body);
        const result = await crisisSoftening(sections);
        await db().from('share_edit_suggestions').delete().eq('story_id', storyId).eq('kind', 'crisis');
        if (result?.edits.length) {
            await db()
                .from('share_edit_suggestions')
                .insert(
                    result.edits.map((e) => ({
                        story_id: storyId,
                        section_index: e.section_index,
                        original: sections[e.section_index],
                        suggested: e.suggested,
                        reason: e.reason,
                        kind: 'crisis',
                        model: result.model,
                    })),
                );
        }
    } catch (err) {
        console.error('[share] crisis softening failed:', err instanceof Error ? err.message : err);
    }
}

/** Admin: publish a held story with the chosen crisis edits (or a full manual text). */
export async function adminReleaseHeld(storyId: string, args: { acceptedIds: number[]; manualText?: string | null }) {
    const story = await getStoryById(storyId);
    if (!story || story.status !== 'held') throw new Error('Story is not held.');
    let body: string;
    if (args.manualText && args.manualText.trim()) {
        body = args.manualText.replace(/\r\n?/g, '\n').trim();
    } else {
        const sections = splitSections(story.body_text ?? '');
        const crisis = await listSuggestions(storyId, 'crisis');
        const accepted = new Set(args.acceptedIds);
        body = assembleText(
            sections,
            crisis.map((c) => ({ ...c, status: accepted.has(c.id) ? 'accepted' : 'rejected' })),
        );
    }
    await update(storyId, {
        body_text: body,
        status: 'published',
        crisis_flag: false,
        published_at: story.published_at ?? new Date().toISOString(),
        narration_path: null,
    });
    await db().from('share_story_versions').insert({ story_id: storyId, body_text: body });
    await db().from('share_edit_suggestions').delete().eq('story_id', storyId).eq('kind', 'crisis');
    revalidateStory(story);
}

export async function adminSetRemoved(storyId: string, removed: boolean) {
    const story = await getStoryById(storyId);
    if (!story) throw new Error('Story not found.');
    await update(storyId, { status: removed ? 'removed' : story.body_text ? 'published' : 'reviewing' });
    if (removed && story.youtube_video_id) await queueYoutubeRemoval(story.youtube_video_id);
    if (removed) await update(storyId, { youtube_video_id: null, youtube_status: 'pending' });
    revalidateStory(story);
}

// ─── Identity ───────────────────────────────────────────────────────────────

/**
 * A named submitter gets their OWN experiencer profile, tied to their account.
 * Never matched by name (that would attach the story to a stranger).
 */
export async function ensureExperiencerProfile(userId: string, displayName: string): Promise<number | null> {
    const { data: existing } = await db().from('experiencer_profiles').select('id').eq('user_id', userId).maybeSingle();
    if (existing?.id) return existing.id as number;
    const slug = `${slugify(displayName, 50) || 'experiencer'}-${randomSlugSuffix().slice(0, 6)}`;
    const { data, error } = await db()
        .from('experiencer_profiles')
        .insert({
            slug,
            full_name: displayName,
            video_ids: [],
            user_id: userId,
            // Shared database: profiles created from staging stay unpublished so
            // they never appear on the production /experiencer pages.
            published_at: isTestEnvironment() ? null : new Date().toISOString(),
        })
        .select('id')
        .single();
    if (error) {
        console.error('[share] experiencer profile create failed:', error.message);
        return null;
    }
    return data.id as number;
}

export async function changeDisplayMode(userId: string, storyId: string, mode: 'named' | 'anonymous', displayName?: string | null) {
    const story = await getOwnStory(userId, storyId);
    if (mode === story.display_mode) {
        // Same mode: change the name it shows (full name, or the name shown instead).
        const name = (displayName ?? '').trim().slice(0, 80);
        if (mode === 'named' && !name) return;
        if ((name || null) === story.display_name) return;
        await update(storyId, { display_name: name || null });
        if (mode === 'named') await db().from('experiencer_profiles').update({ full_name: name }).eq('user_id', userId);
        if (story.youtube_video_id) {
            await queueYoutubeRemoval(story.youtube_video_id);
            await update(storyId, { youtube_video_id: null, youtube_status: 'pending' });
        }
        revalidateStory(story);
        return;
    }
    if (mode === 'named') {
        const name = (displayName ?? '').trim().slice(0, 80);
        if (!name) throw new Error('Please enter the name to show.');
        const profileId = story.status === 'published' ? await ensureExperiencerProfile(userId, name) : story.experiencer_profile_id;
        await update(storyId, { display_mode: 'named', display_name: name, experiencer_profile_id: profileId });
    } else {
        // The full name is never kept on a story that no longer shares it.
        const shown = (displayName ?? '').trim().slice(0, 80) || null;
        await update(storyId, { display_mode: 'anonymous', display_name: shown, experiencer_profile_id: null });
    }
    // Whatever is on YouTube shows the old identity: take it down and re-upload.
    if (story.youtube_video_id) {
        await queueYoutubeRemoval(story.youtube_video_id);
        await update(storyId, { youtube_video_id: null, youtube_status: 'pending' });
    }
    revalidateStory(story);
}

// ─── Delete ─────────────────────────────────────────────────────────────────

async function queueYoutubeRemoval(videoId: string) {
    await db().from('share_youtube_removals').upsert({ youtube_video_id: videoId, done_at: null, error: null });
}

/** Full delete: media, narration, transcript, text, suggestions, intros. */
export async function deleteStoryCompletely(story: OwnStory) {
    if (story.youtube_video_id) await queueYoutubeRemoval(story.youtube_video_id);
    if (story.transcript_id) await deleteRemoteTranscript(story.transcript_id);

    const storage = db().storage.from(MEDIA_BUCKET);
    const folder = `${story.user_id}/${story.id}`;
    const { data: files } = await storage.list(folder, { limit: 1000 });
    const paths = (files ?? []).map((f) => `${folder}/${f.name}`);
    for (const p of [story.media_path, story.narration_path]) if (p && !paths.includes(p)) paths.push(p);
    if (paths.length) {
        const { error } = await storage.remove(paths);
        if (error) throw new Error(`Could not delete files: ${error.message}`);
    }
    const { error } = await db().from('share_stories').delete().eq('id', story.id);
    if (error) throw new Error(error.message);
    revalidateStory(story);
}

export async function deleteOwnStory(userId: string, storyId: string) {
    const story = await getOwnStory(userId, storyId);
    await deleteStoryCompletely(story);
}
