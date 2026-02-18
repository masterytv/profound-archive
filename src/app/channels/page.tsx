import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ChannelCard, type ChannelStats } from '@/components/channels/ChannelCard'
import { ChannelSearch } from '@/components/channels/ChannelSearch'
import { ExplorerControls } from '@/components/explore/ExplorerControls'
import { Film, Tv } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'NDE Channels | Project Profound',
    description: 'Browse all near-death experience channels. Explore NDE video collections from top YouTube channels covering near-death experiences, afterlife accounts, and consciousness research.',
}

const SORT_OPTIONS = [
    { value: 'video_count', label: 'Most Videos' },
    { value: 'total_views', label: 'Most Views' },
    { value: 'subscriber_count', label: 'Most Subscribers' },
    { value: 'latest_video_date', label: 'Most Recent' },
    { value: 'channel_name', label: 'Alphabetical' },
]

const ITEMS_PER_PAGE = 12

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
        let cmp = 0
        switch (sort) {
            case 'video_count':
                cmp = a.video_count - b.video_count
                break
            case 'total_views':
                cmp = a.total_views - b.total_views
                break
            case 'subscriber_count':
                cmp = a.subscriber_count - b.subscriber_count
                break
            case 'latest_video_date':
                cmp = (a.latest_video_date || '').localeCompare(b.latest_video_date || '')
                break
            case 'channel_name':
                cmp = a.channel_name.localeCompare(b.channel_name)
                break
            default:
                cmp = a.video_count - b.video_count
        }
        return direction === 'desc' ? -cmp : cmp
    })

    // Pagination
    const totalPages = Math.ceil(channels.length / ITEMS_PER_PAGE)
    const paginatedChannels = channels.slice(
        (page - 1) * ITEMS_PER_PAGE,
        page * ITEMS_PER_PAGE
    )

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
                {/* Header */}
                <div className="mb-8 sm:mb-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                            <Tv className="w-5 h-5 text-blue-600" />
                        </div>
                        <h1
                            className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight"
                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                        >
                            NDE Channels
                        </h1>
                    </div>
                    <p className="text-slate-500 text-sm sm:text-base max-w-2xl">
                        Browse {channels.length} channels sharing near-death experience accounts.
                        Each channel page features searchable and sortable video collections.
                    </p>
                </div>

                {/* Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
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

                {/* Grid */}
                {paginatedChannels.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {paginatedChannels.map((channel) => (
                            <ChannelCard key={channel.channel_id} channel={channel} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Film className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-slate-500 text-sm">
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
