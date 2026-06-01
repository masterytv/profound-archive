import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { Heart, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ExplorerControls, type SortOption, type FilterOption } from "@/components/explore/ExplorerControls";

export const metadata = {
    title: "Explore by Transformation Score | Project Profound",
    description:
        "Browse NDE accounts ranked by the NDE Transformation Index — sort by overall score, breadth, depth, or filter by classification.",
};

export const revalidate = 86400; // ISR: revalidate once per day

const PAGE_SIZE = 12;

const SORT_OPTIONS: SortOption[] = [
    { value: "score", label: "Overall Score" },
    { value: "breadth", label: "Breadth (domains affected)" },
    { value: "depth", label: "Depth (average intensity)" },
];

const FILTER_OPTIONS: FilterOption[] = [
    { value: "Comprehensive Profound Transformation", label: "Comprehensive Profound" },
    { value: "Major Transformation", label: "Major" },
    { value: "Significant Transformation", label: "Significant" },
    { value: "Moderate Transformation", label: "Moderate" },
    { value: "Minimal Transformation", label: "Minimal" },
];

// Color map for classification badges
function getClassColor(classification: string | null | undefined): string {
    if (!classification) return "bg-slate-100 text-slate-600";
    if (classification.includes("Comprehensive") || classification.includes("Major")) return "bg-rose-100 text-rose-800";
    if (classification.includes("Significant")) return "bg-amber-100 text-amber-800";
    if (classification.includes("Moderate")) return "bg-blue-100 text-blue-800";
    return "bg-slate-100 text-slate-600";
}

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TransformationExplorerPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const sort = (params.sort as string) || "score";
    const direction = ((params.dir as string) || "desc") as "asc" | "desc";
    const filter = (params.filter as string) || "";
    const page = Math.max(1, parseInt((params.page as string) || "1", 10));

    const supabase = await createClient();

    let query = supabase
        .from("nde_analysis")
        .select("video_id, transformation_score, transformation_classification, transformation_breakdown", { count: "exact" })
        .not("transformation_score", "is", null)
        .gt("transformation_score", 0);

    if (filter) {
        query = query.eq("transformation_classification", filter);
    }

    query = query.order("transformation_score", { ascending: direction === "asc" });

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    const { data: analysisData, count } = await query;
    const totalResults = count || 0;
    const totalPages = Math.ceil(totalResults / PAGE_SIZE);

    // Client-side re-sort for breadth/depth
    let sortedData = analysisData || [];
    if (sort === "breadth" || sort === "depth") {
        sortedData = [...sortedData].sort((a, b) => {
            const aBreakdown = a.transformation_breakdown as any;
            const bBreakdown = b.transformation_breakdown as any;
            const aVal =
                sort === "breadth"
                    ? aBreakdown?.quantitative_metrics?.transformation_breadth ?? 0
                    : aBreakdown?.quantitative_metrics?.transformation_depth ?? 0;
            const bVal =
                sort === "breadth"
                    ? bBreakdown?.quantitative_metrics?.transformation_breadth ?? 0
                    : bBreakdown?.quantitative_metrics?.transformation_depth ?? 0;
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
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Transformation Index</span>
                    </nav>

                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                            <Heart className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-1">
                                Life Impact
                            </p>
                            <h1
                                className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                NDE Transformation Index
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                                Browse experiences ranked by the depth and breadth of life transformation
                                they describe. Sort by overall score, number of domains affected, or
                                average depth of change.
                            </p>
                            <Link
                                href="/scale/transformation"
                                className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-3 font-medium"
                            >
                                Learn about the Transformation Index
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

                        const breakdown = item.transformation_breakdown as any;
                        const breadth = breakdown?.quantitative_metrics?.transformation_breadth;
                        const depth = breakdown?.quantitative_metrics?.transformation_depth;

                        const sortLabel = sort !== "score" ? SORT_OPTIONS.find((o) => o.value === sort)?.label : null;
                        const subScore =
                            sort === "breadth" && breadth != null
                                ? `${breadth}/10`
                                : sort === "depth" && depth != null
                                    ? `${Number(depth).toFixed(1)}/5`
                                    : null;

                        return (
                            <Link
                                key={item.video_id}
                                href={`/video/${item.video_id}`}
                                className="group block bg-white dark:bg-white/5 rounded-2xl overflow-hidden border border-slate-200/60 dark:border-white/10 hover:shadow-xl hover:border-rose-200 dark:hover:border-rose-700 transition-all duration-300 cursor-pointer"
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
                                    {item.transformation_score !== null && (
                                        <div className="absolute top-2.5 right-2.5">
                                            <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-slate-900 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                                                {item.transformation_score}
                                                <span className="text-slate-400 font-normal">/50</span>
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-4 space-y-2.5">
                                    <h3
                                        className="text-sm font-semibold leading-snug line-clamp-2 text-slate-800 dark:text-slate-200 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors"
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
                                        {item.transformation_classification && (
                                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${getClassColor(item.transformation_classification)}`}>
                                                {item.transformation_classification.replace(" Transformation", "")}
                                            </span>
                                        )}
                                    </div>

                                    {/* Sub-score when sorting by breadth/depth */}
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
