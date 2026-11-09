'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminDeleteAction, releaseHeldAction, retryProcessingAction, setRemovedAction } from '@/app/admin/share/actions';

interface Row {
    id: string;
    slug: string;
    status: string;
    title: string;
    name: string;
    mediaKind: string;
    isTest: boolean;
    updatedAt: string;
    bodyText: string;
    processingError: string | null;
    youtubeStatus: string;
    youtubeVideoId: string | null;
}
interface Held {
    sections: string[];
    crisis: Array<{ id: number; sectionIndex: number; suggested: string }>;
}

export default function AdminStoryRow({ story, held }: { story: Row; held: Held | null }) {
    const router = useRouter();
    const [open, setOpen] = useState(story.status === 'held');
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [accepted, setAccepted] = useState<Set<number>>(new Set(held?.crisis.map((c) => c.id) ?? []));
    const [manual, setManual] = useState<string | null>(null);

    async function run(key: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
        setBusy(key);
        setError(null);
        const res = await fn();
        setBusy(null);
        if (!res.ok) return setError(res.error ?? 'Failed');
        router.refresh();
    }

    const bySection = new Map(held?.crisis.map((c) => [c.sectionIndex, c]) ?? []);

    return (
        <li className="rounded-lg border p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <button className="text-left" onClick={() => setOpen(!open)}>
                    <b>{story.title}</b>{' '}
                    <span className="text-sm text-slate-500">· {story.name} · {story.mediaKind} · {story.status} · {new Date(story.updatedAt).toLocaleString()}</span>
                    {story.isTest && <span className="ml-2 text-xs rounded bg-amber-100 text-amber-800 px-1.5">test</span>}
                </button>
                <div className="flex gap-2 text-sm">
                    {story.status === 'published' && <Link href={`/experiences/${story.slug}`} target="_blank" className="underline">View</Link>}
                    <span className="text-slate-500">YouTube: {story.youtubeVideoId ? <a className="underline" target="_blank" rel="noreferrer" href={`https://youtu.be/${story.youtubeVideoId}`}>{story.youtubeStatus}</a> : story.youtubeStatus}</span>
                </div>
            </div>
            {story.processingError && <p className="text-sm text-amber-700">{story.processingError}</p>}

            {open && story.status === 'held' && held && (
                <div className="space-y-3">
                    <p className="text-sm text-slate-600">Crisis wording was detected. Tick the softened sections to use (suggested by Gemini), or edit the full text yourself, then publish.</p>
                    {manual === null ? (
                        <ol className="space-y-3">
                            {held.sections.map((sec, i) => {
                                const c = bySection.get(i);
                                return (
                                    <li key={i} className="rounded border p-3 text-sm space-y-2">
                                        {!c ? (
                                            <p className="whitespace-pre-wrap">{sec}</p>
                                        ) : (
                                            <div className="grid gap-3 md:grid-cols-2">
                                                <p className="whitespace-pre-wrap bg-red-50 dark:bg-red-500/10 p-2 rounded">{sec}</p>
                                                <label className="whitespace-pre-wrap bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded flex gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={accepted.has(c.id)}
                                                        onChange={(e) => {
                                                            const n = new Set(accepted);
                                                            if (e.target.checked) n.add(c.id); else n.delete(c.id);
                                                            setAccepted(n);
                                                        }}
                                                    />
                                                    <span>{c.suggested}</span>
                                                </label>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                    ) : (
                        <textarea className="w-full min-h-[300px] rounded border p-3 text-sm" value={manual} onChange={(e) => setManual(e.target.value)} />
                    )}
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" disabled={busy !== null} onClick={() => run('release', () => releaseHeldAction(story.id, [...accepted], manual))} className="gap-2">
                            {busy === 'release' && <Loader2 className="h-4 w-4 animate-spin" />} Publish {manual === null ? 'with ticked edits' : 'this text'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setManual(manual === null ? story.bodyText : null)}>
                            {manual === null ? 'Edit full text instead' : 'Back to suggested edits'}
                        </Button>
                    </div>
                </div>
            )}

            {open && story.status !== 'held' && story.bodyText && (
                <p className="text-sm whitespace-pre-wrap max-h-64 overflow-y-auto border rounded p-3">{story.bodyText}</p>
            )}

            {open && (
                <div className="flex flex-wrap gap-2 border-t pt-3">
                    {(story.status === 'processing' || story.status === 'reviewing') && (
                        <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => run('retry', () => retryProcessingAction(story.id))}>Retry processing</Button>
                    )}
                    {story.status === 'published' && (
                        <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => run('remove', () => setRemovedAction(story.id, true))}>Remove from site &amp; YouTube</Button>
                    )}
                    {story.status === 'removed' && (
                        <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => run('restore', () => setRemovedAction(story.id, false))}>Restore</Button>
                    )}
                    <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy !== null}
                        onClick={() => confirm('Delete this experience and all its files permanently?') && run('delete', () => adminDeleteAction(story.id))}
                    >
                        Delete permanently
                    </Button>
                </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
        </li>
    );
}
