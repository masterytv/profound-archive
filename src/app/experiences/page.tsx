import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Video, Headphones, BookOpen, Bot } from 'lucide-react';
import { isShareEnabled, EXPERIENCE_TYPES } from '@/lib/share/config';
import { listPublicStories } from '@/lib/share/public';
import type { LibraryTab } from '@/lib/share/library';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Shared experiences: watch, listen, read | Project Profound',
    description: 'Near-death, spiritual and contact experiences shared directly with Project Profound, in the experiencers’ own words.',
};

const TABS: Array<{ key: LibraryTab; label: string; icon: typeof Video }> = [
    { key: 'watch', label: 'Watch', icon: Video },
    { key: 'listen', label: 'Listen', icon: Headphones },
    { key: 'read', label: 'Read', icon: BookOpen },
];

const typeLabel = (t: string) => EXPERIENCE_TYPES.find((e) => e.value === t)?.label ?? t;

export default async function ExperiencesPage({ searchParams }: { searchParams: Promise<{ tab?: string; type?: string }> }) {
    if (!isShareEnabled()) notFound();
    const sp = await searchParams;
    const tab: LibraryTab = sp.tab === 'watch' || sp.tab === 'listen' ? sp.tab : 'read';
    const type = EXPERIENCE_TYPES.some((e) => e.value === sp.type) ? sp.type : undefined;
    const stories = await listPublicStories({ tab, type, limit: 120 });
    const href = (t: LibraryTab, ty?: string) => `/experiences?tab=${t}${ty ? `&type=${ty}` : ''}`;

    return (
        <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
            <header className="space-y-3">
                <p className="text-sm uppercase tracking-widest text-indigo-500">Shared directly with Project Profound</p>
                <h1 className="text-4xl font-serif">Experiences, in their own words</h1>
                <p className="text-slate-600 dark:text-slate-300 max-w-2xl">
                    Watch, listen to or read experiences that people have shared with us. <Link href="/share" className="text-indigo-600 underline">Share yours</Link>.
                </p>
            </header>

            <nav className="flex flex-wrap gap-2" aria-label="Format">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <Link
                        key={key}
                        href={href(key, type)}
                        aria-current={tab === key ? 'page' : undefined}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 border ${tab === key ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`}
                    >
                        <Icon className="h-4 w-4" /> {label}
                    </Link>
                ))}
            </nav>
            <nav className="flex flex-wrap gap-2 text-sm" aria-label="Experience type">
                <Link href={href(tab)} className={!type ? 'font-semibold underline' : 'text-slate-500 hover:underline'}>All</Link>
                {EXPERIENCE_TYPES.map((e) => (
                    <Link key={e.value} href={href(tab, e.value)} className={type === e.value ? 'font-semibold underline' : 'text-slate-500 hover:underline'}>
                        {e.label}
                    </Link>
                ))}
            </nav>

            {stories.length === 0 ? (
                <p className="text-slate-500">No stories here yet.</p>
            ) : (
                <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {stories.map((s) => (
                        <li key={s.slug}>
                            <Link href={`/experiences/${s.slug}?tab=${tab}`} className="block h-full rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition">
                                {s.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={s.imageUrl} alt="" className="w-full aspect-video object-cover" />
                                ) : (
                                    <div className="w-full aspect-video bg-gradient-to-br from-indigo-100 to-amber-50 dark:from-indigo-900/40 dark:to-slate-800" />
                                )}
                                <div className="p-4 space-y-1">
                                    <p className="text-xs uppercase tracking-wide text-indigo-500">{typeLabel(s.experienceType)}</p>
                                    <h2 className="font-serif text-lg leading-snug">{s.title}</h2>
                                    <p className="text-sm text-slate-500">{s.displayName}{s.yearApprox ? ` · ${s.yearApprox}` : ''}</p>
                                    {tab === 'listen' && s.listenIsSynthetic && (
                                        <p className="text-xs text-slate-500 flex items-center gap-1"><Bot className="h-3 w-3" /> Read by a synthetic voice</p>
                                    )}
                                    {s.isTest && <p className="text-xs text-amber-600">Test story (staging)</p>}
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
