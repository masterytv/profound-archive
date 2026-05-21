import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
    ChevronRight,
    Eye,
    Calendar,
    Sparkles,
    ChevronDown,
    ExternalLink,
    TrendingUp,
    Brain,
    BookOpen,
    Beaker,
    Heart,
    Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { GreysonScoreCard, GreysonBreakdown } from "@/components/video/GreysonScoreCard";
import { TransformationScoreCard } from "@/components/video/TransformationScoreCard";
import { EvidenceStrengthCard } from "@/components/video/EvidenceStrengthCard";
import { YouTubePlayer } from "@/components/video/YouTubePlayer";
import { NderfAnalysisSection } from "@/components/analysis/NderfAnalysisSection";
import { SimilarExperiences, type SimilarExperience } from "@/components/analysis/SimilarExperiences";
import { SocialShareButton } from "@/components/video/ShareButton";
import { TimestampLink } from "@/components/video/TimestampLink";
import MicroFeedback from "@/components/micro-feedback";

interface VideoPageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ t?: string }>;
}

// --- Helpers ---

function formatViewCount(count: number | null): string {
    if (!count) return "0";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toLocaleString();
}

function formatDate(dateString: string | null): string {
    if (!dateString) return "Unknown date";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Unknown date";
        return date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    } catch {
        return "Unknown date";
    }
}

