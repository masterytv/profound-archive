/**
 * Server side of the daily "share-youtube" GitHub Actions job
 * (.github/workflows/share-youtube.yml, scripts/share/youtube_job.py).
 *
 * The job asks for a queue, renders narration/video on the runner, uploads to
 * YouTube, and reports back. It never touches the database directly: it only
 * talks to /api/share/jobs/* with CRON_SECRET, and uploads narration through
 * one-off signed upload URLs.
 */
import { shareAdmin } from './db';
import { MEDIA_BUCKET, PUBLIC_MEDIA_BUCKET, YOUTUBE_MIN_AGE_HOURS, EXPERIENCE_TYPES, siteUrl } from './config';
import { needsNarration } from './library';
import { publicDisplayName } from './text';
import { deleteStoryCompletely, type OwnStory } from './stories';
import { expireOldIntros } from './channels';
import { generateFalImage } from '@/lib/pipeline/fal-image';

const db = () => shareAdmin();

export interface QueueItem {
    storyId: string;
    slug: string;
    title: string;
    displayName: string;
    isAnonymous: boolean;
    experienceType: string;
    mediaKind: OwnStory['media_kind'];
    /** Text for the synthetic narration (only when one is needed). */
    narrationText: string | null;
    /** Signed PUT target for the narration mp3 (only when narration is needed). */
    narrationUpload: { path: string; signedUrl: string } | null;
    /** Existing narration (signed GET), when already generated. */
    narrationUrl: string | null;
    /** Original upload (signed GET): only for named audio/video stories. */
    mediaUrl: string | null;
    imageUrl: string | null;
    /** Upload to YouTube (false for staging test stories and already-uploaded ones). */
    upload: boolean;
    /** Staging test story: mark YouTube as "skipped" once narrated. */
    markSkipped: boolean;
    youtube: { title: string; description: string; tags: string[] } | null;
}

const typeLabel = (t: string) => EXPERIENCE_TYPES.find((e) => e.value === t)?.label ?? 'Experience';

/** The illustration prompt never contains the story or the person's name. */
export function imagePrompt(experienceType: string): string {
    const theme: Record<string, string> = {
        nde: 'a luminous tunnel of soft golden light opening into a vast peaceful landscape',
        ste: 'dawn light breaking through clouds over a quiet valley, a sense of awakening',
        uap: 'a calm night sky over open countryside with a single mysterious soft glowing light',
        obe: 'a quiet room seen from above, bathed in pale silver light',
        adc: 'two softly glowing lights meeting over a still lake at twilight',
        other: 'an expansive horizon of warm light over gentle hills',
    };
    return [
        'Oil painting on heavy woven canvas. Thick directional impasto brushstrokes.',
        'No visible faces. No people in focus. No text, letters, words, or watermarks.',
        `Subject: ${theme[experienceType] ?? theme.other}.`,
        'Serene, hopeful, contemplative mood. Museum quality fine art.',
    ].join(' ');
}

async function ensureImage(story: OwnStory): Promise<string | null> {
    if (story.image_url) return story.image_url;
    if (!process.env.FAL_API_KEY) return null;
    try {
        const img = await generateFalImage(imagePrompt(story.experience_type), 'share.story-image');
        const res = await fetch(img.url);
        if (!res.ok) return null;
        const path = `share/${story.id}.jpg`;
        const { error } = await db()
            .storage.from(PUBLIC_MEDIA_BUCKET)
            .upload(path, Buffer.from(await res.arrayBuffer()), { contentType: 'image/jpeg', upsert: true });
        if (error) return null;
        const { data } = db().storage.from(PUBLIC_MEDIA_BUCKET).getPublicUrl(path);
        await db().from('share_stories').update({ image_url: data.publicUrl }).eq('id', story.id);
        return data.publicUrl;
    } catch (err) {
        console.error('[share] image generation failed:', err instanceof Error ? err.message : err);
        return null;
    }
}

export function youtubeMeta(story: Pick<OwnStory, 'title' | 'display_mode' | 'display_name' | 'anon_number' | 'experience_type' | 'slug' | 'summary' | 'media_kind'>, synthetic: boolean) {
    const name = publicDisplayName(story);
    const title = `${story.title || 'An experience'} | ${name}`.slice(0, 100);
    const lines = [
        story.summary ?? '',
        '',
        `${typeLabel(story.experience_type)} shared directly with Project Profound by ${name}.`,
        `Read, listen or watch: ${siteUrl()}/experiences/${story.slug}`,
        '',
        synthetic ? 'This story is read by a synthetic (AI-generated) voice, not by the person who shared it.' : '',
        story.media_kind === 'text' || story.media_kind === 'file' || synthetic ? 'Illustration created with AI.' : '',
        '',
        `Share your own experience: ${siteUrl()}/share`,
        'If you are struggling, help is available: call or text 988 (US), Samaritans 116 123 (UK & Ireland), or visit findahelpline.com.',
    ];
    return {
        title,
        description: lines.filter((l, i, a) => l || (i > 0 && a[i - 1])).join('\n').slice(0, 4900),
        tags: ['Project Profound', typeLabel(story.experience_type), 'experience'],
    };
}

