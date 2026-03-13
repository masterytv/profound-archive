import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { ArrowRight, Users, Star } from "lucide-react";

export const revalidate = 86400;

export const metadata: Metadata = {
    title: "NDE Experiencers — Scored Profiles | Project Profound",
    description:
        "Discover the most documented near-death experiencers, each profiled with Greyson, Transformation, and Veridical scores from our database of 5,000+ accounts.",
    openGraph: {
        title: "NDE Experiencer Profiles | Project Profound",
        description: "The world's first scored, searchable index of NDE experiencers.",
        type: "website",
    },
};

type ExperiencerProfile = {
    id: number;
    slug: string;
    full_name: string;
    summary: string | null;
    avg_greyson_score: number | null;
    avg_transformation_score: number | null;
    avg_veridical_score: number | null;
    video_ids: string[] | null;
};

const SORT_OPTIONS = [
    { value: "greyson",        label: "Greyson Score" },
    { value: "transformation", label: "Transformation" },
    { value: "veridical",      label: "Veridical" },
    { value: "name",           label: "Name" },
] as const;

type SortOption = typeof SORT_OPTIONS[number]["value"];

function ScoreBadge({ label, value, color }: { label: string; value: number | null; color: string }) {
    if (value === null || value === undefined) return null;
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
            {label} {value.toFixed(1)}
        </span>
    );
}

function ExperiencerCard({ profile }: { profile: ExperiencerProfile }) {
    const videoCount = profile.video_ids?.length ?? 0;
    return (
        <Link
            href={`/experiencer/${profile.slug}`}
            className="group flex flex-col bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-slate-200/60 dark:border-white/10 p-5 hover:shadow-lg hover:border-blue-300/60 dark:hover:border-blue-500/30 transition-all duration-300"
        >
            {/* Avatar placeholder */}
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-violet-100 dark:from-blue-500/30 dark:to-violet-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-300">
                        {profile.full_name.charAt(0)}
                    </span>
                </div>
                <div className="min-w-0">
                    <h2
                        className="text-base font-bold text-slate-900 dark:text-slate-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                        {profile.full_name}
                    </h2>
                    {videoCount > 0 && (
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                            {videoCount} {videoCount === 1 ? "account" : "accounts"}
                        </p>
                    )}
                </div>
            </div>

            {/* Summary */}
            {profile.summary && (
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 mb-3 flex-1">
                    {profile.summary}
                </p>
            )}

            {/* Score badges */}
            <div className="flex flex-wrap gap-1.5 mt-auto pt-3 border-t border-slate-100 dark:border-white/10">
                <ScoreBadge
                    label="Greyson"
                    value={profile.avg_greyson_score}
                    color="bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                />
                <ScoreBadge
                    label="Transform"
                    value={profile.avg_transformation_score}
                    color="bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                />
                <ScoreBadge
                    label="Veridical"
                    value={profile.avg_veridical_score}
                    color="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                />
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all ml-auto self-center" />
            </div>
        </Link>
    );
}

export default async function ExperiencerDirectoryPage({
    searchParams,
}: {
    searchParams: Promise<{ sort?: string }>;
}) {
    const { sort } = await searchParams;
    const validSort = (SORT_OPTIONS.map((o) => o.value) as string[]).includes(sort ?? "")
        ? (sort as SortOption)
        : "greyson";

    const supabase = await createClient();

    // Build sort order
    const sortColumn =
        validSort === "greyson"        ? "avg_greyson_score" :
        validSort === "transformation" ? "avg_transformation_score" :
        validSort === "veridical"      ? "avg_veridical_score" :
        "full_name";

    const ascending = validSort === "name";

    const { data: profiles } = await supabase
        .from("experiencer_profiles")
        .select("id, slug, full_name, summary, avg_greyson_score, avg_transformation_score, avg_veridical_score, video_ids")
        .not("published_at", "is", null)
        .order(sortColumn, { ascending, nullsFirst: false })
        .limit(200);

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
                            each with their Greyson, Transformation, and Veridical scores.
                        </p>
                    </div>
                </section>

                <div className="container mx-auto px-4 max-w-7xl py-10">
                    {/* Sort controls */}
                    <div className="flex flex-wrap items-center gap-2 mb-8">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mr-1">
                            Sort by
                        </span>
                        {SORT_OPTIONS.map((opt) => (
                            <Link
                                key={opt.value}
                                href={`/experiencer?sort=${opt.value}`}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                    validSort === opt.value
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/15"
                                }`}
                            >
                                {opt.value !== "name" && <Star className="w-3 h-3" />}
                                {opt.label}
                            </Link>
                        ))}
                        {profiles && (
                            <span className="ml-auto text-sm text-slate-400 dark:text-slate-500">
                                {profiles.length} profiles
                            </span>
                        )}
                    </div>

                    {/* Grid */}
                    {profiles && profiles.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {profiles.map((p) => (
                                <ExperiencerCard key={p.id} profile={p as ExperiencerProfile} />
                            ))}
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
