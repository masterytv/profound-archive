import { createClient } from "@/lib/supabase/server";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Play, ExternalLink } from "lucide-react";
import Image from "next/image";

export const revalidate = 86400;

type ExperiencerProfile = {
    id: number;
    slug: string;
    full_name: string;
    summary: string | null;
    video_ids: string[] | null;
    avg_greyson_score: number | null;
    avg_veridical_score: number | null;
    avg_transformation_score: number | null;
    big_questions_answered: string[] | null;
    thank_you_note: string | null;
    published_at: string | null;
    updated_at: string;
};

type VideoRow = {
    id: string;
    title: string;
    thumbnail_url: string | null;
    channel_title: string | null;
    view_count: number | null;
};

// Why: Both getProfile and generateStaticParams run at build time (SSG),
// where cookies() is unavailable. Use a direct anon client instead.
function buildClient() {
    return createAnonClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
}

async function getProfile(slug: string): Promise<ExperiencerProfile | null> {
    const supabase = buildClient();
    const { data } = await supabase
        .from("experiencer_profiles")
        .select("*")
        .eq("slug", slug)
        .not("published_at", "is", null)
        .single();
    return data ?? null;
}

export async function generateStaticParams() {
    const supabase = buildClient();
    const { data } = await supabase
        .from("experiencer_profiles")
        .select("slug")
        .not("published_at", "is", null);
    return (data ?? []).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const profile = await getProfile(slug);
    if (!profile) return { title: "Profile Not Found | Project Profound" };

    const title = `${profile.full_name} — NDE Account | Project Profound`;
    const description =
        profile.summary?.slice(0, 160) ??
        `Explore ${profile.full_name}'s near-death experience, scored and sourced by Project Profound.`;

    return {
        title,
        description,
        openGraph: { title, description, type: "profile" },
    };
}

function ScoreBadge({ label, value, colorClass }: { label: string; value: number | null; colorClass: string }) {
    if (value === null || value === undefined) return null;
    return (
        <div className={`text-center px-4 py-3 rounded-xl ${colorClass}`}>
            <div className="text-2xl font-bold">{value.toFixed(1)}</div>
            <div className="text-xs font-semibold uppercase tracking-wider opacity-75 mt-0.5">{label}</div>
        </div>
    );
}

export default async function ExperiencerProfilePage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const profile = await getProfile(slug);
    if (!profile) notFound();

    // Fetch linked videos if any
    let videos: VideoRow[] = [];
    if (profile.video_ids && profile.video_ids.length > 0) {
        const supabase = await createClient();
        const { data } = await supabase
            .from("nde_vids")
            .select("id, title, thumbnail_url, channel_title, view_count")
            .in("id", profile.video_ids.slice(0, 12)); // cap at 12 (LEARNINGS §7E)
        videos = data ?? [];
    }

    // Person JSON-LD for E-E-A-T
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": profile.full_name,
        "description": profile.summary ?? undefined,
        "url": `https://projectprofound.org/experiencer/${profile.slug}`,
        "sameAs": [],
    };

    // BreadcrumbList JSON-LD
    const breadcrumbJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://projectprofound.org" },
            { "@type": "ListItem", "position": 2, "name": "Experiencers", "item": "https://projectprofound.org/experiencer" },
            { "@type": "ListItem", "position": 3, "name": profile.full_name, "item": `https://projectprofound.org/experiencer/${profile.slug}` },
        ],
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

            <div className="min-h-screen bg-background text-foreground">
                {/* Breadcrumb */}
                <div className="border-b border-slate-200/60 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                    <div className="container mx-auto px-4 max-w-4xl py-4 flex items-center gap-3 text-sm">
                        <Link href="/experiencer" className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Experiencers
                        </Link>
                    </div>
                </div>

                <div className="container mx-auto px-4 max-w-3xl py-12">
                    {/* Header */}
                    <header className="mb-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-violet-100 dark:from-blue-500/30 dark:to-violet-500/30 flex items-center justify-center flex-shrink-0">
                                <span className="text-2xl font-bold text-blue-600 dark:text-blue-300">
                                    {profile.full_name.charAt(0)}
                                </span>
                            </div>
                            <div>
                                <h1
                                    className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 leading-tight"
                                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                                >
                                    {profile.full_name}
                                </h1>
                                {videos.length > 0 && (
                                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
                                        {videos.length} {videos.length === 1 ? "account" : "accounts"} in our database
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Score badges */}
                        {(profile.avg_greyson_score || profile.avg_transformation_score || profile.avg_veridical_score) && (
                            <div className="flex flex-wrap gap-3 mb-6">
                                <ScoreBadge
                                    label="Greyson"
                                    value={profile.avg_greyson_score}
                                    colorClass="bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                                />
                                <ScoreBadge
                                    label="Transformation"
                                    value={profile.avg_transformation_score}
                                    colorClass="bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                />
                                <ScoreBadge
                                    label="Veridical"
                                    value={profile.avg_veridical_score}
                                    colorClass="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                                />
                            </div>
                        )}

                        {/* Summary */}
                        {profile.summary && (
                            <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed border-l-4 border-blue-500/40 pl-5 bg-blue-50/30 dark:bg-blue-500/10 py-3 rounded-r-lg">
                                {profile.summary}
                            </p>
                        )}
                    </header>

                    {/* Thank you note */}
                    {profile.thank_you_note && (
                        <section className="mb-10 bg-slate-50 dark:bg-white/5 rounded-xl p-5 border border-slate-200/60 dark:border-white/10">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                                A note from Project Profound
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                                {profile.thank_you_note}
                            </p>
                        </section>
                    )}

                    {/* Related questions */}
                    {profile.big_questions_answered && profile.big_questions_answered.length > 0 && (
                        <section className="mb-10">
                            <h2
                                className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                Questions Their Account Addresses
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {profile.big_questions_answered.map((qSlug) => (
                                    <Link
                                        key={qSlug}
                                        href={`/questions/${qSlug}`}
                                        className="text-sm px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-500/30 transition-colors"
                                    >
                                        {qSlug.replace(/-/g, " ")}
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Videos */}
                    {videos.length > 0 && (
                        <section>
                            <h2
                                className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                Accounts in Our Database
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {videos.map((video) => (
                                    <Link
                                        key={video.id}
                                        href={`/video/${video.id}`}
                                        className="group flex gap-3 bg-white dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/10 p-3 hover:shadow-md hover:border-blue-300/60 dark:hover:border-blue-500/30 transition-all"
                                    >
                                        {/* Thumbnail */}
                                        <div className="relative w-24 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-800">
                                            {video.thumbnail_url ? (
                                                <Image
                                                    src={video.thumbnail_url.replace("maxresdefault", "hqdefault")}
                                                    alt={video.title}
                                                    fill
                                                    sizes="96px"
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Play className="w-5 h-5 text-slate-400" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                <Play className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                                            </div>
                                        </div>
                                        {/* Meta */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                                                {video.title}
                                            </p>
                                            {video.channel_title && (
                                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                                                    <ExternalLink className="w-2.5 h-2.5" />
                                                    {video.channel_title}
                                                </p>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Back link */}
                    <div className="mt-12 pt-6 border-t border-slate-100 dark:border-white/10">
                        <Link
                            href="/experiencer"
                            className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to all experiencers
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
