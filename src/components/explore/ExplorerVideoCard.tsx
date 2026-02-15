"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

interface ExplorerVideoCardProps {
    videoId: string;
    title: string;
    thumbnailUrl: string | null;
    channelName: string | null;
    score: number | null;
    scoreMax: number;
    scoreLabel?: string | null;
    /** Optional sub-scores to display as small badges */
    subScores?: { label: string; value: string | number }[];
}

/**
 * Video card for explorer pages — slightly richer than
 * the homepage thumbnail card, with sub-score badges.
 */
export function ExplorerVideoCard({
    videoId,
    title,
    thumbnailUrl,
    channelName,
    score,
    scoreMax,
    scoreLabel,
    subScores,
}: ExplorerVideoCardProps) {
    return (
        <Link
            href={`/video/${videoId}`}
            className="group block rounded-xl overflow-hidden bg-card border border-border/50 hover:border-primary/40 hover:shadow-xl transition-all duration-300"
        >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-muted overflow-hidden">
                {thumbnailUrl ? (
                    <Image
                        src={thumbnailUrl.replace("maxresdefault", "hqdefault")}
                        alt={title || "Video thumbnail"}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        No Thumbnail
                    </div>
                )}

                {/* Score pill */}
                {score !== null && (
                    <div className="absolute top-2 right-2">
                        <Badge
                            variant="secondary"
                            className="bg-black/75 text-white border-0 text-sm font-mono backdrop-blur-sm px-2 py-0.5"
                        >
                            {score}/{scoreMax}
                        </Badge>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-3 space-y-2">
                <h3 className="text-sm font-semibold leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                    {title || "Untitled"}
                </h3>

                <div className="flex items-center justify-between gap-2">
                    {channelName && (
                        <p className="text-xs text-muted-foreground truncate">
                            {channelName}
                        </p>
                    )}
                    {scoreLabel && (
                        <Badge
                            variant="outline"
                            className="text-[10px] shrink-0 border-primary/30 text-primary/80"
                        >
                            {scoreLabel}
                        </Badge>
                    )}
                </div>

                {/* Sub-scores */}
                {subScores && subScores.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        {subScores.map((s) => (
                            <span
                                key={s.label}
                                className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground"
                            >
                                {s.label}: <strong className="text-foreground">{s.value}</strong>
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </Link>
    );
}
