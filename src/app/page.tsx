import { createClient } from "@/lib/supabase/server";
import { TrendingUp, Sparkles, Brain } from "lucide-react";
import {
  CuratedVideoColumn,
  type CuratedVideo,
} from "@/components/home/CuratedVideoColumn";
import { HeroSearchBar } from "@/components/home/HeroSearchBar";

// --- ISR: revalidate every 6 hours (21600 seconds) ---
export const revalidate = 21600;

// --- Seeded shuffle: deterministic within each 6-hour window ---
function seededShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Simple LCG PRNG seeded by the 6-hour window
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Fetch top-N videos for a given score type from the pool,
 * then seeded-shuffle and return `displayCount` of them.
 */
async function fetchCuratedVideos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  seed: number,
  poolSize: number = 50,
  displayCount: number = 6
) {
  // --- 1. Veridical Perception (from nde_vids, sorted by rvnde_total_score) ---
  const { data: veridicalPool } = await supabase
    .from("nde_vids")
    .select("videoId, title, thumbnailUrl, channelName, rvnde_total_score, rvnde_level")
    .eq("isNde", "clear_nde")
    .not("rvnde_total_score", "is", null)
    .order("rvnde_total_score", { ascending: false })
    .limit(poolSize);

  // --- 2. Transformation (from nde_analysis joined with nde_vids) ---
  const { data: transformationPool } = await supabase
    .from("nde_analysis")
    .select("video_id, transformation_score, transformation_classification")
    .not("transformation_score", "is", null)
    .gt("transformation_score", 0)
    .order("transformation_score", { ascending: false })
    .limit(poolSize);

  // --- 3. Greyson Scale (from nde_analysis joined with nde_vids) ---
  const { data: greysonPool } = await supabase
    .from("nde_analysis")
    .select("video_id, total_greyson_score, scale_agreement")
    .not("total_greyson_score", "is", null)
    .gt("total_greyson_score", 0)
    .order("total_greyson_score", { ascending: false })
    .limit(poolSize);

  // Fetch video metadata for transformation & greyson (they live in nde_analysis, need title/thumbnail from nde_vids)
  const analysisVideoIds = [
    ...(transformationPool || []).map((v) => v.video_id),
    ...(greysonPool || []).map((v) => v.video_id),
  ];

  const uniqueIds = [...new Set(analysisVideoIds)];
  const { data: videoMeta } = uniqueIds.length
    ? await supabase
      .from("nde_vids")
      .select("videoId, title, thumbnailUrl, channelName")
      .in("videoId", uniqueIds)
    : { data: [] };

  const metaMap = new Map(
    (videoMeta || []).map((v) => [v.videoId, v])
  );

  // --- Map to CuratedVideo arrays ---
  const veridicalVideos: CuratedVideo[] = (veridicalPool || []).map((v) => ({
    videoId: v.videoId,
    title: v.title || "Untitled",
    thumbnailUrl: v.thumbnailUrl,
    channelName: v.channelName,
    score: v.rvnde_total_score,
    scoreLabel: v.rvnde_level,
  }));

  const transformationVideos: CuratedVideo[] = (transformationPool || [])
    .map((v) => {
      const meta = metaMap.get(v.video_id);
      if (!meta) return null;
      return {
        videoId: v.video_id,
        title: meta.title || "Untitled",
        thumbnailUrl: meta.thumbnailUrl,
        channelName: meta.channelName,
        score: v.transformation_score,
        scoreLabel: v.transformation_classification,
      };
    })
    .filter(Boolean) as CuratedVideo[];

  const greysonVideos: CuratedVideo[] = (greysonPool || [])
    .map((v) => {
      const meta = metaMap.get(v.video_id);
      if (!meta) return null;
      return {
        videoId: v.video_id,
        title: meta.title || "Untitled",
        thumbnailUrl: meta.thumbnailUrl,
        channelName: meta.channelName,
        score: v.total_greyson_score,
        scoreLabel: v.scale_agreement,
      };
    })
    .filter(Boolean) as CuratedVideo[];

  // --- Seeded shuffle & slice ---
  return {
    veridical: seededShuffle(veridicalVideos, seed).slice(0, displayCount),
    transformation: seededShuffle(transformationVideos, seed + 1).slice(0, displayCount),
    greyson: seededShuffle(greysonVideos, seed + 2).slice(0, displayCount),
  };
}

export default async function Home() {
  const supabase = await createClient();

  // Time-based seed: changes every 6 hours
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
  const seed = Math.floor(Date.now() / SIX_HOURS_MS);

  const { veridical, transformation, greyson } = await fetchCuratedVideos(
    supabase,
    seed
  );

  return (
    <div className="min-h-screen">
      {/* ─── Hero with Search Bar ─── */}
      <section className="pt-10 pb-8 px-4 text-center">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tighter text-foreground mb-3">
          Archive of the Extraordinary
        </h1>
        <p className="max-w-2xl mx-auto text-muted-foreground md:text-lg mb-8">
          Search 5,000+ First-Person Accounts of Near Death Experiences.
        </p>
        <HeroSearchBar />
      </section>

      {/* ─── Curated Video Columns ─── */}
      <section className="container mx-auto px-4 pb-16 max-w-7xl">
        <div className="text-center mb-8">
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">
            Explore by Score
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Curated selections from our highest-scoring accounts, refreshed every
            6 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Column 1: Veridical Perception */}
          <CuratedVideoColumn
            title="Veridical Perception"
            description="Accounts with verified, evidential out-of-body perceptions — details the experiencer could not have known."
            icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
            accentColor="border-t-emerald-500"
            videos={veridical}
            scoreMax={28}
            exploreHref="/explore/veridical"
          />

          {/* Column 2: Transformation */}
          <CuratedVideoColumn
            title="Transformation"
            description="Experiences that led to profound life changes — shifts in values, relationships, and worldview."
            icon={<Sparkles className="w-5 h-5 text-red-600" />}
            accentColor="border-t-red-500"
            videos={transformation}
            scoreMax={50}
            exploreHref="/explore/transformation"
          />

          {/* Column 3: Greyson Scale */}
          <CuratedVideoColumn
            title="Greyson Scale"
            description="Classic NDE depth measured by the Greyson Scale — cognitive, affective, paranormal, and transcendental elements."
            icon={<Brain className="w-5 h-5 text-blue-600" />}
            accentColor="border-t-blue-500"
            videos={greyson}
            scoreMax={32}
            exploreHref="/explore/greyson"
          />
        </div>
      </section>
    </div>
  );
}
