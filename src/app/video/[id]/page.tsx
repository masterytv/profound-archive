import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, Calendar, User, Sparkles, ChevronDown, ExternalLink, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { GreysonScoreCard, GreysonBreakdown } from "@/components/video/GreysonScoreCard";
import { TransformationScoreCard } from "@/components/video/TransformationScoreCard";

interface VideoPageProps {
    params: Promise<{ id: string }>;
}

// Helper to format view count
function formatViewCount(count: number | null): string {
    if (!count) return "0";
    if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toLocaleString();
}

// Helper to format date
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

// Get level color based on rvnde_level
// Green = Exceptional, Yellow = High, Blue = Moderate/Low
function getLevelColor(level: string | null): string {
    if (!level) return "bg-gray-100 text-gray-800";
    const lowerLevel = level.toLowerCase();
    if (lowerLevel.includes("exceptional")) {
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
    }
    if (lowerLevel.includes("high") || lowerLevel.includes("strong")) {
        return "bg-amber-100 text-amber-800 border-amber-200";
    }
    // Moderate, Low, Weak - all use blue
    return "bg-blue-100 text-blue-800 border-blue-200";
}

// Format rvnde_details JSON into readable text
interface RvndeDetailItem {
    quote?: string;
    score?: number;
    reasoning?: string;
}

