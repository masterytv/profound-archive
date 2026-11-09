import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { EXPERIENCE_TYPES, isShareEnabled } from '@/lib/share/config';
import { currentUser } from '@/lib/share/db';
import { listDirectory, memberStatus } from '@/lib/share/channels';
import DirectoryList from '@/components/share/DirectoryList';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Guest directory | Project Profound', robots: { index: false } };

/** Members only. Rendered on the server; shows directory fields only, never contact details. */
export default async function DirectoryPage({ searchParams }: { searchParams: Promise<{ type?: string; q?: string }> }) {
    if (!isShareEnabled()) notFound();
    const user = await currentUser();
    if (!user) redirect('/login?returnTo=/channels/directory');
    const { memberships, conductAccepted } = await memberStatus(user.id);
    if (!memberships.length) notFound();
    if (!conductAccepted) redirect('/channels/conduct');

    const sp = await searchParams;
    const type = EXPERIENCE_TYPES.some((e) => e.value === sp.type) ? sp.type : undefined;
    const entries = await listDirectory(user.id, { type, q: sp.q });

    return (
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-serif">Guest directory</h1>
                <p className="text-slate-500">
                    People who shared their experience with Project Profound and are open to an introduction to {memberships.map((m) => m.channel_name ?? m.channel_id).join(', ')}. Request an introduction and we&apos;ll ask them; if they accept, we email you both.
                </p>
            </header>
            <form className="flex flex-wrap gap-2" action="/channels/directory">
                <input name="q" defaultValue={sp.q ?? ''} placeholder="Search" className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2" />
                <select name="type" defaultValue={type ?? ''} className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2">
                    <option value="">All experiences</option>
                    {EXPERIENCE_TYPES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
                <button className="rounded-lg bg-slate-800 text-white px-4 py-2">Filter</button>
            </form>
            <DirectoryList entries={entries} />
        </div>
    );
}
