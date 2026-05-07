import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { ChevronRight, Video, Search } from "lucide-react";
import Link from "next/link";
import { UapVideoCard } from "@/components/uap-explore/UapVideoCard";
import { UapGridControls } from "@/components/uap-explore/UapGridControls";
import type { UapExploreItem } from "@/components/uap-explore/types";

export const metadata = {
  title: "Explore UAP Videos | Project Profound",
  description:
    "Browse UAP encounter accounts and research videos. Filter by tier, sort by evidence strength, contact depth, and transformation impact.",
};

const PAGE_SIZE = 12;

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function UapVideoExplorePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sort = (params.sort as string) || "date";
  const direction = ((params.dir as string) || "desc") as "asc" | "desc";
  const page = Math.max(1, parseInt((params.page as string) || "1", 10));
  const query = (params.q as string) || "";
  const tier = parseInt((params.tier as string) || "0", 10);

  const supabase = await createClient();

  const { data: rpcData, error: rpcError } = await supabase.rpc("uap_video_explore_grid", {
    p_sort: sort,
    p_direction: direction,
    p_page: page,
    p_page_size: PAGE_SIZE,
    p_query: query.trim(),
    p_tier: tier,
    p_content_types: [],
    p_experience_types: [],
    p_tones: [],
    p_min_evidence: 0,
    p_min_contact_depth: 0,
    p_min_transformation: 0,
  });

  if (rpcError) {
    console.error("[uap-video-explore] RPC error:", rpcError);
  }

  const rawRows = (rpcData || []) as Record<string, any>[];
  const totalResults = rawRows.length > 0 ? Number(rawRows[0].total_count) : 0;
  const totalPages = Math.ceil(totalResults / PAGE_SIZE);

  const gridVideos: UapExploreItem[] = rawRows.map((row) => ({
    video_id: row.video_id,
    title: row.title,
    thumbnail_url: row.thumbnail_url,
    channel_name: row.channel_name,
    date: row.date,
    view_count: row.view_count,
    tier: row.tier,
    track: row.track,
    content_type: row.content_type,
    experiencer_name: row.experiencer_name,
    evidence_score: row.evidence_score ?? null,
    contact_depth_score: row.contact_depth_score ?? null,
    transformation_score: row.transformation_score ?? null,
    experience_type: row.experience_type ?? null,
    overall_tone: row.overall_tone ?? null,
    hynek_type: row.hynek_type ?? null,
  }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 hero-gradient">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 mb-6">
            <Link
              href="/uap"
              className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
            >
              UAP
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              Videos
            </span>
          </nav>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <Video className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-green-600 dark:text-green-400 mb-1">
                {totalResults.toLocaleString()} Videos
              </p>
              <h1
                className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2"
                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
              >
                Explore UAP Videos
              </h1>
              <p className="text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed mb-4">
                Browse first-person encounter accounts and investigative research.
                Filter by content type, sort by evidence strength, contact depth, and transformation impact.
              </p>
              <Link
                href="/uap/search"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:border-green-400 hover:text-green-600 dark:hover:border-green-500 dark:hover:text-green-400 transition-colors"
              >
                <Search className="w-4 h-4" />
                Search Inside Transcripts
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Controls */}
        <div className="bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-slate-200/60 dark:border-white/10 p-4 mb-6">
          <Suspense fallback={null}>
            <UapGridControls
              currentSort={sort}
              currentDirection={direction}
              currentQuery={query}
              currentTier={tier}
              currentPage={page}
              totalPages={totalPages}
              totalResults={totalResults}
            />
          </Suspense>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {gridVideos.map((video) => (
            <UapVideoCard key={video.video_id} video={video} />
          ))}
        </div>

        {/* Empty state */}
        {gridVideos.length === 0 && (
          <div className="text-center py-20">
            <p className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
              No videos match your filters
            </p>
            <p className="text-slate-400 dark:text-slate-500 max-w-md mx-auto">
              Try removing some filters or broadening your search.
            </p>
          </div>
        )}

        {/* Bottom pagination */}
        {totalPages > 1 && (
          <div className="mt-8 bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-slate-200/60 dark:border-white/10 p-4">
            <Suspense fallback={null}>
              <UapGridControls
                currentSort={sort}
                currentDirection={direction}
                currentQuery={query}
                currentTier={tier}
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
