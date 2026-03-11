"use client";

import { seekYouTubePlayer } from "@/components/video/YouTubePlayer";

interface TimestampLinkProps {
    seconds: number;
    label: string; // e.g. "[0:45]"
}

/**
 * Client-side timestamp link for the transcript.
 * Clicking it dispatches a "yt-seek" event that tells the YouTubePlayer
 * on the page to both seek to that moment AND start playing — no page reload.
 */
export function TimestampLink({ seconds, label }: TimestampLinkProps) {
    return (
        <button
            onClick={() => {
                seekYouTubePlayer(seconds);
            }}
            className="shrink-0 text-[10px] font-mono text-blue-400 hover:text-blue-600 pt-0.5 transition-colors cursor-pointer bg-transparent border-0 p-0"
            title={`Jump to ${label} and play`}
        >
            {label}
        </button>
    );
}
