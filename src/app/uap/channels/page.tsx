import { createClient as createAnonClient } from "@supabase/supabase-js";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  Tv,
  Play,
  Eye,
  Users,
  Radio,
  TrendingUp,
  ArrowDownWideNarrow,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { UapChannelSearch } from "@/components/uap/UapChannelSearch";
import { ArchetypePill } from "@/components/uap/ChannelIdentity";
import { Suspense } from "react";

export const revalidate = 86400;

// ─── SEO ────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "UAP Channels | Project Profound",
  description:
    "Browse YouTube channels covering UFO encounters, UAP disclosure, and consciousness research — analyzed by Project Profound.",
  openGraph: {
    title: "UAP Channels | Project Profound",
    description:
      "Browse UAP content channels — sorted by subscribers, views, and archive depth.",
    type: "website",
  },
};

// ─── Supabase client ────────────────────────────────────────────────────────

function buildClient() {
  return createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChannelStat {
  channel_id: string;
  channel_name: string;
  track: string | null;
  avatar_url: string | null;
  subscriber_count: number | null;
  total_view_count: number | null;
  video_count: number;
  avg_evidence_score: number | null;
  avg_contact_depth: number | null;
  avg_transformation_score: number | null;
  tier1_count: number;
  tier2_count: number;
}

// ─── Sort options ───────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "videos", label: "Videos in Archive", key: "video_count" },
  { value: "subscribers", label: "Subscribers", key: "subscriber_count" },
  { value: "views", label: "Total Views", key: "total_view_count" },
  { value: "encounters", label: "Encounters", key: "tier1_count" },
  { value: "programs", label: "Programs", key: "tier2_count" },
  { value: "name", label: "Name", key: "channel_name" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

const PAGE_SIZE = 30;

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCompact(n: number | null | undefined): string {
  if (!n) return "0";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function buildUrl(overrides: Record<string, string | null>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(overrides)) {
    if (v !== null && v !== undefined) params.set(k, v);
  }
  const str = params.toString();
  return `/uap/channels${str ? `?${str}` : ""}`;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function UapChannelsPage({
  searchParams,
}: {
  searchParams: Promise<{
    sort?: string;
    order?: string;
    page?: string;
    q?: string;
  }>;
}) {
  const {
    sort,
    order,
    page: pageParam,
    q: searchQuery,
  } = await searchParams;

  // Validate sort
  const validSort: SortValue = (
    SORT_OPTIONS.map((o) => o.value) as string[]
  ).includes(sort ?? "")
    ? (sort as SortValue)
    : "videos";

  // Default direction: desc for numeric, asc for name
  const defaultAsc = validSort === "name";
  const ascending =
    order === "asc" ? true : order === "desc" ? false : defaultAsc;

  // Pagination
  const currentPage = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const rangeStart = (currentPage - 1) * PAGE_SIZE;
  const rangeEnd = rangeStart + PAGE_SIZE;

  const activeSearch = searchQuery?.trim() || null;

  // Fetch all channel stats
  const supabase = buildClient();
  const { data: channels } = await supabase.rpc("get_uap_channel_stats");
  let allChannels = (channels ?? []) as ChannelStat[];

  // Fetch archetype data from channel_scores
  const { data: scoreRows } = await supabase
    .from("uap_channel_scores")
    .select("channel_id, archetype_primary, personality_code");
  const archetypeMap: Record<string, { archetype_primary: string | null; personality_code: string | null }> = {};
  for (const row of scoreRows ?? []) {
    archetypeMap[row.channel_id] = { archetype_primary: row.archetype_primary, personality_code: row.personality_code };
  }

  // Search filter
  if (activeSearch) {
    const q = activeSearch.toLowerCase();
    allChannels = allChannels.filter((c) =>
      c.channel_name.toLowerCase().includes(q),
    );
  }

  // Sort
  allChannels.sort((a, b) => {
    let cmp = 0;
    switch (validSort) {
      case "name":
        cmp = a.channel_name
          .toLowerCase()
          .localeCompare(b.channel_name.toLowerCase());
        break;
      case "subscribers":
        cmp = (a.subscriber_count ?? 0) - (b.subscriber_count ?? 0);
        break;
      case "views":
        cmp = (a.total_view_count ?? 0) - (b.total_view_count ?? 0);
        break;
      case "encounters":
        cmp = a.tier1_count - b.tier1_count;
        break;
      case "programs":
        cmp = a.tier2_count - b.tier2_count;
        break;
      case "videos":
      default:
        cmp = a.video_count - b.video_count;
        break;
    }
    return ascending ? cmp : -cmp;
  });

  const totalCount = allChannels.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const pagedChannels = allChannels.slice(rangeStart, rangeEnd);

  // Aggregate stats for hero
  const totalVideos = allChannels.reduce((s, c) => s + c.video_count, 0);
  const totalSubs = allChannels.reduce(
    (s, c) => s + (c.subscriber_count ?? 0),
    0,
  );

  // Structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "UAP Channels",
    description:
      "YouTube channels covering UAP research analyzed by Project Profound",
    url: "https://projectprofound.org/uap/channels",
    numberOfItems: totalCount,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-background text-foreground">
        {/* Hero */}
        <section className="relative overflow-hidden py-16 md:py-20">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5" />
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #22C55E 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="relative container mx-auto px-4 max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 bg-green-50 dark:bg-green-500/20 rounded-full">
              <Tv className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              <span className="text-xs font-semibold text-green-700 dark:text-green-300 tracking-wide uppercase">
                UAP Channel Archive
              </span>
            </div>
            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mb-4 leading-[1.1]"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              The Channels Covering{" "}
              <span
                className="text-green-600 dark:text-green-400"
                style={{ fontStyle: "italic" }}
              >
                Disclosure
              </span>
            </h1>
            <p className="max-w-2xl mx-auto text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
              YouTube channels producing UAP encounter testimonies, government
              disclosure coverage, and research — each with their archive depth
              and analysis scores.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-6 mt-6 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Tv className="w-4 h-4 text-green-500" />
                <strong className="text-slate-700 dark:text-slate-300">
                  {totalCount}
                </strong>{" "}
                channels
              </span>
              <span className="flex items-center gap-1.5">
                <Play className="w-4 h-4 text-green-500" />
                <strong className="text-slate-700 dark:text-slate-300">
                  {totalVideos.toLocaleString()}
                </strong>{" "}
                videos archived
              </span>
              {totalSubs > 0 && (
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-green-500" />
                  <strong className="text-slate-700 dark:text-slate-300">
                    {formatCompact(totalSubs)}
                  </strong>{" "}
                  combined subscribers
                </span>
              )}
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 max-w-7xl py-10">
          {/* Search */}
          <div className="mb-6 flex items-center gap-4">
            <Suspense>
              <UapChannelSearch />
            </Suspense>
            <span className="text-sm text-slate-400 dark:text-slate-500 whitespace-nowrap hidden sm:block">
              {totalCount.toLocaleString()} channels
            </span>
          </div>

          {/* Sort Controls */}
          <div className="flex flex-wrap items-center gap-2 mb-8">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mr-1">
              Sort by
            </span>
            {SORT_OPTIONS.map((opt) => {
              const isActive = validSort === opt.value;
              const iconMap: Record<string, React.ReactNode> = {
                videos: <Play className="w-3.5 h-3.5" />,
                subscribers: <Users className="w-3.5 h-3.5" />,
                views: <Eye className="w-3.5 h-3.5" />,
                encounters: <Radio className="w-3.5 h-3.5" />,
                programs: <TrendingUp className="w-3.5 h-3.5" />,
              };

              return (
                <Link
                  key={opt.value}
                  href={buildUrl({
                    sort: opt.value,
                    order: opt.value === "name" ? "asc" : "desc",
                    ...(activeSearch ? { q: activeSearch } : {}),
                  })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? "bg-green-600 text-white"
                      : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/15"
                  }`}
                >
                  {iconMap[opt.value]}
                  {opt.label}
                </Link>
              );
            })}

            {/* Direction toggle */}
            <Link
              href={buildUrl({
                sort: validSort,
                order: ascending ? "desc" : "asc",
                ...(activeSearch ? { q: activeSearch } : {}),
              })}
              className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 ml-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors cursor-pointer"
            >
              <ArrowDownWideNarrow
                className={`w-3.5 h-3.5 transition-transform ${ascending ? "rotate-180" : ""}`}
              />
              {validSort === "name"
                ? ascending
                  ? "A → Z"
                  : "Z → A"
                : ascending
                  ? "Low → High"
                  : "High → Low"}
            </Link>

            <span className="ml-auto text-sm text-slate-400 dark:text-slate-500 sm:hidden">
              {totalCount.toLocaleString()} channels
              {totalPages > 1 &&
                ` · Page ${currentPage} of ${totalPages}`}
            </span>
          </div>

          {/* Active search indicator */}
          {activeSearch && (
            <div className="flex items-center gap-2 mb-6 text-sm text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 text-xs font-medium">
                Searching: &quot;{activeSearch}&quot;
                <Link
                  href={buildUrl({
                    sort: validSort,
                    order: ascending ? "asc" : "desc",
                  })}
                  className="hover:text-green-900 dark:hover:text-green-100"
                >
                  ✕
                </Link>
              </span>
            </div>
          )}

          {/* Channel Grid */}
          {pagedChannels.length > 0 ? (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pagedChannels.map((ch) => (
                  <Link
                    key={ch.channel_id}
                    href={`/uap/channels/${ch.channel_id}`}
                    className="group bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 p-5 hover:shadow-lg hover:border-green-300 dark:hover:border-green-700 transition-all"
                  >
                    {/* Avatar + Name */}
                    <div className="flex items-center gap-3 mb-3">
                      {ch.avatar_url ? (
                        <Image
                          src={ch.avatar_url}
                          alt={ch.channel_name}
                          width={44}
                          height={44}
                          className="rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                          {ch.channel_name?.charAt(0) || "?"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                          {ch.channel_name}
                        </h2>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          {ch.video_count}{" "}
                          {ch.video_count === 1 ? "video" : "videos"} in archive
                        </p>
                      </div>
                    </div>

                    {/* Channel stats row */}
                    <div className="flex items-center gap-3 mb-3 text-[11px] text-slate-500 dark:text-slate-400">
                      {ch.subscriber_count != null &&
                        ch.subscriber_count > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {formatCompact(ch.subscriber_count)} subs
                          </span>
                        )}
                      {ch.total_view_count != null &&
                        ch.total_view_count > 0 && (
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {formatCompact(ch.total_view_count)} views
                          </span>
                        )}
                    </div>

                    {/* Tier breakdown + Archetype */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {ch.tier1_count > 0 && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                          {ch.tier1_count} encounters
                        </span>
                      )}
                      {ch.tier2_count > 0 && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                          {ch.tier2_count} programs
                        </span>
                      )}
                      <ArchetypePill type={archetypeMap[ch.channel_id]?.archetype_primary ?? null} />
                    </div>

                    {/* Average scores */}
                    {ch.avg_evidence_score && (
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-white/10">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-emerald-500" />
                          <span>Avg ESS: {ch.avg_evidence_score}</span>
                        </div>
                        {ch.avg_contact_depth && (
                          <span>CDS: {ch.avg_contact_depth}</span>
                        )}
                      </div>
                    )}
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-10">
                  {currentPage > 1 ? (
                    <Link
                      href={buildUrl({
                        sort: validSort,
                        order: ascending ? "asc" : "desc",
                        page: String(currentPage - 1),
                        ...(activeSearch ? { q: activeSearch } : {}),
                      })}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white dark:bg-white/10 border border-slate-200/60 dark:border-white/10 text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-green-300 dark:hover:border-green-500/30 hover:text-green-600 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-300 dark:text-slate-600 cursor-not-allowed">
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </span>
                  )}
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {currentPage} / {totalPages}
                  </span>
                  {currentPage < totalPages ? (
                    <Link
                      href={buildUrl({
                        sort: validSort,
                        order: ascending ? "asc" : "desc",
                        page: String(currentPage + 1),
                        ...(activeSearch ? { q: activeSearch } : {}),
                      })}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white dark:bg-white/10 border border-slate-200/60 dark:border-white/10 text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-green-300 dark:hover:border-green-500/30 hover:text-green-600 transition-all"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-300 dark:text-slate-600 cursor-not-allowed">
                      Next <ChevronRight className="w-4 h-4" />
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Tv className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h2
                className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2"
                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
              >
                {activeSearch ? "No matching channels" : "No channels found"}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                {activeSearch ? (
                  <>
                    Try a different search term or{" "}
                    <Link
                      href="/uap/channels"
                      className="text-green-600 dark:text-green-400 hover:underline"
                    >
                      view all channels
                    </Link>
                    .
                  </>
                ) : (
                  <>Channels will appear as UAP content is analyzed.</>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
