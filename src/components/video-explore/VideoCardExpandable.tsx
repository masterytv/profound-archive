"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Eye, Calendar, ExternalLink } from "lucide-react";
import { ExperienceBadges } from "@/components/analysis/ExperienceBadges";
import { JourneyFlowTimeline } from "@/components/analysis/JourneyFlowTimeline";
import type { VideoExploreItem } from "./types";

interface VideoCardExpandableProps {
  video: VideoExploreItem;
  /** Use eager loading for above-fold items */
  priority?: boolean;
  className?: string;
}

// Score bar color + label mapping
const SCORE_BARS = [
  { key: "rvnde_total_score" as const, max: 28, label: "Evidence", color: "bg-emerald-500" },
  { key: "total_greyson_score" as const, max: 32, label: "Depth", color: "bg-blue-500" },
  { key: "transformation_score" as const, max: 50, label: "Impact", color: "bg-rose-500" },
] as const;

function formatViewCount(count: number | null): string {
  if (!count) return "0";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString();
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short" });
  } catch {
    return "";
  }
}

export function VideoCardExpandable({
  video,
  priority = false,
  className,
}: VideoCardExpandableProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Count detected core elements
  const elementCount = video.core_elements?.filter((el) => el.present).length ?? 0;
  const elementTotal = video.core_elements?.length ?? 15;

  // Check if any scores exist for the score strip
  const hasScores = SCORE_BARS.some(
    (bar) => video[bar.key] !== null && video[bar.key] !== undefined
  );

  return (
    <div
      className={cn(
        "group bg-white dark:bg-white/5 rounded-2xl overflow-hidden border border-slate-200/60 dark:border-white/10 transition-all duration-300",
        isExpanded
          ? "shadow-lg border-blue-200 dark:border-blue-700"
          : "hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-700",
        className
      )}
    >
      {/* Clickable thumbnail area — navigate to video */}
      <Link href={`/video/${video.videoId}`} className="block">
        <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden">
          {video.thumbnailUrl ? (
            <Image
              src={video.thumbnailUrl.replace("maxresdefault", "hqdefault")}
              alt={video.title || "Video thumbnail"}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              loading={priority ? "eager" : "lazy"}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              No Thumbnail
            </div>
          )}
        </div>
      </Link>

      {/* Card body */}
      <div className="p-4 space-y-2.5">
        {/* Title */}
        <Link href={`/video/${video.videoId}`}>
          <h3
            className="text-sm font-semibold leading-snug line-clamp-2 text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "15px" }}
          >
            {video.title || "Untitled"}
          </h3>
        </Link>

        {/* Meta row: channel + date + views */}
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          {video.channelName && (
            <span className="truncate">{video.channelName}</span>
          )}
          {video.date && (
            <>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="shrink-0">{formatDate(video.date)}</span>
            </>
          )}
          {video.viewCount && (
            <>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="shrink-0 flex items-center gap-0.5">
                <Eye className="w-3 h-3" />
                {formatViewCount(video.viewCount)}
              </span>
            </>
          )}
        </div>

        {/* Expand/collapse toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-1 pt-1 text-xs text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
        >
          {isExpanded ? (
            <>
              Less <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              Research <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>

        {/* Expanded research breakdown */}
        {isExpanded && (
          <div className="pt-2 pb-1 space-y-3 border-t border-slate-100 dark:border-white/10">
            {/* Score Strip — Evidence / Depth / Impact */}
            {hasScores && (
              <div className="space-y-1">
                {SCORE_BARS.map((bar) => {
                  const value = video[bar.key];
                  if (value === null || value === undefined) return null;
                  const pct = Math.round((value / bar.max) * 100);
                  return (
                    <div key={bar.key} className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 w-14 shrink-0">
                        {bar.label}
                      </span>
                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", bar.color)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 w-6 text-right shrink-0">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Experience badges */}
            {(video.experience_type || video.trigger_category || video.overall_tone || video.intensity_rating) && (
              <ExperienceBadges
                experienceType={video.experience_type}
                triggerCategory={video.trigger_category}
                tone={video.overall_tone}
                intensityRating={video.intensity_rating}
              />
            )}

            {/* Journey flow preview */}
            {video.journey_sequence && video.journey_sequence.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Journey Flow
                </h4>
                <JourneyFlowTimeline
                  journeyFlow={video.journey_sequence}
                  collapseAfter={4}
                />
              </div>
            )}

            {/* Element count */}
            {video.core_elements && video.core_elements.length > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  <strong className="text-slate-700 dark:text-slate-300">{elementCount}</strong> of {elementTotal} elements detected
                </span>
              </div>
            )}

            {/* Link to full page */}
            <Link
              href={`/video/${video.videoId}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              View Full Analysis <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
