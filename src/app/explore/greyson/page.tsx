import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { Brain, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ExplorerControls, type SortOption, type FilterOption } from "@/components/explore/ExplorerControls";

export const metadata = {
    title: "Explore by Greyson Scale Score | Project Profound",
    description:
        "Browse NDE accounts ranked by the Greyson NDE Scale — sort by total score or category sub-totals (cognitive, affective, paranormal, transcendental).",
};

const PAGE_SIZE = 12;

const SORT_OPTIONS: SortOption[] = [
    { value: "score", label: "Total Score" },
    { value: "cognitive", label: "Cognitive Elements" },
    { value: "affective", label: "Affective Elements" },
    { value: "paranormal", label: "Paranormal Elements" },
    { value: "transcendental", label: "Transcendental Elements" },
];

const FILTER_OPTIONS: FilterOption[] = [
    { value: "Deep NDE", label: "Deep NDE" },
    { value: "Moderate NDE", label: "Moderate NDE" },
    { value: "Mild NDE", label: "Mild NDE" },
    { value: "Not NDE", label: "Not NDE" },
];

// Color map for classification badges
function getClassColor(classification: string | null | undefined): string {
    if (!classification) return "bg-slate-100 text-slate-600";
    if (classification.includes("Deep")) return "bg-blue-100 text-blue-800";
    if (classification.includes("Moderate")) return "bg-amber-100 text-amber-800";
    if (classification.includes("Mild")) return "bg-slate-100 text-slate-600";
    return "bg-red-100 text-red-700";
}

/** Sum all item scores within a Greyson category */
function sumCategory(breakdown: any, category: string): number {
    const cat = breakdown?.[category];
    if (!cat || typeof cat !== "object") return 0;
    return Object.values(cat).reduce((sum: number, item: any) => {
        return sum + (typeof item?.score === "number" ? item.score : 0);
    }, 0);
}

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function GreysonExplorerPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const sort = (params.sort as string) || "score";
    const direction = ((params.dir as string) || "desc") as "asc" | "desc";
    const filter = (params.filter as string) || "";
    const page = Math.max(1, parseInt((params.page as string) || "1", 10));

    const supabase = await createClient();

    // Build query — join nde_analysis with nde_vids to get thumbnails
    let query = supabase
        .from("nde_analysis")
        .select("video_id, total_greyson_score, scale_agreement, greyson_breakdown", { count: "exact" })
        .not("total_greyson_score", "is", null)
        .gt("total_greyson_score", 0);

    if (filter) {
        query = query.eq("scale_agreement", filter);
    }

    query = query.order("total_greyson_score", { ascending: direction === "asc" });

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    const { data: analysisData, count } = await query;
    const totalResults = count || 0;
    const totalPages = Math.ceil(totalResults / PAGE_SIZE);

    // Client-side re-sort for category sub-totals
    let sortedData = analysisData || [];
    if (sort !== "score" && sortedData.length > 0) {
        sortedData = [...sortedData].sort((a, b) => {
            const aVal = sumCategory(a.greyson_breakdown, sort);
            const bVal = sumCategory(b.greyson_breakdown, sort);
            return direction === "desc" ? bVal - aVal : aVal - bVal;
        });
    }

    // Fetch video metadata
    const videoIds = sortedData.map((v) => v.video_id);
    const { data: videoMeta } = videoIds.length
        ? await supabase
            .from("nde_vids")
            .select("videoId, title, thumbnailUrl, channelName")
            .in("videoId", videoIds)
        : { data: [] };

    const metaMap = new Map((videoMeta || []).map((v) => [v.videoId, v]));

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
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Greyson Scale</span>
                    </nav>

                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                            <Brain className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h1
                                className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                Greyson NDE Scale
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                                The gold standard for measuring NDE depth. Sort by total score or explore
                                individual categories: cognitive, affective, paranormal, and transcendental
                                elements.
                            </p>
                            <Link
                                href="/scale/greyson"
                                className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-3 font-medium"
                            >
                                Learn about the Greyson Scale
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
                            filterLabel="Classification"
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
                    {sortedData.map((item) => {
                        const meta = metaMap.get(item.video_id);
                        if (!meta) return null;

                        const breakdown = item.greyson_breakdown as any;
                        const sortLabel = sort !== "score" ? SORT_OPTIONS.find((o) => o.value === sort)?.label : null;
                        const subScore = sort !== "score" ? `${sumCategory(breakdown, sort)}/8` : null;

                        return (
                            <Link
                                key={item.video_id}
                                href={`/video/${item.video_id}`}
                                className="group block bg-white dark:bg-white/5 rounded-2xl overflow-hidden border border-slate-200/60 dark:border-white/10 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-700 transition-all duration-300 cursor-pointer"
                            >
                                {/* Thumbnail */}
                                <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    {meta.thumbnailUrl ? (
                                        <Image
                                            src={meta.thumbnailUrl.replace("maxresdefault", "hqdefault")}
                                            alt={meta.title || "Video thumbnail"}
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
                                    {item.total_greyson_score !== null && (
                                        <div className="absolute top-2.5 right-2.5">
                                            <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-slate-900 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                                                {item.total_greyson_score}
                                                <span className="text-slate-400 font-normal">/32</span>
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
                                        {meta.title || "Untitled"}
                                    </h3>

                                    <div className="flex items-center justify-between gap-2">
                                        {meta.channelName && (
                                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                                {meta.channelName}
                                            </p>
                                        )}
                                        {item.scale_agreement && (
                                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${getClassColor(item.scale_agreement)}`}>
                                                {item.scale_agreement}
                                            </span>
                                        )}
                                    </div>

                                    {/* Sub-score when sorting by category */}
                                    {sortLabel && subScore && (
                                        <div className="pt-1">
                                            <span className="text-[11px] bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-lg text-slate-500 dark:text-slate-400">
                                                {sortLabel}: <strong className="text-slate-700 dark:text-slate-300">{subScore}</strong>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {sortedData.length === 0 && (
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
                                filterLabel="Classification"
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
