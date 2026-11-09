'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink, Loader2, Mail, Pencil, Plus, Upload, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addChannelAction, deleteContactAction, importContactsAction, saveContactAction } from '@/app/admin/channel-contacts/actions';
import type { ChannelRow } from '@/lib/share/contacts';

const TYPES = ['nde', 'uap', 'both', 'other'] as const;
const ROLES = ['host', 'producer', 'agency', 'network', 'other'] as const;
const STATUSES = ['not_contacted', 'contacted', 'interested', 'declined', 'member'] as const;
const STATUS_LABEL: Record<(typeof STATUSES)[number], string> = {
    not_contacted: 'Not contacted',
    contacted: 'Contacted',
    interested: 'Interested',
    declined: 'Declined',
    member: 'Member',
};
const STATUS_COLOR: Record<(typeof STATUSES)[number], string> = {
    not_contacted: 'bg-slate-100 text-slate-600',
    contacted: 'bg-blue-100 text-blue-800',
    interested: 'bg-amber-100 text-amber-800',
    declined: 'bg-rose-100 text-rose-800',
    member: 'bg-emerald-100 text-emerald-800',
};

/** Gmail compose with the address in "To" (several addresses: the first one). */
function gmailUrl(email: string, subject = 'Project Profound'): string {
    const to = email.split(/[;,]\s*/)[0];
    return `https://mail.google.com/mail/?${new URLSearchParams({ view: 'cm', fs: '1', to, su: subject }).toString()}`;
}

const input = 'w-full rounded border px-2 py-1.5 text-sm bg-white dark:bg-slate-900';

