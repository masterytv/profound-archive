/**
 * The ONLY way public pages read shared stories.
 *
 * Every query selects an explicit column whitelist (PUBLIC_COLUMNS) that
 * contains no user_id, no contact details and no original-media path for
 * anonymous stories. `toPublicStory` is the last line of defence and is
 * covered by tests/lib/share-public.test.ts.
 */
import { shareAdmin } from './db';
import { visibleTestValues, MEDIA_BUCKET } from './config';
import { libraryFormats, type LibraryTab } from './library';
import { publicDisplayName } from './text';

export const PUBLIC_COLUMNS =
    'id, slug, status, display_mode, display_name, anon_number, experience_type, title, year_approx, country, region, language, media_kind, media_path, body_text, summary, narration_path, image_url, experiencer_profile_id, published_at, updated_at, youtube_video_id, youtube_status, is_test';

export interface StoryRow {
    id: string;
    slug: string;
    status: string;
    display_mode: 'named' | 'anonymous';
    display_name: string | null;
    anon_number: number;
    experience_type: string;
    title: string | null;
    year_approx: number | null;
    country: string | null;
    region: string | null;
    language: string;
    media_kind: 'text' | 'audio' | 'video' | 'file';
    media_path: string | null;
    body_text: string | null;
    summary: string | null;
    narration_path: string | null;
    image_url: string | null;
    experiencer_profile_id: number | null;
    published_at: string | null;
    updated_at: string;
    youtube_video_id: string | null;
    youtube_status: string;
    is_test: boolean;
}

export interface PublicStory {
    slug: string;
    displayName: string;
    isAnonymous: boolean;
    experienceType: string;
    title: string;
    yearApprox: number | null;
    /** Region only for anonymous stories; country for named. */
    place: string | null;
    language: string;
    sharedAs: StoryRow['media_kind'];
    text: string;
    summary: string | null;
    imageUrl: string | null;
    publishedAt: string | null;
    updatedAt: string;
    youtubeVideoId: string | null;
    tabs: LibraryTab[];
    /** Storage paths, signed at render time by signMediaUrls(); never public URLs. */
    watchPath: string | null;
    listenPath: string | null;
    listenIsSynthetic: boolean;
    experiencerProfileId: number | null;
    isTest: boolean;
}

export function toPublicStory(row: StoryRow): PublicStory {
    const formats = libraryFormats(row);
    const anonymous = row.display_mode !== 'named';
    return {
        slug: row.slug,
        displayName: publicDisplayName(row),
        isAnonymous: anonymous,
        experienceType: row.experience_type,
        title: row.title || 'An experience',
        yearApprox: row.year_approx,
        place: anonymous ? row.region : row.country || row.region,
        language: row.language,
        sharedAs: row.media_kind,
        text: row.body_text ?? '',
        summary: row.summary,
        imageUrl: row.image_url,
        publishedAt: row.published_at,
        updatedAt: row.updated_at,
        youtubeVideoId: row.youtube_video_id,
        tabs: formats.tabs,
        watchPath: formats.watch,
        listenPath: formats.listen,
        listenIsSynthetic: formats.listenIsSynthetic,
        experiencerProfileId: anonymous ? null : row.experiencer_profile_id,
        isTest: row.is_test,
    };
}

export async function listPublicStories(opts: { tab?: LibraryTab; type?: string; limit?: number; profileId?: number } = {}): Promise<PublicStory[]> {
    let q = shareAdmin()
        .from('share_stories')
        .select(PUBLIC_COLUMNS)
        .eq('status', 'published')
        .in('is_test', visibleTestValues())
        .order('published_at', { ascending: false })
        .limit(opts.limit ?? 60);
    if (opts.type) q = q.eq('experience_type', opts.type);
    if (opts.profileId != null) q = q.eq('experiencer_profile_id', opts.profileId).eq('display_mode', 'named');
    const { data, error } = await q;
    if (error) {
        console.error('[share] listPublicStories failed:', error.message);
        return [];
    }
    const stories = (data as unknown as StoryRow[]).map(toPublicStory);
    return opts.tab ? stories.filter((s) => s.tabs.includes(opts.tab!)) : stories;
}

export async function getPublicStory(slug: string): Promise<PublicStory | null> {
    const { data, error } = await shareAdmin()
        .from('share_stories')
        .select(PUBLIC_COLUMNS)
        .eq('slug', slug)
        .eq('status', 'published')
        .in('is_test', visibleTestValues())
        .maybeSingle();
    if (error || !data) return null;
    return toPublicStory(data as unknown as StoryRow);
}

/** Short-lived signed URLs for a published story's media (rendered per request). */
export async function signMediaUrls(story: PublicStory, ttlSeconds = 6 * 3600): Promise<{ watchUrl: string | null; listenUrl: string | null }> {
    const storage = shareAdmin().storage.from(MEDIA_BUCKET);
    const sign = async (path: string | null) => {
        if (!path) return null;
        const { data } = await storage.createSignedUrl(path, ttlSeconds);
        return data?.signedUrl ?? null;
    };
    const [watchUrl, listenUrl] = await Promise.all([sign(story.watchPath), sign(story.listenPath)]);
    return { watchUrl, listenUrl };
}
