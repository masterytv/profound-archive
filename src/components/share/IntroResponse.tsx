'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { respondToIntroAction } from '@/app/share/actions';

export default function IntroResponse({ token, channelName, note, initialChoice }: { token: string; channelName: string; note: string; initialChoice: 'accept' | 'decline' | null }) {
    const [extras, setExtras] = useState({ phone: false, website: false, other: false });
    const [busy, setBusy] = useState<string | null>(null);
    const [done, setDone] = useState<'accept' | 'decline' | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function respond(choice: 'accept' | 'decline') {
        setBusy(choice);
        setError(null);
        const res = await respondToIntroAction(token, choice, extras);
        setBusy(null);
        if (!res.ok) return setError(res.error);
        setDone(choice);
    }

    if (done === 'accept') return <p className="text-lg">Done. We&apos;ve emailed you and {channelName} with each other&apos;s contact details. Project Profound steps out from here. Take good care.</p>;
    if (done === 'decline') return <p className="text-lg">Thank you. We&apos;ve let {channelName} know, without giving a reason.</p>;

    return (
        <div className="space-y-5">
            <p><b>{channelName}</b>, a YouTube channel vetted by Project Profound, would like to be introduced to you. Their message:</p>
            <blockquote className="border-l-4 border-indigo-200 pl-4 italic whitespace-pre-wrap text-slate-700 dark:text-slate-300">{note}</blockquote>
            <p className="text-sm text-slate-600 dark:text-slate-400">
                If you accept, we send one email to you both. It includes your sign-in email address, plus anything you tick below (from the contact details you added on your experience in My experiences). If you decline, we let them know politely.
            </p>
            <div className="space-y-2 text-sm">
                {(['phone', 'website', 'other'] as const).map((k) => (
                    <label key={k} className="flex items-center gap-2">
                        <input type="checkbox" checked={extras[k]} onChange={(e) => setExtras({ ...extras, [k]: e.target.checked })} />
                        Also include my {k === 'other' ? 'other contact details' : k} (if I saved one)
                    </label>
                ))}
            </div>
            <div className="flex gap-3">
                <Button onClick={() => respond('accept')} disabled={busy !== null} className={`gap-2 ${initialChoice === 'accept' ? 'ring-2 ring-emerald-400' : ''}`}>
                    {busy === 'accept' && <Loader2 className="h-4 w-4 animate-spin" />} Accept the introduction
                </Button>
                <Button variant="outline" onClick={() => respond('decline')} disabled={busy !== null} className={`gap-2 ${initialChoice === 'decline' ? 'ring-2 ring-slate-400' : ''}`}>
                    {busy === 'decline' && <Loader2 className="h-4 w-4 animate-spin" />} No, thank you
                </Button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );
}
