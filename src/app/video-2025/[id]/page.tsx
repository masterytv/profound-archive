import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Eye,
    Calendar,
    User,
    Heart,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    TrendingUp,
    Brain,
    BookOpen,
    Cpu,
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
import { YouTubePlayer } from "@/components/video/YouTubePlayer";
import { NderfAnalysisSection } from "@/components/analysis/NderfAnalysisSection";
import { SimilarExperiences, type SimilarExperience } from "@/components/analysis/SimilarExperiences";

export const revalidate = 86400; // ISR: revalidate once per day

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
        return { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200", dot: "bg-slate-400" };
    const l = level.toLowerCase();
    if (l.includes("exceptional"))
        return { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", dot: "bg-emerald-500" };
    if (l.includes("high") || l.includes("strong"))
        return { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", dot: "bg-amber-500" };
    return { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200", dot: "bg-blue-500" };
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
                        className="bg-slate-50 rounded-xl p-3 border border-slate-100"
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-slate-700">{label}</span>
                            {value.score !== undefined && (
                                <span className="text-xs font-bold bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-slate-800">
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

// --- Page Component ---

export default async function VideoPageAlt1({ params, searchParams }: VideoPageProps) {
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

    // Fetch similar experiences server-side (avoids client-side AbortError from React strict mode)
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

    return (
        <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
            {/* ─── Breadcrumb bar ─── */}
            <div className="border-b border-slate-200 bg-white/60 backdrop-blur-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 max-w-6xl">
                    <nav className="flex items-center gap-1.5 text-sm text-slate-400 py-3">
                        <Link href="/" className="hover:text-blue-600 transition-colors">
                            Home
                        </Link>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <Link href="/search3" className="hover:text-blue-600 transition-colors">
                            Search
                        </Link>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="text-slate-600 font-medium truncate max-w-[200px] sm:max-w-xs">
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

                        {/* Title + Metadata */}
                        <div className="space-y-4">
                            <h1
                                className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                {video.title || "Untitled Video"}
                            </h1>

                            <div className="flex flex-wrap items-center gap-3 text-sm">
                                {video.channelName && (
                                    <Link
                                        href={video.channelId ? `/channel/${video.channelId}` : (video.channelUrl || "#")}
                                        className="flex items-center gap-1.5 font-medium text-slate-800 hover:text-blue-600 transition-colors"
                                    >
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                            {video.channelName.charAt(0)}
                                        </div>
                                        {video.channelName}
                                    </Link>
                                )}

                                <span className="text-slate-300">·</span>

                                <div className="flex items-center gap-1 text-slate-500">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {formatDate(video.date)}
                                </div>

                                <div className="flex items-center gap-1 text-slate-500">
                                    <Eye className="w-3.5 h-3.5" />
                                    {formatViewCount(video.viewCount)} views
                                </div>

                                {video.experiencerFullName && (
                                    <div className="flex items-center gap-1 text-slate-500">
                                        <User className="w-3.5 h-3.5" />
                                        <span>
                                            Experiencer: <strong className="text-slate-700">{video.experiencerFullName}</strong>
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* YouTube link */}
                            <Link
                                href={video.url || `https://www.youtube.com/watch?v=${video.videoId}`}
                                target="_blank"
                                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Watch on YouTube
                            </Link>
                        </div>

                        {/* ─── Mobile-only: Research Scores ─── */}
                        {scoreCount > 0 && (
                            <div className="lg:hidden bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
                                <h3
                                    className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4"
                                    style={{ fontFamily: "'Crimson Pro', Georgia, serif", letterSpacing: "0.05em" }}
                                >
                                    Research Scores
                                </h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {hasVeridical && (
                                        <a href="#section-veridical-mobile" className="rounded-xl p-3 block cursor-pointer hover:ring-2 hover:ring-emerald-300 transition-all ${levelColor.bg} ${levelColor.border} border">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                                                <span className="text-[10px] font-semibold text-slate-700">Veridical</span>
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xl font-bold text-slate-900">{video.rvnde_total_score ?? "—"}</span>
                                                <span className="text-xs text-slate-400">/28</span>
                                            </div>
                                        </a>
                                    )}
                                    {hasGreyson && (
                                        <a href="#section-greyson" className="rounded-xl p-3 block cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all bg-blue-50 border border-blue-200">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Brain className="w-3.5 h-3.5 text-blue-600" />
                                                <span className="text-[10px] font-semibold text-slate-700">Greyson</span>
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xl font-bold text-slate-900">{analysis!.total_greyson_score ?? "—"}</span>
                                                <span className="text-xs text-slate-400">/32</span>
                                            </div>
                                        </a>
                                    )}
                                    {hasTransformation && (
                                        <a href="#section-transformation" className="rounded-xl p-3 block cursor-pointer hover:ring-2 hover:ring-rose-300 transition-all bg-rose-50 border border-rose-200">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Heart className="w-3.5 h-3.5 text-rose-600" />
                                                <span className="text-[10px] font-semibold text-slate-700">Transform</span>
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xl font-bold text-slate-900">{analysis!.transformation_score ?? "—"}</span>
                                                <span className="text-xs text-slate-400">/50</span>
                                            </div>
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* AI Summary */}
                        {video.analysis_nde_summary && (
                            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                                    <Cpu className="w-4 h-4 text-blue-500" />
                                    <h2
                                        className="text-lg font-bold text-slate-900"
                                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                                    >
                                        AI Summary
                                    </h2>
                                    <span className="ml-auto text-[10px] font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                                        AI-generated
                                    </span>
                                </div>
                                <div className="px-6 py-5">
                                    <p className="text-slate-700 leading-relaxed whitespace-pre-line text-[15px]">
                                        {video.analysis_nde_summary}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ─── Experience Analysis (NDERF) ─── */}
                        {analysis && (
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
                        )}

                        {/* ─── Similar Experiences (pgvector) ─── */}
                        <SimilarExperiences results={similarExperiences} />


                        {/* ─── Mobile-only: Veridical + Greyson + Transformation breakdowns ─── */}
                        {hasVeridical && (
                            <div id="section-veridical-mobile" className={`lg:hidden bg-white rounded-2xl border-2 ${levelColor.border} shadow-sm overflow-hidden scroll-mt-16`}>
                                <div className={`px-6 py-4 ${levelColor.bg} flex items-center gap-3`}>
                                    <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center">
                                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h2
                                            className="text-lg font-bold text-slate-900"
                                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                                        >
                                            Veridical Perception{" "}
                                            <span className="text-slate-400 font-normal text-base">(cvNDE)</span>
                                        </h2>
                                    </div>
                                    {video.rvnde_total_score !== null && (
                                        <div className="flex items-baseline gap-1 bg-white/90 px-4 py-2 rounded-xl shadow-sm">
                                            <span className="text-3xl font-bold text-slate-900">{video.rvnde_total_score}</span>
                                            <span className="text-slate-400 text-lg">/28</span>
                                        </div>
                                    )}
                                </div>
                                <div className="px-6 py-5 space-y-4">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {video.rvnde_level && (
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${levelColor.bg} ${levelColor.text}`}>
                                                <span className={`w-2 h-2 rounded-full ${levelColor.dot}`} />
                                                {video.rvnde_level}
                                            </span>
                                        )}
                                        <Link
                                            href="/scale/cvnde"
                                            target="_blank"
                                            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                        >
                                            About this scale <ExternalLink className="w-3 h-3" />
                                        </Link>
                                    </div>
                                    {video.rvnde_summary_reason && (
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            {video.rvnde_summary_reason}
                                        </p>
                                    )}
                                    {video.rvnde_details && (
                                        <Collapsible>
                                            <CollapsibleTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full justify-between text-sm text-slate-600 hover:text-blue-600"
                                                >
                                                    View Criteria Breakdown
                                                    <ChevronDown className="w-4 h-4" />
                                                </Button>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent className="pt-3">
                                                <RvndeDetailsSection details={video.rvnde_details} />
                                            </CollapsibleContent>
                                        </Collapsible>
                                    )}
                                </div>
                            </div>
                        )}
                        {hasGreyson && (
                            <div id="section-greyson" className="lg:hidden scroll-mt-16">
                                <GreysonScoreCard
                                    totalScore={analysis!.total_greyson_score}
                                    classification={analysis!.scale_agreement}
                                    breakdown={analysis!.greyson_breakdown as GreysonBreakdown}
                                />
                            </div>
                        )}
                        {hasTransformation && (
                            <div id="section-transformation" className="lg:hidden scroll-mt-16">
                                <TransformationScoreCard
                                    totalScore={analysis!.transformation_score}
                                    classification={analysis!.transformation_classification}
                                    breakdown={analysis!.transformation_breakdown as any}
                                />
                            </div>
                        )}

                        {/* Transcript */}
                        {video.subtitles_punctuated && (
                            <Collapsible>
                                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                                    <CollapsibleTrigger asChild>
                                        <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer">
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="w-4 h-4 text-slate-500" />
                                                <h2
                                                    className="text-lg font-bold text-slate-900"
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
                                            <div className="bg-slate-50 rounded-xl p-5 max-h-[500px] overflow-y-auto border border-slate-100">
                                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                                                    {video.subtitles_punctuated}
                                                </p>
                                            </div>
                                        </div>
                                    </CollapsibleContent>
                                </div>
                            </Collapsible>
                        )}
                    </div>

                    {/* ─── Right Sidebar (desktop only) ─── */}
                    <div className="hidden lg:block space-y-6 lg:sticky lg:top-14 lg:self-start lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:scrollbar-thin lg:pr-1">
                        {/* Score Summary Card */}
                        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
                            <h3
                                className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif", letterSpacing: "0.05em" }}
                            >
                                Research Scores
                            </h3>

                            {scoreCount === 0 ? (
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    This video has not yet been analyzed by our research scales.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {/* Veridical mini */}
                                    {hasVeridical && (
                                        <a href="#section-veridical" className={`rounded-xl p-3 block cursor-pointer hover:ring-2 hover:ring-emerald-300 transition-all ${levelColor.bg} ${levelColor.border} border`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <TrendingUp className="w-4 h-4 text-emerald-600" />
                                                <span className="text-xs font-semibold text-slate-700">Veridical Perception</span>
                                            </div>
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-2xl font-bold text-slate-900">
                                                    {video.rvnde_total_score ?? "—"}
                                                </span>
                                                <span className="text-sm text-slate-400">/28</span>
                                                {video.rvnde_level && (
                                                    <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full ${levelColor.text} bg-white/70`}>
                                                        {video.rvnde_level.replace(" Evidential Strength", "")}
                                                    </span>
                                                )}
                                            </div>
                                        </a>
                                    )}

                                    {/* Greyson mini */}
                                    {hasGreyson && (
                                        <a href="#section-greyson-desktop" className="rounded-xl p-3 block cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all bg-blue-50 border border-blue-200">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Brain className="w-4 h-4 text-blue-600" />
                                                <span className="text-xs font-semibold text-slate-700">Greyson Scale</span>
                                            </div>
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-2xl font-bold text-slate-900">
                                                    {analysis.total_greyson_score ?? "—"}
                                                </span>
                                                <span className="text-sm text-slate-400">/32</span>
                                                {analysis.scale_agreement && (
                                                    <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full text-blue-700 bg-white/70">
                                                        {analysis.scale_agreement}
                                                    </span>
                                                )}
                                            </div>
                                        </a>
                                    )}

                                    {/* Transformation mini */}
                                    {hasTransformation && (
                                        <a href="#section-transformation-desktop" className="rounded-xl p-3 block cursor-pointer hover:ring-2 hover:ring-rose-300 transition-all bg-rose-50 border border-rose-200">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Heart className="w-4 h-4 text-rose-600" />
                                                <span className="text-xs font-semibold text-slate-700">Transformation</span>
                                            </div>
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-2xl font-bold text-slate-900">
                                                    {analysis.transformation_score ?? "—"}
                                                </span>
                                                <span className="text-sm text-slate-400">/50</span>
                                                {analysis.transformation_classification && (
                                                    <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full text-rose-700 bg-white/70">
                                                        {analysis.transformation_classification}
                                                    </span>
                                                )}
                                            </div>
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* Quick links */}
                            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
                                <Link
                                    href="/scale/cvnde"
                                    className="flex items-center justify-between text-xs text-slate-500 hover:text-blue-600 transition-colors py-1"
                                >
                                    <span>About cvNDE Scale</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                                <Link
                                    href="/scale/greyson"
                                    className="flex items-center justify-between text-xs text-slate-500 hover:text-blue-600 transition-colors py-1"
                                >
                                    <span>About Greyson Scale</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                                <Link
                                    href="/scale/transformation"
                                    className="flex items-center justify-between text-xs text-slate-500 hover:text-blue-600 transition-colors py-1"
                                >
                                    <span>About NDE-TI Scale</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </div>

                        {/* Full Veridical Perception Breakdown (sidebar widget) */}
                        {hasVeridical && (
                            <div id="section-veridical" className={`bg-white rounded-2xl border-2 ${levelColor.border} shadow-sm overflow-hidden scroll-mt-16`}>
                                <div className={`px-6 py-4 ${levelColor.bg} flex items-center gap-3`}>
                                    <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center">
                                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h2
                                            className="text-lg font-bold text-slate-900"
                                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                                        >
                                            Veridical Perception{" "}
                                            <span className="text-slate-400 font-normal text-base">(cvNDE)</span>
                                        </h2>
                                    </div>
                                    {video.rvnde_total_score !== null && (
                                        <div className="flex items-baseline gap-1 bg-white/90 px-4 py-2 rounded-xl shadow-sm">
                                            <span className="text-3xl font-bold text-slate-900">{video.rvnde_total_score}</span>
                                            <span className="text-slate-400 text-lg">/28</span>
                                        </div>
                                    )}
                                </div>
                                <div className="px-6 py-5 space-y-4">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {video.rvnde_level && (
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${levelColor.bg} ${levelColor.text}`}>
                                                <span className={`w-2 h-2 rounded-full ${levelColor.dot}`} />
                                                {video.rvnde_level}
                                            </span>
                                        )}
                                        <Link
                                            href="/scale/cvnde"
                                            target="_blank"
                                            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                        >
                                            About this scale <ExternalLink className="w-3 h-3" />
                                        </Link>
                                    </div>

                                    {video.rvnde_summary_reason && (
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            {video.rvnde_summary_reason}
                                        </p>
                                    )}

                                    {video.rvnde_details && (
                                        <Collapsible>
                                            <CollapsibleTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full justify-between text-sm text-slate-600 hover:text-blue-600"
                                                >
                                                    View Criteria Breakdown
                                                    <ChevronDown className="w-4 h-4" />
                                                </Button>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent className="pt-3">
                                                <RvndeDetailsSection details={video.rvnde_details} />
                                            </CollapsibleContent>
                                        </Collapsible>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Full Greyson Breakdown (sidebar widget) */}
                        {hasGreyson && (
                            <div id="section-greyson-desktop" className="scroll-mt-16">
                                <GreysonScoreCard
                                    totalScore={analysis.total_greyson_score}
                                    classification={analysis.scale_agreement}
                                    breakdown={analysis.greyson_breakdown as GreysonBreakdown}
                                />
                            </div>
                        )}

                        {/* Full Transformation Breakdown (sidebar widget) */}
                        {hasTransformation && (
                            <div id="section-transformation-desktop" className="scroll-mt-16">
                                <TransformationScoreCard
                                    totalScore={analysis.transformation_score}
                                    classification={analysis.transformation_classification}
                                    breakdown={analysis.transformation_breakdown as any}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
