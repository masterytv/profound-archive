'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Users, Eye, Film, Globe } from 'lucide-react'

export interface ChannelStats {
    channel_id: string
    channel_name: string
    channel_url: string | null
    channel_username: string | null
    video_count: number
    total_views: number
    total_likes: number
    subscriber_count: number
    latest_video_date: string | null
    sample_thumbnail: string | null
    avatar_url?: string | null
    description?: string | null
    banner_url?: string | null
    country?: string | null
}

function formatNumber(num: number): string {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
    return num.toString()
}

export function ChannelCard({ channel }: { channel: ChannelStats }) {
    return (
        <Link
            href={`/channel/${channel.channel_id}`}
            className="group relative flex flex-col items-center overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm hover:shadow-xl hover:border-blue-200/60 transition-all duration-300 p-6 text-center"
        >
            {/* Channel Logo */}
            <div className="relative mb-4">
                {channel.avatar_url ? (
                    <div className="relative w-20 h-20 rounded-full overflow-hidden ring-3 ring-slate-100 group-hover:ring-blue-100 transition-all duration-300 shadow-md group-hover:shadow-lg">
                        <Image
                            src={channel.avatar_url}
                            alt={channel.channel_name}
                            fill
                            className="object-cover"
                            sizes="80px"
                        />
                    </div>
                ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl font-bold shadow-md ring-3 ring-slate-100">
                        {channel.channel_name.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            {/* Channel Name */}
            <h3 className="text-base font-semibold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2 mb-1">
                {channel.channel_name}
            </h3>

            {/* Country badge */}
            {channel.country && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-400 mb-3">
                    <Globe className="w-3 h-3" />
                    {channel.country}
                </span>
            )}

            {!channel.country && <div className="mb-3" />}

            {/* Stats Grid */}
            <div className="w-full grid grid-cols-3 gap-1 rounded-xl bg-slate-50 p-3">
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 text-slate-400 mb-0.5">
                        <Film className="w-3 h-3" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">{channel.video_count}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Videos</span>
                </div>
                <div className="flex flex-col items-center border-x border-slate-200/60">
                    <div className="flex items-center gap-1 text-slate-400 mb-0.5">
                        <Eye className="w-3 h-3" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">{formatNumber(channel.total_views)}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Views</span>
                </div>
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 text-slate-400 mb-0.5">
                        <Users className="w-3 h-3" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">
                        {channel.subscriber_count > 0 ? formatNumber(channel.subscriber_count) : '—'}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Subs</span>
                </div>
            </div>
        </Link>
    )
}
