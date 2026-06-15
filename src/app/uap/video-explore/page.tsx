import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { ChevronRight, Video, Search } from "lucide-react";
import Link from "next/link";
import { UapVideoCard } from "@/components/uap-explore/UapVideoCard";
import { UapGridControls } from "@/components/uap-explore/UapGridControls";
import { UapFilterSidebar } from "@/components/uap-explore/UapFilterSidebar";
import type { UapExploreItem, ExploreFacets } from "@/components/uap-explore/types";

export const metadata = {
  title: "Explore UFO/UAP Videos | Project Profound",
  description:
    "Browse UFO/UAP encounter accounts and research videos. Filter by entity type, evidence strength, contact depth, and more across 350+ analyzed videos.",
};

export const revalidate = 3600; // ISR: revalidate hourly so newly-added videos surface within ~1h (was 86400/daily)

const PAGE_SIZE = 12;

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Helper: parse a comma-separated param into string[]
function parseArrayParam(val: string | string[] | undefined): string[] {
  if (!val) return [];
  const str = Array.isArray(val) ? val[0] : val;
  return str ? str.split(",").filter(Boolean) : [];
}

// Helper: parse boolean param (true/false/null)
function parseBoolParam(val: string | string[] | undefined): boolean | null {
  const str = Array.isArray(val) ? val[0] : val;
  if (str === "true") return true;
  if (str === "false") return false;
  return null;
}

export default async function UapVideoExplorePage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Existing params
  const sort = (params.sort as string) || "date";
  const direction = ((params.dir as string) || "desc") as "asc" | "desc";
  const page = Math.max(1, parseInt((params.page as string) || "1", 10));
  const query = (params.q as string) || "";
  const tier = parseInt((params.tier as string) || "0", 10);

  // New deep filter params
  const videoTones = parseArrayParam(params.tones);
  const hynekTypes = parseArrayParam(params.hynek);
  const entityTypes = parseArrayParam(params.entities);
  const contentTypes = parseArrayParam(params.ctypes);
  const decade = (params.decade as string) || "";
  const channel = (params.channel as string) || "";
  const recurrence = (params.recurrence as string) || "";
  const minIntelligence = parseInt((params.minIntel as string) || "0", 10);
  const hasOath = parseBoolParam(params.oath);
  const hasPsi = parseBoolParam(params.psi);
  const hasCraft = parseBoolParam(params.craft);
  const hasBiologics = parseBoolParam(params.biologics);
  const hasCrash = parseBoolParam(params.crash);
  const minCredibility = parseInt((params.minCred as string) || "0", 10);

  const supabase = await createClient();

  // Fetch facets + grid data in parallel
  const [facetsResult, gridResult] = await Promise.all([
    supabase.rpc("uap_explore_facets"),
    supabase.rpc("uap_video_explore_grid", {
      p_sort: sort,
      p_direction: direction,
      p_page: page,
      p_page_size: PAGE_SIZE,
      p_query: query.trim(),
      p_tier: tier,
      p_content_types: contentTypes,
      p_experience_types: [],
      p_tones: [],
      // Existing score filters
      p_min_evidence: 0,
      p_min_contact_depth: 0,
      p_min_transformation: 0,
      // New deep filters
      p_entity_types: entityTypes,
      p_craft_shapes: [],
      p_hynek_types: hynekTypes,
      p_five_observables: [],
      p_video_tones: videoTones,
      p_primary_topics: [],
      p_recurrence: recurrence,
      p_min_intelligence: minIntelligence,
      p_has_oath: hasOath,
      p_has_psi: hasPsi,
      p_has_craft: hasCraft,
      p_has_biologics: hasBiologics,
      p_has_crash: hasCrash,
      p_min_credibility: minCredibility,
      p_decade: decade,
      p_channel: channel,
    }),
  ]);

  if (gridResult.error) {
    console.error("[uap-video-explore] RPC error:", gridResult.error);
  }
  if (facetsResult.error) {
    console.error("[uap-video-explore] Facets RPC error:", facetsResult.error);
  }

  const facets: ExploreFacets = facetsResult.data || {
    video_tones: [],
    hynek_types: [],
    experience_types: [],
    content_types: [],
    recurrence_patterns: [],
    channels: [],
    entity_types: [],
    decades: [],
    toggle_counts: { has_psi: 0, has_oath: 0, has_craft: 0, has_biologics: 0, has_crash: 0 },
    tier_counts: { all: 0, tier1: 0, tier2: 0 },
  };

  const rawRows = (gridResult.data || []) as Record<string, any>[];
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
    // New fields
    video_tone: row.video_tone ?? null,
    intelligence_value: row.intelligence_value ?? null,
    has_psi_content: row.has_psi_content ?? null,
    has_under_oath_claims: row.has_under_oath_claims ?? null,
    dominant_entity_type: row.dominant_entity_type ?? null,
    summary_snippet: row.summary_snippet ?? null,
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
                Explore UFO/UAP Videos
              </h1>
              <p className="text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed mb-4">
                Browse first-person encounter accounts and investigative research.
                Use the filters to narrow by entity type, evidence strength, video tone, and more.
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
        <div className="flex gap-6 items-start">
          {/* Desktop: sidebar column */}
          <div className="hidden lg:block">
            <Suspense fallback={null}>
              <UapFilterSidebar facets={facets} variant="sidebar" />
            </Suspense>
          </div>

          {/* Main content area */}
          <div className="flex-1 min-w-0">
            {/* Controls (sort, search, tier pills) */}
            <div className="bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-slate-200/60 dark:border-white/10 p-4 mb-4">
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

            {/* Mobile: inline collapsible filters — under controls, above grid */}
            <div className="lg:hidden mb-4">
              <Suspense fallback={null}>
                <UapFilterSidebar facets={facets} variant="inline" />
              </Suspense>
            </div>

            {/* Video Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
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
      </div>
    </div>
  );
}
