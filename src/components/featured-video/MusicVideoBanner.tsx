"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Music, Play } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import { FEATURED_VIDEO, isNdeSectionPath, trackFeaturedVideo } from "@/lib/featured-video";
import { FeaturedVideoPlayer } from "./FeaturedVideoPlayer";

/**
 * Persistent announcement bar across the NDE section (see NDE_SECTION_PREFIXES).
 * Deliberately not a modal pop-up (intrusive interstitials hurt mobile search
 * ranking) and deliberately not dismissible: it stays so visitors can watch
 * again, until FEATURED_VIDEO.enabled is switched off. The button plays the
 * video in a dialog so visitors stay on the page they came for.
 */
export function MusicVideoBanner() {
    const pathname = usePathname() ?? "";
    const [dialogOpen, setDialogOpen] = useState(false);

    if (!FEATURED_VIDEO.enabled || !isNdeSectionPath(pathname)) return null;

    return (
        <div className="bg-gradient-to-r from-violet-700 to-indigo-700 text-white text-sm">
            <div className="container mx-auto max-w-7xl px-4 py-2 flex items-center justify-center gap-3">
                <Music className="hidden sm:block w-4 h-4 shrink-0 opacity-80" />
                <span className="hidden sm:inline">
                    New from Project Profound: &ldquo;{FEATURED_VIDEO.shortTitle}&rdquo; &mdash; {FEATURED_VIDEO.tagline.toLowerCase()}
                </span>
                <span className="sm:hidden">New: &ldquo;{FEATURED_VIDEO.shortTitle}&rdquo;</span>
                <button
                    type="button"
                    onClick={() => {
                        trackFeaturedVideo("open", "banner");
                        setDialogOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white text-violet-800 hover:bg-violet-50 font-semibold px-3 py-1 shrink-0 transition-colors"
                >
                    <Play className="w-3 h-3 fill-violet-800" />
                    {FEATURED_VIDEO.buttonLabel}
                </button>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-3xl p-4 sm:p-6">
                    <DialogTitle className="pr-8">{FEATURED_VIDEO.title}</DialogTitle>
                    <DialogDescription className="sr-only">
                        Project Profound music video about near-death experiences
                    </DialogDescription>
                    {dialogOpen && <FeaturedVideoPlayer placement="banner" autoStart />}
                </DialogContent>
            </Dialog>
        </div>
    );
}
