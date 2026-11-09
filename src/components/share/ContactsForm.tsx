'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveContactsAction } from '@/app/share/actions';

const input = 'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2';

export default function ContactsForm({ initial }: { initial: { phone: string; website: string; other: string } }) {
    const [v, setV] = useState(initial);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    async function save() {
        setBusy(true);
        setMsg(null);
        const res = await saveContactsAction(v);
        setBusy(false);
        setMsg(res.ok ? 'Saved.' : res.error);
    }
    return (
        <div className="space-y-3">
            <input className={input} placeholder="Phone (optional)" value={v.phone} maxLength={40} onChange={(e) => setV({ ...v, phone: e.target.value })} />
            <input className={input} placeholder="Website (optional)" value={v.website} maxLength={200} onChange={(e) => setV({ ...v, website: e.target.value })} />
            <input className={input} placeholder="Anything else, e.g. a social handle (optional)" value={v.other} maxLength={300} onChange={(e) => setV({ ...v, other: e.target.value })} />
            <div className="flex items-center gap-3">
                <Button onClick={save} disabled={busy} variant="outline" className="gap-2">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button>
                {msg && <span className="text-sm text-slate-500">{msg}</span>}
            </div>
        </div>
    );
}
