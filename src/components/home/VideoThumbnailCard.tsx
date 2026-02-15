import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface VideoThumbnailCardProps {
    videoId: string;
    title: string;
    thumbnailUrl: string | null;
    channelName: string | null;
    score: number | null;
    scoreMax: number;
    scoreLabel?: string | null;
}

/**
 * Compact video card for the homepage curated columns.
 * Server component — no client interactivity needed.
 */
export function VideoThumbnailCard({
    videoId,
    title,
    thumbnailUrl,
    channelName,
    score,
    scoreMax,
    scoreLabel,
}: VideoThumbnailCardProps) {
    return (
        <Link
            href={`/video/${videoId}`}
            className="group block rounded-xl overflow-hidden bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
        >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-muted overflow-hidden">
                {thumbnailUrl ? (
                    <img
                        src={thumbnailUrl}
                        alt={title || "Video thumbnail"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        No Thumbnail
                    </div>
                )}

                {/* Score pill overlay */}
                {score !== null && (
                    <div className="absolute top-2 right-2">
                        <Badge
                            variant="secondary"
                            className="bg-black/70 text-white border-0 text-xs font-mono backdrop-blur-sm"
                        >
                            {score}/{scoreMax}
                        </Badge>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-3 space-y-1">
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
            </div>
        </Link>
    );
}
