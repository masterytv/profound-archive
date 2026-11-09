'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createInviteAction } from '@/app/admin/share/actions';

interface Channel { channel_id: string; name: string; vertical: 'nde' | 'uap' | 'other' }

/** Same rules as normalizeChannelRef in src/lib/share/channels.ts (kept here so this stays a client file). */
function channelRef(input: string): string | null {
    const s = input.trim();
    const id = s.match(/(UC[\w-]{22})/);
    if (id) return id[1];
    const handle = s.match(/(?:youtube\.com\/)?@([\w.-]{3,30})/i) ?? s.match(/^([\w.-]{3,30})$/);
    return handle ? `@${handle[1].toLowerCase()}` : null;
}

export default function InviteForm({ channels, initialEmail = '', initialChannel = null }: { channels: Channel[]; initialEmail?: string; initialChannel?: Channel | null }) {
    const router = useRouter();
    const [email, setEmail] = useState(initialEmail);
    const [query, setQuery] = useState('');
    const [chosen, setChosen] = useState<Channel[]>(initialChannel ? [channels.find((c) => c.channel_id === initialChannel.channel_id) ?? initialChannel] : []);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [customName, setCustomName] = useState('');
    const [customRef, setCustomRef] = useState('');
    const customId = channelRef(customRef);

    const matches = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return channels.filter((c) => c.name.toLowerCase().includes(q) && !chosen.some((x) => x.channel_id === c.channel_id)).slice(0, 8);
    }, [channels, query, chosen]);

    function addCustom() {
        if (!customId || !customName.trim() || chosen.some((c) => c.channel_id === customId)) return;
        setChosen([...chosen, { channel_id: customId, name: customName.trim(), vertical: 'other' }]);
        setCustomName('');
        setCustomRef('');
    }

    async function send() {
        setBusy(true);
        setMsg(null);
        const res = await createInviteAction(email, chosen.map((c) => ({ channel_id: c.channel_id, channel_name: c.name })));
        setBusy(false);
        if (!res.ok) return setMsg(res.error);
        setMsg(`Invite sent to ${email}.`);
        setEmail('');
        setChosen([]);
        router.refresh();
    }

    return (
        <div className="space-y-3 max-w-xl">
            <input className="w-full rounded border px-3 py-2" type="email" placeholder="Channel owner's email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <div className="flex flex-wrap gap-2">
                {chosen.map((c) => (
                    <span key={c.channel_id} className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-sm">
                        {c.name} <button onClick={() => setChosen(chosen.filter((x) => x.channel_id !== c.channel_id))} aria-label={`Remove ${c.name}`}>×</button>
                    </span>
                ))}
            </div>
            <input className="w-full rounded border px-3 py-2" placeholder="Search PP channels to link" value={query} onChange={(e) => setQuery(e.target.value)} />
            {matches.length > 0 && (
                <ul className="rounded border divide-y">
                    {matches.map((c) => (
                        <li key={c.channel_id}>
                            <button className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => { setChosen([...chosen, c]); setQuery(''); }}>
                                {c.name} <span className="text-xs uppercase text-slate-400">{c.vertical}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <details className="rounded border px-3 py-2">
                <summary className="cursor-pointer text-sm text-slate-600 dark:text-slate-300">Channel not in the list? Add it by hand</summary>
                <div className="mt-3 space-y-2">
                    <input className="w-full rounded border px-3 py-2" placeholder="Channel name, e.g. Project Profound" value={customName} onChange={(e) => setCustomName(e.target.value)} />
                    <input className="w-full rounded border px-3 py-2" placeholder="YouTube link or @handle, e.g. https://www.youtube.com/@projectprofound" value={customRef} onChange={(e) => setCustomRef(e.target.value)} />
                    {customRef && !customId && <p className="text-xs text-red-600">That doesn&apos;t look like a YouTube channel link, @handle or channel ID.</p>}
                    <Button type="button" variant="outline" size="sm" onClick={addCustom} disabled={!customId || !customName.trim()}>
                        Add {customId ? `(${customId})` : ''}
                    </Button>
                </div>
            </details>
            <Button onClick={send} disabled={busy || !email.includes('@') || chosen.length === 0} className="gap-2">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send invite
            </Button>
            {msg && <p className="text-sm text-slate-600">{msg}</p>}
        </div>
    );
}
