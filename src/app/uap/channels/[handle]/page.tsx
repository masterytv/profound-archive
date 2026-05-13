import { createClient as createAnonClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Suspense } from "react";
import {
  ChevronRight,
  ExternalLink,
  Eye,
  Users,
  User,
  Calendar,
  Fingerprint,
  Building2,
} from "lucide-react";
import UapEntityLinkSection from "@/components/uap/UapEntityLinkSection";
import {
  findLinkedPersons,
  findLinkedPrograms,
  findLinkedExperiencers,
  findLinkedEvents,
  findLinkedOrgs,
} from "@/lib/data/uap-entity-links";
import { UapVideoCard } from "@/components/uap-explore/UapVideoCard";
import { UapGridControls } from "@/components/uap-explore/UapGridControls";
import type { UapExploreItem } from "@/components/uap-explore/types";

// ─── Build Client (SSG-safe) ────────────────────────────────────────────────

function buildClient() {
  return createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ handle: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface ChannelRow {
  channel_id: string;
  channel_name: string;
  description: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  custom_url: string | null;
  subscriber_count: number | null;
  total_view_count: number | null;
  video_count: number | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCount(n: number | null): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// Valid sort columns for this page (subset of the video explore sort fields)
const VALID_SORTS = [
  "date",
  "view_count",
  "evidence_score",
  "contact_depth_score",
  "transformation_score",
  "title",
] as const;
type ValidSort = (typeof VALID_SORTS)[number];

const PAGE_SIZE = 12;

// ─── Data Fetching ──────────────────────────────────────────────────────────

async function getChannel(channelId: string) {
  const supabase = buildClient();
  const { data: channel } = await supabase
    .from("uap_channels")
    .select(
      "channel_id, channel_name, description, avatar_url, banner_url, custom_url, subscriber_count, total_view_count, video_count",
    )
    .eq("channel_id", channelId)
    .eq("hidden", false)
    .single();

  return channel as ChannelRow | null;
}

async function getChannelVideos(
  channelId: string,
  sort: ValidSort,
  direction: "asc" | "desc",
  page: number,
  tier: number,
  query: string,
) {
  const supabase = buildClient();

  // Step 1: Fetch paginated videos from uap_vids (no join)
  let q = supabase
    .from("uap_vids")
    .select(
      "video_id, title, thumbnail_url, date, view_count, tier, track, content_type, channel_name",
      { count: "exact" },
    )
    .eq("channel_id", channelId)
    .in("tier", [1, 2]);

  // Tier filter
  if (tier === 1 || tier === 2) {
    q = q.eq("tier", tier);
  }

  // Text search — filter by title
  if (query) {
    q = q.ilike("title", `%${query}%`);
  }

  // Sort — for analysis columns we need a different approach,
  // but for basic columns we can sort directly
  const analysisColumns = [
    "evidence_score",
    "contact_depth_score",
    "transformation_score",
  ];
  if (!analysisColumns.includes(sort)) {
    q = q.order(sort, {
      ascending: direction === "asc",
      nullsFirst: false,
    });
  } else {
    // Default sort for analysis-based sorts (we'll re-sort client-side)
    q = q.order("date", { ascending: false });
  }

  // Pagination
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  q = q.range(from, to);

  const { data: videos, count, error } = await q;

  if (error) {
    console.error("[channel-videos] Query error:", error);
  }

  const videoRows = (videos ?? []) as Record<string, any>[];

  // Step 2: Batch-fetch analysis data for these video IDs
  const videoIds = videoRows.map((v) => v.video_id);
  let analysisMap: Record<string, Record<string, any>> = {};

  if (videoIds.length > 0) {
    const { data: analysisRows } = await supabase
      .from("uap_analysis")
      .select(
        "video_id, evidence_score, contact_depth_score, transformation_score, experience_type, overall_tone, hynek_type, experiencer_name",
      )
      .in("video_id", videoIds);

    for (const row of analysisRows ?? []) {
      analysisMap[row.video_id] = row;
    }
  }

  // Merge analysis into video rows
  const merged = videoRows.map((v) => ({
    ...v,
    analysis: analysisMap[v.video_id] ?? null,
  }));

  // If sorting by an analysis column, re-sort client-side
  if (analysisColumns.includes(sort)) {
    merged.sort((a, b) => {
      const aVal = a.analysis?.[sort] ?? -Infinity;
      const bVal = b.analysis?.[sort] ?? -Infinity;
      return direction === "asc" ? aVal - bVal : bVal - aVal;
    });
  }

  return {
    videos: merged,
    totalCount: count ?? 0,
  };
}

// ─── Metadata ───────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const channel = await getChannel(handle);
  if (!channel) return { title: "Channel Not Found | Project Profound" };

  const title = `${channel.channel_name} — UAP Channel | Project Profound`;
  const description =
    channel.description?.slice(0, 160) ??
    `Browse ${channel.channel_name}'s UAP content on Project Profound.`;

  return {
    title,
    description,
    openGraph: {
      title: channel.channel_name,
      description,
      images: channel.avatar_url ? [channel.avatar_url] : undefined,
    },
  };
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default async function UapChannelDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { handle } = await params;
  const sp = await searchParams;

  const channel = await getChannel(handle);
  if (!channel) notFound();

  // Parse search params for sort/page/tier/query
  const sort: ValidSort = VALID_SORTS.includes(
    (sp.sort as string) as ValidSort,
  )
    ? ((sp.sort as string) as ValidSort)
    : "date";
  const direction = ((sp.dir as string) || "desc") as "asc" | "desc";
  const page = Math.max(1, parseInt((sp.page as string) || "1", 10));
  const tier = parseInt((sp.tier as string) || "0", 10);
  const query = ((sp.q as string) || "").trim();

  // Fetch videos + cross-entity links in parallel
  const [{ videos: rawVideos, totalCount }, allVideosForLinks] =
    await Promise.all([
      getChannelVideos(handle, sort, direction, page, tier, query),
      // Get ALL video IDs for this channel (for cross-entity link discovery)
      (async () => {
        const supabase = buildClient();
        const { data } = await supabase
          .from("uap_vids")
          .select("video_id")
          .eq("channel_id", handle)
          .in("tier", [1, 2]);
        return (data ?? []).map((v: { video_id: string }) => v.video_id);
      })(),
    ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Map raw data to UapExploreItem for the card component
  const gridVideos: UapExploreItem[] = rawVideos.map((row) => {
    const analysis = row.analysis;
    return {
      video_id: row.video_id,
      title: row.title,
      thumbnail_url: row.thumbnail_url,
      channel_name: row.channel_name,
      date: row.date,
      view_count: row.view_count,
      tier: row.tier,
      track: row.track,
      content_type: row.content_type,
      experiencer_name: analysis?.experiencer_name ?? null,
      evidence_score: analysis?.evidence_score ?? null,
      contact_depth_score: analysis?.contact_depth_score ?? null,
      transformation_score: analysis?.transformation_score ?? null,
      experience_type: analysis?.experience_type ?? null,
      overall_tone: analysis?.overall_tone ?? null,
      hynek_type: analysis?.hynek_type ?? null,
      video_tone: null,
      intelligence_value: null,
      has_psi_content: null,
      has_under_oath_claims: null,
      dominant_entity_type: null,
    };
  });

  // Cross-entity link discovery
  const [
    linkedPersons,
    linkedPrograms,
    linkedExperiencers,
    linkedEvents,
    linkedOrgs,
  ] = await Promise.all([
    findLinkedPersons(allVideosForLinks),
    findLinkedPrograms(allVideosForLinks),
    findLinkedExperiencers(allVideosForLinks),
    findLinkedEvents(allVideosForLinks),
    findLinkedOrgs(allVideosForLinks),
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: channel.channel_name,
            description:
              channel.description?.slice(0, 300) ??
              `UAP research channel: ${channel.channel_name}`,
            ...(channel.avatar_url && { logo: channel.avatar_url }),
            ...(channel.custom_url && {
              url: `https://youtube.com/${channel.custom_url}`,
            }),
            isPartOf: {
              "@type": "WebSite",
              name: "Project Profound",
              url: "https://projectprofound.org",
            },
          }),
        }}
      />

      {/* Breadcrumb */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-6xl">
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 py-3">
            <Link
              href="/uap"
              className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
            >
              UAP
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link
              href="/uap/channels"
              className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
            >
              Channels
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-xs">
              {channel.channel_name}
            </span>
          </nav>
        </div>
      </div>

      {/* Channel Header */}
      <div className="container mx-auto px-4 max-w-6xl py-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
          {channel.avatar_url ? (
            <Image
              src={channel.avatar_url}
              alt={channel.channel_name}
              width={88}
              height={88}
              className="rounded-full flex-shrink-0 border-4 border-white dark:border-slate-800 shadow-md"
            />
          ) : (
            <div className="w-[88px] h-[88px] rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-3xl flex-shrink-0 shadow-md">
              {channel.channel_name?.charAt(0) || "?"}
            </div>
          )}
          <div className="text-center sm:text-left">
            <h1
              className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 leading-tight mb-2"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              {channel.channel_name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mb-3 justify-center sm:justify-start">
              {channel.subscriber_count && (
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />{" "}
                  {formatCount(channel.subscriber_count)} subscribers
                </span>
              )}
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />{" "}
                {formatCount(channel.total_view_count)} views
              </span>
              <span>{totalCount} videos in archive</span>
            </div>
            {channel.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl line-clamp-3">
                {channel.description}
              </p>
            )}
            {channel.custom_url && (
              <a
                href={`https://youtube.com/${channel.custom_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400 hover:underline font-medium mt-3"
              >
                <ExternalLink className="w-3.5 h-3.5" /> View on YouTube
              </a>
            )}
          </div>
        </div>

        {/* ── Sortable, Pageable Video Grid ── */}
        <section className="mb-10">
          <h2
            className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            Videos in Archive ({totalCount})
          </h2>

          {/* Sort / Filter / Pagination Controls */}
          <div className="bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-slate-200/60 dark:border-white/10 p-4 mb-4">
            <Suspense fallback={null}>
              <UapGridControls
                currentSort={sort}
                currentDirection={direction}
                currentQuery={query}
                currentTier={tier}
                currentPage={page}
                totalPages={totalPages}
                totalResults={totalCount}
              />
            </Suspense>
          </div>

          {/* Video Grid */}
          {gridVideos.length > 0 ? (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {gridVideos.map((video) => (
                  <UapVideoCard key={video.video_id} video={video} />
                ))}
              </div>

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
                      totalResults={totalCount}
                    />
                  </Suspense>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
                {query
                  ? "No videos match your search"
                  : "No videos in the archive for this channel yet."}
              </p>
              {query && (
                <p className="text-slate-400 dark:text-slate-500 max-w-md mx-auto text-sm">
                  Try removing your search filter or broadening the tier.
                </p>
              )}
            </div>
          )}
        </section>

        {/* ── Standardized Cross-Entity Links (canonical order) ── */}
        <div className="space-y-10 mt-10">
          <UapEntityLinkSection
            icon={Users}
            title={`Linked Experiencers (${linkedExperiencers.length})`}
            description="Experiencers featured across this channel's videos. This reflects topical co-occurrence within the channel's content."
            entities={linkedExperiencers}
          />
          <UapEntityLinkSection
            icon={User}
            title={`Linked Persons of Interest (${linkedPersons.length})`}
            description="Individuals discussed across this channel's videos. This reflects topical co-occurrence within the channel's content."
            entities={linkedPersons}
          />
          <UapEntityLinkSection
            icon={Calendar}
            title={`Linked Events (${linkedEvents.length})`}
            description="Events discussed across this channel's videos. This reflects topical co-occurrence within the channel's content."
            entities={linkedEvents}
          />
          <UapEntityLinkSection
            icon={Building2}
            title={`Linked Organizations (${linkedOrgs.length})`}
            description="Organizations discussed across this channel's videos. This reflects topical co-occurrence within the channel's content."
            entities={linkedOrgs}
          />
          <UapEntityLinkSection
            icon={Fingerprint}
            title={`Linked Programs (${linkedPrograms.length})`}
            description="Programs discussed across this channel's videos. This reflects topical co-occurrence within the channel's content."
            entities={linkedPrograms}
          />
        </div>
      </div>
    </div>
  );
}
