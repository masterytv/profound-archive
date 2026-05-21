import { createClient as createAnonClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Play, ExternalLink, Heart, Brain, TrendingUp, Globe, Briefcase, Camera, BookMarked, LinkIcon } from "lucide-react";
import { SocialShareButton } from "@/components/video/ShareButton";
import Image from "next/image";
import ExperienceFingerprint from "@/components/experiencer/experience-fingerprint";
import MicroFeedback from "@/components/micro-feedback";

export const revalidate = 86400;

import AdminProfileActions from "@/components/experiencer/admin-profile-actions";

// ─── Types ──────────────────────────────────────────────────────────────────

type HighlightElement = {
    name: string;
    element_label: string;
    quote: string;
    confidence: number;
    video_id: string;
    channel_name?: string;
    channel_id?: string;
};

type ChannelAppearance = {
    channel_id: string;
    name: string;
    avatar_url: string | null;
    video_count: number;
};

type ExperiencerProfile = {
    id: number;
    slug: string;
    full_name: string;
    summary: string | null;
    bio: string | null;
    photo_url: string | null;
    video_ids: string[] | null;
    avg_greyson_score: number | null;
    avg_veridical_score: number | null;
    avg_transformation_score: number | null;
    big_questions_answered: string[] | null;
    thank_you_note: string | null;
    contribution_label: string | null;
    highlight_quote: string | null;
    highlight_quote_source: string | null;
    highlight_elements: HighlightElement[] | null;
    channel_appearances: ChannelAppearance[] | null;
    core_themes: string[] | null;
    first_shared_year: number | null;
    experience_type: string | null;
    trigger_category: string | null;
    social_links: Record<string, string> | null;
    offerings: Array<{ type: string; title: string; url: string; image_url?: string }> | null;
    published_at: string | null;
    updated_at: string;
};

type VideoRow = {
    id: string;
    title: string;
    thumbnail_url: string | null;
    channel_title: string | null;
    channel_id: string | null;
    view_count: number | null;
};

// ─── Build Client (SSG-safe) ────────────────────────────────────────────────

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

// ─── SEO Metadata ───────────────────────────────────────────────────────────

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const profile = await getProfile(slug);
    if (!profile) return { title: "Profile Not Found | Project Profound" };

    const title = `${profile.full_name} — NDE Experiencer | Project Profound`;
    const description = profile.highlight_quote
        ? `"${profile.highlight_quote.slice(0, 140)}…" — ${profile.full_name}'s near-death experience profiled by Project Profound.`
        : profile.summary?.slice(0, 160) ??
          `Explore ${profile.full_name}'s near-death experience, honored by Project Profound.`;

    return {
        title,
        description,
        openGraph: { title, description, type: "profile", images: [`/api/og/experiencer?slug=${slug}`] },
        twitter: { card: "summary_large_image", title, description },
    };
}

// ─── Display Labels ─────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
    nde: "Near-Death Experience", obe: "Out-of-Body Experience",
    sde: "Shared Death Experience", adc: "After-Death Communication",
    ste: "Spiritually Transformative Experience",
};

const TRIGGER_LABELS: Record<string, string> = {
    medical_crisis: "Medical Crisis", accident: "Accident", surgery: "Surgery",
    illness: "Illness", cardiac_arrest: "Cardiac Arrest", near_drowning: "Near Drowning",
    childbirth: "Childbirth", combat: "Combat", suicide_attempt: "Suicide Attempt",
    overdose: "Overdose", spontaneous: "Spontaneous", other: "Other", unknown: "Unknown",
};

const SOCIAL_ICONS: Record<string, { label: string; icon: React.ReactNode }> = {
    website: { label: "Website", icon: <Globe className="w-4 h-4" /> }, linkedin: { label: "LinkedIn", icon: <Briefcase className="w-4 h-4" /> },
    twitter: { label: "Twitter / X", icon: <span className="text-sm font-bold">𝕏</span> }, instagram: { label: "Instagram", icon: <Camera className="w-4 h-4" /> },
    youtube: { label: "YouTube", icon: <Play className="w-4 h-4" /> }, facebook: { label: "Facebook", icon: <BookMarked className="w-4 h-4" /> },
};

