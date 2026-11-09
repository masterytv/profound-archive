import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Bot, Video, Headphones, BookOpen } from 'lucide-react';
import { isShareEnabled, EXPERIENCE_TYPES } from '@/lib/share/config';
import { getPublicStory, signMediaUrls } from '@/lib/share/public';
import { shareAdmin } from '@/lib/share/db';

export const dynamic = 'force-dynamic';

const typeLabel = (t: string) => EXPERIENCE_TYPES.find((e) => e.value === t)?.label ?? t;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    if (!isShareEnabled()) return {};
    const { slug } = await params;
    const story = await getPublicStory(slug);
    if (!story) return { title: 'Story not found | Project Profound' };
    return {
        title: `${story.title} | Project Profound`,
        description: story.summary ?? `${typeLabel(story.experienceType)} shared by ${story.displayName}.`,
        openGraph: story.imageUrl ? { images: [story.imageUrl] } : undefined,
        robots: story.isTest ? { index: false } : undefined,
    };
}

export default async function ExperienceStoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ tab?: string }> }) {
    if (!isShareEnabled()) notFound();
    const { slug } = await params;
    const { tab } = await searchParams;
    const story = await getPublicStory(slug);
    if (!story) notFound();

    const { watchUrl, listenUrl } = await signMediaUrls(story);
    let profileSlug: string | null = null;
    if (story.experiencerProfileId) {
        const { data } = await shareAdmin().from('experiencer_profiles').select('slug, published_at').eq('id', story.experiencerProfileId).maybeSingle();
        profileSlug = data?.published_at ? data.slug : null;
    }
    const order = ['watch', 'listen', 'read'];
    const first = story.tabs.includes(tab as never) ? tab : story.tabs.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b))[0];

    return (
        <article className="max-w-3xl mx-auto px-4 py-12 space-y-8">
            <Link href="/experiences" className="text-sm text-indigo-600 underline">← All shared experiences</Link>
            <header className="space-y-2">
                <p className="text-sm uppercase tracking-widest text-indigo-500">{typeLabel(story.experienceType)} · Shared directly with Project Profound</p>
                <h1 className="text-4xl font-serif leading-tight">{story.title}</h1>
                <p className="text-slate-500">
                    {profileSlug ? <Link href={`/experiencer/${profileSlug}`} className="underline">{story.displayName}</Link> : story.displayName}
                    {story.yearApprox ? ` · ${story.yearApprox}` : ''}
                    {story.place ? ` · ${story.place}` : ''}
                </p>
                {story.isTest && <p className="text-xs text-amber-600">Test story (staging only)</p>}
            </header>

            {story.tabs.includes('watch') && (
                <section className="space-y-2" id="watch" aria-label="Watch">
                    <h2 className={`flex items-center gap-2 text-sm uppercase tracking-wide ${first === 'watch' ? 'text-indigo-600' : 'text-slate-500'}`}><Video className="h-4 w-4" /> Watch</h2>
                    {story.youtubeVideoId ? (
                        <iframe
                            className="w-full aspect-video rounded-xl"
                            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(story.youtubeVideoId)}`}
                            title={story.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    ) : watchUrl ? (
                        <video src={watchUrl} controls playsInline preload="metadata" className="w-full rounded-xl bg-black aspect-video" />
                    ) : null}
                </section>
            )}

            {story.tabs.includes('listen') && listenUrl && (
                <section className="space-y-2" id="listen" aria-label="Listen">
                    <h2 className={`flex items-center gap-2 text-sm uppercase tracking-wide ${first === 'listen' ? 'text-indigo-600' : 'text-slate-500'}`}><Headphones className="h-4 w-4" /> Listen</h2>
                    <audio src={listenUrl} controls preload="none" className="w-full" />
                    {story.listenIsSynthetic && (
                        <p className="text-sm text-slate-500 flex items-center gap-2"><Bot className="h-4 w-4" /> Read by a synthetic (AI-generated) voice, not by the person who shared this story.</p>
                    )}
                </section>
            )}

            {story.tabs.includes('read') && (
                <section className="space-y-2" id="read" aria-label="Read">
                    <h2 className={`flex items-center gap-2 text-sm uppercase tracking-wide ${first === 'read' ? 'text-indigo-600' : 'text-slate-500'}`}><BookOpen className="h-4 w-4" /> Read</h2>
                    {story.sharedAs === 'audio' || story.sharedAs === 'video' ? <p className="text-xs text-slate-500">Transcript, lightly edited with the storyteller&apos;s approval.</p> : null}
                    <div className="font-serif text-lg leading-relaxed space-y-4">
                        {story.text.split(/\n\s*\n/).map((p, i) => <p key={i} className="whitespace-pre-wrap">{p}</p>)}
                    </div>
                </section>
            )}

            <footer className="border-t border-slate-200 dark:border-slate-700 pt-6 text-sm text-slate-500">
                Have you had an experience like this? <Link href="/share" className="text-indigo-600 underline">Share yours</Link>.
            </footer>
        </article>
    );
}
