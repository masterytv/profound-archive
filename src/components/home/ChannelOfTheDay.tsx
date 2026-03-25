import Link from "next/link";
import Image from "next/image";
import { Tv, ArrowRight, Video, Eye, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

// Seeded shuffle — deterministic within each 24-hour window
function seededShuffle<T>(array: T[], seed: number): T[] {
    const shuffled = [...array];
    let s = seed;
    for (let i = shuffled.length - 1; i > 0; i--) {
        s = (s * 1664525 + 1013904223) & 0x7fffffff;
        const j = s % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

type ChannelStats = {
    channel_id: string;
    channel_name: string;
    channel_url: string | null;
    video_count: number;
    total_views: number;
    subscriber_count: number;
    sample_thumbnail: string | null;
    avatar_url: string | null;
    banner_url: string | null;
    description: string | null;
    total_analyzed: number | null;
    avg_intensity: string | null;
    avg_greyson_score: string | null;
    avg_transformation_score: string | null;
    avg_veridical_score: string | null;
    pct_positive_tone: string | null;
};

function formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n.toString();
}

// Map raw Greyson average (0-32) to a "Depth" percentage
function greysonToDepthPct(raw: number): number {
    return Math.round((raw / 32) * 100);
}

// Map raw Transformation average (0-50) to a "Life Impact" percentage
function transformToImpactPct(raw: number): number {
    return Math.round((raw / 50) * 100);
}

// Map raw Veridical average (0-28) to an "Evidence" percentage
function veridicalToEvidencePct(raw: number): number {
    return Math.round((raw / 28) * 100);
}

/**
 * ChannelOfTheDay — magazine-style featured NDE channel.
 * Matches the visual weight of StoryOfTheDay.
 * Rotates daily from the top 40 channels by video count.
 */
export async function ChannelOfTheDay() {
    const supabase = await createClient();
    const ONE_DAY_MS = 86_400_000;
    const dailySeed = Math.floor(Date.now() / ONE_DAY_MS) + 100;

    const { data: allChannels } = await supabase.rpc("get_channel_stats");
    const pool = (allChannels || []) as ChannelStats[];

    if (pool.length === 0) return null;

    const top40 = pool
        .sort((a, b) => b.video_count - a.video_count)
        .slice(0, 40);

    const featured = seededShuffle(top40, dailySeed)[0];
    if (!featured) return null;

    const depthPct = featured.avg_greyson_score ? greysonToDepthPct(parseFloat(featured.avg_greyson_score)) : null;
    const impactPct = featured.avg_transformation_score ? transformToImpactPct(parseFloat(featured.avg_transformation_score)) : null;
    const evidencePct = featured.avg_veridical_score ? veridicalToEvidencePct(parseFloat(featured.avg_veridical_score)) : null;

    // Use banner if available, otherwise sample_thumbnail
    const heroImage = featured.banner_url || featured.sample_thumbnail;

    // First sentence of description as a teaser
    const descTeaser = featured.description
        ? featured.description.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ")
        : null;

    return (
        <section className="container mx-auto px-4 py-10 max-w-5xl">
            <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2.5 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                        <Tv className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h2
                        className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                        Channel of the Day
                    </h2>
                </div>
            </div>

            <Link
                href={`/channel/${featured.channel_id}`}
                className="group block rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-white/5 overflow-hidden hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all duration-300"
            >
                <div className="flex flex-col md:flex-row">
                    {/* Big Thumbnail / Banner */}
                    <div className="relative w-full md:w-[420px] shrink-0 aspect-video md:aspect-auto bg-slate-100 dark:bg-slate-700">
                        {heroImage && (
                            <Image
                                src={heroImage.replace("maxresdefault", "hqdefault")}
                                alt={featured.channel_name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                sizes="(max-width: 768px) 100vw, 420px"
                            />
                        )}
                        {/* Avatar overlay */}
                        {featured.avatar_url && (
                            <div className="absolute bottom-3 left-3 w-14 h-14 rounded-xl overflow-hidden border-2 border-white dark:border-slate-800 shadow-lg">
                                <Image
                                    src={featured.avatar_url}
                                    alt={`${featured.channel_name} avatar`}
                                    fill
                                    className="object-cover"
                                    sizes="56px"
                                />
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="p-6 md:p-8 flex flex-col justify-center flex-1 min-w-0">
                        {/* Quick stats row */}
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/20 px-2.5 py-1 rounded-full">
                                <Video className="w-3 h-3" />
                                {featured.video_count} videos
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-full">
                                <Eye className="w-3 h-3" />
                                {formatNumber(featured.total_views)} views
                            </span>
                            {featured.subscriber_count > 0 && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-full">
                                    <UsersRound className="w-3 h-3" />
                                    {formatNumber(featured.subscriber_count)} subscribers
                                </span>
                            )}
                        </div>

                        <h3
                            className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2 leading-snug group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors"
                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                        >
                            {featured.channel_name}
                        </h3>

                        {descTeaser && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4 line-clamp-2">
                                {descTeaser}
                            </p>
                        )}

                        {/* Research Score Badges */}
                        <div className="flex flex-wrap gap-3 mb-4">
                            {depthPct !== null && (
                                <div className="text-center">
                                    <span className="block text-lg font-bold text-blue-600 dark:text-blue-400">{depthPct}%</span>
                                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Depth</span>
                                </div>
                            )}
                            {impactPct !== null && (
                                <div className="text-center">
                                    <span className="block text-lg font-bold text-emerald-600 dark:text-emerald-400">{impactPct}%</span>
                                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Life Impact</span>
                                </div>
                            )}
                            {evidencePct !== null && (
                                <div className="text-center">
                                    <span className="block text-lg font-bold text-violet-600 dark:text-violet-400">{evidencePct}%</span>
                                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Evidence</span>
                                </div>
                            )}
                            {featured.pct_positive_tone && (
                                <div className="text-center">
                                    <span className="block text-lg font-bold text-amber-600 dark:text-amber-400">{Math.round(parseFloat(featured.pct_positive_tone))}%</span>
                                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Positive</span>
                                </div>
                            )}
                        </div>

                        <span className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 group-hover:gap-3 transition-all">
                            Explore this channel
                            <ArrowRight className="w-4 h-4" />
                        </span>
                    </div>
                </div>
            </Link>

            <div className="text-center mt-6">
                <Link
                    href="/channels"
                    className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                    Browse all channels
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>
        </section>
    );
}
