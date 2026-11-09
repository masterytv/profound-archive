import Link from 'next/link';
import { shareAdmin } from '@/lib/share/db';
import { isShareEnabled, visibleTestValues } from '@/lib/share/config';
import { listSuggestions, type OwnStory } from '@/lib/share/stories';
import { publicDisplayName, splitSections } from '@/lib/share/text';
import AdminStoryRow from '@/components/share/AdminStoryRow';

export const dynamic = 'force-dynamic';

const FILTERS = ['held', 'published', 'processing', 'reviewing', 'removed', 'draft', 'all'] as const;

/** Admin queue (the admin layout already restricts this to admins). */
export default async function AdminSharePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
    const sp = await searchParams;
    const status = (FILTERS as readonly string[]).includes(sp.status ?? '') ? sp.status! : 'held';
    let q = shareAdmin()
        .from('share_stories')
        .select('*')
        .in('is_test', visibleTestValues())
        .order('updated_at', { ascending: false })
        .limit(200);
    if (status !== 'all') q = q.eq('status', status);
    const { data, error } = await q;
    const stories = (data ?? []) as OwnStory[];

    const { data: counts } = await shareAdmin().from('share_stories').select('status').in('is_test', visibleTestValues());
    const countBy = (s: string) => (counts ?? []).filter((r) => r.status === s).length;

    const held = await Promise.all(
        stories
            .filter((s) => s.status === 'held')
            .map(async (s) => ({ id: s.id, sections: splitSections(s.body_text ?? ''), crisis: await listSuggestions(s.id, 'crisis') })),
    );
    const heldMap = new Map(held.map((h) => [h.id, h]));

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Shared stories</h1>
                    <p className="text-sm text-slate-500">
                        Share Your Experience. Flag SHARE_ENABLED is <b>{isShareEnabled() ? 'on' : 'off'}</b>.{' '}
                        {visibleTestValues().includes(true) ? 'Showing test (staging) and real rows.' : 'Showing real rows only.'}
                    </p>
                </div>
                <Link href="/admin/share/channels" className="text-sm underline">Channel invites &amp; introductions →</Link>
            </header>
            {error && <p className="text-red-600 text-sm">Could not load stories: {error.message}. Have the share migrations been run?</p>}
            <nav className="flex flex-wrap gap-2 text-sm">
                {FILTERS.map((f) => (
                    <Link key={f} href={`/admin/share?status=${f}`} className={`rounded-full px-3 py-1 border ${status === f ? 'bg-slate-900 text-white' : ''}`}>
                        {f}{f !== 'all' ? ` (${countBy(f)})` : ''}
                    </Link>
                ))}
            </nav>
            {stories.length === 0 ? (
                <p className="text-slate-500">Nothing here.</p>
            ) : (
                <ul className="space-y-3">
                    {stories.map((s) => (
                        <AdminStoryRow
                            key={s.id}
                            story={{
                                id: s.id,
                                slug: s.slug,
                                status: s.status,
                                title: s.title ?? '(untitled)',
                                name: publicDisplayName(s),
                                mediaKind: s.media_kind,
                                isTest: s.is_test,
                                updatedAt: s.updated_at,
                                bodyText: s.body_text ?? '',
                                processingError: s.processing_error,
                                youtubeStatus: s.youtube_status,
                                youtubeVideoId: s.youtube_video_id,
                            }}
                            held={heldMap.get(s.id) ? { sections: heldMap.get(s.id)!.sections, crisis: heldMap.get(s.id)!.crisis.map((c) => ({ id: c.id, sectionIndex: c.section_index, suggested: c.suggested })) } : null}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}
