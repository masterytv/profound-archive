import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, BookOpen, Video, List } from "lucide-react";
import type { Metadata } from "next";
import { SearchResultCardV4 } from "@/components/search-result-card-v4";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CrisisBanner } from "@/components/crisis-banner";
import { isCrisisTopic } from "@/lib/questions/crisis-detection";
import { createClient } from "@/lib/supabase/server";

// ─── Types ───────────────────────────────────────────────────────────────────

interface QuestionAnswer {
    slug: string;
    question: string;
    ai_query?: string;  // HyDE passage used for semantic search — shown for debugging
    shortAnswer: string;
    answer: {
        paragraphs: string[];
        citedVideoIds: string[];
    };
    referencedVideos: ReferencedVideo[];
    moreVideos: MoreVideo[];
}

interface ReferencedVideo {
    video_id: string;
    url: string;
    title: string;
    thumbnailUrl: string;
    date: string | null;
    viewCount: string;
    channelName: string;
    summary: string;
    transcripts: Array<{ content: string; start_time: number }>;
}

interface MoreVideo {
    video_id: string;
    title: string;
    channelName: string;
    thumbnailUrl: string;
    viewCount: number;
    date: string | null;
    experienceType: string;
    tone: string;
    greysonScore: number | null;
    relevance: number;
}


// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatViewCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n.toString();
}

function formatDate(dateString: string | null): string {
    if (!dateString) return "—";
    try {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch {
        return "—";
    }
}

// ─── Metadata ────────────────────────────────────────────────────────────────

type QuestionResult = QuestionAnswer | { no_results: true; question: string; slug: string } | null;

async function fetchQuestionData(slug: string): Promise<QuestionResult> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
            ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
        const res = await fetch(`${baseUrl}/api/questions/${encodeURIComponent(slug)}`, {
            cache: 'no-store',
        });
        if (!res.ok) return null;
        const json = await res.json();
        if (json.no_results) return json as { no_results: true; question: string; slug: string };
        return json as QuestionAnswer;
    } catch (err) {
        console.error('[QuestionsPage] fetch error:', err);
        return null;
    }
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const data = await fetchQuestionData(slug);
    const question = data?.question ?? slug.split('-').join(' ');
    return {
        title: `${question} | Project Profound`,
        description: `What do near-death experiences tell us about: ${question} — answered from 5,000+ real NDE accounts.`,
    };
}

// ─── Page ────────────────────────────────────────────────────────────────────