function getLevelColor(level: string | null): {
    bg: string;
    text: string;
    border: string;
    dot: string;
} {
    if (!level)
        return { bg: "bg-slate-50 dark:bg-slate-800/50", text: "text-slate-600 dark:text-slate-400", border: "border-slate-200 dark:border-slate-700", dot: "bg-slate-400" };
    const l = level.toLowerCase();
    if (l.includes("exceptional"))
        return { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-800 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-500" };
    if (l.includes("high") || l.includes("strong"))
        return { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-800 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800", dot: "bg-amber-500" };
    return { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-800 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800", dot: "bg-blue-500" };
}

/** Map the raw rvnde_level string to a short human-readable descriptor */
function getEvidenceDescriptor(level: string | null): string {
    if (!level) return "Analysed";
    const l = level.toLowerCase();
    if (l.includes("exceptional")) return "Exceptional";
    if (l.includes("high") || l.includes("strong")) return "Strong";
    if (l.includes("moderate")) return "Moderate";
    return "Suggestive";
}

interface RvndeDetailItem {
    quote?: string;
    score?: number;
    reasoning?: string;
}

function RvndeDetailsSection({ details }: { details: unknown }) {
    if (!details || typeof details !== "object") return null;

    const entries = Object.entries(details as Record<string, RvndeDetailItem>);
    if (entries.length === 0) return null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {entries.map(([key, value]) => {
                const label = key
                    .replace(/_/g, " ")
                    .replace(/([a-z])([A-Z])/g, "$1 $2")
                    .replace(/\b\w/g, (c) => c.toUpperCase());

                if (typeof value !== "object" || value === null) return null;

                return (
                    <div
                        key={key}
                        className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-100 dark:border-white/10"
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>
                            {value.score !== undefined && (
                                <span className="text-xs font-bold bg-white dark:bg-white/10 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200">
                                    {value.score}/4
                                </span>
                            )}
                        </div>
                        {value.quote && (
                            <p className="text-[11px] text-slate-500 italic leading-snug mb-1">
                                &ldquo;{value.quote}&rdquo;
                            </p>
                        )}
                        {value.reasoning && (
                            <p className="text-[11px] text-slate-500 leading-snug">
                                {value.reasoning}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// --- 1.10 Pull-quote helper ---

// Emotionally resonant keywords used to score each segment
const RESONANT_WORDS = [
    "love", "light", "peace", "beautiful", "father", "mother", "god",
    "heaven", "angel", "joy", "warm", "bliss", "home", "knew", "felt",
    "afraid", "back", "alive", "life", "death", "never", "everything",
];

interface TimestampedSegment {
    start: number;
    end: number;
    text: string;
}

function extractPullQuote(
    rawTimestamped: { data: TimestampedSegment[] } | null,
): { quote: string; startSeconds: number } | null {
    if (!rawTimestamped?.data || rawTimestamped.data.length === 0) return null;

    // Filter usable segments (no music tags, at least 8 words)
    const usable = rawTimestamped.data.filter(
        (seg) => seg.text && !seg.text.startsWith("[") && seg.text.split(/\s+/).length >= 8
    );
    if (usable.length === 0) return null;

    // Score each segment by count of resonant emotional keywords
    let bestIdx = -1;
    let bestScore = -1;

    usable.forEach((seg, i) => {
        const words = seg.text.toLowerCase().split(/\s+/);
        const score = words.filter((w) => RESONANT_WORDS.includes(w)).length;
        if (score > bestScore) {
            bestScore = score;
            bestIdx = i;
        }
    });

    // Require at least 2 resonant words to be worth showing
    if (bestIdx === -1 || bestScore < 2) return null;

    // Merge the best segment with the next one for a richer quote (if available)
    const best = usable[bestIdx];
    const next = usable[bestIdx + 1];
    const quote = next
        ? `${best.text.trim()} ${next.text.trim()}`
        : best.text.trim();

    return {
        quote,
        startSeconds: Math.floor(best.start),
    };
}

// --- 1.11 Timestamped transcript grouping ---

/**
 * Safely extracts the segment array from raw_timestamped_subtitles regardless of
 * how Supabase returns the JSONB value.
 *   Shape A: { data: [...segments] }      ← pipeline standard
 *   Shape B: [...segments]                ← some older rows
 *   Shape C: a JSON string (double-encoded) ← defensive
 */
function getTimestampedSegments(raw: unknown): TimestampedSegment[] | null {
    if (!raw) return null;

    // Shape C: string — try parsing first
    let parsed = raw;
    if (typeof raw === "string") {
        try { parsed = JSON.parse(raw); } catch { return null; }
    }

    // Shape A: { data: [...] }
    if (
        typeof parsed === "object" &&
        parsed !== null &&
        !Array.isArray(parsed) &&
        Array.isArray((parsed as Record<string, unknown>).data)
    ) {
        return (parsed as { data: TimestampedSegment[] }).data;
    }

    // Shape B: plain array
    if (Array.isArray(parsed)) {
        return parsed as TimestampedSegment[];
    }

    return null;
}

function groupSegmentsIntoBlocks(
    segments: TimestampedSegment[],
    blockDurationSeconds = 60
): { blockStart: number; text: string; startSeconds: number }[] {
    const blocks: { blockStart: number; text: string; startSeconds: number }[] = [];
    let currentBlock: string[] = [];
    let blockStart = 0;
    let blockStartSeconds = 0;

    for (const seg of segments) {
        if (!seg.text || seg.text.startsWith("[")) continue; // skip [Music] etc.
        const blockNum = Math.floor(seg.start / blockDurationSeconds);
        if (blockNum !== blockStart && currentBlock.length > 0) {
            blocks.push({
                blockStart: blockStart * blockDurationSeconds,
                text: currentBlock.join(" "),
                startSeconds: blockStartSeconds,
            });
            currentBlock = [];
            blockStart = blockNum;
            blockStartSeconds = Math.floor(seg.start);
        }
        if (currentBlock.length === 0) blockStartSeconds = Math.floor(seg.start);
        currentBlock.push(seg.text.trim());
    }

    if (currentBlock.length > 0) {
        blocks.push({
            blockStart: blockStart * blockDurationSeconds,
            text: currentBlock.join(" "),
            startSeconds: blockStartSeconds,
        });
    }

    return blocks;
}

function formatTimestamp(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

// --- Page Component ---

export default async function VideoPageV2({ params, searchParams }: VideoPageProps) {
    const { id } = await params;
    const { t } = await searchParams;
    const startTime = t ? parseInt(t, 10) : undefined;
    const supabase = await createClient();

    const { data: video, error } = await supabase
        .from("nde_vids")
        .select(
            `
      videoId,
      title,
      channelName,
      channelId,
      channelUrl,
      date,
      viewCount,
      experiencerFullName,
      analysis_nde_summary,
      subtitles_punctuated,
      raw_timestamped_subtitles,
      rvnde_total_score,
      rvnde_level,
      rvnde_summary_reason,
      rvnde_details,
      url,
      thumbnailUrl
    `
        )
        .eq("videoId", id)
        .single();

    if (error || !video) {
        notFound();
    }

    // Return 404 for videos from hidden (defunct) channels
    const { data: channelHidden } = await supabase
        .from('channels')
        .select('hidden')
        .eq('channel_id', video.channelId)
        .single();
    if (channelHidden?.hidden) {
        notFound();
    }

    const { data: analysis } = await supabase
        .from("nde_analysis")
        .select(
            "total_greyson_score, scale_agreement, greyson_breakdown, transformation_score, transformation_classification, transformation_breakdown, experience_type, core_elements, trigger_category, overall_tone, intensity_rating, journey_sequence, journey_notes, phenomenology, entities, content_safety"
        )
        .eq("video_id", id)
        .single();

    // Look up experiencer profile slug for linking
    let experiencerSlug: string | null = null;
    if (video.experiencerFullName) {
        const { data: profileData } = await supabase
            .from('experiencer_profiles')
            .select('slug')
            .ilike('full_name', video.experiencerFullName.trim())
            .limit(1)
            .single();
        experiencerSlug = profileData?.slug ?? null;
    }

    const { data: similarData } = await supabase.rpc("find_similar_experiences", {
        target_video_id: id,
        match_count: 6,
        similarity_threshold: 0.7,
    });
    const similarExperiences: SimilarExperience[] = (similarData || []) as SimilarExperience[];

    const levelColor = getLevelColor(video.rvnde_level);
    const hasVeridical = video.rvnde_total_score !== null || video.rvnde_level;
    const hasGreyson = analysis && analysis.greyson_breakdown;
    const hasTransformation = analysis && analysis.transformation_breakdown;
    const scoreCount = [hasVeridical, hasGreyson, hasTransformation].filter(Boolean).length;

    // 1.10 — Pull quote
    const rawSegments = getTimestampedSegments(video.raw_timestamped_subtitles);
    const pullQuote = rawSegments && rawSegments.length > 0
        ? extractPullQuote({ data: rawSegments })
        : null;

    // 1.4 — Tag strip data
    const tags: { label: string; color?: string; icon?: string }[] = [];
    if (analysis?.experience_type) tags.push({ label: analysis.experience_type });
    if (analysis?.trigger_category) tags.push({ label: analysis.trigger_category.replace(/_/g, " ") });
    if (analysis?.overall_tone) tags.push({ label: analysis.overall_tone, color: "emerald" });
    if (analysis?.transformation_classification) tags.push({ label: analysis.transformation_classification, color: "rose" });
    if (analysis?.intensity_rating) tags.push({ label: `${analysis.intensity_rating}/10 Intensity`, icon: 'star' });

    // 1.11 — Timestamped transcript blocks
    const transcriptBlocks = rawSegments ? groupSegmentsIntoBlocks(rawSegments) : null;

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* ─── Breadcrumb bar ─── */}
            <div className="border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 max-w-6xl">
                    <nav className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 py-3">
                        <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Home</Link>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <Link href="/search3" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Search</Link>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[200px] sm:max-w-xs">
                            {video.title || "Video"}
                        </span>
                    </nav>
                </div>
            </div>

            {/* ─── Main Layout: Player + Sidebar ─── */}
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
                    {/* ─── Left Column ─── */}
                    <div className="space-y-8">
                        {/* Video Player */}
                        <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-lg bg-black">
                            <YouTubePlayer videoId={video.videoId} title={video.title || "Video"} startTime={startTime} />
                        </div>

                        {/* ─── Title + Metadata (original layout) ─── */}
                        <div className="space-y-4">
                            <h1
                                className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 leading-tight"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                {video.title || "Untitled Video"}
                            </h1>

                            {/* Metadata row: channel · date · views · experiencer */}
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                                {video.channelName && (
                                    <Link
                                        href={video.channelId ? `/channel/${video.channelId}` : (video.channelUrl || "#")}
                                        className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    >
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                            {video.channelName.charAt(0)}
                                        </div>
                                        {video.channelName}
                                    </Link>
                                )}

                                <span className="text-slate-300">·</span>

                                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {formatDate(video.date)}
                                </div>

                                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                    <Eye className="w-3.5 h-3.5" />
                                    {formatViewCount(video.viewCount)} views
                                </div>

                                {video.experiencerFullName && (
                                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                        <span>Experiencer:{' '}
                                            {experiencerSlug ? (
                                                <Link href={`/experiencer/${experiencerSlug}`} className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
                                                    {video.experiencerFullName}
                                                </Link>
                                            ) : (
                                                <strong className="text-slate-700 dark:text-slate-300">{video.experiencerFullName}</strong>
                                            )}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* 1.5 — Share button (replaces Watch on YouTube) */}
                            <SocialShareButton
                                url={`https://projectprofound.org/video/${video.videoId}`}
                                title={video.experiencerFullName
                                    ? `${video.experiencerFullName}'s Near-Death Experience — Project Profound`
                                    : `${video.title} — Project Profound`
                                }
                                description="Explore this Near-Death Experience account on Project Profound."
                            />
                        </div>

                        {/* ─── Mobile-only: Research Scores ─── */}
                        {scoreCount > 0 && (
                            <div className="lg:hidden bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm p-5">
                                <h3
                                    className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4"
                                    style={{ fontFamily: "'Crimson Pro', Georgia, serif", letterSpacing: "0.05em" }}
                                >
                                    What Researchers Found
                                </h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {hasVeridical && (
                                        <a href="#section-veridical-mobile" className={`rounded-xl p-3 block cursor-pointer hover:ring-2 hover:ring-emerald-300 transition-all ${levelColor.bg} ${levelColor.border} border`}>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Evidence</span>
                                            </div>
                                            {video.rvnde_total_score !== null ? (
                                                <div className="flex items-baseline gap-0.5">
                                                    <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{Math.round((video.rvnde_total_score / 28) * 100)}%</span>
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-slate-500 leading-tight">{getEvidenceDescriptor(video.rvnde_level)}</div>
                                            )}
                                        </a>
                                    )}
                                    {hasGreyson && (
                                        <a href="#section-greyson" className="rounded-xl p-3 block cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Brain className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Depth</span>
                                            </div>
                                            <div className="flex items-baseline gap-0.5">
                                                <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{Math.round(((analysis!.total_greyson_score ?? 0) / 32) * 100)}%</span>
                                            </div>
                                        </a>
                                    )}
                                    {hasTransformation && (
                                        <a href="#section-transformation" className="rounded-xl p-3 block cursor-pointer hover:ring-2 hover:ring-rose-300 transition-all bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Sparkles className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Impact</span>
                                            </div>
                                            <div className="flex items-baseline gap-0.5">
                                                <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{Math.round(((analysis!.transformation_score ?? 0) / 50) * 100)}%</span>
                                            </div>
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ─── 1.1: The Story (renamed AI Summary) ─── */}
                        {video.analysis_nde_summary && (
                            <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-blue-500" />
                                    <h2
                                        className="text-lg font-bold text-slate-900 dark:text-slate-100"
                                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                                    >
                                        The Story
                                    </h2>
                                </div>

                                {/* 1.4 — Tag strip (above the story) */}
                                {tags.length > 0 && (
                                    <div className="px-6 pt-4 pb-2 flex flex-wrap gap-2">
                                        {tags.map((tag) => (
                                            <span
                                                key={tag.label}
                                                className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                                                    tag.color === "emerald"
                                                        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800"
                                                        : tag.color === "rose"
                                                        ? "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-800"
                                                        : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10"
                                                }`}
                                            >
                                                {tag.icon === 'star' && <Star className="w-3 h-3 inline" />}{' '}{tag.label}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Story text */}
                                <div className="px-6 py-5">
                                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line text-[15px]">
                                        {video.analysis_nde_summary}
                                    </p>
                                </div>

                                {/* 1.10 — Pull quote (below the story) */}
                                {pullQuote && (
                                    <div className="px-6 pb-5 pt-0">
                                        <blockquote className="border-l-2 border-blue-200 dark:border-blue-700 pl-4">
                                            <p
                                                className="text-slate-600 dark:text-slate-400 italic leading-relaxed"
                                                style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "1.05rem" }}
                                            >
                                                &ldquo;{pullQuote.quote}&rdquo;
                                            </p>
                                            {pullQuote.startSeconds > 0 && (
                                                <TimestampLink
                                                    seconds={pullQuote.startSeconds}
                                                    label="Jump to this moment →"
                                                />
                                            )}
                                        </blockquote>
                                    </div>
                                )}

                                {/* 1.1b — Subtle AI disclosure at bottom */}
                                <div className="px-6 pb-4 border-t border-slate-50 dark:border-white/5 pt-3">
                                    <span className="text-[11px] text-slate-400 dark:text-slate-500">✦ AI Generated</span>
                                </div>
                            </div>
                        )}

                        {/* ─── Similar Experiences (pgvector) ─── */}
                        <SimilarExperiences results={similarExperiences} />

                        {/* ─── 1.6: Research Breakdown (moved NDERF + scores) ─── */}
                        {analysis && (
                            <Collapsible>
                                <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm overflow-hidden">
                                    <CollapsibleTrigger asChild>
                                        <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                                            <div className="flex items-center gap-2">
                                                <Beaker className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                                <h2
                                                    className="text-lg font-bold text-slate-900 dark:text-slate-100"
                                                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                                                >
                                                    Research Breakdown
                                                </h2>
                                            </div>
                                            <ChevronDown className="w-5 h-5 text-slate-400" />
                                        </button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <div className="px-6 pb-6 space-y-6">
                                            <NderfAnalysisSection
                                                data={{
                                                    experience_type: analysis.experience_type as string | null,
                                                    trigger_category: analysis.trigger_category as string | null,
                                                    tone: analysis.overall_tone as string | null,
                                                    intensity_rating: analysis.intensity_rating as number | null,
                                                    nde_elements: analysis.core_elements as any,
                                                    journey_flow: analysis.journey_sequence as any,
                                                    phenomenology: analysis.phenomenology as any,
                                                    entities: analysis.entities as any,
                                                    content_safety: analysis.content_safety as any,
                                                    nde_summary: null,
                                                }}
                                            />
                                        </div>
                                    </CollapsibleContent>
                                </div>
                            </Collapsible>
                        )}

                        {/* ─── Mobile-only: Veridical + Greyson + Transformation breakdowns ─── */}
                        {hasVeridical && (
                            <div id="section-veridical-mobile" className="lg:hidden scroll-mt-16">
                                <EvidenceStrengthCard
                                    totalScore={video.rvnde_total_score}
                                    level={video.rvnde_level}
                                    descriptor={getEvidenceDescriptor(video.rvnde_level)}
                                    summaryReason={video.rvnde_summary_reason}
                                    details={video.rvnde_details}
                                    title="Evidence Strength"
                                />
                                <MicroFeedback
                                    feature="evidence_strength"
                                    contextId={video.videoId}
                                    prompt="Was this Evidence Strength score useful?"
                                    compact
                                />
                            </div>
                        )}
                        {hasGreyson && (
                            <div id="section-greyson" className="lg:hidden scroll-mt-16">
                                <GreysonScoreCard
                                    totalScore={analysis!.total_greyson_score}
                                    classification={analysis!.scale_agreement}
                                    breakdown={analysis!.greyson_breakdown as GreysonBreakdown}
                                    title="Experience Depth"
                                />
                                <MicroFeedback
                                    feature="greyson_score"
                                    contextId={video.videoId}
                                    prompt="Was this Experience Depth score useful?"
                                    compact
                                />
                            </div>
                        )}
                        {hasTransformation && (
                            <div id="section-transformation" className="lg:hidden scroll-mt-16">
                                <TransformationScoreCard
                                    totalScore={analysis!.transformation_score}
                                    classification={analysis!.transformation_classification}
                                    breakdown={analysis!.transformation_breakdown as any}
                                    title="Life Impact"
                                />
                                <MicroFeedback
                                    feature="transformation_score"
                                    contextId={video.videoId}
                                    prompt="Was this Life Impact score useful?"
                                    compact
                                />
                            </div>
                        )}

                        {/* ─── 1.11: Timestamped Transcript ─── */}
                        {(transcriptBlocks || video.subtitles_punctuated) && (
                            <Collapsible>
                                <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm overflow-hidden">
                                    <CollapsibleTrigger asChild>
                                        <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                                <h2
                                                    className="text-lg font-bold text-slate-900 dark:text-slate-100"
                                                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                                                >
                                                    Full Transcript
                                                </h2>
                                            </div>
                                            <ChevronDown className="w-5 h-5 text-slate-400" />
                                        </button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <div className="px-6 pb-6">
                                            {transcriptBlocks ? (
                                                // 1.11 — Timestamped blocks
                                                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-5 max-h-[500px] overflow-y-auto border border-slate-100 dark:border-white/10 space-y-4">
                                                    {transcriptBlocks.map((block, i) => (
                                                        <div key={i} className="flex gap-3">
                                                            <TimestampLink
                                                                seconds={block.startSeconds}
                                                                label={`[${formatTimestamp(block.startSeconds)}]`}
                                                            />
                                                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{block.text}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                // Fallback: plain subtitles_punctuated
                                                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-5 max-h-[500px] overflow-y-auto border border-slate-100 dark:border-white/10">
                                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                                        {video.subtitles_punctuated}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </CollapsibleContent>
                                </div>
                            </Collapsible>
                        )}

                        {/* ─── 1.9: Grief / comfort footer ─── */}
                        <div className="bg-blue-50/40 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl px-6 py-6 space-y-3">
                            <div className="flex items-center gap-2">
                                <Heart className="w-4 h-4 text-blue-400" />
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    Are you here because someone you love has died?
                                </p>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                These accounts were gathered because death may not be the end.
                                Thousands of people have experienced something beyond — and come back to tell us about it.
                            </p>
                            <div className="flex flex-wrap gap-3 pt-1">
                                <Link
                                    href="/chat"
                                    className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
                                >
                                    Talk about it with AI →
                                </Link>
                            </div>
                        </div>

                        {/* ─── Micro feedback ─── */}
                        <MicroFeedback
                            feature="video_analysis"
                            contextId={video.videoId}
                            prompt="Was this analysis helpful?"
                        />
                    </div>

                    {/* ─── Right Sidebar (desktop only) ─── */}
                    <div className="hidden lg:block space-y-6 lg:pr-1">
                        {/* 1.7/1.8 — Renamed Score Summary Card */}
                        <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm p-5">
                            <h3
                                className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif", letterSpacing: "0.05em" }}
                            >
                                What Researchers Found
                            </h3>

                            {scoreCount === 0 ? (
                                <p className="text-sm text-slate-400 dark:text-slate-500 leading-relaxed">
                                    This video has not yet been analyzed by our research scales.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {/* Evidence Strength (was Veridical) */}
                                    {hasVeridical && (
                                        <a href="#section-veridical" className={`rounded-xl p-3 block cursor-pointer hover:ring-2 hover:ring-emerald-300 transition-all ${levelColor.bg} ${levelColor.border} border`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Evidence Strength</span>
                                            </div>
                                            <div className="flex items-baseline gap-1.5">
                                                {video.rvnde_total_score !== null ? (
                                                    <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{Math.round((video.rvnde_total_score / 28) * 100)}%</span>
                                                ) : (
                                                    <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">—</span>
                                                )}
                                                <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full ${levelColor.text} bg-white/70 dark:bg-black/20`}>
                                                    {getEvidenceDescriptor(video.rvnde_level)}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-1 leading-snug">Contains independently verifiable details</p>
                                        </a>
                                    )}

                                    {/* Experience Depth (was Greyson) */}
                                    {hasGreyson && (
                                        <a href="#section-greyson-desktop" className="rounded-xl p-3 block cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Experience Depth</span>
                                            </div>
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{Math.round(((analysis.total_greyson_score ?? 0) / 32) * 100)}%</span>
                                                {analysis.scale_agreement && (
                                                    <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full text-blue-700 dark:text-blue-300 bg-white/70 dark:bg-black/20">
                                                        {analysis.scale_agreement}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-1 leading-snug">Counts how many classic NDE hallmarks were present</p>
                                        </a>
                                    )}

                                    {/* Life Impact (was Transformation) */}
                                    {hasTransformation && (
                                        <a href="#section-transformation-desktop" className="rounded-xl p-3 block cursor-pointer hover:ring-2 hover:ring-rose-300 transition-all bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Sparkles className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Life Impact</span>
                                            </div>
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{Math.round(((analysis.transformation_score ?? 0) / 50) * 100)}%</span>
                                                {analysis.transformation_classification && (
                                                    <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full text-rose-700 dark:text-rose-300 bg-white/70 dark:bg-black/20">
                                                        {analysis.transformation_classification}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-1 leading-snug">Measures how deeply this changed the experiencer's life</p>
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* Quick links */}
                            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/10 space-y-2">
                                <Link href="/scale/cvnde" className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1">
                                    <span>About Evidence Strength</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                                <Link href="/scale/greyson" className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1">
                                    <span>About Experience Depth</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                                <Link href="/scale/transformation" className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1">
                                    <span>About Life Impact</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </div>

                        {/* Full Veridical Breakdown */}
                        {hasVeridical && (
                            <div id="section-veridical" className="scroll-mt-16">
                                <EvidenceStrengthCard
                                    totalScore={video.rvnde_total_score}
                                    level={video.rvnde_level}
                                    descriptor={getEvidenceDescriptor(video.rvnde_level)}
                                    summaryReason={video.rvnde_summary_reason}
                                    details={video.rvnde_details}
                                    title="Evidence Strength"
                                />
                                <MicroFeedback
                                    feature="evidence_strength"
                                    contextId={video.videoId}
                                    prompt="Was this Evidence Strength score useful?"
                                    compact
                                />
                            </div>
                        )}

                        {/* Full Greyson Breakdown */}
                        {hasGreyson && (
                            <div id="section-greyson-desktop" className="scroll-mt-16">
                                <GreysonScoreCard
                                    totalScore={analysis.total_greyson_score}
                                    classification={analysis.scale_agreement}
                                    breakdown={analysis.greyson_breakdown as GreysonBreakdown}
                                    title="Experience Depth"
                                />
                                <MicroFeedback
                                    feature="greyson_score"
                                    contextId={video.videoId}
                                    prompt="Was this Experience Depth score useful?"
                                    compact
                                />
                            </div>
                        )}

                        {/* Full Transformation Breakdown */}
                        {hasTransformation && (
                            <div id="section-transformation-desktop" className="scroll-mt-16">
                                <TransformationScoreCard
                                    totalScore={analysis.transformation_score}
                                    classification={analysis.transformation_classification}
                                    breakdown={analysis.transformation_breakdown as any}
                                    title="Life Impact"
                                />
                                <MicroFeedback
                                    feature="transformation_score"
                                    contextId={video.videoId}
                                    prompt="Was this Life Impact score useful?"
                                    compact
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
