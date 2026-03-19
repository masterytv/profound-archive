import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { ArrowRight, Users, Brain, Sparkles, TrendingUp, ArrowDownWideNarrow, Eye, ChevronLeft, ChevronRight } from "lucide-react";

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

type ExperiencerProfile = {
    id: number;
    slug: string;
    full_name: string;
    summary: string | null;
    photo_url: string | null;
    avg_greyson_score: number | null;
    avg_transformation_score: number | null;
    avg_veridical_score: number | null;
    video_ids: string[] | null;
    total_views: number | null;
};

const SORT_OPTIONS = [
    { value: "views",          label: "Total Views" },
    { value: "greyson",        label: "Experience Depth" },
    { value: "transformation", label: "Life Impact" },
    { value: "veridical",      label: "Evidence Strength" },
    { value: "name",           label: "Name" },
] as const;

type SortOption = typeof SORT_OPTIONS[number]["value"];

function ScoreBadge({ label, value, color, icon }: { label: string; value: number | null; color: string; icon?: React.ReactNode }) {
    if (value === null || value === undefined) return null;
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
            {icon}{label} {value.toFixed(1)}
        </span>
    );
}

function ExperiencerCard({ profile }: { profile: ExperiencerProfile }) {
    const videoCount = profile.video_ids?.length ?? 0;
    return (
        <Link
            href={`/experiencer/${profile.slug}`}
            className="group flex bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-slate-200/60 dark:border-white/10 overflow-hidden hover:shadow-lg hover:border-blue-300/60 dark:hover:border-blue-500/30 transition-all duration-300"
        >
            {/* Photo — 1/3 width */}
            <div className="relative w-1/3 min-h-[140px] bg-gradient-to-br from-blue-100 to-violet-100 dark:from-blue-500/20 dark:to-violet-500/20 flex-shrink-0">
                {profile.photo_url ? (
                    <Image
                        src={profile.photo_url}
                        alt={profile.full_name}
                        fill
                        sizes="(max-width: 640px) 33vw, 150px"
                        className="object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-3xl font-bold text-blue-400/60 dark:text-blue-300/40">
                            {profile.full_name.charAt(0)}
                        </span>
                    </div>
                )}
            </div>

            {/* Content — 2/3 width */}
            <div className="flex flex-col flex-1 p-4 min-w-0">
                <h2
                    className="text-base font-bold text-slate-900 dark:text-slate-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate mb-0.5"
                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                >
                    {profile.full_name}
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
                    {videoCount > 0 && <>{videoCount} {videoCount === 1 ? "account" : "accounts"}</>}
                    {videoCount > 0 && profile.total_views ? " · " : ""}
                    {profile.total_views ? <><Eye className="w-3 h-3 inline mb-0.5" /> {formatViews(profile.total_views)}</> : null}
                </p>

                {/* Score percentages with icons */}
                <div className="flex items-center gap-3 mt-auto">
                    {profile.avg_greyson_score !== null && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                            <Brain className="w-3.5 h-3.5" />
                            {Math.round((profile.avg_greyson_score / 32) * 100)}%
                        </span>
                    )}
                    {profile.avg_transformation_score !== null && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                            <Sparkles className="w-3.5 h-3.5" />
                            {Math.round((profile.avg_transformation_score / 50) * 100)}%
                        </span>
                    )}
                    {profile.avg_veridical_score !== null && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {Math.round((profile.avg_veridical_score / 28) * 100)}%
                        </span>
                    )}
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all ml-auto self-center" />
                </div>
            </div>
        </Link>
    );
}

