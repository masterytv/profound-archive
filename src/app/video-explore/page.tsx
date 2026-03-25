import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { ChevronRight, Video, Search } from "lucide-react";
import Link from "next/link";
import { VideoCardExpandable } from "@/components/video-explore/VideoCardExpandable";
import { VideoGridControls } from "@/components/video-explore/VideoGridControls";
import { AdvancedFilters } from "@/components/video-explore/AdvancedFilters";
import { SMART_TAGS } from "@/components/video-explore/types";
import type { VideoExploreItem } from "@/components/video-explore/types";

export const metadata = {
  title: "Explore Videos | Project Profound",
  description:
    "Browse 5,000+ near-death experience videos. Sort by views, evidence strength, experience depth, and transformation impact. Filter by core elements, tone, and more.",
};

const PAGE_SIZE = 12;

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Build conditions from smart tag IDs.
 * Element tags produce element names for JSONB containment.
 * Score tags produce minimum thresholds.
 */
function getSmartTagConditions(tags: string[]): {
  elementNames: string[];
  minTransformation: number;
  minVeridical: number;
  minIntensity: number;
  toneFilter: string[];
} {
  const elementNames: string[] = [];
  let minTransformation = 0;
  let minVeridical = 0;
  let minIntensity = 0;
  const toneFilter: string[] = [];

  for (const tag of tags) {
    const def = SMART_TAGS.find((t) => t.id === tag);
    if (!def) continue;

    if (def.category === "element") {
      elementNames.push(tag);
    } else if (tag === "life_changing") {
      minTransformation = Math.max(minTransformation, 35);
    } else if (tag === "strong_evidence") {
      minVeridical = Math.max(minVeridical, 14);
    } else if (tag === "intense") {
      minIntensity = Math.max(minIntensity, 8);
    } else if (tag === "distressing") {
      toneFilter.push("very_negative", "negative");
    }
  }

  return { elementNames, minTransformation, minVeridical, minIntensity, toneFilter };
}

export default async function VideoExplorePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sort = (params.sort as string) || "date";
  const direction = ((params.dir as string) || "desc") as "asc" | "desc";
  const page = Math.max(1, parseInt((params.page as string) || "1", 10));
  const query = (params.q as string) || "";
  const activeTags = ((params.tags as string) || "").split(",").filter(Boolean);

  // Advanced filter params
  const filterTypes = ((params.type as string) || "").split(",").filter(Boolean);
  const filterTones = ((params.tone as string) || "").split(",").filter(Boolean);
  const filterElements = ((params.elements as string) || "").split(",").filter(Boolean);
  const minGreyson = parseInt((params.minGreyson as string) || "0", 10);
  const minTransformation = parseInt((params.minTransformation as string) || "0", 10);
  const minVeridical = parseInt((params.minVeridical as string) || "0", 10);
  const minIntensity = parseInt((params.minIntensity as string) || "0", 10);

  const supabase = await createClient();


  // --- Grid query via RPC (handles JSONB element containment server-side) ---
  const tagConditions = activeTags.length > 0
    ? getSmartTagConditions(activeTags)
    : { elementNames: [], minTransformation: 0, minVeridical: 0, minIntensity: 0, toneFilter: [] };

  // Merge smart tag tones with advanced filter tones (union)
  const mergedTones = [...new Set([...tagConditions.toneFilter, ...filterTones])];

  const { data: rpcData, error: rpcError } = await supabase.rpc("video_explore_grid", {
    p_sort: sort,
    p_direction: direction,
    p_page: page,
    p_page_size: PAGE_SIZE,
    p_query: query.trim(),
    p_element_names: tagConditions.elementNames,
    p_min_greyson: Math.max(minGreyson, 0),
    p_min_transformation: Math.max(minTransformation, tagConditions.minTransformation),
    p_min_veridical: Math.max(minVeridical, tagConditions.minVeridical),
    p_min_intensity: Math.max(minIntensity, tagConditions.minIntensity),
    p_experience_types: filterTypes,
    p_tones: mergedTones,
    p_advanced_elements: filterElements,
  });

  if (rpcError) {
    console.error("[video-explore] RPC error:", rpcError);
  }

  const rawRows = (rpcData || []) as Record<string, any>[];
  const totalResults = rawRows.length > 0 ? Number(rawRows[0].total_count) : 0;
  const totalPages = Math.ceil(totalResults / PAGE_SIZE);

  // RPC returns flat rows — map directly to VideoExploreItem
  const gridVideos: VideoExploreItem[] = rawRows.map((row) => ({
    videoId: row.videoId,
    title: row.title,
    thumbnailUrl: row.thumbnailUrl,
    channelName: row.channelName,
    date: row.date,
    viewCount: row.viewCount,
    experiencerFullName: row.experiencerFullName,
    rvnde_total_score: row.rvnde_total_score,
    rvnde_level: row.rvnde_level,
    total_greyson_score: row.total_greyson_score ?? null,
    transformation_score: row.transformation_score ?? null,
    intensity_rating: row.intensity_rating ?? null,
    experience_type: row.experience_type ?? null,
    trigger_category: row.trigger_category ?? null,
    overall_tone: row.overall_tone ?? null,
    transformation_classification: row.transformation_classification ?? null,
    core_elements: row.core_elements ?? null,
    journey_sequence: row.journey_sequence ?? null,
  }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 hero-gradient">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 mb-6">
            <Link
              href="/"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link
              href="/explore"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Explore
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              Videos
            </span>
          </nav>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <Video className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-1">
                {totalResults.toLocaleString()} Videos
              </p>
              <h1
                className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2"
                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
              >
                Explore NDE Videos
              </h1>
              <p className="text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed mb-4">
                Browse by research scores, filter by what happened during the
                experience, or search by name. Every video is analyzed for
                evidence strength, experience depth, and life impact.
              </p>
              <Link
                href="/search3"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
              >
                <Search className="w-4 h-4" />
                Search Inside Transcripts
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">


        {/* Browse All Grid */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar filters */}
          <div className="w-full lg:w-64 shrink-0">
            <Suspense fallback={null}>
              <AdvancedFilters />
            </Suspense>
          </div>

          {/* Main grid area */}
          <div className="w-full lg:flex-1 min-w-0">
            {/* Controls */}
            <div className="bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-slate-200/60 dark:border-white/10 p-4 mb-6">
              <Suspense fallback={null}>
                <VideoGridControls
                  currentSort={sort}
                  currentDirection={direction}
                  currentQuery={query}
                  currentPage={page}
                  totalPages={totalPages}
                  totalResults={totalResults}
                />
              </Suspense>
            </div>

            {/* Video Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {gridVideos.map((video) => (
                <VideoCardExpandable key={video.videoId} video={video} />
              ))}
            </div>

            {/* Empty state */}
            {gridVideos.length === 0 && (
              <div className="text-center py-20">
                <p className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  No videos match your filters
                </p>
                <p className="text-slate-400 dark:text-slate-500 max-w-md mx-auto">
                  Try removing some filters or smart tags to broaden your
                  results.
                </p>
              </div>
            )}

            {/* Bottom pagination */}
            {totalPages > 1 && (
              <div className="mt-8 bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-slate-200/60 dark:border-white/10 p-4">
                <Suspense fallback={null}>
                  <VideoGridControls
                    currentSort={sort}
                    currentDirection={direction}
                    currentQuery={query}
                    currentPage={page}
                    totalPages={totalPages}
                    totalResults={totalResults}
                  />
                </Suspense>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
