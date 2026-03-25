import Link from "next/link";
import Image from "next/image";
import { Star, ArrowRight } from "lucide-react";
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

type StoryVideo = {
    videoId: string;
    title: string;
    thumbnailUrl: string | null;
    channelName: string | null;
    viewCount: number | null;
    analysis_nde_summary: string | null;
};

/**
 * StoryOfTheDay — magazine-style featured video section.
 * Rotates daily from the top 100 most viewed NDE videos that have an AI summary.
 */
export async function StoryOfTheDay() {
    const supabase = await createClient();
    const ONE_DAY_MS = 86_400_000;
    const dailySeed = Math.floor(Date.now() / ONE_DAY_MS);

    const { data: pool } = await supabase
        .from("nde_vids")
        .select("videoId, title, thumbnailUrl, channelName, viewCount, analysis_nde_summary")
        .eq("isNde", "clear_nde")
        .not("analysis_nde_summary", "is", null)
        .not("viewCount", "is", null)
        .order("viewCount", { ascending: false })
        .limit(100);

    if (!pool || pool.length === 0) return null;

    const featured = seededShuffle(pool as StoryVideo[], dailySeed)[0];
    if (!featured) return null;

    // Take first two sentences of the AI summary for a teaser
    const summaryTeaser = featured.analysis_nde_summary
        ? featured.analysis_nde_summary
            .split(/(?<=[.!?])\s+/)
            .slice(0, 3)
            .join(" ")
        : null;

    const viewLabel = featured.viewCount
        ? featured.viewCount >= 1_000_000
            ? `${(featured.viewCount / 1_000_000).toFixed(1)}M views`
            : featured.viewCount >= 1_000
                ? `${(featured.viewCount / 1_000).toFixed(0)}K views`
                : `${featured.viewCount} views`
        : null;

    return (
        <section className="container mx-auto px-4 py-10 max-w-5xl">
            <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2.5 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                        <Star className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h2
                        className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                        Story of the Day
                    </h2>
                </div>
            </div>

            <Link
                href={`/video/${featured.videoId}`}
                className="group block rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-white/5 overflow-hidden hover:shadow-xl hover:border-amber-200 dark:hover:border-amber-500/30 transition-all duration-300"
            >
                <div className="flex flex-col md:flex-row">
                    {/* Thumbnail */}
                    <div className="relative w-full md:w-[420px] shrink-0 aspect-video md:aspect-auto bg-slate-100 dark:bg-slate-700">
                        {featured.thumbnailUrl && (
                            <Image
                                src={featured.thumbnailUrl.replace("maxresdefault", "hqdefault")}
                                alt={featured.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                sizes="(max-width: 768px) 100vw, 420px"
                            />
                        )}
                    </div>

                    {/* Content */}
                    <div className="p-6 md:p-8 flex flex-col justify-center flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3">
                            {viewLabel && (
                                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/20 px-2.5 py-1 rounded-full">
                                    {viewLabel}
                                </span>
                            )}
                            {featured.channelName && (
                                <span className="text-xs text-slate-400 dark:text-slate-500">
                                    {featured.channelName}
                                </span>
                            )}
                        </div>

                        <h3
                            className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 leading-snug group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors"
                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                        >
                            {featured.title}
                        </h3>

                        {summaryTeaser && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4 line-clamp-4">
                                {summaryTeaser}
                            </p>
                        )}

                        <span className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400 group-hover:gap-3 transition-all">
                            Watch the full story
                            <ArrowRight className="w-4 h-4" />
                        </span>
                    </div>
                </div>
            </Link>
        </section>
    );
}
