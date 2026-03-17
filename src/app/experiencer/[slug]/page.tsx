import { createClient as createAnonClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Play, ExternalLink, Globe, Share2, Heart, Sparkles, Copy } from "lucide-react";
import Image from "next/image";
import ExperienceFingerprint from "@/components/experiencer/experience-fingerprint";

export const revalidate = 86400;

// ─── Types ──────────────────────────────────────────────────────────────────

type HighlightElement = {
    name: string;
    element_label: string;
    quote: string;
    confidence: number;
    video_id: string;
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
        openGraph: {
            title,
            description,
            type: "profile",
            images: [`/api/og/experiencer?slug=${slug}`],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
        },
    };
}

// ─── Display Labels ─────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
    medical_crisis: "Medical Crisis",
    accident: "Accident",
    surgery: "Surgery",
    illness: "Illness",
    cardiac_arrest: "Cardiac Arrest",
    near_drowning: "Near Drowning",
    childbirth: "Childbirth",
    combat: "Combat",
    suicide_attempt: "Suicide Attempt",
    overdose: "Overdose",
    allergic_reaction: "Allergic Reaction",
    spontaneous: "Spontaneous",
    other: "Other",
    unknown: "Unknown",
};

const TYPE_LABELS: Record<string, string> = {
    nde: "Near-Death Experience",
    obe: "Out-of-Body Experience",
    sde: "Shared Death Experience",
    adc: "After-Death Communication",
    ste: "Spiritually Transformative Experience",
};

const SOCIAL_ICONS: Record<string, { label: string; icon: string }> = {
    website: { label: "Website", icon: "🌐" },
    linkedin: { label: "LinkedIn", icon: "💼" },
    twitter: { label: "Twitter / X", icon: "𝕏" },
    instagram: { label: "Instagram", icon: "📸" },
    youtube: { label: "YouTube", icon: "▶" },
    facebook: { label: "Facebook", icon: "📘" },
};

// ─── Courage Badge Component ────────────────────────────────────────────────

function CourageBadge({ label }: { label: string }) {
    return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-500/15 dark:to-yellow-500/15 border border-amber-200/60 dark:border-amber-500/30">
            <Heart className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-600 dark:fill-amber-400" />
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 tracking-wide">
                {label}
            </span>
        </div>
    );
}

// ─── Share Button Component ─────────────────────────────────────────────────

