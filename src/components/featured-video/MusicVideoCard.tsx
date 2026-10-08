import { Music } from "lucide-react";
import { FEATURED_VIDEO } from "@/lib/featured-video";
import { FeaturedVideoPlayer } from "./FeaturedVideoPlayer";

/** End-of-article card on NDE blog posts. */
export function MusicVideoCard() {
    if (!FEATURED_VIDEO.enabled) return null;

    return (
        <aside
            aria-labelledby="music-video-card-heading"
            className="mt-12 rounded-2xl border border-violet-200/70 dark:border-violet-500/20 bg-gradient-to-br from-violet-50/80 to-blue-50/60 dark:from-violet-500/10 dark:to-blue-500/10 p-5 sm:p-6"
        >
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300 mb-2">
                <Music className="w-4 h-4" />
                {FEATURED_VIDEO.buttonLabel}
            </p>
            <h2
                id="music-video-card-heading"
                className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-1"
                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
                &ldquo;{FEATURED_VIDEO.shortTitle}&rdquo; &mdash; {FEATURED_VIDEO.tagline}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-5">
                A music video from Project Profound about near-death experiences.
            </p>
            <FeaturedVideoPlayer placement="blog_card" />
        </aside>
    );
}
