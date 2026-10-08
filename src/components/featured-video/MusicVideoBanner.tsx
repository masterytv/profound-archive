"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Music, Play, X } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    FEATURED_VIDEO,
    hasSeenFeaturedVideo,
    isBannerActive,
    markFeaturedVideoSeen,
    trackFeaturedVideo,
} from "@/lib/featured-video";
import { FeaturedVideoPlayer } from "./FeaturedVideoPlayer";

/** Pages where the banner never shows: /nde has its own strip; admin/auth pages aren't for promotion. */
const HIDDEN_PREFIXES = ["/nde", "/admin", "/login", "/auth", "/update-password", "/unsubscribe"];

function readEligible(): boolean {
    return isBannerActive() && !hasSeenFeaturedVideo();
}

/** Re-check when another tab dismisses the banner. */
function subscribeToStorage(onChange: () => void): () => void {
    window.addEventListener("storage", onChange);
    return () => window.removeEventListener("storage", onChange);
}

function isHiddenPath(pathname: string): boolean {
    return HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Slim site-wide announcement bar — deliberately not a modal pop-up (intrusive
 * interstitials hurt mobile search ranking). Dismissible, remembered per
 * browser, and switched off after FEATURED_VIDEO.bannerUntil. Clicking the
 * button plays the video in a dialog so visitors stay on the page they came for.
 */
export function MusicVideoBanner() {
    const pathname = usePathname() ?? "";
    // localStorage isn't available during server render, so the server snapshot is
    // "hidden" and the bar appears on the client once we know it's unseen.
    const eligible = useSyncExternalStore(subscribeToStorage, readEligible, () => false);
    const [hiddenThisPage, setHiddenThisPage] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    const openVideo = () => {
        trackFeaturedVideo("open", "banner");
        markFeaturedVideoSeen();
        setDialogOpen(true);
        setHiddenThisPage(true);
    };

    const dismiss = () => {
        trackFeaturedVideo("dismiss", "banner");
        markFeaturedVideoSeen();
        setHiddenThisPage(true);
    };

    const showBar = eligible && !hiddenThisPage && !isHiddenPath(pathname);

    return (
        <>
            {showBar && (
                <div className="bg-gradient-to-r from-violet-700 to-indigo-700 text-white text-sm">
                    <div className="container mx-auto max-w-7xl px-4 py-2 flex items-center justify-center gap-3">
                        <Music className="hidden sm:block w-4 h-4 shrink-0 opacity-80" />
                        <span className="hidden sm:inline">
                            New from Project Profound: &ldquo;{FEATURED_VIDEO.shortTitle}&rdquo; &mdash; {FEATURED_VIDEO.tagline.toLowerCase()}
                        </span>
                        <span className="sm:hidden">New: &ldquo;{FEATURED_VIDEO.shortTitle}&rdquo;</span>
                        <button
                            type="button"
                            onClick={openVideo}
                            className="inline-flex items-center gap-1.5 rounded-full bg-white text-violet-800 hover:bg-violet-50 font-semibold px-3 py-1 shrink-0 transition-colors"
                        >
                            <Play className="w-3 h-3 fill-violet-800" />
                            {FEATURED_VIDEO.buttonLabel}
                        </button>
                        <button
                            type="button"
                            onClick={dismiss}
                            aria-label="Dismiss announcement"
                            className="ml-1 p-1 rounded-full opacity-80 hover:opacity-100 hover:bg-white/10 shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
            {/* Outside the bar: playing hides the bar, and the dialog must survive that. */}
            <VideoDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        </>
    );
}

function VideoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl p-4 sm:p-6">
                <DialogTitle className="pr-8">{FEATURED_VIDEO.title}</DialogTitle>
                <DialogDescription className="sr-only">
                    Project Profound music video about near-death experiences
                </DialogDescription>
                {open && <FeaturedVideoPlayer placement="banner" autoStart />}
            </DialogContent>
        </Dialog>
    );
}