/** Stories that need narration and/or a YouTube upload, plus pending removals. */
export async function buildQueue(limit = 10): Promise<{ items: QueueItem[]; removals: string[] }> {
    const cutoff = new Date(Date.now() - YOUTUBE_MIN_AGE_HOURS * 3600_000).toISOString();
    // Pending YouTube uploads, plus already-uploaded stories whose narration was
    // cleared by an edit (the website's Listen tab needs a fresh one).
    const { data } = await db()
        .from('share_stories')
        .select('*')
        .eq('status', 'published')
        .or('youtube_status.eq.pending,narration_path.is.null')
        .lte('published_at', cutoff)
        .order('published_at', { ascending: true })
        .limit(limit * 3);
    const storage = db().storage.from(MEDIA_BUCKET);
    const items: QueueItem[] = [];

    const candidates = ((data ?? []) as OwnStory[])
        .filter((s) => s.youtube_status === 'pending' || needsNarration(s))
        .slice(0, limit);
    for (const story of candidates) {
        const narrate = needsNarration(story);
        const wantsUpload = story.youtube_status === 'pending' && !story.is_test;
        let narrationUpload: QueueItem['narrationUpload'] = null;
        if (narrate) {
            const path = `${story.user_id}/${story.id}/narration-${Date.now()}.mp3`;
            const { data: up } = await storage.createSignedUploadUrl(path);
            if (up?.signedUrl) narrationUpload = { path, signedUrl: up.signedUrl };
        }
        const sign = async (p: string | null) => (p ? (await storage.createSignedUrl(p, 6 * 3600)).data?.signedUrl ?? null : null);
        const named = story.display_mode === 'named';
        const usesOriginal = named && (story.media_kind === 'audio' || story.media_kind === 'video');
        const synthetic = !usesOriginal;
        items.push({
            storyId: story.id,
            slug: story.slug,
            title: story.title || 'An experience',
            displayName: publicDisplayName(story),
            isAnonymous: !named,
            experienceType: story.experience_type,
            mediaKind: story.media_kind,
            narrationText: narrate ? story.body_text : null,
            narrationUpload,
            narrationUrl: await sign(story.narration_path),
            mediaUrl: usesOriginal ? await sign(story.media_path) : null,
            imageUrl: story.media_kind === 'video' && named ? null : await ensureImage(story),
            upload: wantsUpload,
            markSkipped: story.is_test && story.youtube_status === 'pending',
            youtube: wantsUpload ? youtubeMeta(story, synthetic) : null,
        });
    }

    const { data: removals } = await db().from('share_youtube_removals').select('youtube_video_id').is('done_at', null).limit(50);
    return { items, removals: (removals ?? []).map((r) => r.youtube_video_id as string) };
}

export interface JobResult {
    storyId: string;
    narrationPath?: string | null;
    youtubeVideoId?: string | null;
    youtubeStatus?: 'uploaded' | 'failed' | 'skipped' | 'pending';
    error?: string | null;
}

export async function applyResult(r: JobResult): Promise<void> {
    const { data: story } = await db().from('share_stories').select('id, user_id, status, narration_path').eq('id', r.storyId).maybeSingle();
    if (!story) {
        // Deleted while the job ran: make sure the new video doesn't linger.
        if (r.youtubeVideoId) await db().from('share_youtube_removals').upsert({ youtube_video_id: r.youtubeVideoId });
        return;
    }
    const patch: Record<string, unknown> = {};
    if (r.narrationPath) {
        if (!r.narrationPath.startsWith(`${story.user_id}/${story.id}/narration-`)) throw new Error('bad narration path');
        patch.narration_path = r.narrationPath;
    }
    if (r.youtubeStatus) patch.youtube_status = r.youtubeStatus;
    if (r.youtubeVideoId) patch.youtube_video_id = r.youtubeVideoId;
    if (r.error !== undefined) patch.youtube_error = r.error;
    if (Object.keys(patch).length) await db().from('share_stories').update(patch).eq('id', story.id);
    // Removed/held while the job ran: the upload must come down again.
    if (r.youtubeVideoId && story.status !== 'published') {
        await db().from('share_youtube_removals').upsert({ youtube_video_id: r.youtubeVideoId });
        await db().from('share_stories').update({ youtube_video_id: null, youtube_status: 'pending' }).eq('id', story.id);
    }
}

export async function applyRemovalResult(videoId: string, ok: boolean, error?: string | null) {
    await db()
        .from('share_youtube_removals')
        .update(ok ? { done_at: new Date().toISOString(), error: null } : { error: error ?? 'failed' })
        .eq('youtube_video_id', videoId);
}

/** Daily: expire intros, purge removed stories after 30 days, purge staging test data after 7. */
export async function runMaintenance(): Promise<{ expiredIntros: number; purgedRemoved: number; purgedTest: number }> {
    const expiredIntros = await expireOldIntros();
    const purge = async (stories: OwnStory[]) => {
        let n = 0;
        for (const s of stories) {
            try {
                await deleteStoryCompletely(s);
                n++;
            } catch (err) {
                console.error('[share] purge failed:', s.id, err instanceof Error ? err.message : err);
            }
        }
        return n;
    };
    const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
    const { data: removed } = await db().from('share_stories').select('*').eq('status', 'removed').lt('updated_at', monthAgo).limit(50);
    const purgedRemoved = await purge((removed ?? []) as OwnStory[]);
    const { data: tests } = await db().from('share_stories').select('*').eq('is_test', true).lt('created_at', weekAgo).limit(50);
    const purgedTest = await purge((tests ?? []) as OwnStory[]);
    await db().from('share_channel_invites').delete().eq('is_test', true).lt('created_at', weekAgo);
    return { expiredIntros, purgedRemoved, purgedTest };
}
