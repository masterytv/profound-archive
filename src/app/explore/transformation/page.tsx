import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ExplorerVideoCard } from "@/components/explore/ExplorerVideoCard";
import { ExplorerControls, type SortOption, type FilterOption } from "@/components/explore/ExplorerControls";

export const metadata = {
    title: "Explore by Transformation Score | Project Profound",
    description:
        "Browse NDE accounts ranked by the NDE Transformation Index — sort by overall score, breadth, depth, or filter by classification.",
};

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

    // Build query
    let query = supabase
        .from("nde_analysis")
        .select("video_id, transformation_score, transformation_classification, transformation_breakdown", { count: "exact" })
        .not("transformation_score", "is", null)
        .gt("transformation_score", 0);

    // Apply filter
    if (filter) {
        query = query.eq("transformation_classification", filter);
    }

    // Apply sort
    if (sort === "breadth") {
        // Sort by JSONB nested field — Supabase doesn't support this directly,
        // so we sort by score as proxy and re-sort client-side
        query = query.order("transformation_score", { ascending: direction === "asc" });
    } else if (sort === "depth") {
        query = query.order("transformation_score", { ascending: direction === "asc" });
    } else {
        query = query.order("transformation_score", { ascending: direction === "asc" });
    }

    // Paginate
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    const { data: analysisData, count } = await query;
    const totalResults = count || 0;
    const totalPages = Math.ceil(totalResults / PAGE_SIZE);

    // Client-side re-sort for breadth/depth if needed
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
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="container mx-auto px-4 py-6 max-w-7xl">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </Link>

                <div className="flex items-center gap-3 mb-2">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                        NDE Transformation Index
                    </h1>
                </div>
                <p className="text-muted-foreground max-w-2xl mb-1">
                    Browse experiences ranked by the depth and breadth of life transformation
                    they describe. Sort by overall score, number of domains affected, or
                    average depth of change.
                </p>
                <Link
                    href="/scale/transformation"
                    className="text-sm text-primary hover:underline"
                >
                    Learn about the Transformation Index →
                </Link>
            </div>

            {/* Controls + Grid */}
            <div className="container mx-auto px-4 pb-16 max-w-7xl">
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

                {/* Video Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
                    {sortedData.map((item) => {
                        const meta = metaMap.get(item.video_id);
                        if (!meta) return null;

                        const breakdown = item.transformation_breakdown as any;
                        const breadth = breakdown?.quantitative_metrics?.transformation_breadth;
                        const depth = breakdown?.quantitative_metrics?.transformation_depth;

                        return (
                            <ExplorerVideoCard
                                key={item.video_id}
                                videoId={item.video_id}
                                title={meta.title || "Untitled"}
                                thumbnailUrl={meta.thumbnailUrl}
                                channelName={meta.channelName}
                                score={item.transformation_score}
                                scoreMax={50}
                                scoreLabel={item.transformation_classification}
                                subScores={[
                                    ...(breadth != null ? [{ label: "Breadth", value: `${breadth}/10` }] : []),
                                    ...(depth != null ? [{ label: "Depth", value: `${Number(depth).toFixed(1)}/5` }] : []),
                                ]}
                            />
                        );
                    })}
                </div>

                {sortedData.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                        No results found. Try adjusting your filters.
                    </div>
                )}

                {/* Bottom pagination */}
                {totalPages > 1 && (
                    <div className="mt-8">
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
