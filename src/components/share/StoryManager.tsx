'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
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

export default function StoryManager({ story, sections, suggestions: initial, mediaUrl, promote }: { story: StoryView; sections: string[]; suggestions: SuggestionView[]; mediaUrl: string | null; promote?: ReactNode }) {
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

    // The text of each section as it will be published: starts as written,
    // switches to the suggestion on Accept, and can be edited freely.
    const [texts, setTexts] = useState<string[]>(() =>
        sections.map((sec, i) => {
            const s = initial.find((x) => x.sectionIndex === i);
            return s && s.status !== 'rejected' ? s.suggested : sec;
        }),
    );

    // While the recording is being transcribed, check for the result on our own.
    useEffect(() => {
        if (story.status !== 'processing') return;
        const timer = setInterval(() => router.refresh(), 15_000);
        return () => clearInterval(timer);
    }, [story.status, router]);

    async function decide(id: number, sectionIndex: number, status: 'accepted' | 'rejected') {
        const s = suggestions.find((x) => x.id === id);
        setSuggestions((all) => all.map((x) => (x.id === id ? { ...x, status } : x)));
        // Accept keeps whatever is in the box (the suggestion plus any further edits);
        // Keep my original puts back exactly what they wrote.
        if (s && status === 'rejected') setTexts((t) => t.map((x, k) => (k === sectionIndex ? sections[sectionIndex] : x)));
        if (s && status === 'accepted' && s.status === 'rejected') setTexts((t) => t.map((x, k) => (k === sectionIndex ? s.suggested : x)));
        const res = await setSuggestionAction(id, status);
        if (!res.ok) setError(res.error);
    }

    const bySection = new Map(suggestions.map((s) => [s.sectionIndex, s]));
    const pendingCount = suggestions.filter((s) => s.status === 'pending').length;

    return (
        <div className="space-y-8">
            <header className="space-y-1">
                <h1 className="text-3xl font-serif">{story.title || 'Your story'}</h1>
                <p className="text-slate-500">
                    Shown as {story.displayName || 'Anonymous'} · shared as {story.mediaKind === 'file' ? 'a document' : story.mediaKind}
                </p>
            </header>

            {mediaUrl && (story.mediaKind === 'video' ? (
                <video src={mediaUrl} controls playsInline className="w-full rounded-xl bg-black aspect-video" />
            ) : (
                <div>
                    <audio src={mediaUrl} controls className="w-full" />
                </div>
            ))}

            {story.status === 'processing' && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-2">
                    <p className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> We&apos;re turning your recording into text. This usually takes a few minutes.</p>
                    <p className="text-sm text-slate-500">This page updates by itself when it&apos;s ready, and we&apos;ll also email you. You can close this page.</p>
                    {story.processingError && <p className="text-sm text-amber-700">Note: {story.processingError} Our team has been notified.</p>}
                    <Button variant="outline" size="sm" onClick={() => router.refresh()}>Check again</Button>
                </div>
            )}

            {story.status === 'reviewing' && (
                <section className="space-y-5">
                    <div className="rounded-xl bg-indigo-50 dark:bg-indigo-500/10 p-4 text-sm text-indigo-900 dark:text-indigo-100 space-y-1">
                        {suggestions.length > 0 ? (
                            <p>
                                Our editor suggested {suggestions.length === 1 ? 'a light edit' : `${suggestions.length} light edits`} (spelling, punctuation, paragraphs).
                                The edited version is shown in the box, ready for you to change further, with what you wrote underneath.
                                For each one, choose <b>Accept</b> or <b>Keep my original</b>.
                            </p>
                        ) : (
                            <p>{story.processingError ? 'Editor suggestions aren’t available right now.' : 'Our editor didn’t suggest any changes.'} You can edit your text below before you publish.</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1" htmlFor="title">Title</label>
                        <input id="title" className={input} value={title} maxLength={120} placeholder="Give your story a title" onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <ol className="space-y-4">
                        {sections.map((sec, i) => {
                            const s = bySection.get(i);
                            return (
                                <li
                                    key={i}
                                    className={`rounded-xl border p-4 space-y-3 ${s && s.status === 'pending' ? 'border-indigo-300 dark:border-indigo-500/50' : 'border-slate-200 dark:border-slate-700'}`}
                                >
                                    <p className="text-xs uppercase text-slate-400">
                                        {!s ? 'Your text (you can edit it here)' : s.status === 'rejected' ? 'Your original (you can edit it here)' : 'Edited version (you can edit it further here)'}
                                    </p>
                                    <AutoTextarea value={texts[i] ?? sec} onChange={(v) => setTexts((t) => t.map((x, k) => (k === i ? v : x)))} />
                                    {s && (
                                        <>
                                            {s.reason && <p className="text-xs text-slate-500">Editor&apos;s note: {s.reason}</p>}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Button size="sm" variant={s.status === 'accepted' ? 'default' : 'outline'} onClick={() => decide(s.id, i, 'accepted')} className="gap-1">
                                                    <Check className="h-4 w-4" /> Accept
                                                </Button>
                                                <Button size="sm" variant={s.status === 'rejected' ? 'default' : 'outline'} onClick={() => decide(s.id, i, 'rejected')} className="gap-1">
                                                    <X className="h-4 w-4" /> Keep my original
                                                </Button>
                                                {s.status === 'pending' && <span className="text-xs text-indigo-700 dark:text-indigo-300">Choose one to continue</span>}
                                            </div>
                                            {s.status !== 'rejected' && (
                                                <details className="text-sm" open={s.status === 'pending'}>
                                                    <summary className="cursor-pointer text-xs uppercase text-slate-400">What you wrote</summary>
                                                    <p className="mt-2 whitespace-pre-wrap font-serif leading-relaxed text-slate-600 dark:text-slate-400 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">{sec}</p>
                                                </details>
                                            )}
                                        </>
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                        {pendingCount > 0 && (
                            <span className="text-sm text-slate-500">
                                Choose Accept or Keep my original for {pendingCount === 1 ? 'the suggestion' : `${pendingCount} suggestions`} above to publish.
                            </span>
                        )}
                        <Button
                            disabled={busy !== null || pendingCount > 0 || !texts.join('').trim()}
                            className="gap-2"
                            onClick={() => run('publish', () => finishReviewAction(story.id, title, texts.map((t) => t.trim()).filter(Boolean).join('\n\n')))}
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
                    {story.status === 'published' && promote}
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
                    <p className="text-slate-600 dark:text-slate-300">
                        {story.displayMode === 'named' ? (
                            <>Your full name is shared: <b>{story.displayName}</b>.</>
                        ) : (
                            <>Your full name is not shared. Shown as <b>{story.displayName || 'Anonymous'}</b>.</>
                        )}
                    </p>
                    <div className="flex flex-wrap gap-2 items-center">
                        <input
                            className={`${input} max-w-xs`}
                            placeholder={story.displayMode === 'named' ? 'Full name' : 'First name, initials or nickname (optional)'}
                            value={nameDraft}
                            maxLength={80}
                            onChange={(e) => setNameDraft(e.target.value)}
                        />
                        <Button
                            variant="outline"
                            disabled={busy !== null || nameDraft.trim() === (story.displayName ?? '') || (story.displayMode === 'named' && !nameDraft.trim())}
                            onClick={() => run('rename', () => changeDisplayModeAction(story.id, story.displayMode, nameDraft))}
                        >
                            Update name
                        </Button>
                    </div>
                    {story.displayMode === 'named' ? (
                        <Button variant="outline" disabled={busy !== null} onClick={() => run('anon', () => changeDisplayModeAction(story.id, 'anonymous', ''))}>
                            Stop sharing my full name
                        </Button>
                    ) : (
                        <Button variant="outline" disabled={busy !== null || !nameDraft.trim()} onClick={() => run('named', () => changeDisplayModeAction(story.id, 'named', nameDraft))}>
                            Share the name above as my full name
                        </Button>
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
                            onClick={() => run('delete', () => deleteStoryAction(story.id), () => router.push('/share/my-experiences'))}
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

/** A textarea that grows with its content, so long paragraphs are easy to edit. */
function AutoTextarea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <textarea
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 font-serif leading-relaxed min-h-[8rem]"
            style={{ fieldSizing: 'content' } as CSSProperties}
            rows={Math.min(30, Math.max(4, Math.ceil((value ?? '').length / 80) + (value ?? '').split('\n').length))}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    );
}