function ShareButton({ name, slug }: { name: string; slug: string }) {
    const url = `https://projectprofound.org/experiencer/${slug}`;
    const text = `Read about ${name}'s near-death experience on Project Profound`;

    return (
        <div className="flex items-center gap-2">
            <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-500/20 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition-all"
            >
                <Share2 className="w-3.5 h-3.5" /> Share
            </a>
        </div>
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

    // Fetch linked videos
    let videos: VideoRow[] = [];
    if (profile.video_ids && profile.video_ids.length > 0) {
        const supabase = await createClient();
        const { data } = await supabase
            .from("nde_vids")
            .select("id:videoId, title, thumbnail_url:thumbnailUrl, channel_title:channelName, view_count:viewCount")
            .in("videoId", profile.video_ids.slice(0, 20));
        videos = (data ?? []) as unknown as VideoRow[];
    }

    const channelCount = profile.channel_appearances?.length ?? 0;
    const videoCount = profile.video_ids?.length ?? 0;

    // JSON-LD
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Person",
        name: profile.full_name,
        description: profile.summary ?? undefined,
        url: `https://projectprofound.org/experiencer/${profile.slug}`,
        sameAs: Object.values(profile.social_links || {}).filter(Boolean),
    };

    const breadcrumbJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
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
                    <div className="container mx-auto px-4 max-w-4xl py-4 flex items-center justify-between">
                        <Link href="/experiencer" className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm">
                            <ArrowLeft className="w-3.5 h-3.5" />
                            All Experiencers
                        </Link>
                        <ShareButton name={profile.full_name} slug={profile.slug} />
                    </div>
                </div>

                <div className="container mx-auto px-4 max-w-3xl py-12">

                    {/* ═══ SECTION 1: Gratitude Header ═══ */}
                    <header className="mb-12 text-center">
                        {/* Photo */}
                        <div className="w-24 h-24 mx-auto mb-5 rounded-2xl overflow-hidden shadow-lg">
                            {profile.photo_url ? (
                                <Image
                                    src={profile.photo_url}
                                    alt={profile.full_name}
                                    width={96}
                                    height={96}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-violet-100 dark:from-blue-500/30 dark:to-violet-500/30 flex items-center justify-center">
                                    <span className="text-3xl font-bold text-blue-600 dark:text-blue-300">
                                        {profile.full_name.charAt(0)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Courage Badge */}
                        <div className="mb-3">
                            <CourageBadge label={profile.contribution_label || "Courageous Storyteller"} />
                        </div>

                        {/* Name */}
                        <h1
                            className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 leading-tight mb-3"
                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                        >
                            {profile.full_name}
                        </h1>

                        {/* Gratitude Statement */}
                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl mx-auto">
                            We honor {profile.full_name} for sharing their experience with the world.
                            Their courage helps others feel less alone and helps all of us understand
                            ourselves and our place in the Universe with more clarity.
                        </p>

                        {/* Impact Line */}
                        <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">
                            {videoCount > 0 && (
                                <>
                                    Shared across {videoCount} {videoCount === 1 ? "conversation" : "conversations"}
                                    {channelCount > 0 && ` on ${channelCount} ${channelCount === 1 ? "channel" : "channels"}`}
                                    {profile.first_shared_year && ` since ${profile.first_shared_year}`}
                                </>
                            )}
                        </p>

                        {/* Type & Trigger Badges */}
                        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
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
                    </header>

                    {/* ═══ SECTION 2: Featured Quote ═══ */}
                    {profile.highlight_quote && (
                        <section className="mb-12">
                            <div className="relative bg-gradient-to-br from-blue-50/50 to-violet-50/50 dark:from-blue-500/5 dark:to-violet-500/5 rounded-2xl p-8 border border-blue-100/60 dark:border-blue-500/20">
                                <Sparkles className="absolute top-4 right-4 w-5 h-5 text-blue-300 dark:text-blue-500/50" />
                                <blockquote className="text-xl sm:text-2xl text-slate-800 dark:text-slate-200 leading-relaxed italic" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
                                    &ldquo;{profile.highlight_quote}&rdquo;
                                </blockquote>
                                {profile.highlight_quote_source && (
                                    <p className="mt-4 text-sm text-slate-400 dark:text-slate-500">
                                        — {profile.full_name}, from their account on {profile.highlight_quote_source}
                                    </p>
                                )}
                            </div>
                        </section>
                    )}

                    {/* ═══ SECTION 3: Experience Fingerprint ═══ */}
                    {profile.highlight_elements && profile.highlight_elements.length > 0 && (
                        <section className="mb-12">
                            <h2
                                className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2 text-center"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                Their Experience Fingerprint
                            </h2>
                            <p className="text-sm text-slate-400 dark:text-slate-500 text-center mb-6 max-w-md mx-auto">
                                Each element they described in their experience. Tap a glowing element to read their words.
                            </p>
                            <ExperienceFingerprint
                                elements={profile.highlight_elements}
                                experiencerName={profile.full_name}
                            />
                        </section>
                    )}

                    {/* ═══ SECTION 4: In Their Own Words (Quote Cards) ═══ */}
                    {profile.highlight_elements && profile.highlight_elements.length > 1 && (
                        <section className="mb-12">
                            <h2
                                className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                In Their Own Words
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {profile.highlight_elements
                                    .filter(el => el.quote && el.quote.length > 15)
                                    .slice(0, 6)
                                    .map((el, i) => (
                                        <div
                                            key={i}
                                            className="bg-white dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/10 p-4"
                                        >
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400 mb-2 block">
                                                {el.element_label}
                                            </span>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                                &ldquo;{el.quote}&rdquo;
                                            </p>
                                        </div>
                                    ))}
                            </div>
                        </section>
                    )}

                    {/* ═══ SECTION 5: The Story ═══ */}
                    {profile.summary && (
                        <section className="mb-12">
                            <h2
                                className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                Their Story
                            </h2>
                            <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/10 p-5">
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                    {profile.summary}
                                </p>
                                <p className="mt-3 text-xs text-slate-400 dark:text-slate-500 italic">
                                    Composed from {profile.full_name}&apos;s own words across{" "}
                                    {videoCount} recorded {videoCount === 1 ? "conversation" : "conversations"}.
                                </p>
                            </div>
                        </section>
                    )}

                    {/* ═══ SECTION 6: Seeds They Plant (Core Themes) ═══ */}
                    {profile.core_themes && profile.core_themes.length > 0 && (
                        <section className="mb-12">
                            <h2
                                className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                Seeds They Plant
                            </h2>
                            <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
                                Across every telling, {profile.full_name} returns to these truths:
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {profile.core_themes.map((theme, i) => (
                                    <span
                                        key={i}
                                        className="text-sm px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-500/20"
                                    >
                                        {theme}
                                    </span>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ═══ SECTION 7: Channels & Videos ═══ */}
                    {/* Channel appearances */}
                    {profile.channel_appearances && profile.channel_appearances.length > 0 && (
                        <section className="mb-8">
                            <h2
                                className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                Communities They&apos;ve Trusted
                            </h2>
                            <div className="flex flex-wrap gap-3">
                                {profile.channel_appearances.map((ch) => (
                                    <Link
                                        key={ch.channel_id}
                                        href={`/channel/${ch.channel_id}`}
                                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/30 transition-colors"
                                    >
                                        {ch.avatar_url ? (
                                            <Image src={ch.avatar_url} alt={ch.name} width={24} height={24} className="rounded-full" />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700" />
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{ch.name}</p>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                                {ch.video_count} {ch.video_count === 1 ? "appearance" : "appearances"}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Video grid */}
                    {videos.length > 0 && (
                        <section className="mb-12">
                            <h2
                                className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                Watch &amp; Listen
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {videos.map((video) => (
                                    <Link
                                        key={video.id}
                                        href={`/video/${video.id}`}
                                        className="group flex gap-3 bg-white dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/10 p-3 hover:shadow-md hover:border-blue-300/60 dark:hover:border-blue-500/30 transition-all"
                                    >
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

                    {/* ═══ SECTION 8: Their Work & Mission ═══ */}
                    {(profile.social_links && Object.values(profile.social_links).some(Boolean)) ||
                    (profile.offerings && profile.offerings.length > 0) ? (
                        <section className="mb-12">
                            <h2
                                className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                Their Work &amp; Mission
                            </h2>
                            <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
                                If {profile.full_name}&apos;s story moved you, here are ways to go deeper with their work.
                            </p>

                            {/* Social links */}
                            {profile.social_links && Object.keys(profile.social_links).length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {Object.entries(profile.social_links).map(([key, url]) => {
                                        if (!url) return null;
                                        const social = SOCIAL_ICONS[key];
                                        return (
                                            <a
                                                key={key}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-sm text-slate-600 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-500/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                                            >
                                                <span>{social?.icon || "🔗"}</span>
                                                {social?.label || key}
                                            </a>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Offerings/Books */}
                            {profile.offerings && profile.offerings.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {profile.offerings.map((item, i) => (
                                        <a
                                            key={i}
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 hover:shadow-md transition-all"
                                        >
                                            {item.image_url && (
                                                <Image src={item.image_url} alt={item.title} width={48} height={48} className="rounded-lg object-cover" />
                                            )}
                                            <div>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.title}</p>
                                                <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{item.type}</p>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </section>
                    ) : null}

                    {/* ═══ SECTION 9: Big Questions Answered ═══ */}
                    {profile.big_questions_answered && profile.big_questions_answered.length > 0 && (
                        <section className="mb-12">
                            <h2
                                className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                Questions Their Account Illuminates
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

                    {/* ═══ SECTION 10: Thank You Note ═══ */}
                    {profile.thank_you_note && (
                        <section className="mb-12 bg-gradient-to-br from-amber-50/50 to-yellow-50/50 dark:from-amber-500/5 dark:to-yellow-500/5 rounded-xl p-6 border border-amber-200/40 dark:border-amber-500/20">
                            <p className="text-xs font-bold uppercase tracking-widest text-amber-500 dark:text-amber-400 mb-2">
                                A note from Project Profound
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                                {profile.thank_you_note}
                            </p>
                        </section>
                    )}

                    {/* ═══ SECTION 11: Gratitude & Transparency Footer ═══ */}
                    <footer className="border-t border-slate-100 dark:border-white/10 pt-8 mt-12">
                        <div className="text-center mb-8">
                            <p className="text-sm text-slate-500 dark:text-slate-400 italic max-w-lg mx-auto">
                                Thank you, {profile.full_name}, for trusting the world with your most sacred experience.
                                What you shared matters.
                            </p>
                        </div>

                        {/* Share CTA */}
                        <div className="text-center mb-8 p-6 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/10">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                Know {profile.full_name}? Share their profile with them.
                            </p>
                            <ShareButton name={profile.full_name} slug={profile.slug} />
                        </div>

                        {/* Transparency */}
                        <p className="text-[11px] text-slate-400 dark:text-slate-600 text-center leading-relaxed max-w-md mx-auto">
                            This page was composed from {profile.full_name}&apos;s own words in recorded interviews.
                            Quotes are verbatim from video transcripts. No content is fabricated.
                        </p>

                        {/* Back link */}
                        <div className="mt-6 text-center">
                            <Link
                                href="/experiencer"
                                className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to all experiencers
                            </Link>
                        </div>
                    </footer>
                </div>
            </div>
        </>
    );
}
