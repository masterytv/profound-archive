"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import FavoriteButton from "@/components/favorite-button"
import SaveToCollectionButton from "@/components/add-to-collection-button"
import { InteractiveBadges } from "@/components/analysis/InteractiveBadges"
import { ScoreBadges } from "@/components/analysis/ScoreBadges"

interface Transcript {
    content: string;
    start_time?: number;
    similarity?: number;
}

interface SearchResultCardV4Props {
    video: {
        video_id: string;
        url: string;
        title: string;
        thumbnailUrl: string;
        date: string | null;
        viewCount: string;
        channelName: string;
        summary: string;
        transcripts: Transcript[];
    };
    searchTerm?: string;
    user?: User | null;
}

// All analysis data fetched in a single query per card
interface AnalysisData {
    experience_type: string | null;
    trigger_category: string | null;
    overall_tone: string | null;
    intensity_rating: number | null;
    total_greyson_score: number | null;
    scale_agreement: string | null;
    transformation_score: number | null;
    transformation_classification: string | null;
}

// Veridical data lives in nde_vids, not nde_analysis
interface VeridicalData {
    rvnde_total_score: number | null;
    rvnde_level: string | null;
}

// Sub-component for transcript chunks with truncation support
interface TranscriptChunkProps {
    content: string;
    linkUrl: string;
    searchTerm?: string;
    highlightTerm: (text: string, term?: string) => React.ReactNode;
    timestampStr: string | null;
    similarity?: number;
    isOversized: boolean;
    truncateLength: number;
    hasTimestamp: boolean;
    videoId: string;
    videoTitle: string;
    videoThumbnailUrl: string;
    startTime?: number;
    user?: User | null;
}

function TranscriptChunk({
    content, linkUrl, searchTerm, highlightTerm,
    timestampStr, similarity, isOversized, truncateLength,
    hasTimestamp, videoId, videoTitle, videoThumbnailUrl, startTime, user
}: TranscriptChunkProps) {
    const [isChunkExpanded, setIsChunkExpanded] = useState(false);
    const displayContent = isOversized && !isChunkExpanded
        ? content.substring(0, truncateLength) + "..."
        : content;

    return (
        <div className="group relative pl-4 border-l-2 border-primary/20 hover:border-primary transition-colors">
            <Link href={linkUrl} className="block">
                <div className="text-sm text-foreground/80 leading-relaxed">
                    &quot;{highlightTerm(displayContent, searchTerm)}&quot;
                </div>
            </Link>
            {isOversized && (
                <Button
                    variant="link"
                    className="p-0 h-auto text-xs text-primary/70 hover:text-primary"
                    onClick={(e) => { e.preventDefault(); setIsChunkExpanded(!isChunkExpanded); }}
                >
                    {isChunkExpanded ? "Show Less" : `Show More (${content.length.toLocaleString()} chars)`}
                </Button>
            )}
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground font-mono">
                {timestampStr && (
                    <span className="bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        {timestampStr}
                    </span>
                )}
                {similarity != null && (
                    <span>Match: {(similarity * 100).toFixed(0)}%</span>
                )}
                {hasTimestamp && (
                    <SaveToCollectionButton
                        videoId={videoId}
                        videoTitle={videoTitle}
                        videoThumbnailUrl={videoThumbnailUrl}
                        startTime={startTime!}
                        content={content}
                        user={user}
                    />
                )}
            </div>
        </div>
    );
}

