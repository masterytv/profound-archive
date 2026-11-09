'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requestIntroAction } from '@/app/channels/actions';
import type { DirectoryEntry } from '@/lib/share/channels';

const APPEARANCE: Record<string, string> = { camera: 'Open to appearing on camera', audio_only: 'Audio only', none: 'Not sure about format yet' };
const TYPE: Record<string, string> = { nde: 'NDE', ste: 'STE', uap: 'UAP / contact', obe: 'OBE', adc: 'ADC', other: 'Other' };

export default function DirectoryList({ entries }: { entries: DirectoryEntry[] }) {
    if (!entries.length) return <p className="text-slate-500">No one is listed for your channel yet. Check back soon.</p>;
    return (
        <ul className="space-y-4">
            {entries.map((e) => <Entry key={e.storyId} entry={e} />)}
        </ul>
    );
}

function Entry({ entry }: { entry: DirectoryEntry }) {
    const [open, setOpen] = useState(false);
    const [channelId, setChannelId] = useState(entry.eligibleChannels[0]?.channel_id ?? '');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function send() {
        setBusy(true);
        setError(null);
        const res = await requestIntroAction({ storyId: entry.storyId, channelId, note });
        setBusy(false);
        if (!res.ok) return setError(res.error);
        setSent(true);
    }

    return (
        <li className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-serif text-xl">{entry.title}</h2>
                <span className="text-xs uppercase tracking-wide text-indigo-500">{TYPE[entry.experienceType] ?? entry.experienceType}</span>
            </div>
            <p className="text-sm text-slate-500">
                {entry.displayName}{entry.place ? ` · ${entry.place}` : ''} · {entry.language.toUpperCase()} · {APPEARANCE[entry.appearancePref] ?? ''}
            </p>
            {entry.summary && <p className="text-slate-700 dark:text-slate-300">{entry.summary}</p>}
            <div className="flex flex-wrap gap-3 items-center">
                <Link href={`/experiences/${entry.slug}`} target="_blank" className="text-sm text-indigo-600 underline">Read the full story</Link>
                {sent ? (
                    <span className="text-sm text-emerald-700">Request sent. We&apos;ll email you when they answer.</span>
                ) : !open ? (
                    <Button size="sm" onClick={() => setOpen(true)}>Request an introduction</Button>
                ) : null}
            </div>
            {open && !sent && (
                <div className="space-y-2">
                    {entry.eligibleChannels.length > 1 && (
                        <select value={channelId} onChange={(e) => setChannelId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">
                            {entry.eligibleChannels.map((c) => <option key={c.channel_id} value={c.channel_id}>{c.channel_name ?? c.channel_id}</option>)}
                        </select>
                    )}
                    <textarea
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 min-h-[120px]"
                        placeholder="Introduce yourself and your channel, and say what kind of conversation you have in mind. We forward this to them."
                        value={note}
                        maxLength={1500}
                        onChange={(e) => setNote(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <Button size="sm" onClick={send} disabled={busy || note.trim().length < 20} className="gap-2">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Send request</Button>
                        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
            )}
        </li>
    );
}
