'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, X, Loader2, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    changeDisplayModeAction,
    deleteStoryAction,
    editStoryAction,
    finishReviewAction,
    setSuggestionAction,
} from '@/app/share/actions';

interface StoryView {
    id: string;
    slug: string;
    status: 'draft' | 'processing' | 'reviewing' | 'held' | 'published' | 'removed';
    title: string;
    displayMode: 'named' | 'anonymous';
    displayName: string;
    mediaKind: 'text' | 'audio' | 'video' | 'file';
    bodyText: string;
    processingError: string | null;
    youtubeVideoId: string | null;
}
interface SuggestionView {
    id: number;
    sectionIndex: number;
    suggested: string;
    reason: string;
    status: 'pending' | 'accepted' | 'rejected';
}

const input = 'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2';

export default function StoryManager({ story, sections, suggestions: initial, mediaUrl }: { story: StoryView; sections: string[]; suggestions: SuggestionView[]; mediaUrl: string | null }) {
    const router = useRouter();
    const [suggestions, setSuggestions] = useState(initial);
    const [title, setTitle] = useState(story.title);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(story.bodyText);
    const [nameDraft, setNameDraft] = useState(story.displayName);
    const [confirmDelete, setConfirmDelete] = useState(false);

    async function run<T extends { ok: boolean; error?: string }>(key: string, fn: () => Promise<T>, after?: (r: T) => void) {
        setBusy(key);
        setError(null);
        const res = await fn();
        setBusy(null);
        if (!res.ok) return setError(res.error ?? 'Something went wrong.');
        after?.(res);
        router.refresh();
    }

    async function decide(id: number, status: 'accepted' | 'rejected') {
        setSuggestions((s) => s.map((x) => (x.id === id ? { ...x, status } : x)));
        const res = await setSuggestionAction(id, status);
        if (!res.ok) setError(res.error);
    }

    const bySection = new Map(suggestions.map((s) => [s.sectionIndex, s]));

    return (
        <div className="space-y-8">
            <header className="space-y-1">
                <h1 className="text-3xl font-serif">{story.title || 'Your story'}</h1>
                <p className="text-slate-500">
                    {story.displayMode === 'named' ? `Shown as ${story.displayName}` : 'Shown as Anonymous'} · shared as {story.mediaKind === 'file' ? 'a document' : story.mediaKind}
                </p>
            </header>

            {mediaUrl && (story.mediaKind === 'video' ? (
                <video src={mediaUrl} controls playsInline className="w-full rounded-xl bg-black aspect-video" />
            ) : (
                <div>
                    <audio src={mediaUrl} controls className="w-full" />
                    {story.displayMode === 'anonymous' && <p className="text-xs text-slate-500 mt-1">Only you can hear this recording. It is never published.</p>}
                </div>
            ))}

            {story.status === 'processing' && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-2">
                    <p className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> We&apos;re turning your recording into text. This usually takes a few minutes.</p>
                    <p className="text-sm text-slate-500">We&apos;ll email you when it&apos;s ready to review. You can close this page.</p>
                    {story.processingError && <p className="text-sm text-amber-700">Note: {story.processingError} Our team has been notified.</p>}
                    <Button variant="outline" size="sm" onClick={() => router.refresh()}>Check again</Button>
                </div>
            )}

            {story.status === 'reviewing' && (
                <section className="space-y-5">
                    <div className="rounded-xl bg-indigo-50 dark:bg-indigo-500/10 p-4 text-sm text-indigo-900 dark:text-indigo-100">
                        Our editor suggested a few light changes. For each one, choose <b>Accept</b> or <b>Keep mine</b>. Anything you don&apos;t accept stays exactly as you wrote it.
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1" htmlFor="title">Title</label>
                        <input id="title" className={input} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <ol className="space-y-4">
                        {sections.map((sec, i) => {
                            const s = bySection.get(i);
                            return (
                                <li key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                                    {!s ? (
                                        <p className="whitespace-pre-wrap font-serif leading-relaxed">{sec}</p>
                                    ) : (
                                        <>
                                            <div className="grid gap-3 md:grid-cols-2">
                                                <div>
                                                    <p className="text-xs uppercase text-slate-400 mb-1">What you wrote</p>
                                                    <p className={`whitespace-pre-wrap font-serif leading-relaxed ${s.status === 'accepted' ? 'opacity-50' : ''}`}>{sec}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs uppercase text-slate-400 mb-1">Suggested</p>
                                                    <p className={`whitespace-pre-wrap font-serif leading-relaxed ${s.status === 'rejected' ? 'opacity-50' : ''}`}>{s.suggested}</p>
                                                </div>
                                            </div>
                                            {s.reason && <p className="text-xs text-slate-500">Why: {s.reason}</p>}
                                            <div className="flex gap-2">
                                                <Button size="sm" variant={s.status === 'accepted' ? 'default' : 'outline'} onClick={() => decide(s.id, 'accepted')} className="gap-1"><Check className="h-4 w-4" /> Accept</Button>
                                                <Button size="sm" variant={s.status === 'rejected' ? 'default' : 'outline'} onClick={() => decide(s.id, 'rejected')} className="gap-1"><X className="h-4 w-4" /> Keep mine</Button>
                                            </div>
                                        </>
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                    <div className="flex justify-end">
                        <Button
                            disabled={busy !== null}
                            className="gap-2"
                            onClick={() => run('publish', () => finishReviewAction(story.id, title))}
                        >
                            {busy === 'publish' && <Loader2 className="h-4 w-4 animate-spin" />} Publish my story
                        </Button>
                    </div>
                </section>
            )}

            {(story.status === 'published' || story.status === 'held') && (
                <section className="space-y-4">
                    {story.status === 'published' && (
                        <p className="flex items-center gap-2 text-emerald-700">
                            Published. <Link href={`/experiences/${story.slug}`} className="underline inline-flex items-center gap-1">See it on the site <ExternalLink className="h-3 w-3" /></Link>
                        </p>
                    )}
                    {!editing ? (
                        <>
                            <div className="whitespace-pre-wrap font-serif leading-relaxed rounded-xl border border-slate-200 dark:border-slate-700 p-4">{story.bodyText}</div>
                            <Button variant="outline" onClick={() => setEditing(true)}>Edit text</Button>
                        </>
                    ) : (
                        <div className="space-y-3">
                            <input className={input} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
                            <textarea className={`${input} min-h-[360px] font-serif leading-relaxed`} value={draft} onChange={(e) => setDraft(e.target.value)} />
                            <div className="flex gap-2">
                                <Button disabled={busy !== null} onClick={() => run('edit', () => editStoryAction(story.id, draft, title), () => setEditing(false))} className="gap-2">
                                    {busy === 'edit' && <Loader2 className="h-4 w-4 animate-spin" />} Save and republish
                                </Button>
                                <Button variant="ghost" onClick={() => { setEditing(false); setDraft(story.bodyText); }}>Cancel</Button>
                            </div>
                            {story.youtubeVideoId && <p className="text-xs text-slate-500">The website updates straight away. The YouTube video keeps the version that was uploaded.</p>}
                        </div>
                    )}
                </section>
            )}

            {story.status !== 'removed' && (
                <section className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-6">
                    <h2 className="text-lg font-serif">How you&apos;re named</h2>
                    {story.displayMode === 'named' ? (
                        story.mediaKind === 'video' ? (
                            <p className="text-sm text-slate-500">This story is a video, which shows your face and voice, so it can&apos;t be made anonymous. You can delete it instead.</p>
                        ) : (
                            <Button variant="outline" disabled={busy !== null} onClick={() => run('anon', () => changeDisplayModeAction(story.id, 'anonymous', ''))}>
                                Make this story anonymous
                            </Button>
                        )
                    ) : (
                        <div className="flex flex-wrap gap-2 items-center">
                            <input className={`${input} max-w-xs`} placeholder="Name to show" value={nameDraft} maxLength={80} onChange={(e) => setNameDraft(e.target.value)} />
                            <Button variant="outline" disabled={busy !== null || !nameDraft.trim()} onClick={() => run('named', () => changeDisplayModeAction(story.id, 'named', nameDraft))}>
                                Show my name
                            </Button>
                        </div>
                    )}
                    {story.youtubeVideoId && <p className="text-xs text-slate-500">Changing this takes the YouTube version down within 24 hours and posts a new one.</p>}
                </section>
            )}

            <section className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-6">
                <h2 className="text-lg font-serif">Delete this story</h2>
                <p className="text-sm text-slate-500">Deletes your recording, transcript and text completely. It disappears from the website now and from YouTube within 24 hours. This can&apos;t be undone.</p>
                {!confirmDelete ? (
                    <Button variant="outline" className="gap-2 text-red-600" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" /> Delete…</Button>
                ) : (
                    <div className="flex gap-2">
                        <Button
                            variant="destructive"
                            disabled={busy !== null}
                            className="gap-2"
                            onClick={() => run('delete', () => deleteStoryAction(story.id), () => router.push('/share/my-stories'))}
                        >
                            {busy === 'delete' && <Loader2 className="h-4 w-4 animate-spin" />} Yes, delete everything
                        </Button>
                        <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                    </div>
                )}
            </section>

            {error && <p className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</p>}
        </div>
    );
}
