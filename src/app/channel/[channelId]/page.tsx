import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { ExplorerControls, type SortOption } from '@/components/explore/ExplorerControls'
import { Eye, Film, Users, ExternalLink, ChevronRight, Calendar } from 'lucide-react'
import { ExpandableDescription } from '@/components/channels/ExpandableDescription'
import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ChannelAnalysisSummary, type ChannelNderfStats, type ChannelScoreSummary } from '@/components/analysis/ChannelAnalysisSummary'

const PAGE_SIZE = 12

const SORT_OPTIONS: SortOption[] = [
    { value: 'viewCount', label: 'Most Views' },
    { value: 'date', label: 'Newest' },
    { value: 'title', label: 'Title (A-Z)' },
]

function formatNumber(num: number): string {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
    return num.toString()
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Unknown'
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

interface PageProps {
    params: Promise<{ channelId: string }>
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { channelId } = await params
    const supabase = await createClient()
    const { data } = await supabase
        .from('nde_vids')
        .select('channelName')
        .eq('channelId', channelId)
        .eq('isNde', 'clear_nde')
        .limit(1)
        .single()

    const name = data?.channelName || 'Channel'
    return {
        title: `${name} | NDE Channels | Project Profound`,
        description: `Browse all near-death experience videos from ${name}. Watch NDE testimonials, afterlife accounts, and consciousness research.`,
    }
}

export default async function ChannelDetailPage({ params, searchParams }: PageProps) {
    const { channelId } = await params
    const sp = await searchParams
    const sort = (sp.sort as string) || 'viewCount'
    const direction = ((sp.dir as string) || 'desc') as 'asc' | 'desc'
    const page = Math.max(1, parseInt((sp.page as string) || '1', 10))
    const query = (sp.q as string) || ''

    const supabase = await createClient()

    // Fetch channel metadata from first video
    const { data: channelMeta } = await supabase
        .from('nde_vids')
        .select('channelName, channelUrl, channelUsername, numberOfSubscribers')
        .eq('channelId', channelId)
        .not('channelName', 'is', null)
        .limit(1)
        .single()

    if (!channelMeta) {
        notFound()
    }

    // Fetch enriched channel data (avatar, banner, description)
    const { data: channelEnriched } = await supabase
        .from('channels')
        .select('avatar_url, banner_url, description, country, subscriber_count')
        .eq('channel_id', channelId)
        .single()

    // Use enriched subscriber count (from YouTube API) as primary source
    const subscriberCount = channelEnriched?.subscriber_count || channelMeta.numberOfSubscribers || 0

    // Fetch videos for this channel
    let videoQuery = supabase
        .from('nde_vids')
        .select('videoId, title, thumbnailUrl, viewCount, date, channelName', { count: 'exact' })
        .eq('channelId', channelId)
        .eq('isNde', 'clear_nde')

    // Search filter
    if (query) {
        videoQuery = videoQuery.ilike('title', `%${query}%`)
    }

    // Sort
    const ascending = direction === 'asc'
    switch (sort) {
        case 'viewCount':
            videoQuery = videoQuery.order('viewCount', { ascending, nullsFirst: false })
            break
        case 'date':
            videoQuery = videoQuery.order('date', { ascending, nullsFirst: false })
            break
        case 'title':
            videoQuery = videoQuery.order('title', { ascending, nullsFirst: false })
            break
        default:
            videoQuery = videoQuery.order('viewCount', { ascending: false, nullsFirst: false })
    }

    // Pagination
    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    videoQuery = videoQuery.range(from, to)

    const { data: videos, count } = await videoQuery
    const totalResults = count || 0
    const totalPages = Math.ceil(totalResults / PAGE_SIZE)

    // Channel aggregate stats
    const { data: statsData } = await supabase
        .from('nde_vids')
        .select('viewCount')
        .eq('channelId', channelId)
        .eq('isNde', 'clear_nde')

    const totalViews = statsData?.reduce((sum, v) => sum + (v.viewCount || 0), 0) || 0

    // Fetch NDERF analysis stats server-side (avoids client-side AbortError from React strict mode)
    const { data: nderfStats } = await supabase.rpc('get_channel_nderf_stats', {
        target_channel_id: channelId,
    })

    // Fetch channel-level Greyson/Transformation/Veridical averages for the score summary
    const { data: greysonAvg } = await supabase
        .from('nde_analysis')
        .select('total_greyson_score')
        .not('total_greyson_score', 'is', null)
        .in('video_id', (
            await supabase.from('nde_vids').select('videoId').eq('channelId', channelId).eq('isNde', 'clear_nde')
        ).data?.map(v => v.videoId) || [])

    const { data: transformAvg } = await supabase
        .from('nde_analysis')
        .select('transformation_score')
        .not('transformation_score', 'is', null)
        .in('video_id', (
            await supabase.from('nde_vids').select('videoId').eq('channelId', channelId).eq('isNde', 'clear_nde')
        ).data?.map(v => v.videoId) || [])

    const { data: veridicalAvg } = await supabase
        .from('nde_vids')
        .select('rvnde_total_score')
        .eq('channelId', channelId)
        .eq('isNde', 'clear_nde')
        .not('rvnde_total_score', 'is', null)

    const channelScores: ChannelScoreSummary = {
        avg_greyson_score: greysonAvg && greysonAvg.length > 0
            ? Math.round((greysonAvg.reduce((s, r) => s + (r.total_greyson_score ?? 0), 0) / greysonAvg.length) * 10) / 10
            : null,
        avg_transformation_score: transformAvg && transformAvg.length > 0
            ? Math.round((transformAvg.reduce((s, r) => s + (r.transformation_score ?? 0), 0) / transformAvg.length) * 10) / 10
            : null,
        avg_veridical_score: veridicalAvg && veridicalAvg.length > 0
            ? Math.round((veridicalAvg.reduce((s, r) => s + (r.rvnde_total_score ?? 0), 0) / veridicalAvg.length) * 10) / 10
            : null,
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">

            {/* Channel Header */}
            <div className="border-b border-slate-200/60 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-1.5 text-sm text-slate-400 mb-5">
                        <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <Link href="/channels" className="hover:text-blue-600 transition-colors">Channels</Link>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="text-slate-700 dark:text-slate-200 font-medium">{channelMeta.channelName}</span>
                    </nav>

                    <div className="flex flex-col sm:flex-row items-start gap-5">
                        {/* Avatar */}
                        {channelEnriched?.avatar_url ? (
                            <Image
                                src={channelEnriched.avatar_url}
                                alt={channelMeta.channelName || 'Channel'}
                                width={64}
                                height={64}
                                className="rounded-2xl shrink-0 shadow-lg"
                            />
                        ) : (
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl font-bold shadow-lg">
                                {channelMeta.channelName?.charAt(0).toUpperCase()}
                            </div>
                        )}

                        <div className="flex-1">
                            <h1
                                className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-2"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                {channelMeta.channelName}
                            </h1>

                            {/* Stats row */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-3">
                                <span className="flex items-center gap-1.5">
                                    <Film className="w-4 h-4" />
                                    <strong className="text-slate-700 dark:text-slate-200">{totalResults}</strong> videos
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Eye className="w-4 h-4" />
                                    <strong className="text-slate-700 dark:text-slate-200">{formatNumber(totalViews)}</strong> total views
                                </span>
                                {subscriberCount > 0 && (
                                    <span className="flex items-center gap-1.5">
                                        <Users className="w-4 h-4" />
                                        <strong className="text-slate-700 dark:text-slate-200">{formatNumber(subscriberCount)}</strong> subscribers
                                    </span>
                                )}
                            </div>

                            {/* YouTube link */}
                            {channelMeta.channelUrl && (
                                <a
                                    href={channelMeta.channelUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                                >
                                    View on YouTube
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    {channelEnriched?.description && (
                        <ExpandableDescription text={channelEnriched.description} />
                    )}
                </div>
            </div>

            {/* ─── Channel NDERF Analysis Summary ─── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <ChannelAnalysisSummary stats={nderfStats as ChannelNderfStats | null} scores={channelScores} />
            </div>

            {/* Controls + Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search + Controls */}
                <div className="bg-white dark:bg-white/5 rounded-2xl shadow-sm dark:shadow-none border border-slate-200/60 dark:border-white/10 p-4 mb-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {/* Inline search */}
                        <div className="relative flex-1 w-full sm:max-w-xs">
                            <input
                                type="text"
                                placeholder="Search videos in this channel..."
                                defaultValue={query}
                                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 py-2 pl-3 pr-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all"
                            />
                        </div>
                        <Suspense fallback={null}>
                            <ExplorerControls
                                sortOptions={SORT_OPTIONS}
                                currentSort={sort}
                                currentDirection={direction}
                                currentPage={page}
                                totalPages={totalPages}
                                totalResults={totalResults}
                            />
                        </Suspense>
                    </div>
                </div>

                {/* Video Grid */}
                {videos && videos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {videos.map((video) => (
                            <Link
                                key={video.videoId}
                                href={`/video/${video.videoId}`}
                                className="group block bg-white dark:bg-white/5 rounded-2xl overflow-hidden border border-slate-200/60 dark:border-white/10 hover:shadow-xl dark:hover:shadow-none hover:border-blue-200 dark:hover:border-blue-500/50 transition-all duration-300"
                            >
                                {/* Thumbnail */}
                                <div className="relative aspect-video overflow-hidden bg-slate-100">
                                    {video.thumbnailUrl ? (
                                        <Image
                                            src={video.thumbnailUrl}
                                            alt={video.title || 'Video thumbnail'}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center">
                                            <Film className="w-8 h-8 text-slate-300" />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-4">
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">
                                        {video.title || 'Untitled Video'}
                                    </h3>
                                    <div className="flex items-center gap-3 text-xs text-slate-400">
                                        {video.viewCount != null && (
                                            <span className="flex items-center gap-1">
                                                <Eye className="w-3 h-3" />
                                                {formatNumber(video.viewCount)}
                                            </span>
                                        )}
                                        {video.date && (
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(video.date)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Film className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-slate-500 text-sm">
                            {query ? `No videos matching "${query}"` : 'No videos found for this channel.'}
                        </p>
                    </div>
                )}

                {/* Bottom pagination */}
                {totalPages > 1 && (
                    <div className="mt-8">
                        <div className="bg-white dark:bg-white/5 rounded-2xl shadow-sm dark:shadow-none border border-slate-200/60 dark:border-white/10 p-4">
                            <Suspense fallback={null}>
                                <ExplorerControls
                                    sortOptions={SORT_OPTIONS}
                                    currentSort={sort}
                                    currentDirection={direction}
                                    currentPage={page}
                                    totalPages={totalPages}
                                    totalResults={totalResults}
                                />
                            </Suspense>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
