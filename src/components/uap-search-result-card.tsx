"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FavoriteButton from "@/components/favorite-button";
import SaveToCollectionButton from "@/components/add-to-collection-button";
import { Play, Clock, Shield, Zap, Eye as EyeIcon } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface UapTranscript {
  content: string;
  startTime: number | null;
  similarity?: number;
}

export interface GroupedUapVideo {
  videoId: string;
  url: string;
  title: string;
  thumbnailUrl: string;
  date: number; // epoch seconds
  viewCount: number;
  channelName: string;
  summary: string | null;
  tier: number;
  track: string;
  transcripts: UapTranscript[];
}

// Analysis data fetched per card from uap_analysis
interface UapAnalysisData {
  hynek_type: string | null;
  experience_type: string | null;
  entities: unknown; // JSONB array
  evidence_types: unknown; // JSONB array
  recurrence_pattern: string | null;
  content_type: string | null;
  video_tone: string | null;
  ess_score: number | null;
  cds_score: number | null;
  cti_score: number | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s]
    .map((v) => (v < 10 ? "0" + v : v))
    .filter((v, i) => v !== "00" || i > 0)
    .join(":");
}

function formatDate(epochSec: number): string {
  if (!epochSec) return "";
  try {
    return new Date(epochSec * 1000).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function formatViewCount(n: number): string {
  if (!n) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K views`;
  return `${n.toLocaleString()} views`;
}

const CONTENT_TYPE_LABELS: Record<string, string> = {
  first_person_encounter: "Encounter",
  retold_story: "Retold",
  program_disclosure: "Disclosure",
  research_analysis: "Research",
  documentary: "Documentary",
  interview_panel: "Interview",
  lecture: "Lecture",
  news_report: "News",
};

function highlightTerm(text: string, term?: string): React.ReactNode {
  if (!term || !term.trim()) return text;
  try {
    const regex = new RegExp(
      `(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <strong
          key={i}
          className="text-green-600 dark:text-green-400 font-bold bg-green-100 dark:bg-green-900/40 px-0.5 rounded"
        >
          {part}
        </strong>
      ) : (
        part
      )
    );
  } catch {
    return text;
  }
}

// ─── Transcript Chunk Sub-Component ─────────────────────────────────────────