// ─── Section Heading ────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
            {children}
        </h2>
    );
}



// ─── Page ───────────────────────────────────────────────────────────────────

export default async function ExperiencerProfilePage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const profile = await getProfile(slug);
    if (!profile) notFound();

    // Fetch linked videos with channel_id
    const supabase = buildClient();
    let videos: VideoRow[] = [];
    if (profile.video_ids && profile.video_ids.length > 0) {
        const { data } = await supabase
            .from("nde_vids")
            .select("id:videoId, title, thumbnail_url:thumbnailUrl, channel_title:channelName, channel_id:channelId, view_count:viewCount")
            .in("videoId", profile.video_ids.slice(0, 20));
        videos = (data ?? []) as unknown as VideoRow[];
    }

    // Compute average scores from analysis data (DB fields may be null)
    let avgGreyson: number | null = null;
    let avgTransformation: number | null = null;
    let avgVeridical: number | null = null;
    if (profile.video_ids && profile.video_ids.length > 0) {
        // Greyson + Transformation from nde_analysis
        const { data: analyses } = await supabase
            .from("nde_analysis")
            .select("total_greyson_score, transformation_score")
            .in("video_id", profile.video_ids.slice(0, 50));
        if (analyses && analyses.length > 0) {
            const gs = analyses.map((a: Record<string, number | null>) => a.total_greyson_score).filter((v): v is number => v != null);
            const ts = analyses.map((a: Record<string, number | null>) => a.transformation_score).filter((v): v is number => v != null);
            if (gs.length) avgGreyson = Math.round(gs.reduce((a, b) => a + b, 0) / gs.length);
            if (ts.length) avgTransformation = Math.round(ts.reduce((a, b) => a + b, 0) / ts.length);
        }
        // Evidence/Veridical from nde_vids.rvnde_total_score
        const { data: vidScores } = await supabase
            .from("nde_vids")
            .select("rvnde_total_score:rvnde_total_score")
            .in("videoId", profile.video_ids.slice(0, 50))
            .not("rvnde_total_score", "is", null);
        if (vidScores && vidScores.length > 0) {
            const vs = vidScores.map((v: Record<string, number | null>) => v.rvnde_total_score).filter((v): v is number => v != null);
            if (vs.length) avgVeridical = Math.round(vs.reduce((a, b) => a + b, 0) / vs.length);
        }
    }

    // Sort by view count descending for "most watched"
    const sortedVideos = [...videos].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0));
    const mostWatched = sortedVideos[0] ?? null;

    const channelCount = profile.channel_appearances?.length ?? 0;
    const videoCount = profile.video_ids?.length ?? 0;

    // Build a video→channel lookup for enriching fingerprint elements
    const videoChannelMap = new Map(videos.map(v => [v.id, { name: v.channel_title, id: v.channel_id }]));

    // Enrich highlight_elements with channel info + timestamps
    const enrichedElements: import("@/components/experiencer/experience-fingerprint").FingerprintElement[] =
        (profile.highlight_elements || []).map((el: any) => ({
            name: el.name as string,
            element_label: el.element_label as string,
            quote: el.quote as string,
            confidence: el.confidence as number,
            video_id: el.video_id as string,
            channel_name: videoChannelMap.get(el.video_id)?.name || undefined,
            channel_id: videoChannelMap.get(el.video_id)?.id || undefined,
            timestamp_seconds: el.timestamp_seconds as number | undefined,
        }));

    // JSON-LD
    const jsonLd = {
        "@context": "https://schema.org", "@type": "Person",
        name: profile.full_name, description: profile.summary ?? undefined,
        url: `https://projectprofound.org/experiencer/${profile.slug}`,
        sameAs: Object.values(profile.social_links || {}).filter(Boolean),
    };
    const breadcrumbJsonLd = {
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://projectprofound.org" },
            { "@type": "ListItem", position: 2, name: "Experiencers", item: "https://projectprofound.org/experiencer" },
            { "@type": "ListItem", position: 3, name: profile.full_name, item: `https://projectprofound.org/experiencer/${profile.slug}` },
        ],
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

            <div className="min-h-screen bg-background text-foreground">
                {/* Breadcrumb */}
                <div className="border-b border-slate-200/60 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                    <div className="container mx-auto px-4 max-w-6xl py-4 flex items-center justify-between">
                        <Link href="/experiencer" className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm">
                            <ArrowLeft className="w-3.5 h-3.5" /> All Experiencers
                        </Link>
                        <SocialShareButton
                            url={`https://projectprofound.org/experiencer/${profile.slug}`}
                            title={`${profile.full_name}'s Near-Death Experience — Project Profound`}
                            description={`Explore ${profile.full_name}'s NDE profile on Project Profound.`}
                        />
                    </div>
                </div>

                <div className="container mx-auto px-4 max-w-6xl py-10">

                    {/* Admin Controls — only visible to admins */}
                    <AdminProfileActions
                        profileId={profile.id}
                        isPublished={profile.published_at !== null}
                    />

                    {/* ═══════════════════════════════════════════════════════
                         HERO: Two-column header — Photo+Name | Scores
                       ═══════════════════════════════════════════════════════ */}
                    <header className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-start mb-12">
                        {/* Left: Photo, Badge, Name, Intro */}
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                            {/* Large Photo */}
                            <div className="w-40 h-40 flex-shrink-0 rounded-2xl overflow-hidden shadow-xl border-4 border-white dark:border-slate-800">
                                {profile.photo_url ? (
                                    <Image
                                        src={profile.photo_url}
                                        alt={profile.full_name}
                                        width={160} height={160}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-violet-100 dark:from-blue-500/30 dark:to-violet-500/30 flex items-center justify-center">
                                        <span className="text-5xl font-bold text-blue-600 dark:text-blue-300">
                                            {profile.full_name.charAt(0)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="text-center sm:text-left">
                                {/* Large Courage Badge */}
                                <div className="mb-3">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-500/15 dark:to-yellow-500/15 border border-amber-200/60 dark:border-amber-500/30">
                                        <Heart className="w-5 h-5 text-amber-600 dark:text-amber-400 fill-amber-600 dark:fill-amber-400" />
                                        <span className="text-sm font-bold text-amber-700 dark:text-amber-300 tracking-wide">
                                            {profile.contribution_label || "Courageous Storyteller"}
                                        </span>
                                    </div>
                                </div>

                                {/* Name */}
                                <h1
                                    className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 leading-tight mb-3"
                                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                                >
                                    {profile.full_name}
                                </h1>

                                {/* Data-driven intro instead of gratitude statement */}
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg">
                                    {profile.full_name} has been in{" "}
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{videoCount} {videoCount === 1 ? "video" : "videos"}</span>
                                    {channelCount > 0 && (
                                        <> across <span className="font-semibold text-slate-800 dark:text-slate-200">{channelCount} {channelCount === 1 ? "channel" : "channels"}</span></>
                                    )}
                                    {profile.first_shared_year && <> since {profile.first_shared_year}</>}.
                                </p>

                                {/* Type & Trigger Badges */}
                                <div className="flex items-center gap-2 mt-3 flex-wrap justify-center sm:justify-start">
                                    {profile.experience_type && (
                                        <span className="text-xs font-medium px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/30">
                                            {TYPE_LABELS[profile.experience_type] || profile.experience_type}
                                        </span>
                                    )}
                                    {profile.trigger_category && profile.trigger_category !== "unknown" && (
                                        <span className="text-xs font-medium px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                                            {TRIGGER_LABELS[profile.trigger_category] || profile.trigger_category}
                                        </span>
                                    )}
                                </div>

                                {/* Highlight Quote — inline under badges */}
                                {profile.highlight_quote && (
                                    <blockquote className="mt-4 text-slate-500 dark:text-slate-400 italic leading-relaxed max-w-lg">
                                        &ldquo;{profile.highlight_quote}&rdquo;
                                        {profile.highlight_quote_source && (
                                            <span className="not-italic text-xs text-slate-400 dark:text-slate-500 ml-1">
                                                — {profile.highlight_quote_source}
                                            </span>
                                        )}
                                    </blockquote>
                                )}
                            </div>
                        </div>

                        {/* Right: Score Cards — stacked */}
                        {(avgGreyson !== null || avgTransformation !== null || avgVeridical !== null) && (
                        <div className="flex flex-col gap-2 self-center w-full md:w-56">
                            {/* Experience Depth (Greyson) */}
                            {avgGreyson !== null && (
                                <div className="rounded-xl p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Brain className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Experience Depth</span>
                                    </div>
                                    <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{Math.round((avgGreyson / 32) * 100)}%</span>
                                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">Classic NDE hallmarks present</p>
                                </div>
                            )}
                            {/* Life Impact (Transformation) */}
                            {avgTransformation !== null && (
                                <div className="rounded-xl p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Heart className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Life Impact</span>
                                    </div>
                                    <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{Math.round((avgTransformation / 50) * 100)}%</span>
                                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">How deeply this changed their life</p>
                                </div>
                            )}
                            {/* Evidence Strength (Veridical) */}
                            {avgVeridical !== null && (
                                <div className="rounded-xl p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Evidence Strength</span>
                                    </div>
                                    <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{Math.round((avgVeridical / 28) * 100)}%</span>
                                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">Independently verifiable details</p>
                                </div>
                            )}
                        </div>
                        )}
                    </header>

                    {/* ═══════════════════════════════════════════════════════
                         INTRO: Summary from most-watched video + thumbnail
                       ═══════════════════════════════════════════════════════ */}
                    {profile.summary && mostWatched && (
                        <section className="mb-12">
                            <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 p-5 flex flex-col sm:flex-row gap-5">
                                {/* Thumbnail from most-watched video */}
                                <Link href={`/video/${mostWatched.id}`} className="relative flex-shrink-0 w-full sm:w-64 aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 group">
                                    {mostWatched.thumbnail_url ? (
                                        <Image
                                            src={mostWatched.thumbnail_url}
                                            alt={mostWatched.title}
                                            fill
                                            sizes="256px"
                                            className="object-cover"
                                        />
                                    ) : null}
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                        <Play className="w-10 h-10 text-white drop-shadow-lg" fill="white" />
                                    </div>
                                </Link>
                                <div className="flex-1">
                                    <p className="text-xs font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400 mb-2">
                                        Their Story
                                    </p>
                                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                        {profile.summary}
                                    </p>
                                    <p className="mt-3 text-xs text-slate-400 dark:text-slate-500 italic">
                                        Summary from their most-watched video on{" "}
                                        {mostWatched.channel_title && (
                                            <Link href={`/channel/${mostWatched.channel_id}`} className="text-blue-500 dark:text-blue-400 hover:underline not-italic font-medium">
                                                {mostWatched.channel_title}
                                            </Link>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}


                    {/* ═══════════════════════════════════════════════════════
                         TWO-COLUMN BODY — collapses on mobile
                       ═══════════════════════════════════════════════════════ */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-12">

                        {/* ─── LEFT COL ─── */}
                        <div className="space-y-12">
                            {/* Experience Fingerprint */}
                            {enrichedElements.length > 0 && (
                                <section>
                                    <SectionHeading>Experience Fingerprint</SectionHeading>
                                    <p className="text-sm text-slate-400 dark:text-slate-500 mb-6 max-w-md">
                                        Each element they described. Tap a glowing element to read their words.
                                    </p>
                                    <ExperienceFingerprint
                                        elements={enrichedElements}
                                        experiencerName={profile.full_name}
                                    />
                                </section>
                            )}

                            {/* Seeds They Plant (Core Themes) */}
                            {profile.core_themes && profile.core_themes.length > 0 && (
                                <section>
                                    <SectionHeading>Seeds They Plant</SectionHeading>
                                    <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
                                        Across every telling, {profile.full_name} returns to these truths:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.core_themes.map((theme, i) => (
                                            <span key={i} className="text-sm px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-500/20">
                                                {theme}
                                            </span>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Big Questions */}
                            {profile.big_questions_answered && profile.big_questions_answered.length > 0 && (
                                <section>
                                    <SectionHeading>Questions Their Account Illuminates</SectionHeading>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.big_questions_answered.map((qSlug) => (
                                            <Link key={qSlug} href={`/questions/${qSlug}`}
                                                className="text-sm px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-500/30 transition-colors">
                                                {qSlug.replace(/-/g, " ")}
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Their Work & Mission */}
                            {((profile.social_links && Object.values(profile.social_links).some(Boolean)) ||
                              (profile.offerings && profile.offerings.length > 0)) && (
                                <section>
                                    <SectionHeading>Their Work &amp; Mission</SectionHeading>
                                    <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
                                        If {profile.full_name}&apos;s story moved you, go deeper with their work.
                                    </p>
                                    {profile.social_links && Object.keys(profile.social_links).length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {Object.entries(profile.social_links).map(([key, url]) => {
                                                if (!url) return null;
                                                const social = SOCIAL_ICONS[key];
                                                return (
                                                    <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                                                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-sm text-slate-600 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-500/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all">
                                                        {social?.icon || <LinkIcon className="w-4 h-4" />} {social?.label || key}
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {profile.offerings && profile.offerings.length > 0 && (
                                        <div className="grid grid-cols-1 gap-3">
                                            {profile.offerings.map((item, i) => (
                                                <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                                                    className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 hover:shadow-md transition-all">
                                                    {item.image_url && <Image src={item.image_url} alt={item.title} width={48} height={48} className="rounded-lg object-cover" />}
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.title}</p>
                                                        <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{item.type}</p>
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            )}
                        </div>

                        {/* ─── RIGHT COL ─── */}
                        <div className="space-y-12">
                            {/* In Their Own Words — Quote Cards with video links */}
                            {enrichedElements.length > 1 && (
                                <section>
                                    <SectionHeading>In Their Own Words</SectionHeading>
                                    <div className="grid grid-cols-1 gap-3">
                                        {enrichedElements
                                            .filter(el => el.quote && el.quote.length > 15)
                                            .slice(0, 6)
                                            .map((el, i) => (
                                                <div key={i} className="bg-white dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/10 p-4">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400 mb-2 block">
                                                        {el.element_label}
                                                    </span>
                                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic mb-3">
                                                        &ldquo;{el.quote}&rdquo;
                                                    </p>
                                                    <div className="flex items-center justify-between">
                                                        {el.channel_name && (
                                                            <Link href={`/channel/${el.channel_id}`}
                                                                className="text-xs text-blue-500 dark:text-blue-400 hover:underline font-medium">
                                                                {el.channel_name}
                                                            </Link>
                                                        )}
                                                        <Link href={el.timestamp_seconds != null
                                                                ? `/video/${el.video_id}?t=${el.timestamp_seconds}`
                                                                : `/video/${el.video_id}`}
                                                            className="inline-flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400 hover:underline font-medium">
                                                            <Play className="w-3 h-3" /> Watch
                                                        </Link>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>

                    {/* ═══════════════════════════════════════════════════════
                         FULL-WIDTH SECTIONS BELOW TWO-COLUMN GRID
                       ═══════════════════════════════════════════════════════ */}

                    {/* Channels — full width 2-col grid */}
                    {profile.channel_appearances && profile.channel_appearances.length > 0 && (
                        <section className="mt-12">
                            <SectionHeading>Communities They&apos;ve Trusted</SectionHeading>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                {profile.channel_appearances.map((ch) => (
                                    <Link key={ch.channel_id} href={`/channel/${ch.channel_id}`}
                                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/30 transition-colors">
                                        {ch.avatar_url ? (
                                            <Image src={ch.avatar_url} alt={ch.name} width={28} height={28} className="rounded-full flex-shrink-0" />
                                        ) : (
                                            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 truncate">{ch.name}</p>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                                {ch.video_count} {ch.video_count === 1 ? "video" : "videos"}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Videos — full width 2-col grid */}
                    {sortedVideos.length > 0 && (
                        <section className="mt-12">
                            <SectionHeading>Watch &amp; Listen</SectionHeading>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {sortedVideos.map((video) => (
                                    <Link key={video.id} href={`/video/${video.id}`}
                                        className="group bg-white dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/10 overflow-hidden hover:shadow-md hover:border-blue-300/60 dark:hover:border-blue-500/30 transition-all">
                                        <div className="relative w-full aspect-video bg-slate-100 dark:bg-slate-800">
                                            {video.thumbnail_url ? (
                                                <Image
                                                    src={video.thumbnail_url}
                                                    alt={video.title}
                                                    fill
                                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Play className="w-6 h-6 text-slate-400" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="white" />
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <p className="text-sm font-bold text-slate-900 dark:text-slate-50 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                                                {video.title}
                                            </p>
                                            {video.channel_title && (
                                                <p className="text-xs text-blue-500 dark:text-blue-400 mt-1 flex items-center gap-1 font-medium truncate">
                                                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                    {video.channel_title}
                                                </p>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ═══════════════════════════════════════════════════════
                         FOOTER — full width below two columns
                       ═══════════════════════════════════════════════════════ */}

                    {/* Thank You Note */}
                    {profile.thank_you_note && (
                        <section className="mt-12 bg-gradient-to-br from-amber-50/50 to-yellow-50/50 dark:from-amber-500/5 dark:to-yellow-500/5 rounded-xl p-6 border border-amber-200/40 dark:border-amber-500/20">
                            <p className="text-xs font-bold uppercase tracking-widest text-amber-500 dark:text-amber-400 mb-2">
                                A note from Project Profound
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                                {profile.thank_you_note}
                            </p>
                        </section>
                    )}

                    {/* Gratitude Footer */}
                    <footer className="border-t border-slate-100 dark:border-white/10 pt-8 mt-12">
                        <div className="text-center mb-8">
                            <p className="text-sm text-slate-500 dark:text-slate-400 italic max-w-lg mx-auto">
                                Thank you, {profile.full_name}, for trusting the world with your most sacred experience. What you shared matters.
                            </p>
                        </div>
                        <div className="text-center mb-8 p-6 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/10">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                Know {profile.full_name}? Share their profile with them.
                            </p>
                            <div className="flex justify-center">
                                <SocialShareButton
                                    url={`https://projectprofound.org/experiencer/${profile.slug}`}
                                    title={`${profile.full_name}'s Near-Death Experience — Project Profound`}
                                    description={`Explore ${profile.full_name}'s NDE profile on Project Profound.`}
                                />
                            </div>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-600 text-center leading-relaxed max-w-md mx-auto">
                            This page was composed from {profile.full_name}&apos;s own words in recorded interviews. Quotes are verbatim from video transcripts.
                        </p>
                        <div className="mt-8 flex justify-center">
                            <MicroFeedback
                                feature="experiencer_profile"
                                contextId={slug}
                                prompt="Was this profile helpful?"
                            />
                        </div>
                        <div className="mt-6 text-center">
                            <Link href="/experiencer"
                                className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                <ArrowLeft className="w-4 h-4" /> Back to all experiencers
                            </Link>
                        </div>
                    </footer>
                </div>
            </div>
        </>
    );
}
