'use client';

import { useMemo, useState } from 'react';
import { Loader2, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateIntroPreferencesAction } from '@/app/share/actions';

export interface ChannelChoice {
    channel_id: string;
    name: string;
    vertical: 'nde' | 'uap';
}

export interface IntroPrefs {
    introMode: 'none' | 'all' | 'selected';
    channelIds: string[];
    appearancePref: 'camera' | 'audio_only' | 'none';
    phone: string;
    website: string;
    other: string;
}

const box = 'rounded-xl border border-slate-200 dark:border-slate-700 p-3';
const input = 'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2';

/**
 * Shown on a published experience: ask whether the person would like to be
 * introduced to vetted YouTube channels, and collect the (optional) contact
 * details that are shared only if they accept an introduction.
 */
export default function PromoteSection({ storyId, initial, channels, userEmail }: { storyId: string; initial: IntroPrefs; channels: ChannelChoice[]; userEmail: string }) {
    const [v, setV] = useState(initial);
    const [query, setQuery] = useState('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [saved, setSaved] = useState(initial);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? channels.filter((c) => c.name.toLowerCase().includes(q)) : channels;
    }, [channels, query]);
    const selected = new Set(v.channelIds);
    const dirty = JSON.stringify(v) !== JSON.stringify(saved);

    async function save() {
        setBusy(true);
        setMsg(null);
        const res = await updateIntroPreferencesAction(storyId, {
            intro_mode: v.introMode,
            channel_ids: v.introMode === 'selected' ? v.channelIds : [],
            appearance_pref: v.appearancePref,
            phone: v.phone,
            website: v.website,
            other: v.other,
        });
        setBusy(false);
        if (!res.ok) return setMsg({ ok: false, text: res.error });
        setSaved(v);
        setMsg({
            ok: true,
            text:
                v.introMode === 'none'
                    ? 'Saved. Channels won’t see this experience.'
                    : 'Saved. We’ll email you whenever a channel asks to be introduced, and you decide each time.',
        });
    }

    return (
        <section className="rounded-2xl border-2 border-red-100 dark:border-red-500/20 bg-red-50/40 dark:bg-red-500/5 p-5 space-y-4">
            <div className="space-y-1">
                <h2 className="text-xl font-serif flex items-center gap-2">
                    <Youtube className="h-5 w-5 text-red-600" /> Get invited onto YouTube channels
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                    Project Profound works with YouTube channels that interview experiencers. If you&apos;d like, channels we&apos;ve personally vetted
                    can read a short summary of your experience and ask us to introduce you. You decide each time, and they never see your
                    contact details unless you accept.
                </p>
            </div>

            <div className="space-y-2">
                {([
                    ['none', 'No, thank you'],
                    ['all', 'Yes, any channel Project Profound has vetted'],
                    ['selected', 'Yes, but only channels I choose'],
                ] as const).map(([mode, label]) => (
                    <label key={mode} className={`${box} flex gap-3 cursor-pointer bg-white/70 dark:bg-slate-900/40 ${v.introMode === mode ? 'ring-2 ring-indigo-500' : ''}`}>
                        <input type="radio" name={`intro-${storyId}`} className="mt-1" checked={v.introMode === mode} onChange={() => setV({ ...v, introMode: mode })} />
                        <b className="font-medium">{label}</b>
                    </label>
                ))}
            </div>

            {v.introMode === 'selected' && (
                <div className={`${box} space-y-2 bg-white/70 dark:bg-slate-900/40`}>
                    <input className={input} placeholder="Search channels" value={query} onChange={(e) => setQuery(e.target.value)} />
                    <p className="text-xs text-slate-500">{selected.size} selected</p>
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {filtered.map((c) => (
                            <label key={c.channel_id} className="flex items-center gap-3 py-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selected.has(c.channel_id)}
                                    onChange={(e) => {
                                        const n = new Set(selected);
                                        if (e.target.checked) n.add(c.channel_id);
                                        else n.delete(c.channel_id);
                                        setV({ ...v, channelIds: [...n] });
                                    }}
                                />
                                <span className="flex-1">{c.name}</span>
                                <span className="text-xs uppercase text-slate-400">{c.vertical}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {v.introMode !== 'none' && (
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium mb-1" htmlFor={`appear-${storyId}`}>Would you appear on camera?</label>
                        <select id={`appear-${storyId}`} className={input} value={v.appearancePref} onChange={(e) => setV({ ...v, appearancePref: e.target.value as IntroPrefs['appearancePref'] })}>
                            <option value="none">Not sure yet</option>
                            <option value="camera">Yes, on camera</option>
                            <option value="audio_only">Audio only</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm font-medium">How a channel can reach you (only if you accept an introduction)</p>
                        <p className="text-xs text-slate-500">
                            Your email ({userEmail}) is always included in an introduction you accept. You can add more below; it is never shown publicly.
                        </p>
                        <input className={input} placeholder="Phone (optional)" value={v.phone} maxLength={40} onChange={(e) => setV({ ...v, phone: e.target.value })} />
                        <input className={input} placeholder="Website (optional)" value={v.website} maxLength={200} onChange={(e) => setV({ ...v, website: e.target.value })} />
                        <input className={input} placeholder="Anything else, e.g. a social handle (optional)" value={v.other} maxLength={300} onChange={(e) => setV({ ...v, other: e.target.value })} />
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
                <Button onClick={save} disabled={busy || !dirty || (v.introMode === 'selected' && v.channelIds.length === 0)} className="gap-2">
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save my choice
                </Button>
                {msg && <span className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</span>}
            </div>
        </section>
    );
}
