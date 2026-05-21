import Link from "next/link";
import type { Metadata } from "next";
import { Users, Shield, Zap, Eye, Play, ArrowDownWideNarrow, ChevronLeft, ChevronRight } from "lucide-react";
import { UapExperiencerCard, type UapExperiencerProfile } from "@/components/uap/UapExperiencerCard";
import { UapExperiencerSearch } from "@/components/uap/UapExperiencerSearch";
import { Suspense } from "react";
import { getContacteeList } from "@/lib/data/uap-contactee";

export const revalidate = 86400;

// ─── SEO ────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "UAP Contact Experiencers | Project Profound",
  description:
    "Explore profiles of UAP contact experiencers — first-person accounts of encounters with unidentified aerial phenomena, analyzed with the UAP Contact Triad.",
  openGraph: {
    title: "UAP Contact Experiencers | Project Profound",
    description:
      "Explore profiles of UAP contact experiencers — scored with the UAP Contact Experience Triad.",
    type: "website",
  },
};

// ─── Sort Options ───────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "views", label: "Total Views", column: "total_views" },
  { value: "evidence", label: "Evidence Strength", column: "avg_evidence_score" },
  { value: "contact_depth", label: "Experience Depth", column: "avg_contact_depth" },
  { value: "transformation", label: "Life Impact", column: "avg_transformation_score" },
  { value: "name", label: "Name", column: "display_name" },
] as const;

type SortValue = typeof SORT_OPTIONS[number]["value"];

const PAGE_SIZE = 50;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getLastName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[parts.length - 1] || name).toLowerCase();
}

