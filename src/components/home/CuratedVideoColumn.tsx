import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { VideoThumbnailCard } from "./VideoThumbnailCard";

export interface CuratedVideo {
    videoId: string;
    title: string;
    thumbnailUrl: string | null;
    channelName: string | null;
    score: number | null;
    scoreLabel?: string | null;
}

interface CuratedVideoColumnProps {
    /** Column heading, e.g. "Veridical Perception" */
    title: string;
    /** Short description shown under the title */
    description: string;
    /** Icon component rendered next to the title */
    icon: React.ReactNode;
    /** Accent color class for the column header border/gradient */
    accentColor: string;
    /** Videos to display */
    videos: CuratedVideo[];
    /** Max score denominator, e.g. 28, 50, 32 */
    scoreMax: number;
    /** Link to the full explorer page */
    exploreHref: string;
}

/**
 * A single column of curated videos for the homepage.
 * Renders a header, video cards, and an "Explore All" link.
 */
export function CuratedVideoColumn({
    title,
    description,
    icon,
    accentColor,
    videos,
    scoreMax,
    exploreHref,
}: CuratedVideoColumnProps) {
    return (
        <div className="flex flex-col">
            {/* Column Header */}
            <div className={`rounded-t-xl p-4 border-t-4 ${accentColor}`}>
                <div className="flex items-center gap-2 mb-1">
                    {icon}
                    <h2 className="text-lg font-bold text-foreground">{title}</h2>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    {description}
                </p>
            </div>

            {/* Video Cards */}
            <div className="flex flex-col gap-3 mt-3 flex-1">
                {videos.map((video) => (
                    <VideoThumbnailCard
                        key={video.videoId}
                        videoId={video.videoId}
                        title={video.title}
                        thumbnailUrl={video.thumbnailUrl}
                        channelName={video.channelName}
                        score={video.score}
                        scoreMax={scoreMax}
                        scoreLabel={video.scoreLabel}
                    />
                ))}
            </div>

            {/* Explore All Link */}
            <Link
                href={exploreHref}
                className="mt-4 inline-flex items-center justify-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors group"
            >
                Explore All {title}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
        </div>
    );
}