export function SearchResultCardV4({ video, searchTerm, user }: SearchResultCardV4Props) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
    const [veridicalData, setVeridicalData] = useState<VeridicalData | null>(null);
    const supabase = createClient();

    // Fetch analysis data from nde_analysis + veridical from nde_vids
    useEffect(() => {
        if (!video.video_id) return;
        const fetchData = async () => {
            // Analysis data (experience badges + greyson/transformation scores)
            const { data: analysis } = await supabase
                .from("nde_analysis")
                .select(
                    "experience_type, trigger_category, overall_tone, intensity_rating, " +
                    "total_greyson_score, scale_agreement, " +
                    "transformation_score, transformation_classification"
                )
                .eq("video_id", video.video_id)
                .single();
            if (analysis) setAnalysisData(analysis as AnalysisData);

            // Veridical perception score (lives in nde_vids table)
            const { data: veridical } = await supabase
                .from("nde_vids")
                .select("rvnde_total_score, rvnde_level")
                .eq("videoId", video.video_id)
                .single();
            if (veridical) setVeridicalData(veridical as VeridicalData);
        };
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [video.video_id]);

    // Helper for formatting timestamp
    const formatTimestamp = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return [h, m, s]
            .map((v) => (v < 10 ? "0" + v : v))
            .filter((v, i) => v !== "00" || i > 0)
            .join(":");
    };

    // Safe Date Formatter
    const formatDate = (dateString: string | null) => {
        if (!dateString) return "Unknown Date";
        try {
            const d = new Date(dateString);
            if (isNaN(d.getTime())) return "Invalid Date";
            return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
        } catch {
            return "Invalid Date";
        }
    };

    // Helper for Highlighting
    const highlightTerm = (text: string, term?: string) => {
        if (!term || !term.trim()) return text;
        try {
            const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
            const parts = text.split(regex);
            return parts.map((part, i) =>
                regex.test(part) ? (
                    <strong key={i} className="text-primary font-bold bg-yellow-100 px-1 rounded">{part}</strong>
                ) : part
            );
        } catch {
            return text;
        }
    };

    const summary = video.summary;
    const isLongSummary = summary.length > 250;
    const displayedSummary = isExpanded ? summary : `${summary.substring(0, 250)}${isLongSummary ? "..." : ""}`;

    const hasScores = (
        (analysisData?.total_greyson_score != null) ||
        (analysisData?.transformation_score != null) ||
        (veridicalData?.rvnde_total_score != null)
    );

    const hasBadges = analysisData && (
        analysisData.experience_type ||
        analysisData.trigger_category ||
        analysisData.overall_tone ||
        analysisData.intensity_rating
    );

    return (
        <Card className="overflow-hidden transition-shadow duration-300 ease-in-out hover:shadow-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* Left Column (Metadata) */}
                <div className="md:col-span-4 flex flex-col gap-3">
                    {/* Thumbnail */}
                    <div className="relative rounded-md overflow-hidden aspect-video w-full bg-gray-100">
                        <Link href={`/video/${video.video_id}`}>
                            {video.thumbnailUrl ? (
                                <Image
                                    src={video.thumbnailUrl.replace("maxresdefault", "hqdefault")}
                                    alt={video.title}
                                    fill
                                    sizes="(max-width: 768px) 100vw, 33vw"
                                    className="object-cover"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
                            )}
                        </Link>
                    </div>

                    {/* Metadata Lines */}
                    <div className="text-sm text-muted-foreground space-y-1">
                        <p className="font-medium text-foreground">{video.channelName}</p>
                        <p>{formatDate(video.date)}</p>
                        <p>{isNaN(Number(video.viewCount)) ? video.viewCount : Number(video.viewCount).toLocaleString()} views</p>
                    </div>
                </div>

                {/* Right Column (Content) */}
                <div className="md:col-span-8 flex flex-col gap-3">
                    {/* Title & Actions */}
                    <div className="flex justify-between items-start gap-2">
                        <h3 className="text-xl font-bold leading-tight hover:text-primary transition-colors">
                            <Link href={`/video/${video.video_id}`}>
                                {video.title}
                            </Link>
                        </h3>
                        <div className="flex items-center flex-shrink-0">
                            <SaveToCollectionButton
                                videoId={video.video_id}
                                videoTitle={video.title}
                                videoThumbnailUrl={video.thumbnailUrl}
                                startTime={0}
                                content={video.summary}
                                user={user}
                            />
                            <FavoriteButton
                                videoId={video.video_id}
                                videoTitle={video.title}
                                videoThumbnailUrl={video.thumbnailUrl}
                                user={user}
                            />
                        </div>
                    </div>

                    {/* ─── V4: All badges in one wrapping row ─── */}
                    {(hasBadges || hasScores) && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            {/* Experience badges first: type, trigger, tone, intensity */}
                            {hasBadges && (
                                <InteractiveBadges
                                    experienceType={analysisData!.experience_type}
                                    triggerCategory={analysisData!.trigger_category}
                                    tone={analysisData!.overall_tone}
                                    intensityRating={analysisData!.intensity_rating}
                                    size="sm"
                                    inline
                                />
                            )}

                            {/* Scale score badges: Greyson, Transformation, Veridical */}
                            {hasScores && (
                                <ScoreBadges
                                    greysonScore={analysisData?.total_greyson_score}
                                    greysonClassification={analysisData?.scale_agreement}
                                    transformationScore={analysisData?.transformation_score}
                                    transformationClassification={analysisData?.transformation_classification}
                                    veridicalScore={veridicalData?.rvnde_total_score}
                                    veridicalLevel={veridicalData?.rvnde_level}
                                    size="sm"
                                    inline
                                />
                            )}
                        </div>
                    )}

                    {/* Summary */}
                    {summary && (
                        <div className="bg-muted/30 p-3 rounded-md text-sm">
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary/50 text-primary">
                                    AI Video Summary - AI makes mistakes
                                </Badge>
                            </div>
                            <p className="text-foreground/90">
                                {displayedSummary}
                                {isLongSummary && (
                                    <Button variant="link" className="p-0 h-auto text-xs ml-1" onClick={() => setIsExpanded(!isExpanded)}>
                                        {isExpanded ? "Read Less" : "Read More"}
                                    </Button>
                                )}
                            </p>
                        </div>
                    )}

                    {/* Transcripts (Matches) */}
                    <div className="space-y-4">
                        {video.transcripts.map((t, idx) => {
                            const hasTimestamp = typeof t.start_time === "number" && !isNaN(t.start_time);
                            const timestampStr = hasTimestamp ? formatTimestamp(t.start_time!) : null;
                            // Link to internal /video page with ?t= so the player starts at the right moment.
                            // Falls back to /video/[id] (no timestamp) if no start_time.
                            const linkUrl = hasTimestamp
                                ? `/video/${video.video_id}?t=${Math.floor(t.start_time!)}`
                                : `/video/${video.video_id}`;

                            // Truncate oversized transcript chunks to prevent wall-of-text display
                            const TRANSCRIPT_TRUNCATE_LENGTH = 400;
                            const isOversized = t.content.length > TRANSCRIPT_TRUNCATE_LENGTH;

                            return (
                                <TranscriptChunk
                                    key={idx}
                                    content={t.content}
                                    linkUrl={linkUrl}
                                    searchTerm={searchTerm}
                                    highlightTerm={highlightTerm}
                                    timestampStr={timestampStr}
                                    similarity={t.similarity}
                                    isOversized={isOversized}
                                    truncateLength={TRANSCRIPT_TRUNCATE_LENGTH}
                                    hasTimestamp={hasTimestamp}
                                    videoId={video.video_id}
                                    videoTitle={video.title}
                                    videoThumbnailUrl={video.thumbnailUrl}
                                    startTime={t.start_time}
                                    user={user}
                                />
                            );
                        })}
                    </div>
                </div>

            </div>
        </Card>
    );
}
