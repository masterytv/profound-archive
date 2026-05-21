import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Brain, Heart, TrendingUp, Eye } from "lucide-react";

export type ExperiencerProfile = {
    id: number;
    slug: string;
    full_name: string;
    summary: string | null;
    photo_url: string | null;
    avg_greyson_score: number | null;
    avg_transformation_score: number | null;
    avg_veridical_score: number | null;
    video_ids: string[] | null;
    total_views: number | null;
};

export function formatViews(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K views`;
    return `${n} views`;
}

export function ExperiencerCard({ profile }: { profile: ExperiencerProfile }) {
    const videoCount = profile.video_ids?.length ?? 0;
    return (
        <Link
            href={`/experiencer/${profile.slug}`}
            className="group flex bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-slate-200/60 dark:border-white/10 overflow-hidden hover:shadow-lg hover:border-blue-300/60 dark:hover:border-blue-500/30 transition-all duration-300"
        >
            {/* Photo — 1/3 width */}
            <div className="relative w-1/3 min-h-[140px] bg-gradient-to-br from-blue-100 to-violet-100 dark:from-blue-500/20 dark:to-violet-500/20 flex-shrink-0">
                {profile.photo_url ? (
                    <Image
                        src={profile.photo_url}
                        alt={profile.full_name}
                        fill
                        sizes="(max-width: 640px) 33vw, 150px"
                        className="object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-3xl font-bold text-blue-400/60 dark:text-blue-300/40">
                            {profile.full_name.charAt(0)}
                        </span>
                    </div>
                )}
            </div>

            {/* Content — 2/3 width */}
            <div className="flex flex-col flex-1 p-4 min-w-0">
                <h2
                    className="text-base font-bold text-slate-900 dark:text-slate-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate mb-0.5"
                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                >
                    {profile.full_name}
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
                    {videoCount > 0 && <>{videoCount} {videoCount === 1 ? "account" : "accounts"}</>}
                    {videoCount > 0 && profile.total_views ? " · " : ""}
                    {profile.total_views ? <><Eye className="w-3 h-3 inline mb-0.5" /> {formatViews(profile.total_views)}</> : null}
                </p>

                {/* Score percentages with icons */}
                <div className="flex items-center gap-3 mt-auto">
                    {profile.avg_greyson_score !== null && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                            <Brain className="w-3.5 h-3.5" />
                            {Math.round((profile.avg_greyson_score / 32) * 100)}%
                        </span>
                    )}
                    {profile.avg_transformation_score !== null && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                            <Heart className="w-3.5 h-3.5" />
                            {Math.round((profile.avg_transformation_score / 50) * 100)}%
                        </span>
                    )}
                    {profile.avg_veridical_score !== null && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {Math.round((profile.avg_veridical_score / 28) * 100)}%
                        </span>
                    )}
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all ml-auto self-center" />
                </div>
            </div>
        </Link>
    );
}
