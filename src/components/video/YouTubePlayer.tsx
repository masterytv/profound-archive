"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Play } from "lucide-react";

interface YouTubePlayerProps {
    videoId: string;
    title: string;
    startTime?: number; // seconds — passed as &start=N in the embed URL
}

/** Dispatch this from any client component to seek + autoplay the player on the page. */
export function seekYouTubePlayer(seconds: number) {
    window.dispatchEvent(new CustomEvent("yt-seek", { detail: { seconds } }));
}

/**
 * Click-to-play YouTube embed.
 * Shows an optimized thumbnail with a play button overlay.
 * Only loads the heavy YouTube iframe (~150MB GPU) when the user clicks play.
 * Why: YouTube iframes with autoplay consume significant GPU memory for video
 * decoding. During extended browsing across multiple video pages, this causes
 * rendering corruption and browser tab crashes.
 *
 * Also listens for the 'yt-seek' CustomEvent so transcript timestamp links can
 * jump to a specific time AND immediately start playback without a page reload.
 */
export function YouTubePlayer({ videoId, title, startTime }: YouTubePlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeStart, setActiveStart] = useState<number | undefined>(startTime);

    // Listen for seek events dispatched by transcript timestamp links
    useEffect(() => {
        const handler = (e: Event) => {
            const seconds = (e as CustomEvent<{ seconds: number }>).detail.seconds;
            setActiveStart(seconds);
            setIsPlaying(true);
            // Scroll the player into view smoothly
            document.querySelector("[data-yt-player]")?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        };
        window.addEventListener("yt-seek", handler);
        return () => window.removeEventListener("yt-seek", handler);
    }, []);

    const handlePlay = useCallback(() => {
        setActiveStart(startTime);
        setIsPlaying(true);
    }, [startTime]);

    if (isPlaying) {
        const startParam = activeStart && activeStart > 0 ? `&start=${Math.floor(activeStart)}` : "";
        return (
            <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0${startParam}`}
                title={title || "Video"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
            />
        );
    }

    return (
        <button
            data-yt-player
            onClick={handlePlay}
            className="absolute inset-0 w-full h-full group cursor-pointer bg-black"
            aria-label={`Play ${title}`}
        >
            {/* Thumbnail — uses Next.js Image for WebP + responsive sizing */}
            <Image
                src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
                alt={title || "Video thumbnail"}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 900px"
                className="object-cover"
                priority
                onError={(e) => {
                    // Fallback to hqdefault if maxresdefault doesn't exist
                    const img = e.target as HTMLImageElement;
                    if (img.src.includes("maxresdefault")) {
                        img.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
                    }
                }}
            />

            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors duration-300">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-600 group-hover:bg-red-500 flex items-center justify-center shadow-2xl transition-all duration-300 group-hover:scale-110">
                    <Play className="w-7 h-7 md:w-9 md:h-9 text-white fill-white ml-1" />
                </div>
            </div>
        </button>
    );
}