function formatViews(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K views`;
    return `${n} views`;
}

export default async function ExperiencerDirectoryPage({
    searchParams,
}: {
    searchParams: Promise<{ sort?: string; order?: string; page?: string }>;
}) {
    const { sort, order, page: pageParam } = await searchParams;
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

    const supabase = await createClient();

    // Build sort order — for name sort, we extract last name client-side
    const sortByName = validSort === "name";
    const sortColumn =
        validSort === "views"          ? "total_views" :
        validSort === "greyson"        ? "avg_greyson_score" :
        validSort === "transformation" ? "avg_transformation_score" :
        validSort === "veridical"      ? "avg_veridical_score" :
        "full_name"; // fallback for DB query, overridden by client sort

    // Get total count for pagination
    const { count: totalCount } = await supabase
        .from("experiencer_profiles")
        .select("id", { count: "exact", head: true })
        .not("published_at", "is", null);

    const totalPages = Math.ceil((totalCount ?? 0) / PAGE_SIZE);

    let profiles: ExperiencerProfile[] | null;

    if (sortByName) {
        // Fetch ALL profiles then sort by last name and paginate client-side
        const { data: allProfiles } = await supabase
            .from("experiencer_profiles")
            .select("id, slug, full_name, summary, photo_url, avg_greyson_score, avg_transformation_score, avg_veridical_score, video_ids, total_views")
            .not("published_at", "is", null);

        const getLastName = (name: string) => {
            const parts = name.trim().split(/\s+/);
            return (parts[parts.length - 1] || name).toLowerCase();
        };

        const sorted = (allProfiles ?? []).sort((a, b) => {
            const cmp = getLastName(a.full_name).localeCompare(getLastName(b.full_name));
            return ascending ? cmp : -cmp;
        });

        profiles = sorted.slice(rangeStart, rangeEnd + 1) as ExperiencerProfile[];
    } else {
        const { data } = await supabase
            .from("experiencer_profiles")
            .select("id, slug, full_name, summary, photo_url, avg_greyson_score, avg_transformation_score, avg_veridical_score, video_ids, total_views")
            .not("published_at", "is", null)
            .order(sortColumn, { ascending, nullsFirst: false })
            .range(rangeStart, rangeEnd);
        profiles = data as ExperiencerProfile[] | null;
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
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
                                transformation: <Sparkles className="w-3.5 h-3.5" />,
                                veridical: <TrendingUp className="w-3.5 h-3.5" />,
                            };
                            return (
                                <Link
                                    key={opt.value}
                                    href={`/experiencer?sort=${opt.value}&order=${opt.value === "name" ? "asc" : "desc"}`}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                        isActive
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
                        <Link
                            href={`/experiencer?sort=${validSort}&order=${ascending ? "desc" : "asc"}`}
                            className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 ml-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors cursor-pointer"
                        >
                            <ArrowDownWideNarrow className={`w-3.5 h-3.5 transition-transform ${ascending ? "rotate-180" : ""}`} />
                            {validSort === "name"
                                ? (ascending ? "A → Z" : "Z → A")
                                : (ascending ? "Low → High" : "High → Low")
                            }
                        </Link>
                        <span className="ml-auto text-sm text-slate-400 dark:text-slate-500">
                            {totalCount ?? 0} profiles
                            {totalPages > 1 && ` · Page ${currentPage} of ${totalPages}`}
                        </span>
                    </div>

                    {/* Grid */}
                    {profiles && profiles.length > 0 ? (
                        <div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {profiles.map((p) => (
                                <ExperiencerCard key={p.id} profile={p as ExperiencerProfile} />
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-3 mt-10">
                                {currentPage > 1 ? (
                                    <Link
                                        href={`/experiencer?sort=${validSort}&order=${ascending ? "asc" : "desc"}&page=${currentPage - 1}`}
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
                                    {currentPage} / {totalPages}
                                </span>
                                {currentPage < totalPages ? (
                                    <Link
                                        href={`/experiencer?sort=${validSort}&order=${ascending ? "asc" : "desc"}&page=${currentPage + 1}`}
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
                                Profiles coming soon
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                                We are generating scored profiles from our database of 5,000+ accounts.
                                Check back soon.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
