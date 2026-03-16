import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, BookOpen, Video, List } from "lucide-react";
import type { Metadata } from "next";
import { SearchResultCardV4 } from "@/components/search-result-card-v4";
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { CrisisBanner } from "@/components/crisis-banner";
import { isCrisisTopic } from "@/lib/questions/crisis-detection";
import { createClient } from "@/lib/supabase/server";
import { RegenerateBar } from "@/components/questions/regenerate-bar";

/**
 * A cookie-free Supabase client safe for use in generateStaticParams and generateMetadata
 * (called outside request scope where Next.js cookies() is unavailable).
 */
function getServiceClient() {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!,
    );
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface QuestionAnswer {
    slug: string;
    question: string;
    ai_query?: string;         // raw HyDE passage
    embedding_input?: string;  // question + ai_query combined — what was actually embedded
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
    quote: string | null;      // top matching chunk text, DB-sourced
    startTime: number | null;  // seconds — used for timestamped link
    relevance: number;
}


// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Replaces LLM-emitted citation markers [1]–[4] with superscript links
 * pointing to /video/[videoId]. The mapping comes entirely from the DB-backed
 * referencedVideos array — Claude never generates a URL or title.
 */
function renderWithCitations(
    text: string,
    videos: ReferencedVideo[]
): React.ReactNode[] {
    // Split on [1], [2], … markers
    const parts = text.split(/(\[[1-9]\])/g);
    return parts.map((part, i) => {
        const match = part.match(/^\[(\d)\]$/);
        if (match) {
            const idx = parseInt(match[1], 10) - 1;
            const video = videos[idx];
            if (video) {
                return (
                    <a
                        key={i}
                        href={`/video/${video.video_id}`}
                        title={video.title}
                        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold no-underline hover:bg-emerald-200 dark:hover:bg-emerald-500/40 transition-colors align-super mx-[1px]"
                        aria-label={`Source ${idx + 1}: ${video.title}`}
                    >
                        {idx + 1}
                    </a>
                );
            }
        }
        return part || null;
    }).filter(Boolean);
}

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

// ─── ISR + Static Generation ────────────────────────────────────────────────

// Re-render each question page at most once per 24 h (ISR).
export const revalidate = 86400;

/**
 * Pre-render all active curated questions at build time so crawlers never wait for Claude.
 * try/catch: if Supabase is unreachable at build time, return [] so the build completes
 * and all slugs fall through to dynamicParams = true (runtime ISR).
 */
export async function generateStaticParams() {
    try {
        const supabase = getServiceClient();
        const { data } = await supabase
            .from('nde_questions')
            .select('slug')
            .eq('is_active', true);
        return (data ?? []).map((q: { slug: string }) => ({ slug: q.slug }));
    } catch (err) {
        console.warn('[generateStaticParams] Supabase unavailable at build time — falling back to runtime ISR:', err);
        return [];
    }
}

// Allow user question slugs (not in generateStaticParams) to render on-demand at runtime.
export const dynamicParams = true;

// ─── Metadata ────────────────────────────────────────────────────────────────

type QuestionResult = QuestionAnswer | { no_results: true; question: string; slug: string } | { rate_limited: true; slug: string } | null;

async function fetchQuestionData(slug: string): Promise<QuestionResult> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
            ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
        const res = await fetch(`${baseUrl}/api/questions/${encodeURIComponent(slug)}`, {
            // next.revalidate=0 disables caching without inheriting the parent SSR abort signal.
            // AbortSignal.timeout prevents a stuck Claude call from hanging indefinitely.
            // Why: Turbopack dev HMR can abort the SSR request mid-Claude-call, causing "Unable
            // to generate answer" — the explicit signal breaks that inheritance chain.
            // 90s timeout: auto-generated questions need HyDE (3s) + embedding (1s) + Claude (15-30s)
            next: { revalidate: 0 },
            signal: AbortSignal.timeout(90_000),
        });
        if (res.status === 429) return { rate_limited: true, slug };
        if (!res.ok) return null;
        const json = await res.json();
        if (json.no_results) return json as { no_results: true; question: string; slug: string };
        return json as QuestionAnswer;
    } catch (err) {
        console.error('[QuestionsPage] fetch error:', err);
        return null;
    }
}

/**
 * Reads metadata directly from DB — never calls Claude.
 * Uses question_synthesis.short_answer written by the API route after first load.
 * Falls back to a generic description until the synthesis is first cached.
 */
