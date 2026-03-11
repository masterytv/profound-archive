import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { TrendingUp, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ExplorerControls, type SortOption, type FilterOption } from "@/components/explore/ExplorerControls";
import { Badge } from "@/components/ui/badge";

export const metadata = {
    title: "Explore by Veridical Perception Score | Project Profound",
    description:
        "Browse NDE accounts ranked by veridical (evidential) perception — sort by total score or individual criteria, filter by evidential strength level.",
};

const PAGE_SIZE = 12;

const SORT_OPTIONS: SortOption[] = [
    { value: "score", label: "Total Score" },
    { value: "c1_medical_severity", label: "Medical Severity" },
    { value: "c2_access_impossibility", label: "Access Impossibility" },
    { value: "c3_specificity", label: "Specificity" },
    { value: "c4_unpredictability", label: "Unpredictability" },
    { value: "c5_verification", label: "Verification" },
    { value: "c6_weight", label: "Weight of Evidence" },
    { value: "c7_precedence", label: "Precedence" },
];

const FILTER_OPTIONS: FilterOption[] = [
    { value: "Exceptional Evidential Strength", label: "Exceptional" },
    { value: "High Evidential Strength", label: "High" },
    { value: "Moderate Evidential Strength", label: "Moderate" },
    { value: "Low Evidential Strength", label: "Low" },
];

// Color map for evidential level badges
function getLevelColor(level: string | null | undefined): string {
    if (!level) return "bg-slate-100 text-slate-600";
    if (level.includes("Exceptional")) return "bg-emerald-100 text-emerald-800";
    if (level.includes("High")) return "bg-blue-100 text-blue-800";
    if (level.includes("Moderate")) return "bg-amber-100 text-amber-800";
    return "bg-slate-100 text-slate-600";
}

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function VeridicalExplorerAlt1Page({ searchParams }: PageProps) {
    const params = await searchParams;
    const sort = (params.sort as string) || "score";
    const direction = ((params.dir as string) || "desc") as "asc" | "desc";
    const filter = (params.filter as string) || "";
    const page = Math.max(1, parseInt((params.page as string) || "1", 10));

    const supabase = await createClient();

    let query = supabase
        .from("nde_vids")
        .select("videoId, title, thumbnailUrl, channelName, rvnde_total_score, rvnde_level, rvnde_details", { count: "exact" })
        .eq("isNde", "clear_nde")
        .not("rvnde_total_score", "is", null);

    if (filter) {
        query = query.eq("rvnde_level", filter);
    }

    query = query.order("rvnde_total_score", { ascending: direction === "asc" });

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    const { data: videos, count } = await query;
    const totalResults = count || 0;
    const totalPages = Math.ceil(totalResults / PAGE_SIZE);

    let sortedVideos = videos || [];
    if (sort !== "score" && sortedVideos.length > 0) {
        sortedVideos = [...sortedVideos].sort((a, b) => {
            const aDetails = a.rvnde_details as Record<string, any> | null;
            const bDetails = b.rvnde_details as Record<string, any> | null;
            const aVal = aDetails?.[sort]?.score ?? 0;
            const bVal = bDetails?.[sort]?.score ?? 0;
            return direction === "desc" ? bVal - aVal : aVal - bVal;
        });
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* ─── Header ─── */}
            <div className="border-b border-slate-200 dark:border-slate-800 hero-gradient">
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 mb-6">
                        <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            Home
                        </Link>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            Explore
                        </Link>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Veridical Perception</span>
                    </nav>

                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                            <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">
                                Evidence Strength
                            </p>
                            <h1
                                className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                Veridical Perception{" "}
                                <span className="text-slate-400 dark:text-slate-500 text-2xl md:text-3xl font-normal">(cvNDE)</span>
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                                Accounts with verified, evidential out-of-body perceptions. Sort by
                                total score or drill into individual criteria like medical severity,
                                verification strength, and specificity.
                            </p>
                            <Link
                                href="/scale/cvnde"
                                className="inline-flex items-center gap-1. text-sm text-blue-600 hover:text-blue-700 mt-3 font-medium"
                            >
                                Learn about the cvNDE Scale
                                <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Controls + Grid ─── */}
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                {/* Controls */}
                <div className="bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-slate-200/60 dark:border-white/10 p-4 mb-8">
                    <Suspense fallback={null}>
                        <ExplorerControls
                            sortOptions={SORT_OPTIONS}
                            filterOptions={FILTER_OPTIONS}
                            filterLabel="Evidential Level"
                            currentSort={sort}
                            currentDirection={direction}
                            currentFilter={filter}
                            currentPage={page}
                            totalPages={totalPages}
                            totalResults={totalResults}
                        />
                    </Suspense>
                </div>

                {/* Video Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {sortedVideos.map((video) => {
                        const details = video.rvnde_details as Record<string, any> | null;
                        const sortLabel = sort !== "score" ? SORT_OPTIONS.find((o) => o.value === sort)?.label : null;
                        const subScore = sort !== "score" && details?.[sort]?.score != null
                            ? `${details[sort].score}/4`
                            : null;

                        return (
                            <Link
                                key={video.videoId}
                                href={`/video/${video.videoId}`}
                                className="group block bg-white dark:bg-white/5 rounded-2xl overflow-hidden border border-slate-200/60 dark:border-white/10 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-700 transition-all duration-300 cursor-pointer"
                            >
                                {/* Thumbnail */}
                                <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    {video.thumbnailUrl ? (
                                        <Image
                                            src={video.thumbnailUrl.replace("maxresdefault", "hqdefault")}
                                            alt={video.title || "Video thumbnail"}
                                            fill
                                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                            No Thumbnail
                                        </div>
                                    )}

                                    {/* Score badge */}
                                    {video.rvnde_total_score !== null && (
                                        <div className="absolute top-2.5 right-2.5">
                                            <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-slate-900 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                                                {video.rvnde_total_score}
                                                <span className="text-slate-400 font-normal">/28</span>
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-4 space-y-2.5">
                                    <h3
                                        className="text-sm font-semibold leading-snug line-clamp-2 text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                                        style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "15px" }}
                                    >
                                        {video.title || "Untitled"}
                                    </h3>

                                    <div className="flex items-center justify-between gap-2">
                                        {video.channelName && (
                                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                                {video.channelName}
                                            </p>
                                        )}
                                        {video.rvnde_level && (
                                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${getLevelColor(video.rvnde_level)}`}>
                                                {video.rvnde_level.replace(" Evidential Strength", "")}
                                            </span>
                                        )}
                                    </div>

                                    {/* Sub-score if sorting by criteria */}
                                    {sortLabel && subScore && (
                                        <div className="pt-1">
                                            <span className="text-[11px] bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-lg text-slate-500 dark:text-slate-400">
                                                {sortLabel}: <strong className="text-slate-700">{subScore}</strong>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {sortedVideos.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-slate-400 text-lg">No results found. Try adjusting your filters.</p>
                    </div>
                )}

                {/* Bottom pagination */}
                {totalPages > 1 && (
                    <div className="mt-10 bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-slate-200/60 dark:border-white/10 p-4">
                        <Suspense fallback={null}>
                            <ExplorerControls
                                sortOptions={SORT_OPTIONS}
                                filterOptions={FILTER_OPTIONS}
                                filterLabel="Evidential Level"
                                currentSort={sort}
                                currentDirection={direction}
                                currentFilter={filter}
                                currentPage={page}
                                totalPages={totalPages}
                                totalResults={totalResults}
                            />
                        </Suspense>
                    </div>
                )}
            </div>
        </div>
    );
}
