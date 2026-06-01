import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ChannelListRow, type ChannelStats } from '@/components/channels/ChannelListRow'
import { ChannelSearch } from '@/components/channels/ChannelSearch'
import { ExplorerControls } from '@/components/explore/ExplorerControls'
import { Film, Tv } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'NDE Channels | Project Profound',
    description: 'Browse all near-death experience channels. Sort by intensity, emotional tone, Greyson score, and more.',
}

export const revalidate = 86400; // ISR: revalidate once per day

const SORT_OPTIONS = [
    // Basic
    { value: 'video_count', label: 'Most Videos' },
    { value: 'total_views', label: 'Most Views' },
    { value: 'subscriber_count', label: 'Most Subscribers' },
    { value: 'channel_name', label: 'Alphabetical' },
    // Analysis
    { value: 'avg_intensity', label: 'Avg. Intensity' },
    { value: 'pct_positive_tone', label: 'Most Positive' },
    { value: 'pct_negative_tone', label: 'Most Distressing' },
    { value: 'avg_greyson_score', label: 'Avg. Depth' },
    { value: 'avg_transformation_score', label: 'Avg. Life Impact' },
    { value: 'avg_veridical_score', label: 'Avg. Evidence' },
    { value: 'total_analyzed', label: 'Most Analyzed' },
]

// Channels with no analysis data sort to the bottom for analysis-based sorts
const ANALYSIS_SORT_KEYS = new Set([
    'avg_intensity', 'pct_positive_tone', 'pct_negative_tone',
    'avg_greyson_score', 'avg_transformation_score', 'avg_veridical_score',
    'total_analyzed',
])

const ITEMS_PER_PAGE = 20

export default async function ChannelsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const sort = (params.sort as string) || 'video_count'
    const direction = ((params.dir as string) || 'desc') as 'asc' | 'desc'
    const page = parseInt((params.page as string) || '1', 10)
    const query = (params.q as string) || ''

    const supabase = await createClient()
    const { data: allChannels, error } = await supabase.rpc('get_channel_stats')

    if (error) {
        console.error('Error fetching channel stats:', error)
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-slate-500">Unable to load channels. Please try again later.</p>
            </div>
        )
    }

    let channels = (allChannels as ChannelStats[]) || []

    // Filter by search query
    if (query) {
        channels = channels.filter((c) =>
            c.channel_name.toLowerCase().includes(query.toLowerCase())
        )
    }

    // Sort
    channels.sort((a, b) => {
        const isAnalysisSort = ANALYSIS_SORT_KEYS.has(sort)

        // For analysis sorts: push nulls to the end regardless of direction
        if (isAnalysisSort) {
            const av = (a as Record<string, unknown>)[sort]
            const bv = (b as Record<string, unknown>)[sort]
            if (av == null && bv == null) return 0
            if (av == null) return 1   // a goes after b
            if (bv == null) return -1  // b goes after a
        }

        let cmp = 0
        const av = (a as Record<string, unknown>)[sort]
        const bv = (b as Record<string, unknown>)[sort]

        if (sort === 'channel_name') {
            cmp = a.channel_name.localeCompare(b.channel_name)
        } else if (sort === 'latest_video_date') {
            cmp = (a.latest_video_date || '').localeCompare(b.latest_video_date || '')
        } else if (typeof av === 'number' && typeof bv === 'number') {
            cmp = av - bv
        } else if (typeof av === 'string' && typeof bv === 'string') {
            cmp = parseFloat(av) - parseFloat(bv)
        }

        return direction === 'desc' ? -cmp : cmp
    })

    // Pagination
    const totalPages = Math.ceil(channels.length / ITEMS_PER_PAGE)
    const paginatedChannels = channels.slice(
        (page - 1) * ITEMS_PER_PAGE,
        page * ITEMS_PER_PAGE
    )

    const rankOffset = (page - 1) * ITEMS_PER_PAGE

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">

                {/* Header */}
                <div className="mb-8 sm:mb-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
                            <Tv className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h1
                            className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight"
                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                        >
                            NDE Channels
                        </h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base max-w-2xl">
                        {channels.length} channels sharing near-death experience accounts,
                        ranked by experience analysis. Sort by intensity, emotional tone, depth, life impact, and more.
                    </p>
                </div>

                {/* Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <Suspense fallback={null}>
                        <ChannelSearch currentQuery={query} />
                    </Suspense>
                    <ExplorerControls
                        sortOptions={SORT_OPTIONS}
                        currentSort={sort}
                        currentDirection={direction}
                        currentPage={page}
                        totalPages={totalPages}
                        totalResults={channels.length}
                    />
                </div>

                {/* List */}
                {paginatedChannels.length > 0 ? (
                    <div className="flex flex-col gap-2">
                        {paginatedChannels.map((channel, i) => (
                            <ChannelListRow
                                key={channel.channel_id}
                                channel={channel}
                                rank={rankOffset + i + 1}
                                activeSortKey={sort}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Film className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            {query ? `No channels matching "${query}"` : 'No channels found.'}
                        </p>
                    </div>
                )}

                {/* Bottom pagination */}
                {totalPages > 1 && (
                    <div className="mt-8 flex justify-center">
                        <ExplorerControls
                            sortOptions={SORT_OPTIONS}
                            currentSort={sort}
                            currentDirection={direction}
                            currentPage={page}
                            totalPages={totalPages}
                            totalResults={channels.length}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
