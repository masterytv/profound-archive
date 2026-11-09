import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isShareEnabled, MEDIA_BUCKET } from '@/lib/share/config';
import { currentUser, shareAdmin } from '@/lib/share/db';
import { getOwnStory, listSuggestions, type OwnStory } from '@/lib/share/stories';
import { splitSections } from '@/lib/share/text';
import { SUPPORT_RESOURCES } from '@/lib/share/crisis';
import { unescapeModelText } from '@/lib/share/suggestions';
import StoryManager from '@/components/share/StoryManager';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'My story | Project Profound', robots: { index: false } };

export default async function MyStoryPage({ params }: { params: Promise<{ id: string }> }) {
    if (!isShareEnabled()) notFound();
    const { id } = await params;
    const user = await currentUser();
    if (!user) redirect(`/login?returnTo=/share/my-experiences/${id}`);

    let story: OwnStory;
    try {
        story = await getOwnStory(user.id, id);
    } catch {
        notFound();
    }

    const suggestions = story.status === 'reviewing' ? await listSuggestions(story.id, 'style') : [];
    const sections = story.status === 'reviewing' ? splitSections(story.original_text ?? '') : [];
    let mediaUrl: string | null = null;
    if (story.media_path && story.media_kind !== 'file') {
        const { data } = await shareAdmin().storage.from(MEDIA_BUCKET).createSignedUrl(story.media_path, 3600);
        mediaUrl = data?.signedUrl ?? null;
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
            <Link href="/share/my-experiences" className="text-sm text-indigo-600 underline">← My experiences</Link>
            {story.status === 'held' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 p-4 space-y-2 text-amber-900 dark:text-amber-100">
                    <p>Thank you for sharing. Because your story touches on some very painful moments, a member of our team will look at it with care before it appears. You don&apos;t need to do anything.</p>
                    <p className="font-medium">If you are struggling right now, please reach out:</p>
                    <ul className="list-disc pl-5 text-sm">
                        {SUPPORT_RESOURCES.map((r) => (
                            <li key={r.href}>{r.region}: <a href={r.href} target="_blank" rel="noopener noreferrer" className="underline">{r.label}</a></li>
                        ))}
                    </ul>
                </div>
            )}
            {/* Keyed by status/version: when processing → reviewing (or any change), the
                client state (editable paragraphs) is rebuilt from fresh data. */}
            <StoryManager
                key={`${story.status}:${story.updated_at}`}
                story={{
                    id: story.id,
                    slug: story.slug,
                    status: story.status,
                    title: story.title ?? '',
                    displayMode: story.display_mode,
                    displayName: story.display_name ?? '',
                    mediaKind: story.media_kind,
                    bodyText: story.body_text ?? '',
                    processingError: story.processing_error,
                    youtubeVideoId: story.youtube_video_id,
                }}
                sections={sections}
                suggestions={suggestions.map((s) => ({ id: s.id, sectionIndex: s.section_index, suggested: unescapeModelText(s.suggested), reason: s.reason ?? '', status: s.status }))}
                mediaUrl={mediaUrl}
            />
        </div>
    );
}
