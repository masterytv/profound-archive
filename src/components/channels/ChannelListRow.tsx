'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Eye, Film, BarChart3, ChevronRight } from 'lucide-react'
import { MiniStackedBar, MiniIntensityBar } from './MiniStackedBar'
import type { ChannelStats } from './ChannelCard'
export type { ChannelStats } from './ChannelCard'

function formatNumber(num: number): string {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
    return num.toString()
}

function ScoreBadge({ label, value, unit, color }: {
    label: string
    value: number | null | undefined
    unit?: string
    color: string
}) {
    if (value == null) return null
    return (
        <div className="flex flex-col items-center min-w-[56px]">
            <span className={`text-sm font-bold tabular-nums ${color}`}>
                {value}{unit ?? ''}
            </span>
            <span className="text-[9px] text-slate-400 uppercase tracking-wider leading-tight text-center">
                {label}
            </span>
        </div>
    )
}

export function ChannelListRow({
    channel,
    rank,
    activeSortKey,
}: {
    channel: ChannelStats
    rank: number
    activeSortKey: string
}) {
    const hasAnalysis = (channel.total_analyzed ?? 0) > 0
    const expTypes = channel.experience_types ?? {}
    const toneDistrib = channel.tone_distribution ?? {}

    // Derive the highlighted sort value shown prominently on the right
    const sortHighlight = (() => {
        switch (activeSortKey) {
            case 'avg_intensity':
                return channel.avg_intensity != null
                    ? { value: `${channel.avg_intensity}/10`, label: 'intensity' }
                    : null
            case 'avg_greyson_score':
                return channel.avg_greyson_score != null
                    ? { value: `${channel.avg_greyson_score}`, label: 'greyson' }
                    : null
            case 'avg_transformation_score':
                return channel.avg_transformation_score != null
                    ? { value: `${channel.avg_transformation_score}`, label: 'transform' }
                    : null
            case 'avg_veridical_score':
                return channel.avg_veridical_score != null
                    ? { value: `${channel.avg_veridical_score}`, label: 'veridical' }
                    : null
            case 'pct_positive_tone':
                return channel.pct_positive_tone != null
                    ? { value: `${channel.pct_positive_tone}%`, label: 'pos. tone' }
                    : null
            case 'pct_negative_tone':
                return channel.pct_negative_tone != null
                    ? { value: `${channel.pct_negative_tone}%`, label: 'distressing' }
                    : null
            case 'total_analyzed':
                return channel.total_analyzed != null
                    ? { value: `${channel.total_analyzed}`, label: 'analyzed' }
                    : null
            case 'video_count':
                return { value: `${channel.video_count}`, label: 'videos' }
            case 'total_views':
                return { value: formatNumber(channel.total_views), label: 'views' }
            case 'subscriber_count':
                return channel.subscriber_count > 0
                    ? { value: formatNumber(channel.subscriber_count), label: 'subs' }
                    : null
            default:
                return { value: `${channel.video_count}`, label: 'videos' }
        }
    })()

    return (
        <Link
            href={`/channel/${channel.channel_id}`}
            className="group flex items-center gap-4 sm:gap-5 bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4 hover:shadow-lg hover:border-blue-200/70 dark:hover:border-blue-700 transition-all duration-200"
        >
            {/* Rank number */}
            <span className="hidden sm:block text-sm font-bold text-slate-300 dark:text-slate-600 w-6 text-right shrink-0 tabular-nums">
                {rank}
            </span>

            {/* Avatar */}
            <div className="shrink-0">
                {channel.avatar_url ? (
                    <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden ring-2 ring-slate-100 dark:ring-slate-700 group-hover:ring-blue-100 dark:group-hover:ring-blue-800 transition-all duration-200 shadow-sm">
                        <Image
                            src={channel.avatar_url}
                            alt={channel.channel_name}
                            fill
                            className="object-cover"
                            sizes="48px"
                        />
                    </div>
                ) : (
                    <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-base font-bold shadow-sm ring-2 ring-slate-100">
                        {channel.channel_name.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            {/* Name + basic stats */}
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate leading-tight mb-0.5">
                    {channel.channel_name}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                    <span className="flex items-center gap-1">
                        <Film className="w-3 h-3" />
                        {channel.video_count}
                    </span>
                    <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {formatNumber(channel.total_views)}
                    </span>
                    {channel.total_analyzed != null && channel.total_analyzed > 0 && (
                        <span className="flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" />
                            {channel.total_analyzed}
                        </span>
                    )}
                </div>

                {/* Mobile-only: summary text stats */}
                {hasAnalysis && (
                    <div className="sm:hidden flex items-center gap-2 mt-1.5 flex-wrap">
                        {channel.avg_intensity != null && (
                            <span className="text-[10px] bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 font-medium px-1.5 py-0.5 rounded-md">
                                ⚡ {channel.avg_intensity}/10
                            </span>
                        )}
                        {channel.pct_positive_tone != null && (
                            <span className="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium px-1.5 py-0.5 rounded-md">
                                +{channel.pct_positive_tone}% pos
                            </span>
                        )}
                        {(() => {
                            const topType = Object.entries(expTypes).sort((a, b) => b[1] - a[1])[0]
                            if (!topType) return null
                            const total = Object.values(expTypes).reduce((s, v) => s + v, 0)
                            const pct = Math.round((topType[1] / total) * 100)
                            return (
                                <span className="text-[10px] bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 font-medium px-1.5 py-0.5 rounded-md">
                                    {topType[0].toUpperCase()} {pct}%
                                </span>
                            )
                        })()}
                    </div>
                )}
            </div>

            {/* Desktop: visual analysis bars */}
            {hasAnalysis && (
                <div className="hidden sm:flex flex-col gap-1.5 w-40 lg:w-48 xl:w-56 shrink-0">
                    {/* Intensity bar */}
                    {channel.avg_intensity != null && (
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider w-12 shrink-0">
                                Intensity
                            </span>
                            <div className="flex-1">
                                <MiniIntensityBar value={channel.avg_intensity} />
                            </div>
                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-6 text-right tabular-nums shrink-0">
                                {channel.avg_intensity}
                            </span>
                        </div>
                    )}

                    {/* Experience types bar */}
                    {Object.keys(expTypes).length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider w-12 shrink-0">
                                Types
                            </span>
                            <div className="flex-1">
                                <MiniStackedBar data={expTypes} label="Experience types" />
                            </div>
                        </div>
                    )}

                    {/* Tone bar */}
                    {Object.keys(toneDistrib).length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider w-12 shrink-0">
                                Tone
                            </span>
                            <div className="flex-1">
                                <MiniStackedBar data={toneDistrib} label="Tone distribution" />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Desktop: Score badges */}
            <div className="hidden lg:flex items-center gap-3 shrink-0 pl-2 border-l border-slate-100 dark:border-white/10">
                <ScoreBadge
                    label="Greyson"
                    value={channel.avg_greyson_score}
                    color="text-violet-600"
                />
                <ScoreBadge
                    label="Transform"
                    value={channel.avg_transformation_score}
                    color="text-blue-600"
                />
                <ScoreBadge
                    label="Veridical"
                    value={channel.avg_veridical_score}
                    color="text-emerald-600"
                />
            </div>

            {/* Active sort highlight + arrow */}
            <div className="flex items-center gap-2 shrink-0 ml-auto pl-2">
                {sortHighlight && (
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                            {sortHighlight.value}
                        </p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            {sortHighlight.label}
                        </p>
                    </div>
                )}
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
            </div>
        </Link>
    )
}
