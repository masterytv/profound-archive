import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { Brain, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ExplorerVideoCard } from "@/components/explore/ExplorerVideoCard";
import { ExplorerControls, type SortOption, type FilterOption } from "@/components/explore/ExplorerControls";

export const metadata = {
    title: "Explore by Greyson Scale Score | Project Profound",
    description:
        "Browse NDE accounts ranked by the Greyson NDE Scale — sort by total score or category sub-totals (cognitive, affective, paranormal, transcendental).",
};

const PAGE_SIZE = 24;

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

    // Build query
    let query = supabase
        .from("nde_analysis")
        .select("video_id, total_greyson_score, scale_agreement, greyson_breakdown", { count: "exact" })
        .not("total_greyson_score", "is", null)
        .gt("total_greyson_score", 0);

    // Apply filter
    if (filter) {
        query = query.eq("scale_agreement", filter);
    }

    // Sort by total score at DB level
    query = query.order("total_greyson_score", { ascending: direction === "asc" });

    // Paginate
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
                    <Brain className="w-6 h-6 text-blue-600" />
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                        Greyson NDE Scale
                    </h1>
                </div>
                <p className="text-muted-foreground max-w-2xl mb-1">
                    The gold standard for measuring NDE depth. Sort by total score or explore
                    individual categories: cognitive, affective, paranormal, and transcendental
                    elements.
                </p>
                <Link
                    href="/scale/greyson"
                    className="text-sm text-primary hover:underline"
                >
                    Learn about the Greyson Scale →
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

                        const breakdown = item.greyson_breakdown as any;

                        // Build sub-scores — show all 4 category subtotals
                        const subScores = [
                            { label: "Cog", value: `${sumCategory(breakdown, "cognitive")}/8` },
                            { label: "Aff", value: `${sumCategory(breakdown, "affective")}/8` },
                            { label: "Par", value: `${sumCategory(breakdown, "paranormal")}/8` },
                            { label: "Tra", value: `${sumCategory(breakdown, "transcendental")}/8` },
                        ];

                        return (
                            <ExplorerVideoCard
                                key={item.video_id}
                                videoId={item.video_id}
                                title={meta.title || "Untitled"}
                                thumbnailUrl={meta.thumbnailUrl}
                                channelName={meta.channelName}
                                score={item.total_greyson_score}
                                scoreMax={32}
                                scoreLabel={item.scale_agreement}
                                subScores={subScores}
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
