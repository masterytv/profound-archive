"use client";

import { useState } from "react";
import { Music, Play, X } from "lucide-react";
import { FEATURED_VIDEO, trackFeaturedVideo } from "@/lib/featured-video";
import { FeaturedVideoPlayer } from "./FeaturedVideoPlayer";

/** Strip under the /nde hero search: a single line that expands into the player. */
export function MusicVideoStrip() {
    const [open, setOpen] = useState(false);

    if (!FEATURED_VIDEO.enabled) return null;

    if (open) {
        return (
            <div className="max-w-2xl mx-auto mb-10">
                <div className="flex justify-end mb-2">
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                        <X className="w-4 h-4" /> Close
                    </button>
                </div>
                <FeaturedVideoPlayer placement="nde_strip" autoStart />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto -mt-6 mb-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <Music className="hidden sm:block w-4 h-4 shrink-0 text-violet-500" />
                New: &ldquo;{FEATURED_VIDEO.shortTitle}&rdquo; &mdash; {FEATURED_VIDEO.tagline.toLowerCase()}
            </span>
            <button
                type="button"
                onClick={() => {
                    trackFeaturedVideo("open", "nde_strip");
                    setOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-medium px-4 py-1.5 shadow-sm transition-colors"
            >
                <Play className="w-3.5 h-3.5 fill-white" />
                {FEATURED_VIDEO.buttonLabel}
            </button>
        </div>
    );
}