function buildUrl(overrides: Record<string, string | null>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(overrides)) {
    if (v !== null && v !== undefined) params.set(k, v);
  }
  const str = params.toString();
  return `/uap/experiencer${str ? `?${str}` : ""}`;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function UapExperiencerPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; order?: string; page?: string; q?: string }>;
}) {
  const { sort, order, page: pageParam, q: searchQuery } = await searchParams;

  // Validate sort
  const validSort: SortValue = (SORT_OPTIONS.map((o) => o.value) as string[]).includes(sort ?? "")
    ? (sort as SortValue)
    : "views";

  // Default direction: desc for scores/views, asc for name
  const defaultAsc = validSort === "name";
  const ascending = order === "asc" ? true : order === "desc" ? false : defaultAsc;

  // Pagination
  const currentPage = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const rangeStart = (currentPage - 1) * PAGE_SIZE;
  const rangeEnd = rangeStart + PAGE_SIZE;

  const activeSearch = searchQuery?.trim() || null;

  // Fetch all profiles with the requested sort
  const sortMapping: Record<SortValue, "views" | "evidence" | "contact_depth" | "transformation" | "name"> = {
    views: "views",
    evidence: "evidence",
    contact_depth: "contact_depth",
    transformation: "transformation",
    name: "name",
  };

  let allProfiles = await getContacteeList({ sort: sortMapping[validSort], limit: 5000 });

  // Apply search filter
  if (activeSearch) {
    const q = activeSearch.toLowerCase();
    allProfiles = allProfiles.filter((p) => p.display_name.toLowerCase().includes(q));
  }

  // Apply name sorting with last-name logic when sorting by name
  if (validSort === "name") {
    allProfiles.sort((a, b) => {
      const cmp = getLastName(a.display_name).localeCompare(getLastName(b.display_name));
      return ascending ? cmp : -cmp;
    });
  } else if (ascending) {
    // Data layer returns desc by default for score/views — reverse for asc
    allProfiles.reverse();
  }

  const effectiveTotalCount = allProfiles.length;
  const effectiveTotalPages = Math.ceil(effectiveTotalCount / PAGE_SIZE);
  const profiles = allProfiles.slice(rangeStart, rangeEnd);

  // Stats for hero
  const totalVideos = allProfiles.reduce((sum, p) => sum + p.video_count, 0);
  const totalViews = allProfiles.reduce((sum, p) => sum + p.total_views, 0);

  // Map to card type
  const cardProfiles: UapExperiencerProfile[] = profiles.map((p) => ({
    id: p.id,
    slug: p.slug,
    display_name: p.display_name,
    photo_url: p.photo_url,
    experience_type: p.experience_type,
    video_count: p.video_count,
    total_views: p.total_views,
    avg_evidence_score: p.avg_evidence_score,
    avg_contact_depth: p.avg_contact_depth,
    avg_transformation_score: p.avg_transformation_score,
  }));


  // Structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "UAP Contact Experiencers",
    description: "Profiles of UAP contact experiencers analyzed by Project Profound",
    url: "https://projectprofound.org/uap/experiencer",
    numberOfItems: effectiveTotalCount,
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
              backgroundImage: "radial-gradient(circle, #22C55E 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="relative container mx-auto px-4 max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 bg-green-50 dark:bg-green-500/20 rounded-full">
              <Users className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              <span className="text-xs font-semibold text-green-700 dark:text-green-300 tracking-wide uppercase">
                UAP Contact Archive
              </span>
            </div>
            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mb-4 leading-[1.1]"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              People Who Made{" "}
              <span className="text-green-600 dark:text-green-400" style={{ fontStyle: "italic" }}>
                Contact
              </span>
            </h1>
            <p className="max-w-2xl mx-auto text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
              Scored profiles of UAP contact experiencers — each with their Evidence Strength,
              Experience Depth, and Life Impact scores from the UAP Contact Experience Triad.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-6 mt-6 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-green-500" />
                <strong className="text-slate-700 dark:text-slate-300">{effectiveTotalCount}</strong> experiencers
              </span>
              <span className="flex items-center gap-1.5">
                <Play className="w-4 h-4 text-green-500" />
                <strong className="text-slate-700 dark:text-slate-300">{totalVideos}</strong> accounts
              </span>
              {totalViews > 0 && (
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-green-500" />
                  <strong className="text-slate-700 dark:text-slate-300">{(totalViews / 1_000_000).toFixed(1)}M</strong> total views
                </span>
              )}
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 max-w-7xl py-10">
          {/* Search */}
          <div className="mb-6 flex items-center gap-4">
            <Suspense>
              <UapExperiencerSearch />
            </Suspense>
            <span className="text-sm text-slate-400 dark:text-slate-500 whitespace-nowrap hidden sm:block">
              {effectiveTotalCount.toLocaleString()} profiles
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
                views: <Eye className="w-3.5 h-3.5" />,
                evidence: <Shield className="w-3.5 h-3.5" />,
                contact_depth: <Zap className="w-3.5 h-3.5" />,
                transformation: <Eye className="w-3.5 h-3.5" />,
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
              <ArrowDownWideNarrow className={`w-3.5 h-3.5 transition-transform ${ascending ? "rotate-180" : ""}`} />
              {validSort === "name"
                ? (ascending ? "A → Z" : "Z → A")
                : (ascending ? "Low → High" : "High → Low")
              }
            </Link>

            <span className="ml-auto text-sm text-slate-400 dark:text-slate-500 sm:hidden">
              {effectiveTotalCount.toLocaleString()} profiles
              {effectiveTotalPages > 1 && ` · Page ${currentPage} of ${effectiveTotalPages}`}
            </span>
          </div>

          {/* Active search indicator */}
          {activeSearch && (
            <div className="flex items-center gap-2 mb-6 text-sm text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 text-xs font-medium">
                Searching: &quot;{activeSearch}&quot;
                <Link
                  href={buildUrl({ sort: validSort, order: ascending ? "asc" : "desc" })}
                  className="hover:text-green-900 dark:hover:text-green-100"
                >
                  ✕
                </Link>
              </span>
            </div>
          )}

          {/* Grid */}
          {cardProfiles.length > 0 ? (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {cardProfiles.map((p) => (
                  <UapExperiencerCard key={p.id} profile={p} />
                ))}
              </div>

              {/* Pagination */}
              {effectiveTotalPages > 1 && (
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
                    {currentPage} / {effectiveTotalPages}
                  </span>
                  {currentPage < effectiveTotalPages ? (
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
              <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h2
                className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2"
                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
              >
                {activeSearch ? "No matching profiles" : "Profiles coming soon"}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                {activeSearch ? (
                  <>
                    Try a different search term or{" "}
                    <Link href="/uap/experiencer" className="text-green-600 dark:text-green-400 hover:underline">
                      view all profiles
                    </Link>.
                  </>
                ) : (
                  <>Experiencer profiles are being generated from analyzed encounter videos. Check back soon.</>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