export default function ChannelContactsTable({ rows }: { rows: ChannelRow[] }) {
    const router = useRouter();
    const [q, setQ] = useState('');
    const [type, setType] = useState<string>('');
    const [status, setStatus] = useState<string>('');
    const [onlyEmail, setOnlyEmail] = useState(false);
    const [editing, setEditing] = useState<string | null>(null);
    const [msg, setMsg] = useState<string | null>(null);

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return rows.filter((r) => {
            if (type && r.channelType !== type) return false;
            if (status && (r.contact?.outreachStatus ?? 'not_contacted') !== status) return false;
            if (onlyEmail && !r.contact?.email) return false;
            if (!needle) return true;
            return [r.channelName, r.channelId, r.contact?.contactName, r.contact?.email, r.contact?.notes].some((v) => v?.toLowerCase().includes(needle));
        });
    }, [rows, q, type, status, onlyEmail]);

    const withEmail = rows.filter((r) => r.contact?.email).length;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
                <input className="rounded border px-3 py-2 text-sm w-64" placeholder="Search name, host, email, notes" value={q} onChange={(e) => setQ(e.target.value)} />
                <select className="rounded border px-2 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="">All types</option>
                    {TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
                <select className="rounded border px-2 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">Any status</option>
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
                <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={onlyEmail} onChange={(e) => setOnlyEmail(e.target.checked)} /> Has email</label>
                <span className="text-sm text-slate-500 ml-auto">{filtered.length} of {rows.length} channels · {withEmail} with email</span>
            </div>

            <div className="flex flex-wrap gap-3">
                <AddChannel onDone={(m) => { setMsg(m); router.refresh(); }} />
                <ImportCsv onDone={(m) => { setMsg(m); router.refresh(); }} />
            </div>
            {msg && <p className="text-sm text-emerald-700">{msg}</p>}

            <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-left text-slate-500">
                        <tr>
                            <th className="p-2">Channel</th>
                            <th className="p-2">Type</th>
                            <th className="p-2 text-right">PP videos</th>
                            <th className="p-2">Host / producer</th>
                            <th className="p-2">Contact</th>
                            <th className="p-2">Status</th>
                            <th className="p-2">Directory access</th>
                            <th className="p-2" />
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((r) => (
                            <Row key={r.channelId} row={r} editing={editing === r.channelId} onEdit={() => setEditing(editing === r.channelId ? null : r.channelId)} onSaved={() => { setEditing(null); router.refresh(); }} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Row({ row: r, editing, onEdit, onSaved }: { row: ChannelRow; editing: boolean; onEdit: () => void; onSaved: () => void }) {
    const c = r.contact;
    const st = c?.outreachStatus ?? 'not_contacted';
    const inviteHref = `/admin/share/channels?${new URLSearchParams({ email: c?.email?.split(/[;,]\s*/)[0] ?? '', cid: r.channelId, cname: r.channelName }).toString()}`;
    return (
        <>
            <tr className="border-t align-top">
                <td className="p-2">
                    <div className="font-medium">{r.channelName}</div>
                    {r.channelUrl && (
                        <a href={r.channelUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 inline-flex items-center gap-1 hover:underline">
                            YouTube <ExternalLink className="h-3 w-3" />
                        </a>
                    )}
                </td>
                <td className="p-2 uppercase text-xs text-slate-500">{r.channelType}</td>
                <td className="p-2 text-right tabular-nums">{r.ppVideos || '–'}</td>
                <td className="p-2">
                    {c?.contactName || <span className="text-slate-400">–</span>}
                    {c?.contactRole ? <div className="text-xs text-slate-500">{c.contactRole}</div> : null}
                </td>
                <td className="p-2 space-y-1">
                    {c?.email ? (
                        <a href={gmailUrl(c.email)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded bg-indigo-600 text-white px-2 py-1 text-xs hover:bg-indigo-700" title={c.email}>
                            <Mail className="h-3 w-3" /> Email
                        </a>
                    ) : null}
                    <div className="text-xs text-slate-500 break-all">{c?.email || ''}</div>
                    {c?.phone && <div className="text-xs">{c.phone}</div>}
                    {c?.contactFormUrl && <a href={c.contactFormUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline block">Contact form</a>}
                    {c?.website && <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline block">Website</a>}
                    {!c?.email && !c?.contactFormUrl && !c?.phone && <span className="text-slate-400">–</span>}
                </td>
                <td className="p-2"><span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[st]}`}>{STATUS_LABEL[st]}</span></td>
                <td className="p-2 text-xs">
                    {r.members.length ? r.members.map((m) => <div key={m}>{m}</div>) : (
                        <Link href={inviteHref} className="inline-flex items-center gap-1 text-indigo-600 hover:underline"><UserPlus className="h-3 w-3" /> Invite</Link>
                    )}
                </td>
                <td className="p-2"><button onClick={onEdit} className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900" aria-label={`Edit ${r.channelName}`}><Pencil className="h-3 w-3" /> {editing ? 'Close' : 'Edit'}</button></td>
            </tr>
            {editing && (
                <tr className="border-t bg-slate-50/60 dark:bg-slate-800/30">
                    <td colSpan={8} className="p-3"><EditForm row={r} onSaved={onSaved} /></td>
                </tr>
            )}
        </>
    );
}

function EditForm({ row: r, onSaved }: { row: ChannelRow; onSaved: () => void }) {
    const c = r.contact;
    const [v, setV] = useState({
        channel_name: r.channelName,
        channel_url: r.channelUrl ?? '',
        channel_type: r.channelType,
        contact_name: c?.contactName ?? '',
        contact_role: c?.contactRole ?? '',
        email: c?.email ?? '',
        phone: c?.phone ?? '',
        contact_form_url: c?.contactFormUrl ?? '',
        website: c?.website ?? '',
        social: c?.social ?? '',
        outreach_status: c?.outreachStatus ?? 'not_contacted',
        notes: c?.notes ?? '',
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });

    async function save() {
        setBusy(true);
        setError(null);
        const res = await saveContactAction({ channel_id: r.channelId, ...v, contact_role: (v.contact_role || '') as '' });
        setBusy(false);
        if (!res.ok) return setError(res.error);
        onSaved();
    }

    async function remove() {
        if (!confirm(r.onPP ? 'Clear the saved contact details for this channel?' : 'Remove this channel from the list?')) return;
        const res = await deleteContactAction(r.channelId);
        if (!res.ok) return setError(res.error);
        onSaved();
    }

    const field = (label: string, el: React.ReactNode) => (
        <label className="block text-xs text-slate-500 space-y-1"><span>{label}</span>{el}</label>
    );

    return (
        <div className="grid gap-3 md:grid-cols-3">
            {field('Channel name', <input className={input} value={v.channel_name} onChange={set('channel_name')} disabled={r.onPP} />)}
            {field('Channel link', <input className={input} value={v.channel_url} onChange={set('channel_url')} />)}
            {field('Channel type', (
                <select className={input} value={v.channel_type} onChange={set('channel_type')} disabled={r.onPP}>
                    {TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
            ))}
            {field('Host or producer name', <input className={input} value={v.contact_name} onChange={set('contact_name')} />)}
            {field('Their role', (
                <select className={input} value={v.contact_role} onChange={set('contact_role')}>
                    <option value="">–</option>
                    {ROLES.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
            ))}
            {field('Outreach status', (
                <select className={input} value={v.outreach_status} onChange={set('outreach_status')}>
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
            ))}
            {field('Email (several: separate with commas)', <input className={input} value={v.email} onChange={set('email')} />)}
            {field('Phone', <input className={input} value={v.phone} onChange={set('phone')} />)}
            {field('Contact form URL', <input className={input} value={v.contact_form_url} onChange={set('contact_form_url')} />)}
            {field('Website', <input className={input} value={v.website} onChange={set('website')} />)}
            <div className="md:col-span-2">{field('Social handles', <input className={input} value={v.social} onChange={set('social')} />)}</div>
            <div className="md:col-span-3">{field('Notes', <textarea className={`${input} min-h-[70px]`} value={v.notes} onChange={set('notes')} />)}</div>
            <div className="md:col-span-3 flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={save} disabled={busy} className="gap-2">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button>
                {(c || !r.onPP) && <Button size="sm" variant="ghost" onClick={remove} className="text-red-600">{r.onPP ? 'Clear contact details' : 'Remove channel'}</Button>}
                {r.onPP && <span className="text-xs text-slate-500">Name and type come from the channel data on PP.</span>}
                {error && <span className="text-sm text-red-600">{error}</span>}
            </div>
        </div>
    );
}

function AddChannel({ onDone }: { onDone: (msg: string) => void }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [ref, setRef] = useState('');
    const [type, setType] = useState<(typeof TYPES)[number]>('other');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1"><Plus className="h-4 w-4" /> Add a channel</Button>;
    return (
        <div className="flex flex-wrap items-center gap-2 rounded border p-2">
            <input className="rounded border px-2 py-1.5 text-sm" placeholder="Channel name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="rounded border px-2 py-1.5 text-sm w-72" placeholder="YouTube link or @handle" value={ref} onChange={(e) => setRef(e.target.value)} />
            <select className="rounded border px-2 py-1.5 text-sm" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
                {TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
            <Button
                size="sm"
                disabled={busy || !name.trim() || !ref.trim()}
                onClick={async () => {
                    setBusy(true);
                    setError(null);
                    const res = await addChannelAction(name, ref, type);
                    setBusy(false);
                    if (!res.ok) return setError(res.error);
                    setOpen(false);
                    setName('');
                    setRef('');
                    onDone(`Added ${name}.`);
                }}
            >
                Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
    );
}

function ImportCsv({ onDone }: { onDone: (msg: string) => void }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    return (
        <label className={`inline-flex items-center gap-1 rounded border px-3 py-1.5 text-sm cursor-pointer hover:bg-slate-50 ${busy ? 'opacity-60' : ''}`}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Import contacts (CSV)
            <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                disabled={busy}
                onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    setBusy(true);
                    setError(null);
                    const res = await importContactsAction(await file.text());
                    setBusy(false);
                    if (!res.ok) return setError(res.error);
                    onDone(`Imported: ${res.data?.added ?? 0} added, ${res.data?.updated ?? 0} filled in, ${res.data?.skipped ?? 0} skipped. Existing details are never overwritten.`);
                }}
            />
            {error && <span className="text-red-600 ml-2">{error}</span>}
        </label>
    );
}