function formatRvndeDetails(details: unknown): React.ReactNode {
    if (!details || typeof details !== "object") return null;

    const entries = Object.entries(details as Record<string, RvndeDetailItem>);
    if (entries.length === 0) return null;

    return (
        <div className="space-y-4">
            {entries.map(([key, value]) => {
                const label = key
                    .replace(/_/g, " ")
                    .replace(/([a-z])([A-Z])/g, "$1 $2")
                    .replace(/\b\w/g, (c) => c.toUpperCase());

                if (typeof value !== "object" || value === null) {
                    return (
                        <div key={key} className="border-b border-gray-200 pb-2 last:border-b-0">
                            <span className="font-semibold text-gray-700">{label}:</span>{" "}
                            <span className="text-gray-600">{String(value)}</span>
                        </div>
                    );
                }

                return (
                    <div key={key} className="border-b border-gray-200 pb-3 last:border-b-0">
                        <div className="font-semibold text-gray-800 mb-1">{label}</div>
                        {value.score !== undefined && (
                            <div className="text-sm text-gray-600 mb-1">
                                <span className="font-medium">Score:</span> {value.score}
                            </div>
                        )}
                        {value.quote && (
                            <div className="text-sm text-gray-600 mb-1 italic">
                                "{value.quote}"
                            </div>
                        )}
                        {value.reasoning && (
                            <div className="text-sm text-gray-600">
                                <span className="font-medium">Reasoning:</span> {value.reasoning}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default async function VideoPage({ params }: VideoPageProps) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch video data
    const { data: video, error } = await supabase
        .from("nde_vids")
        .select(
            `
      videoId,
      title,
      channelName,
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

    // Fetch analysis data separately to avoid join issues
    const { data: analysis, error: analysisError } = await supabase
        .from("nde_analysis")
        .select("total_greyson_score, scale_agreement, greyson_breakdown, transformation_score, transformation_classification, transformation_breakdown")
        .eq("video_id", id)
        .single();

    console.log(`[VideoPage] ID: ${id}`);
    console.log(`[VideoPage] Analysis Error:`, analysisError);
    console.log(`[VideoPage] Analysis Data:`, analysis ? 'Present' : 'Null');
    if (analysis) console.log(JSON.stringify(analysis, null, 2));

    const youtubeEmbedUrl = `https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0`;

    return (
        <div className="min-h-screen bg-background">
            {/* Top Navigation */}
            <div className="container mx-auto px-4 py-4 max-w-6xl">
                <Link
                    href="/search3"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Search
                </Link>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 pb-12 max-w-6xl">
                {/* Video Player */}
                <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg mb-6">
                    <iframe
                        src={youtubeEmbedUrl}
                        title={video.title || "Video"}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full"
                    />
                </div>

                {/* Title and Metadata - directly under video */}
                <div className="mb-8 space-y-4">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                        {video.title || "Untitled Video"}
                    </h1>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                        {video.channelName && (
                            <Link
                                href={video.channelUrl || "#"}
                                target="_blank"
                                className="font-medium text-foreground hover:text-primary transition-colors"
                            >
                                {video.channelName}
                            </Link>
                        )}

                        <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(video.date)}</span>
                        </div>

                        <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>{formatViewCount(video.viewCount)} views</span>
                        </div>

                        {video.experiencerFullName && (
                            <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                <span>Experiencer: <strong>{video.experiencerFullName}</strong></span>
                            </div>
                        )}
                    </div>

                    {/* Watch on YouTube link */}
                    <Link
                        href={video.url || `https://www.youtube.com/watch?v=${video.videoId}`}
                        target="_blank"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Watch on YouTube
                    </Link>
                </div>

                {/* Scores & Summary Section - Two Rows of Two Columns */}
                {/* Row 1: AI Summary + Greyson Scale */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 items-stretch">
                    {/* 1. AI Summary */}
                    {video.analysis_nde_summary && (
                        <Card className="h-full flex flex-col">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Sparkles className="w-5 h-5 text-purple-500" />
                                    AI Summary
                                    <Badge variant="outline" className="text-[10px] font-normal ml-auto">
                                        AI-generated
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <p className="text-foreground/90 leading-relaxed whitespace-pre-line text-sm">
                                    {video.analysis_nde_summary}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* 2. Greyson Scale */}
                    {analysis && analysis.greyson_breakdown && (
                        <GreysonScoreCard
                            totalScore={analysis.total_greyson_score}
                            classification={analysis.scale_agreement}
                            breakdown={analysis.greyson_breakdown as GreysonBreakdown}
                        />
                    )}
                </div>

                {/* Row 2: Veridical Perception + Transformation Index */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 items-stretch">
                    {/* 3. Veridical Perception Score */}
                    {(video.rvnde_total_score !== null || video.rvnde_level) && (
                        <Card className={`h-full flex flex-col border-2 ${getLevelColor(video.rvnde_level)}`}>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <TrendingUp className="w-5 h-5" />
                                    <span>Veridical Perception (<Link href="/scale/cvnde" target="_blank" className="hover:underline">cvNDE</Link>)</span>
                                    <Link href="/scale/cvnde" target="_blank" className="ml-1 text-muted-foreground hover:text-primary transition-colors">
                                        <ExternalLink className="w-4 h-4" />
                                    </Link>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 flex-1">
                                {video.rvnde_total_score !== null && (
                                    <div className="flex items-baseline gap-2">
                                        <div className="text-4xl font-bold">
                                            {video.rvnde_total_score}
                                        </div>
                                        <div className="text-lg font-normal text-muted-foreground">/ 28</div>
                                        {video.rvnde_level && (
                                            <Badge variant="secondary" className={`${getLevelColor(video.rvnde_level)} ml-auto`}>
                                                {video.rvnde_level}
                                            </Badge>
                                        )}
                                    </div>
                                )}

                                {video.rvnde_summary_reason && (
                                    <p className="text-sm text-foreground/80">{video.rvnde_summary_reason}</p>
                                )}

                                {/* Spacer to push details to bottom if needed, or just flow naturally */}
                                <div className="flex-1" />

                                {video.rvnde_details && (
                                    <Collapsible>
                                        <CollapsibleTrigger asChild>
                                            <Button variant="ghost" size="sm" className="w-full justify-between text-xs mt-2">
                                                View Details
                                                <ChevronDown className="w-4 h-4" />
                                            </Button>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="pt-2">
                                            <div className="text-sm bg-white/50 p-3 rounded-md max-h-60 overflow-y-auto">
                                                {formatRvndeDetails(video.rvnde_details)}
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* 4. NDE Transformation Index */}
                    {analysis && analysis.transformation_breakdown && (
                        <TransformationScoreCard
                            totalScore={analysis.transformation_score}
                            classification={analysis.transformation_classification}
                            breakdown={analysis.transformation_breakdown as any}
                        />
                    )}
                </div>

                {/* Transcript */}
                {video.subtitles_punctuated && (
                    <Collapsible>
                        <Card>
                            <CollapsibleTrigger asChild>
                                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                    <CardTitle className="flex items-center justify-between text-lg">
                                        <span>Full Transcript</span>
                                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                    </CardTitle>
                                </CardHeader>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <CardContent className="pt-0">
                                    <div className="bg-muted/30 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                                        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                                            {video.subtitles_punctuated}
                                        </p>
                                    </div>
                                </CardContent>
                            </CollapsibleContent>
                        </Card>
                    </Collapsible>
                )}
            </div>
        </div>
    );
}