function NoResultsPage({ question }: { question: string }) {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="border-b border-border/60 bg-muted/30">
                <div className="container mx-auto px-4 max-w-5xl py-3">
                    <Link
                        href="/questions"
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        All Questions
                    </Link>
                </div>
            </div>
            <div className="container mx-auto px-4 max-w-2xl py-24 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
                    <BookOpen className="w-8 h-8 text-slate-400" />
                </div>
                <h1
                    className="text-2xl font-bold text-slate-900 mb-3"
                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                >
                    Not enough NDE evidence found
                </h1>
                <p className="text-slate-600 text-base leading-relaxed mb-2">
                    We searched 5,000+ near-death experience accounts for:
                </p>
                <p className="text-slate-800 font-medium italic mb-8 text-lg">&#8220;{question}&#8221;</p>
                <p className="text-slate-500 text-sm leading-relaxed mb-8">
                    Our database doesn&apos;t have enough relevant testimony to give you a reliable answer
                    to this specific question. NDEs are a rich but finite dataset.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/questions"
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
                    >
                        Browse curated questions
                    </Link>
                    <Link
                        href="/search3"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        Search NDE accounts directly
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default async function QuestionResultPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    // Check if the current user is an admin — gates the ai_query debug panel
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let isAdmin = false;
    if (user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
        isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
    }

    const data = await fetchQuestionData(slug);

    if (!data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-muted-foreground text-lg">Question not found.</p>
                <Link href="/questions" className="text-primary hover:underline text-sm">
                    ← Browse all questions
                </Link>
            </div>
        );
    }

    // No-results state — insufficient NDE evidence
    if ('no_results' in data) {
        return <NoResultsPage question={data.question} />;
    }

    return (
        <div className="min-h-screen bg-background text-foreground">

            {/* ── Breadcrumb ───────────────────────────────────────────── */}
            <div className="border-b border-border/60 bg-muted/30">
                <div className="container mx-auto px-4 max-w-5xl py-3">
                    <Link
                        href="/questions"
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        All Questions
                    </Link>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                ABOVE THE FOLD HERO
                1. Title
                2. Short Answer
                3. Small Thumbnail Strip
                ═══════════════════════════════════════════════════════ */}
            <section
                className="relative overflow-hidden pt-12 pb-10"
                style={{
                    background: "linear-gradient(135deg, #F0FDF4 0%, #F8FAFC 40%, #EFF6FF 100%)",
                }}
            >
                {/* subtle dot grid */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: "radial-gradient(circle, #059669 1px, transparent 1px)",
                        backgroundSize: "32px 32px",
                    }}
                />

                <div className="relative container mx-auto px-4 max-w-3xl">

                    {/* Crisis safety banner — shown for any question involving suicide, self-harm, etc. */}
                    {isCrisisTopic(data.question) && <CrisisBanner />}

                    {/* 1. Title */}
                    <h1
                        className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-[1.2] mb-4"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                        {data.question}
                    </h1>

                    {/* HyDE ai_query panel — admin only */}
                    {isAdmin && data.ai_query && (
                        <details className="mb-5 group">
                            <summary className="cursor-pointer text-xs font-mono text-slate-400 hover:text-slate-600 transition-colors select-none list-none flex items-center gap-1.5">
                                <span className="inline-block w-3 h-3 rotate-0 group-open:rotate-90 transition-transform">▶</span>
                                <span>Search query used (ai_query) — <span className="text-amber-500 font-bold">Admin only</span></span>
                            </summary>
                            <div className="mt-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 mb-1">HyDE Passage (embedded for semantic search) — Admin only</p>
                                <p className="text-sm text-amber-900 leading-relaxed italic">{data.ai_query}</p>
                            </div>
                        </details>
                    )}

                    {/* 2. Short Answer — direct, confident pull-quote */}
                    <p
                        className="text-lg sm:text-xl font-medium text-emerald-800 leading-relaxed mb-8"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                        {data.shortAnswer}
                    </p>

                    {/* 3. Small Thumbnail Strip — click to scroll to detail cards */}
                    <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
                        {data.referencedVideos.map((video, i) => (
                            <a
                                key={video.video_id}
                                href={`#ref-video-${video.video_id}`}
                                className="group flex-1 min-w-[120px] max-w-[180px]"
                                title={video.title}
                            >
                                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted shadow-sm ring-1 ring-black/5 group-hover:ring-2 group-hover:ring-emerald-500/50 transition-all">
                                    <Image
                                        src={video.thumbnailUrl}
                                        alt={video.title}
                                        fill
                                        sizes="(max-width: 640px) 33vw, 180px"
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    {/* dark scrim + play icon on hover */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                        <div className="w-8 h-8 rounded-full bg-white/0 group-hover:bg-white/90 flex items-center justify-center transition-all scale-75 group-hover:scale-100">
                                            <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-800 fill-current ml-0.5">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </div>
                                    </div>
                                    {/* citation number badge */}
                                    <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shadow">
                                        {i + 1}
                                    </div>
                                </div>
                                <p className="mt-1.5 text-[11px] text-slate-600 line-clamp-2 leading-[1.3]">
                                    {video.channelName}
                                </p>
                            </a>
                        ))}

                        {/* "↓ More videos" nudge — shown when there are >3 refs future-proof */}
                        <div className="hidden sm:flex flex-col justify-start pt-1">
                            <a
                                href="#more-videos"
                                className="text-xs text-slate-400 hover:text-emerald-700 transition-colors inline-flex flex-col items-center gap-1 mt-2"
                            >
                                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                                    <path d="M7 10l5 5 5-5z" />
                                </svg>
                                <span className="whitespace-nowrap">{data.moreVideos.length} more</span>
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════
                LONG ANSWER — below the fold
                ═══════════════════════════════════════════════════════ */}
            <section
                className="relative overflow-hidden py-12"
                style={{
                    background: "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)",
                }}
            >
                <div className="relative container mx-auto px-4 max-w-3xl space-y-6">

                    {/* Section label */}
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-5 rounded-full bg-emerald-500" />
                        <span className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
                            A Deeper Look
                        </span>
                    </div>

                    {data.answer.paragraphs.map((para, i) => (
                        <p
                            key={i}
                            className="text-slate-700 leading-[1.85] text-[1.05rem]"
                        >
                            {para}
                        </p>
                    ))}

                    {/* AI disclaimer */}
                    <div className="mt-8 flex items-start gap-2.5 bg-white/80 border border-slate-100 rounded-xl p-4 text-sm text-slate-400 shadow-sm">
                        <span className="shrink-0 mt-0.5 text-slate-300">✦</span>
                        <p className="leading-relaxed">
                            This synthesis was generated from real NDE accounts in our archive. It is
                            not medical or spiritual advice. Accounts are first-person testimonies —
                            reported experiences, not verified facts.
                        </p>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════
                BOTTOM SECTIONS — full width content
                ═══════════════════════════════════════════════════════ */}
            <div className="container mx-auto px-4 max-w-5xl py-12 space-y-16">

                {/* ════════ SECTION: Videos Referenced ════════ */}
                <section>
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                            <Video className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <h2
                                className="text-2xl font-bold text-slate-900"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                Videos Referenced
                            </h2>
                            <p className="text-sm text-slate-500">
                                The accounts cited above, with the relevant quotes
                            </p>
                        </div>
                    </div>

                    <div className="space-y-5">
                        {data.referencedVideos.map((video) => (
                            // Anchor target so thumbnail strip links scroll here
                            <div key={video.video_id} id={`ref-video-${video.video_id}`}>
                                <SearchResultCardV4
                                    video={video}
                                    user={null}
                                />
                            </div>
                        ))}
                    </div>
                </section>

                {/* ════════ SECTION: More Relevant Videos ════════ */}
                <section id="more-videos">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                            <List className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2
                                className="text-2xl font-bold text-slate-900"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                More Relevant Videos
                            </h2>
                            <p className="text-sm text-slate-500">
                                Additional accounts from the archive related to this question
                            </p>
                        </div>
                    </div>

                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border/60 bg-muted/40">
                                        <th className="text-left font-medium text-muted-foreground px-4 py-3 w-16 hidden sm:table-cell">
                                            Video
                                        </th>
                                        <th className="text-left font-medium text-muted-foreground px-4 py-3">
                                            Title
                                        </th>
                                        <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">
                                            Channel
                                        </th>
                                        <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">
                                            Type
                                        </th>
                                        <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">
                                            Tone
                                        </th>
                                        <th className="text-right font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">
                                            Greyson
                                        </th>
                                        <th className="text-right font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">
                                            Views
                                        </th>
                                        <th className="text-right font-medium text-muted-foreground px-4 py-3">
                                            Relevance
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.moreVideos.map((video, i) => (
                                        <tr
                                            key={video.video_id}
                                            className={`border-b border-border/40 hover:bg-muted/30 transition-colors ${
                                                i % 2 === 0 ? "" : "bg-muted/10"
                                            }`}
                                        >
                                            {/* Thumbnail */}
                                            <td className="px-4 py-3 hidden sm:table-cell">
                                                <Link href={`/video/${video.video_id}`}>
                                                    <div className="relative w-14 aspect-video rounded overflow-hidden bg-muted shrink-0">
                                                        <Image
                                                            src={video.thumbnailUrl}
                                                            alt={video.title}
                                                            fill
                                                            sizes="56px"
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                </Link>
                                            </td>

                                            {/* Title */}
                                            <td className="px-4 py-3 max-w-xs">
                                                <Link
                                                    href={`/video/${video.video_id}`}
                                                    className="font-medium text-foreground hover:text-primary transition-colors line-clamp-2 leading-snug"
                                                >
                                                    {video.title}
                                                </Link>
                                                <p className="text-xs text-muted-foreground mt-0.5 md:hidden">
                                                    {video.channelName}
                                                    {video.date && ` · ${formatDate(video.date)}`}
                                                </p>
                                            </td>

                                            {/* Channel */}
                                            <td className="px-4 py-3 text-muted-foreground hidden md:table-cell whitespace-nowrap">
                                                {video.channelName}
                                            </td>

                                            {/* Type */}
                                            <td className="px-4 py-3 hidden lg:table-cell">
                                                <Badge variant="outline" className="text-[10px] font-medium">
                                                    {video.experienceType}
                                                </Badge>
                                            </td>

                                            {/* Tone */}
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                <TonePill tone={video.tone} />
                                            </td>

                                            {/* Greyson score */}
                                            <td className="px-4 py-3 text-right hidden lg:table-cell">
                                                {video.greysonScore != null ? (
                                                    <span className="font-mono text-xs text-muted-foreground">
                                                        {video.greysonScore}
                                                        <span className="text-muted-foreground/50">/32</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground/40 text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Views */}
                                            <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                                                {typeof video.viewCount === 'number'
                                                    ? formatViewCount(video.viewCount)
                                                    : (video.viewCount ?? '—')}
                                            </td>

                                            {/* Relevance bar — API returns 0-1 float, dummy uses 0-100 */}
                                            <td className="px-4 py-3 text-right">
                                                {(() => {
                                                    const pct = video.relevance <= 1
                                                        ? Math.round(video.relevance * 100)
                                                        : Math.round(video.relevance);
                                                    return (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="hidden sm:flex w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full bg-emerald-500"
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                                                                {pct}%
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Link to full search */}
                    <div className="mt-6 text-center">
                        <Link
                            href={`/search3?q=${encodeURIComponent(data.question)}&type=semantic`}
                            className="text-sm text-primary hover:underline inline-flex items-center gap-1.5"
                        >
                            <BookOpen className="w-3.5 h-3.5" />
                            Search all matching accounts in the archive
                        </Link>
                    </div>
                </section>

            </div>
        </div>
    );
}

// ─── Tone pill helper ─────────────────────────────────────────────────────────

function TonePill({ tone }: { tone: string }) {
    const map: Record<string, string> = {
        "Very Positive": "bg-emerald-50 text-emerald-700 border-emerald-200",
        "Positive": "bg-green-50 text-green-700 border-green-200",
        "Mixed": "bg-yellow-50 text-yellow-700 border-yellow-200",
        "Negative": "bg-orange-50 text-orange-700 border-orange-200",
        "Very Negative": "bg-red-50 text-red-700 border-red-200",
    };
    const cls = map[tone] ?? "bg-muted text-muted-foreground border-border";
    return (
        <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded border ${cls}`}>
            {tone}
        </span>
    );
}