export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const supabase = getServiceClient();

    const { data: q } = await supabase
        .from('nde_questions')
        .select('id, consumer_question')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

    const question = q?.consumer_question ?? slug.split('-').join(' ');

    const { data: synthesis } = q
        ? await supabase
            .from('question_synthesis')
            .select('short_answer')
            .eq('question_id', q.id)
            .maybeSingle()
        : { data: null };

    const description = synthesis?.short_answer
        ?? `What do near-death experiences tell us about: ${question} — explored through 5,000+ real NDE accounts on Project Profound.`;

    return {
        title: `${question} | Project Profound`,
        description,
        openGraph: {
            title: question,
            description,
            url: `https://projectprofound.org/questions/${slug}`,
            type: 'article',
            siteName: 'Project Profound',
            images: [{ url: 'https://projectprofound.org/og-default.png', width: 1200, height: 630 }],
        },
        twitter: { card: 'summary_large_image', title: question, description },
        alternates: { canonical: `https://projectprofound.org/questions/${slug}` },
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
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 dark:bg-white/10 px-5 py-2.5 text-sm font-medium text-white dark:text-slate-200 hover:bg-slate-700 dark:hover:bg-white/20 transition-colors"
                    >
                        Browse curated questions
                    </Link>
                    <Link
                        href="/search3"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
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

    const supabaseService = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
    );

    // Determine question type and active status.
    // Two-pass: first check for an ACTIVE curated question.
    // If not found, check if the slug exists as a RETIRED curated question (is_active=false → 410),
    // then fall through to user_questions.
    let isUserQuestion = false;
    let isActive = true;

    const { data: curatedActive } = await supabaseService
        .from('nde_questions')
        .select('id')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

    if (!curatedActive) {
        // Detect retired curated question (slug exists but is_active=false)
        const { data: curatedRetired } = await supabaseService
            .from('nde_questions')
            .select('id')
            .eq('slug', slug)
            .eq('is_active', false)
            .maybeSingle();

        if (curatedRetired) {
            isActive = false; // will trigger the 410 content page below
        } else {
            const { data: userCheck } = await supabaseService
                .from('user_questions')
                .select('is_active')
                .eq('slug', slug)
                .maybeSingle();
            if (userCheck) {
                isUserQuestion = true;
                isActive = userCheck.is_active ?? true;
            }
        }
    }

    // ── HTTP 410 Gone for deactivated questions ────────────────────────────────
    // 410 tells Google to deindex the page immediately (vs 404 which takes months).
    // We check is_active=false here: curatedCheck is null when is_active=false on nde_questions.
    // For user questions, isActive is read from the row above.
    // Strategy: detect the slug exists but is inactive, then return a minimal 410 page.
    // Note: true HTTP 410 status in Next.js App Router requires middleware — this handles
    // the content layer. Add /middleware.ts mapping to set the 410 header if needed.
    if (!isActive) {
        const { data: inactiveQ } = await supabaseService
            .from('nde_questions')
            .select('consumer_question')
            .eq('slug', slug)
            .maybeSingle();
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
                <p className="text-muted-foreground text-lg font-medium">
                    {inactiveQ?.consumer_question ?? 'This question'} is no longer available.
                </p>
                <p className="text-sm text-muted-foreground max-w-md">
                    It may have been merged into another question or retired from the archive.
                </p>
                <Link href="/questions" className="text-primary hover:underline text-sm">
                    ← Browse all questions
                </Link>
            </div>
        );
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

    // Rate-limited state — too many auto-generated questions recently
    if ('rate_limited' in data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                    <BookOpen className="w-8 h-8 text-amber-500" />
                </div>
                <p className="text-muted-foreground text-lg">We&apos;re generating a lot of answers right now.</p>
                <p className="text-sm text-muted-foreground max-w-md">
                    Please try again in a few minutes. Each answer involves searching 5,000+ NDE accounts
                    and synthesizing the results, which takes time and resources.
                </p>
                <Link href="/questions" className="text-primary hover:underline text-sm">
                    ← Browse answered questions
                </Link>
            </div>
        );
    }

    // No-results state — insufficient NDE evidence
    if ('no_results' in data) {
        return <NoResultsPage question={data.question} />;
    }

    // Cross-link: check if a blog post exists for this question
    let relatedBlogPost: { slug: string; title: string } | null = null;
    try {
        const { data: blogMatch } = await supabaseService
            .from('blog_posts')
            .select('slug, title')
            .eq('source_question_slug', slug)
            .eq('status', 'published')
            .maybeSingle();
        relatedBlogPost = blogMatch;
    } catch {
        // Non-fatal: skip cross-link if query fails
    }

    // ── JSON-LD structured data ─────────────────────────────────────────────
    const faqJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [{
            '@type': 'Question',
            name: data.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: data.shortAnswer,
            },
        }],
    };

    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://projectprofound.org' },
            { '@type': 'ListItem', position: 2, name: 'Questions', item: 'https://projectprofound.org/questions' },
            { '@type': 'ListItem', position: 3, name: data.question, item: `https://projectprofound.org/questions/${slug}` },
        ],
    };

    return (
        <div className="min-h-screen bg-background text-foreground">

            {/* ── Admin: regeneration bar (admin-only) ─────────────────── */}
            {isAdmin && (
                <RegenerateBar
                    slug={slug}
                    questionText={data.question}
                    isUserQuestion={isUserQuestion}
                    isActive={isActive}
                />
            )}

            {/* ── JSON-LD: FAQPage + BreadcrumbList ────────────────────── */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />

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
                className="relative overflow-hidden pt-12 pb-10 bg-gradient-to-br from-emerald-50 via-slate-50 to-blue-50 dark:from-transparent dark:via-transparent dark:to-transparent dark:bg-card"
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
                        className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-[1.2] mb-4"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                        {data.question}
                    </h1>

                    {/* 2. Short Answer — immediately after h1 for QEO first-200-chars rule.
                         Wrapped in a semantic answer-box so crawlers recognise it as the direct answer. */}
                    <div
                        className="mb-6 px-4 py-3.5 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10"
                        role="note"
                        aria-label="Direct answer"
                    >
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 mb-1">
                            What NDEs say
                        </p>
                        <p
                            className="text-lg sm:text-xl font-medium text-emerald-900 dark:text-emerald-100 leading-relaxed"
                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                        >
                            {data.shortAnswer}
                        </p>
                    </div>

                    {/* HyDE ai_query panel — admin only (after shortAnswer so it doesn't push answer down) */}
                    {isAdmin && (data.embedding_input || data.ai_query) && (
                        <details className="mb-5 group">
                            <summary className="cursor-pointer text-xs font-mono text-slate-400 hover:text-slate-600 transition-colors select-none list-none flex items-center gap-1.5">
                                <span className="inline-block w-3 h-3 rotate-0 group-open:rotate-90 transition-transform">▶</span>
                                <span>Search query used (embedding_input) — <span className="text-amber-500 font-bold">Admin only</span></span>
                            </summary>
                            <div className="mt-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 mb-1">Embedding input (question + HyDE) — Admin only</p>
                                <p className="text-sm text-amber-900 leading-relaxed italic">{data.embedding_input ?? data.ai_query}</p>
                            </div>
                        </details>
                    )}

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
                className="relative overflow-hidden py-12 bg-gradient-to-b from-slate-50 to-white dark:from-transparent dark:to-transparent dark:bg-card"
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
                            className="text-slate-700 dark:text-slate-300 leading-[1.85] text-[1.05rem]"
                        >
                            {renderWithCitations(para, data.referencedVideos)}
                        </p>
                    ))}

                    {/* Sources list removed — Videos Referenced section below is the canonical source list */}

                    {/* AI disclaimer */}
                    <div className="mt-8 flex items-start gap-2.5 bg-white/80 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl p-4 text-sm text-slate-400 dark:text-slate-500 shadow-sm dark:shadow-none">
                        <span className="shrink-0 mt-0.5 text-slate-300">✦</span>
                        <p className="leading-relaxed">
                            This synthesis was generated from real NDE accounts in our archive. It is
                            not medical or spiritual advice. Accounts are first-person testimonies —
                            reported experiences, not verified facts.
                        </p>
                    </div>

                    {/* Cross-link: deep-dive blog post */}
                    {relatedBlogPost && (
                        <Link
                            href={`/blog/${relatedBlogPost.slug}`}
                            className="flex items-center gap-3 mt-4 p-4 bg-blue-50/50 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-500/20 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/15 transition-colors group"
                        >
                            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 group-hover:underline">
                                    Read the in-depth article
                                </p>
                                <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">
                                    {relatedBlogPost.title}
                                </p>
                            </div>
                        </Link>
                    )}
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════
                BOTTOM SECTIONS — full width content
                ═══════════════════════════════════════════════════════ */}
            <div className="container mx-auto px-4 max-w-5xl py-12 space-y-16">

                {/* ════════ SECTION: Videos Referenced ════════ */}
                <section>
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <Video className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <h2
                                className="text-2xl font-bold text-slate-900 dark:text-slate-100"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                Videos Referenced
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
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

                {/* ════════ SECTION: Other Relevant Videos ════════ */}
                <section id="more-videos">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                            <List className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2
                                className="text-2xl font-bold text-slate-900 dark:text-slate-100"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                Other Relevant Videos
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Additional accounts from the archive related to this question
                            </p>
                        </div>
                    </div>

                    {/* Card-per-row layout — responsive, no horizontal scroll */}
                    <div className="divide-y divide-slate-100 dark:divide-white/10 rounded-xl border border-slate-100 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
                        {data.moreVideos.map((video) => {
                            const pct = video.relevance <= 1
                                ? Math.round(video.relevance * 100)
                                : Math.round(video.relevance);
                            // Threshold-based classes — works in both light and dark mode
                            const matchClass = pct >= 85
                                ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                : pct >= 70
                                ? 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300'
                                : pct >= 55
                                ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                                : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400';
                            const videoUrl = `/video/${video.video_id}`;
                            const quotedUrl = video.startTime != null
                                ? `${videoUrl}?t=${Math.floor(video.startTime)}`
                                : videoUrl;

                            return (
                                <article
                                    key={video.video_id}
                                    className="flex gap-3 sm:gap-4 px-4 py-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                                >
                                    {/* Thumbnail — visible on all sizes; smaller on mobile, 60% larger on sm/lg */}
                                    <Link
                                        href={videoUrl}
                                        className="shrink-0 self-start"
                                        tabIndex={-1}
                                        aria-hidden="true"
                                    >
                                        <div className="relative w-16 sm:w-40 lg:w-52 aspect-video rounded-lg overflow-hidden bg-slate-100 dark:bg-white/10">
                                            <Image
                                                src={video.thumbnailUrl}
                                                alt={video.title}
                                                fill
                                                sizes="(min-width: 1024px) 208px, (min-width: 640px) 160px, 64px"
                                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        </div>
                                    </Link>

                                    {/* Main content */}
                                    <div className="flex-1 min-w-0">
                                        {/* Title + meta row — full width */}
                                        <Link
                                            href={videoUrl}
                                            className="font-semibold text-slate-900 dark:text-slate-100 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors text-sm sm:text-base leading-snug line-clamp-2"
                                        >
                                            {video.title}
                                        </Link>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            {video.channelName}
                                            {video.date && (
                                                <span className="text-slate-400"> · {formatDate(video.date)}</span>
                                            )}
                                            {video.viewCount > 0 && (
                                                <span className="hidden sm:inline text-slate-400">
                                                    {' · '}{formatViewCount(video.viewCount)} views
                                                </span>
                                            )}
                                        </p>

                                        {/* Bottom row: 2/3 quote | 1/3 relevance */}
                                        <div className="flex gap-3 mt-2 items-start">
                                            {/* Quote — 3/4 width */}
                                            <div className="flex-[3] min-w-0">
                                                {video.quote && (
                                                    <Link
                                                        href={quotedUrl}
                                                        className="block"
                                                        title={video.startTime != null
                                                            ? `Jump to ${Math.floor(video.startTime / 60)}:${String(Math.floor(video.startTime % 60)).padStart(2, '0')}`
                                                            : 'Watch video'}
                                                    >
                                                        <blockquote className="border-l-2 border-emerald-300 dark:border-emerald-500/50 pl-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed line-clamp-3 hover:border-emerald-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                                                            &ldquo;{video.quote.trim()}&rdquo;
                                                            {video.startTime != null && (
                                                                <span className="not-italic text-[10px] text-emerald-600 ml-1.5 font-medium">
                                                                    {Math.floor(video.startTime / 60)}:{String(Math.floor(video.startTime % 60)).padStart(2, '0')}
                                                                </span>
                                                            )}
                                                        </blockquote>
                                                    </Link>
                                                )}
                                            </div>

                                            {/* Relevance — 1/4 width */}
                                            <div className="flex-1 flex items-center justify-center">
                                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${matchClass}`}>
                                                    {pct}% match
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

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
        "Very Positive": "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
        "Positive": "bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/30",
        "Mixed": "bg-yellow-50 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/30",
        "Negative": "bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/30",
        "Very Negative": "bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30",
    };
    const cls = map[tone] ?? "bg-muted text-muted-foreground border-border";
    return (
        <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded border ${cls}`}>
            {tone}
        </span>
    );
}