function TranscriptChunk({
  content,
  startTime,
  videoId,
  videoTitle,
  videoThumbnailUrl,
  searchTerm,
  similarity,
  user,
}: {
  content: string;
  startTime: number | null;
  videoId: string;
  videoTitle: string;
  videoThumbnailUrl: string;
  searchTerm?: string;
  similarity?: number;
  user?: User | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const TRUNCATE_LENGTH = 400;
  const isOversized = content.length > TRUNCATE_LENGTH;
  const displayContent =
    isOversized && !isExpanded
      ? content.substring(0, TRUNCATE_LENGTH) + "..."
      : content;

  const hasTimestamp =
    typeof startTime === "number" && !isNaN(startTime);
  const timestampStr = hasTimestamp ? formatTimestamp(startTime!) : null;
  const linkUrl = hasTimestamp
    ? `/uap/video/${videoId}?t=${Math.floor(startTime!)}`
    : `/uap/video/${videoId}`;

  return (
    <div className="group relative pl-4 border-l-2 border-green-500/20 hover:border-green-500/60 transition-colors">
      <Link href={linkUrl} className="block">
        <div className="text-sm text-foreground/80 leading-relaxed">
          &quot;{highlightTerm(displayContent, searchTerm)}&quot;
        </div>
      </Link>
      {isOversized && (
        <Button
          variant="link"
          className="p-0 h-auto text-xs text-green-600/70 hover:text-green-600"
          onClick={(e) => {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded
            ? "Show Less"
            : `Show More (${content.length.toLocaleString()} chars)`}
        </Button>
      )}
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground font-mono">
        {timestampStr && (
          <span className="bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground group-hover:bg-green-600 group-hover:text-white transition-colors">
            {timestampStr}
          </span>
        )}
        {similarity != null && (
          <span className="text-green-600 dark:text-green-400 font-medium">
            {Math.round(similarity * 100)}% match
          </span>
        )}
        {hasTimestamp && (
          <SaveToCollectionButton
            videoId={videoId}
            videoTitle={videoTitle}
            videoThumbnailUrl={videoThumbnailUrl}
            startTime={startTime!}
            content={content}
            user={user}
            domain="uap"
          />
        )}
      </div>
    </div>
  );
}

// ─── UAP Analysis Badges ────────────────────────────────────────────────────

function UapBadges({ data }: { data: UapAnalysisData }) {
  const badges: React.ReactNode[] = [];

  // Hynek classification
  if (data.hynek_type) {
    badges.push(
      <Badge
        key="hynek"
        variant="outline"
        className="text-[10px] border-violet-500/50 text-violet-600 dark:text-violet-400"
      >
        {data.hynek_type}
      </Badge>
    );
  }

  // Experience type
  if (data.experience_type) {
    badges.push(
      <Badge
        key="exp"
        variant="outline"
        className="text-[10px] border-blue-500/50 text-blue-600 dark:text-blue-400"
      >
        {data.experience_type.replace(/_/g, " ")}
      </Badge>
    );
  }

  // Content type
  if (data.content_type) {
    badges.push(
      <Badge
        key="ct"
        variant="outline"
        className="text-[10px] border-slate-500/50 text-slate-600 dark:text-slate-400"
      >
        {CONTENT_TYPE_LABELS[data.content_type] ??
          data.content_type.replace(/_/g, " ")}
      </Badge>
    );
  }

  // Video tone
  if (data.video_tone) {
    badges.push(
      <Badge
        key="tone"
        variant="outline"
        className="text-[10px] border-amber-500/50 text-amber-600 dark:text-amber-400"
      >
        {data.video_tone.replace(/_/g, " ")}
      </Badge>
    );
  }

  // Entity types
  if (data.entities && Array.isArray(data.entities)) {
    const entityTypes = data.entities
      .map((e: Record<string, unknown>) => (e as { entity_type?: string }).entity_type)
      .filter(Boolean)
      .slice(0, 3);
    for (const et of entityTypes) {
      badges.push(
        <Badge
          key={`ent-${et}`}
          variant="outline"
          className="text-[10px] border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
        >
          {(et as string).replace(/_/g, " ")}
        </Badge>
      );
    }
  }

  // CET Triad scores
  const scores: { label: string; value: number | null; icon: typeof Zap; color: string }[] = [
    { label: "ESS", value: data.ess_score, icon: Shield, color: "text-orange-500" },
    { label: "CDS", value: data.cds_score, icon: Zap, color: "text-cyan-500" },
    { label: "CTI", value: data.cti_score, icon: EyeIcon, color: "text-pink-500" },
  ];

  for (const s of scores) {
    if (s.value != null) {
      badges.push(
        <Badge
          key={s.label}
          variant="outline"
          className={`text-[10px] border-current/30 ${s.color}`}
        >
          <s.icon className="w-2.5 h-2.5 mr-0.5" />
          {s.label}: {s.value}
        </Badge>
      );
    }
  }

  if (badges.length === 0) return null;

  return <div className="flex flex-wrap items-center gap-1.5">{badges}</div>;
}

// ─── Main Card Component ────────────────────────────────────────────────────

export function UapSearchResultCard({
  video,
  searchTerm,
  user,
}: {
  video: GroupedUapVideo;
  searchTerm?: string;
  user?: User | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [analysisData, setAnalysisData] = useState<UapAnalysisData | null>(
    null
  );
  const supabase = createClient();

  // Fetch analysis data for badges (gracefully empty if not populated)
  useEffect(() => {
    if (!video.videoId) return;
    const fetchAnalysis = async () => {
      const { data } = await supabase
        .from("uap_analysis")
        .select(
          "hynek_type, experience_type, entities, evidence_types, recurrence_pattern, content_type, video_tone, ess_score, cds_score, cti_score"
        )
        .eq("video_id", video.videoId)
        .single();
      if (data) setAnalysisData(data as UapAnalysisData);
    };
    fetchAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.videoId]);

  const summary = video.summary || "";
  const isLongSummary = summary.length > 250;
  const displayedSummary = isExpanded
    ? summary
    : `${summary.substring(0, 250)}${isLongSummary ? "..." : ""}`;

  return (
    <Card className="overflow-hidden transition-shadow duration-300 ease-in-out hover:shadow-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column — Thumbnail + metadata */}
        <div className="md:col-span-4 flex flex-col gap-3">
          <div className="relative rounded-md overflow-hidden aspect-video w-full bg-gray-100 dark:bg-slate-800">
            <Link href={`/uap/video/${video.videoId}`}>
              {video.thumbnailUrl ? (
                <Image
                  src={video.thumbnailUrl.replace(
                    "maxresdefault",
                    "hqdefault"
                  )}
                  alt={video.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <Play className="w-8 h-8" />
                </div>
              )}
            </Link>
            {/* Tier badge */}
            <div className="absolute top-1 left-1">
              <span
                className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                  video.tier === 1
                    ? "bg-green-600/90 text-white"
                    : "bg-slate-800/80 text-slate-200"
                }`}
              >
                {video.tier === 1 ? "Encounter" : "Research"}
              </span>
            </div>
          </div>

          {/* Metadata */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">{video.channelName}</p>
            {video.date > 0 && <p>{formatDate(video.date)}</p>}
            {video.viewCount > 0 && <p>{formatViewCount(video.viewCount)}</p>}
          </div>
        </div>

        {/* Right Column — Content */}
        <div className="md:col-span-8 flex flex-col gap-3">
          {/* Title + Save/Favorite actions */}
          <div className="flex justify-between items-start gap-2">
            <h3 className="text-xl font-bold leading-tight hover:text-green-600 dark:hover:text-green-400 transition-colors">
              <Link href={`/uap/video/${video.videoId}`}>{video.title}</Link>
            </h3>
            <div className="flex items-center flex-shrink-0">
              <SaveToCollectionButton
                videoId={video.videoId}
                videoTitle={video.title}
                videoThumbnailUrl={video.thumbnailUrl}
                startTime={0}
                content={summary}
                user={user}
                domain="uap"
              />
              <FavoriteButton
                videoId={video.videoId}
                videoTitle={video.title}
                videoThumbnailUrl={video.thumbnailUrl}
                user={user}
                domain="uap"
              />
            </div>
          </div>

          {/* Analysis badges (gracefully hidden when empty) */}
          {analysisData && <UapBadges data={analysisData} />}

          {/* AI Summary */}
          {summary && (
            <div className="bg-muted/30 p-3 rounded-md text-sm">
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant="outline"
                  className="text-[10px] px-1 py-0 border-green-500/50 text-green-600 dark:text-green-400"
                >
                  Video Summary (AI)
                </Badge>
              </div>
              <p className="text-foreground/90">
                {highlightTerm(displayedSummary, searchTerm)}
                {isLongSummary && (
                  <Button
                    variant="link"
                    className="p-0 h-auto text-xs ml-1"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    {isExpanded ? "Read Less" : "Read More"}
                  </Button>
                )}
              </p>
            </div>
          )}

          {/* Transcript Quotes */}
          <div className="space-y-4">
            {video.transcripts.map((t, idx) => (
              <TranscriptChunk
                key={idx}
                content={t.content}
                startTime={t.startTime}
                videoId={video.videoId}
                videoTitle={video.title}
                videoThumbnailUrl={video.thumbnailUrl}
                searchTerm={searchTerm}
                similarity={t.similarity}
                user={user}
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
