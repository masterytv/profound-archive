import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { TrendingUp, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ExplorerVideoCard } from "@/components/explore/ExplorerVideoCard";
import { ExplorerControls, type SortOption, type FilterOption } from "@/components/explore/ExplorerControls";

export const metadata = {
    title: "Explore by Veridical Perception Score | Project Profound",
    description:
        "Browse NDE accounts ranked by veridical (evidential) perception — sort by total score or individual criteria, filter by evidential strength level.",
};

const PAGE_SIZE = 24;

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

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function VeridicalExplorerPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const sort = (params.sort as string) || "score";
    const direction = ((params.dir as string) || "desc") as "asc" | "desc";
    const filter = (params.filter as string) || "";
    const page = Math.max(1, parseInt((params.page as string) || "1", 10));

    const supabase = await createClient();

    // Build query
    let query = supabase
        .from("nde_vids")
        .select("videoId, title, thumbnailUrl, channelName, rvnde_total_score, rvnde_level, rvnde_details", { count: "exact" })
        .eq("isNde", "clear_nde")
        .not("rvnde_total_score", "is", null);

    // Apply filter
    if (filter) {
        query = query.eq("rvnde_level", filter);
    }

    // Apply sort — for individual criteria, we sort by total score at DB level
    // and re-sort client-side using the JSONB detail scores
    query = query.order("rvnde_total_score", { ascending: direction === "asc" });

    // Paginate
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    const { data: videos, count } = await query;
    const totalResults = count || 0;
    const totalPages = Math.ceil(totalResults / PAGE_SIZE);

    // Client-side re-sort for individual criteria
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
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                        Veridical Perception (cvNDE)
                    </h1>
                </div>
                <p className="text-muted-foreground max-w-2xl mb-1">
                    Accounts with verified, evidential out-of-body perceptions. Sort by
                    total score or drill into individual criteria like medical severity,
                    verification strength, and specificity.
                </p>
                <Link
                    href="/scale/cvnde"
                    className="text-sm text-primary hover:underline"
                >
                    Learn about the cvNDE Scale →
                </Link>
            </div>

            {/* Controls + Grid */}
            <div className="container mx-auto px-4 pb-16 max-w-7xl">
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

                {/* Video Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
                    {sortedVideos.map((video) => {
                        const details = video.rvnde_details as Record<string, any> | null;

                        // Build sub-scores based on current sort
                        const subScores: { label: string; value: string | number }[] = [];
                        if (sort !== "score" && details?.[sort]) {
                            subScores.push({
                                label: SORT_OPTIONS.find((o) => o.value === sort)?.label || sort,
                                value: `${details[sort].score}/4`,
                            });
                        }

                        return (
                            <ExplorerVideoCard
                                key={video.videoId}
                                videoId={video.videoId}
                                title={video.title || "Untitled"}
                                thumbnailUrl={video.thumbnailUrl}
                                channelName={video.channelName}
                                score={video.rvnde_total_score}
                                scoreMax={28}
                                scoreLabel={video.rvnde_level}
                                subScores={subScores}
                            />
                        );
                    })}
                </div>

                {sortedVideos.length === 0 && (
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
