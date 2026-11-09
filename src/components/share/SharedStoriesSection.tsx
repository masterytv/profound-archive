import Link from 'next/link';
import { isShareEnabled } from '@/lib/share/config';
import { listPublicStories } from '@/lib/share/public';

/**
 * Named stories this person shared directly with Project Profound, shown on
 * their /experiencer/[slug] page. Profiles link to accounts by user_id, never
 * by name (see supabase/migrations/20261109_002_experiencer_profiles_user_id.sql).
 */
export default async function SharedStoriesSection({ profileId }: { profileId: number }) {
    if (!isShareEnabled()) return null;
    const stories = await listPublicStories({ profileId, limit: 20 }).catch(() => []);
    if (!stories.length) return null;
    return (
        <section className="mt-12">
            <h2 className="text-xl font-serif mb-4">Shared directly with Project Profound</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
                {stories.map((s) => (
                    <li key={s.slug}>
                        <Link href={`/experiences/${s.slug}`} className="block rounded-xl border border-slate-200/60 dark:border-white/10 p-4 hover:border-indigo-300">
                            <p className="font-serif text-lg">{s.title}</p>
                            <p className="text-sm text-slate-500">{s.tabs.map((t) => (t === 'watch' ? 'Watch' : t === 'listen' ? 'Listen' : 'Read')).join(' · ')}</p>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
