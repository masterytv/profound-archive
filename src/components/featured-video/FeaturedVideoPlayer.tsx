"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import {
    FEATURED_VIDEO,
    markFeaturedVideoSeen,
    trackFeaturedVideo,
    type FeaturedVideoPlacement,
} from "@/lib/featured-video";

interface FeaturedVideoPlayerProps {
    placement: FeaturedVideoPlacement;
    /** Start playing immediately (used inside the banner dialog, which the visitor opened on purpose). */
    autoStart?: boolean;
}

/**
 * Click-to-play 16:9 player for the featured music video. Shows the thumbnail
 * until clicked, so pages carry no YouTube iframe weight for visitors who don't watch.
 */
export function FeaturedVideoPlayer({ placement, autoStart = false }: FeaturedVideoPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(autoStart);
    const { videoId, title } = FEATURED_VIDEO;

    const play = () => {
        trackFeaturedVideo("play", placement);
        markFeaturedVideoSeen();
        setIsPlaying(true);
    };

    return (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-lg">
            {isPlaying ? (
                <iframe
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                />
            ) : (
                <button
                    type="button"
                    onClick={play}
                    className="absolute inset-0 w-full h-full group cursor-pointer"
                    aria-label={`Play ${title}`}
                >
                    <Image
                        src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 100vw, 768px"
                        className="object-cover"
                        onError={(e) => {
                            // maxresdefault doesn't exist for every upload — fall back to hqdefault
                            const img = e.target as HTMLImageElement;
                            if (img.src.includes("maxresdefault")) {
                                img.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
                            }
                        }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors duration-300">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-600 group-hover:bg-red-500 flex items-center justify-center shadow-2xl transition-all duration-300 group-hover:scale-110">
                            <Play className="w-7 h-7 md:w-9 md:h-9 text-white fill-white ml-1" />
                        </div>
                    </div>
                </button>
            )}
        </div>
    );
}
