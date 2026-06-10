import { serializeJsonLd } from '@/lib/json-ld';
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { ArrowRight, Users, Brain, Heart, TrendingUp, ArrowDownWideNarrow, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { ExperiencerSearch } from "@/components/experiencer/ExperiencerSearch";
import { Suspense } from "react";

export const revalidate = 86400;

export const metadata: Metadata = {
    title: "NDE Experiencers — Scored Profiles | Project Profound",
    description:
        "Discover the most documented near-death experiencers, each profiled with Experience Depth, Life Impact, and Evidence Strength scores from our database of 5,000+ accounts.",
    openGraph: {
        title: "NDE Experiencer Profiles | Project Profound",
        description: "The world's first scored, searchable index of NDE experiencers.",
        type: "website",
    },
};

const PAGE_SIZE = 50;


import { ExperiencerCard, formatViews, type ExperiencerProfile } from "@/components/experiencer/ExperiencerCard";

const SORT_OPTIONS = [
    { value: "views", label: "Total Views" },
    { value: "greyson", label: "Experience Depth" },
    { value: "transformation", label: "Life Impact" },
    { value: "veridical", label: "Evidence Strength" },
    { value: "name", label: "Name" },
] as const;

type SortOption = typeof SORT_OPTIONS[number]["value"];


/** Extract last name for sorting — handles "Dr. John Smith" → "smith" */
function getLastName(name: string): string {
    const parts = name.trim().split(/\s+/);
    return (parts[parts.length - 1] || name).toLowerCase();
}

/** Build URL preserving current params and overriding specific ones */
function buildUrl(base: Record<string, string>, overrides: Record<string, string | null>): string {
    const params = new URLSearchParams();
    const merged = { ...base, ...Object.fromEntries(Object.entries(overrides).filter(([, v]) => v !== null)) };
    for (const [k, v] of Object.entries(merged)) {
        if (v && !Object.keys(overrides).includes(k) || overrides[k] !== null) {
            params.set(k, v as string);
        }
    }
    // Remove any keys explicitly set to null
    for (const [k, v] of Object.entries(overrides)) {
        if (v === null) params.delete(k);
    }
    const str = params.toString();
    return `/experiencer${str ? `?${str}` : ''}`;
}

export default async function ExperiencerDirectoryPage({
    searchParams,
}: {
    searchParams: Promise<{ sort?: string; order?: string; page?: string; q?: string; letter?: string }>;
}) {
    const { sort, order, page: pageParam, q: searchQuery, letter } = await searchParams;
    const validSort = (SORT_OPTIONS.map((o) => o.value) as string[]).includes(sort ?? "")
        ? (sort as SortOption)
        : "views";

    // Default direction: desc for scores/views, asc for name
    const defaultAsc = validSort === "name";
    const ascending = order === "asc" ? true : order === "desc" ? false : defaultAsc;

    // Pagination
    const currentPage = Math.max(1, parseInt(pageParam || "1", 10) || 1);
    const rangeStart = (currentPage - 1) * PAGE_SIZE;
    const rangeEnd = rangeStart + PAGE_SIZE - 1;

    // Validate letter filter
    const activeLetter = letter && ALPHABET.includes(letter.toUpperCase()) ? letter.toUpperCase() : null;
    const activeSearch = searchQuery?.trim() || null;

    const supabase = await createClient();

    // Base params for URL building
    const baseParams: Record<string, string> = {};
    if (validSort !== 'views') baseParams.sort = validSort;
    if (order) baseParams.order = order;
    if (activeSearch) baseParams.q = activeSearch;
    if (activeLetter) baseParams.letter = activeLetter;

    // Build the Supabase query with search/letter filters
    const sortByName = validSort === "name";
    const sortColumn =
        validSort === "views" ? "total_views" :
            validSort === "greyson" ? "avg_greyson_score" :
                validSort === "transformation" ? "avg_transformation_score" :
                    validSort === "veridical" ? "avg_veridical_score" :
                        "full_name";

    // ── Count query ──
    let countQuery = supabase
        .from("experiencer_profiles")
        .select("id", { count: "exact", head: true })
        .not("published_at", "is", null);

    if (activeSearch) {
        countQuery = countQuery.ilike("full_name", `%${activeSearch}%`);
    } else if (activeLetter) {
        // Filter by last name starting letter — we use a broader first-character filter
        // and refine client-side for last name accuracy
        countQuery = countQuery.or(`full_name.ilike.${activeLetter}%,full_name.ilike.% ${activeLetter}%`);
    }

    const { count: totalCount } = await countQuery;
    const totalPages = Math.ceil((totalCount ?? 0) / PAGE_SIZE);

    let profiles: ExperiencerProfile[] | null;

    if (sortByName || activeSearch || activeLetter) {
        // For name sort, search, or letter filter: fetch all matching, sort by last name, paginate client-side
        let dataQuery = supabase
            .from("experiencer_profiles")
            .select("id, slug, full_name, summary, photo_url, avg_greyson_score, avg_transformation_score, avg_veridical_score, video_ids, total_views")
            .not("published_at", "is", null);

        if (activeSearch) {
            dataQuery = dataQuery.ilike("full_name", `%${activeSearch}%`);
        } else if (activeLetter) {
            dataQuery = dataQuery.or(`full_name.ilike.${activeLetter}%,full_name.ilike.% ${activeLetter}%`);
        }

        const { data: allProfiles } = await dataQuery;

        let filtered = allProfiles ?? [];

        // Refine letter filter by actual last name
        if (activeLetter && !activeSearch) {
            filtered = filtered.filter(p => getLastName(p.full_name).startsWith(activeLetter.toLowerCase()));
        }

        // Sort
        if (sortByName) {
            filtered.sort((a, b) => {
                const cmp = getLastName(a.full_name).localeCompare(getLastName(b.full_name));
                return ascending ? cmp : -cmp;
            });
        } else {
            // Sort by the selected column
            filtered.sort((a, b) => {
                const aVal = (a as any)[sortColumn] ?? -Infinity;
                const bVal = (b as any)[sortColumn] ?? -Infinity;
                return ascending ? aVal - bVal : bVal - aVal;
            });
        }

        // Override totalCount with refined count (for letter filter refinement)
        const refinedCount = filtered.length;
        const refinedPages = Math.ceil(refinedCount / PAGE_SIZE);

        profiles = filtered.slice(rangeStart, rangeEnd + 1) as ExperiencerProfile[];
        // Use refinedPages for pagination below
        var effectiveTotalPages = refinedPages;
        var effectiveTotalCount = refinedCount;
    } else {
        const { data } = await supabase
            .from("experiencer_profiles")
            .select("id, slug, full_name, summary, photo_url, avg_greyson_score, avg_transformation_score, avg_veridical_score, video_ids, total_views")
            .not("published_at", "is", null)
            .order(sortColumn, { ascending, nullsFirst: false })
            .range(rangeStart, rangeEnd);
        profiles = data as ExperiencerProfile[] | null;
        var effectiveTotalPages = totalPages;
        var effectiveTotalCount = totalCount ?? 0;
    }

    // Structured data for the directory page
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "NDE Experiencer Profiles",
        "description": "A scored, searchable index of near-death experiencers from Project Profound.",
        "url": "https://projectprofound.org/experiencer",
        "publisher": { "@type": "Organization", "name": "Project Profound", "url": "https://projectprofound.org" },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
            />

            <div className="min-h-screen bg-background text-foreground">
                {/* Hero */}
                <section className="relative overflow-hidden py-16 md:py-20 hero-gradient">
                    <div
                        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
                        style={{
                            backgroundImage: "radial-gradient(circle, #2563EB 1px, transparent 1px)",
                            backgroundSize: "32px 32px",
                        }}
                    />
                    <div className="relative container mx-auto px-4 max-w-4xl text-center">
                        <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/20 rounded-full">
                            <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 tracking-wide uppercase">
                                Experiencer Profiles
                            </span>
                        </div>
                        <h1
                            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mb-4 leading-[1.1]"
                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                        >
                            People Who Have{" "}
                            <span className="text-blue-600 dark:text-blue-400" style={{ fontStyle: "italic" }}>
                                Been There
                            </span>
                        </h1>
                        <p className="max-w-2xl mx-auto text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                            Scored profiles of the most documented near-death experiencers in our database —
                            each with their Experience Depth, Life Impact, and Evidence Strength scores.
                        </p>
                    </div>
                </section>

                <div className="container mx-auto px-4 max-w-7xl py-10">
                    {/* ── Search + Alphabet Strip ── */}
                    <div className="mb-6 space-y-4">
                        {/* Search bar */}
                        <div className="flex items-center gap-4">
                            <Suspense>
                                <ExperiencerSearch />
                            </Suspense>
                            <span className="text-sm text-slate-400 dark:text-slate-500 whitespace-nowrap hidden sm:block">
                                {effectiveTotalCount.toLocaleString()} profiles
                            </span>
                        </div>
                    </div>

                    {/* Sort controls */}
                    <div className="flex flex-wrap items-center gap-2 mb-8">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mr-1">
                            Sort by
                        </span>
                        {SORT_OPTIONS.map((opt) => {
                            const isActive = validSort === opt.value;
                            const iconMap: Record<string, React.ReactNode> = {
                                views: <Eye className="w-3.5 h-3.5" />,
                                greyson: <Brain className="w-3.5 h-3.5" />,
                                transformation: <Heart className="w-3.5 h-3.5" />,
                                veridical: <TrendingUp className="w-3.5 h-3.5" />,
                            };
                            const sortParams: Record<string, string | null> = {
                                sort: opt.value,
                                order: opt.value === "name" ? "asc" : "desc",
                                page: null,
                            };
                            if (activeSearch) sortParams.q = activeSearch;
                            if (activeLetter) sortParams.letter = activeLetter;

                            return (
                                <Link
                                    key={opt.value}
                                    href={buildUrl({}, sortParams)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isActive
                                            ? "bg-blue-600 text-white"
                                            : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/15"
                                        }`}
                                >
                                    {iconMap[opt.value]}
                                    {opt.label}
                                </Link>
                            );
                        })}
                        {/* Direction toggle */}
                        {(() => {
                            const dirParams: Record<string, string | null> = {
                                sort: validSort,
                                order: ascending ? "desc" : "asc",
                                page: null,
                            };
                            if (activeSearch) dirParams.q = activeSearch;
                            if (activeLetter) dirParams.letter = activeLetter;

                            return (
                                <Link
                                    href={buildUrl({}, dirParams)}
                                    className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 ml-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors cursor-pointer"
                                >
                                    <ArrowDownWideNarrow className={`w-3.5 h-3.5 transition-transform ${ascending ? "rotate-180" : ""}`} />
                                    {validSort === "name"
                                        ? (ascending ? "A → Z" : "Z → A")
                                        : (ascending ? "Low → High" : "High → Low")
                                    }
                                </Link>
                            );
                        })()}
                        <span className="ml-auto text-sm text-slate-400 dark:text-slate-500 sm:hidden">
                            {effectiveTotalCount.toLocaleString()} profiles
                            {effectiveTotalPages > 1 && ` · Page ${currentPage} of ${effectiveTotalPages}`}
                        </span>
                    </div>

                    {/* Active filter indicator */}
                    {(activeSearch || activeLetter) && (
                        <div className="flex items-center gap-2 mb-6 text-sm text-slate-500 dark:text-slate-400">
                            {activeSearch && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-medium">
                                    Searching: &quot;{activeSearch}&quot;
                                    <Link href={buildUrl({ sort: validSort, order: ascending ? 'asc' : 'desc' }, { q: null, page: null })} className="hover:text-blue-900 dark:hover:text-blue-100">✕</Link>
                                </span>
                            )}

                        </div>
                    )}

                    {/* Grid */}
                    {profiles && profiles.length > 0 ? (
                        <div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {profiles.map((p) => (
                                    <ExperiencerCard key={p.id} profile={p as ExperiencerProfile} />
                                ))}
                            </div>

                            {/* Pagination */}
                            {effectiveTotalPages > 1 && (
                                <div className="flex items-center justify-center gap-3 mt-10">
                                    {currentPage > 1 ? (
                                        <Link
                                            href={buildUrl(baseParams, { sort: validSort, order: ascending ? "asc" : "desc", page: String(currentPage - 1) })}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white dark:bg-white/10 border border-slate-200/60 dark:border-white/10 text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-500/30 hover:text-blue-600 transition-all"
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
                                            href={buildUrl(baseParams, { sort: validSort, order: ascending ? "asc" : "desc", page: String(currentPage + 1) })}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white dark:bg-white/10 border border-slate-200/60 dark:border-white/10 text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-500/30 hover:text-blue-600 transition-all"
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
                                {activeSearch || activeLetter ? 'No matching profiles' : 'Profiles coming soon'}
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                                {activeSearch || activeLetter ? (
                                    <>Try a different search term or <Link href="/experiencer" className="text-blue-600 dark:text-blue-400 hover:underline">view all profiles</Link>.</>
                                ) : (
                                    <>We are generating scored profiles from our database of 5,000+ accounts. Check back soon.</>
                                )}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
