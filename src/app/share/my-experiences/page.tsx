import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isShareEnabled } from '@/lib/share/config';
import { currentUser } from '@/lib/share/db';
import { listOwnStories } from '@/lib/share/stories';
import { publicDisplayName } from '@/lib/share/text';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'My experiences | Project Profound', robots: { index: false } };

const STATUS_LABEL: Record<string, string> = {
    draft: 'Not submitted',
    processing: 'Turning your recording into text',
    reviewing: 'Ready for you to review',
    held: 'Being checked by our team',
    published: 'Published',
    removed: 'Removed by Project Profound',
};

export default async function MyStoriesPage() {
    if (!isShareEnabled()) notFound();
    const user = await currentUser();
    if (!user) redirect('/login?returnTo=/share/my-experiences');
    const stories = await listOwnStories(user.id);

    return (
        <div className="max-w-2xl mx-auto px-4 py-12 space-y-10">
            <header className="flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-serif">My experiences</h1>
                    <p className="text-slate-500">Edit, change how you&apos;re named, or delete a story at any time.</p>
                    <p className="text-sm mt-1"><Link href="/experiences" className="text-indigo-600 underline">See all shared experiences</Link></p>
                </div>
                <Link href="/share" className="rounded-lg bg-indigo-600 px-4 py-2 text-white text-sm font-medium hover:bg-indigo-700">Share another</Link>
            </header>

            {stories.length === 0 ? (
                <p className="text-slate-600">You haven&apos;t shared a story yet. <Link href="/share" className="text-indigo-600 underline">Share your experience</Link>.</p>
            ) : (
                <ul className="divide-y divide-slate-200 dark:divide-slate-700 rounded-xl border border-slate-200 dark:border-slate-700">
                    {stories.map((s) => (
                        <li key={s.id}>
                            <Link href={`/share/my-experiences/${s.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <span>
                                    <b className="block">{s.title || 'Untitled story'}</b>
                                    <span className="text-sm text-slate-500">
                                        {publicDisplayName(s)} · {s.media_kind} · {new Date(s.created_at).toLocaleDateString()}
                                    </span>
                                </span>
                                <span className={`text-sm whitespace-nowrap ${s.status === 'reviewing' ? 'text-amber-600 font-medium' : s.status === 'published' ? 'text-emerald-600' : 'text-slate-500'}`}>
                                    {STATUS_LABEL[s.status] ?? s.status}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

        </div>
    );
}
