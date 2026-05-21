"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Eye, ExternalLink, Radio } from "lucide-react";
import { UfoIcon } from "@/components/icons/UfoIcon";
import type { UapExploreItem } from "./types";
import { CONTENT_TYPE_LABELS, formatLabel } from "./types";

interface UapVideoCardProps {
  video: UapExploreItem;
  priority?: boolean;
  className?: string;
}

// UAP Triad score bars — green-tinted to match UAP domain
const TRIAD_BARS = [
  { key: "evidence_score" as const, max: 35, label: "Evidence", color: "bg-emerald-500" },
  { key: "contact_depth_score" as const, max: 35, label: "Depth", color: "bg-teal-500" },
  { key: "transformation_score" as const, max: 50, label: "Impact", color: "bg-green-500" },
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

export function UapVideoCard({
  video,
  priority = false,
  className,
}: UapVideoCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasTriadScores = TRIAD_BARS.some(
    (bar) => video[bar.key] !== null && video[bar.key] !== undefined
  );

  const tierLabel = video.tier === 1 ? "Encounter" : "Research";
  const tierColors = video.tier === 1
    ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
    : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10";

  const contentLabel = formatLabel(video.content_type ?? "", CONTENT_TYPE_LABELS);

  return (
    <div
      className={cn(
        "group bg-white dark:bg-white/5 rounded-2xl overflow-hidden border border-slate-200/60 dark:border-white/10 transition-all duration-300",
        isExpanded
          ? "shadow-lg border-green-200 dark:border-green-700"
          : "hover:shadow-xl hover:border-green-200 dark:hover:border-green-700",
        className
      )}
    >
      {/* Clickable thumbnail */}
      <Link href={`/uap/video/${video.video_id}`} className="block">
        <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden">
          {video.thumbnail_url ? (
            <Image
              src={video.thumbnail_url.replace("maxresdefault", "hqdefault")}
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
          {/* Tier badge overlay */}
          <div className="absolute top-2 right-2">
            <span className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full border backdrop-blur-sm",
              tierColors
            )}>
              {video.tier === 1 ? <UfoIcon className="w-3 h-3 inline" /> : <Radio className="w-3 h-3 inline" />} {tierLabel}
            </span>
          </div>
        </div>
      </Link>

      {/* Card body */}
      <div className="p-4 space-y-2.5">
        {/* Title */}
        <Link href={`/uap/video/${video.video_id}`}>
          <h3
            className="text-sm font-semibold leading-snug line-clamp-2 text-slate-800 dark:text-slate-200 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors cursor-pointer"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "15px" }}
          >
            {video.title || "Untitled"}
          </h3>
        </Link>

        {/* Meta row: channel + date + views */}
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          {video.channel_name && (
            <span className="truncate">{video.channel_name}</span>
          )}
          {video.date && (
            <>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="shrink-0">{formatDate(video.date)}</span>
            </>
          )}
          {video.view_count && (
            <>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="shrink-0 flex items-center gap-0.5">
                <Eye className="w-3 h-3" />
                {formatViewCount(video.view_count)}
              </span>
            </>
          )}
        </div>

        {/* Expand/collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-1 pt-1 text-xs text-slate-400 dark:text-slate-500 hover:text-green-600 dark:hover:text-green-400 transition-colors cursor-pointer"
        >
          {isExpanded ? (
            <>Less <ChevronUp className="w-3.5 h-3.5" /></>
          ) : (
            <>Details <ChevronDown className="w-3.5 h-3.5" /></>
          )}
        </button>

        {/* Expanded details */}
        {isExpanded && (
          <div className="pt-2 pb-1 space-y-3 border-t border-slate-100 dark:border-white/10">
            {/* Content type + badges */}
            <div className="flex flex-wrap gap-1.5">
              {contentLabel && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                  {contentLabel}
                </span>
              )}
              {video.experience_type && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                  {formatLabel(video.experience_type, {})}
                </span>
              )}
              {video.hynek_type && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  {video.hynek_type}
                </span>
              )}
              {video.overall_tone && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {formatLabel(video.overall_tone, {})}
                </span>
              )}
            </div>

            {/* Experiencer name (Tier 1 only) — inside details */}
            {video.experiencer_name && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Experiencer: <strong className="text-slate-700 dark:text-slate-300">{video.experiencer_name}</strong>
              </div>
            )}

            {/* AI Summary snippet — inside details, up to 5 lines */}
            {video.summary_snippet && (
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-5">
                {video.summary_snippet}{video.summary_snippet.length >= 198 ? "…" : ""}
              </p>
            )}

            {/* Triad score bars (Tier 1 only) */}
            {hasTriadScores && (
              <div className="space-y-1">
                {TRIAD_BARS.map((bar) => {
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

            {/* Link to full page */}
            <Link
              href={`/uap/video/${video.video_id}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
            >
              View Full Analysis <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
