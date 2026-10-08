/**
 * Featured video — Project Profound's own NDE music video.
 *
 * Promoted in three places: a site-wide dismissible banner, a strip under the
 * /nde hero search, and a card at the end of every NDE blog post. Deliberately
 * kept out of nde_vids: it's a song, not a testimony, and must not skew the
 * archive's channel stats or search.
 *
 * To swap or retire the promotion, edit this file only.
 */

export const FEATURED_VIDEO = {
    videoId: 'eQ86fFWLvys',
    title: 'It Was You – A Song About What Really Matters (Near-Death Experience Music Video)',
    shortTitle: 'It Was You',
    tagline: 'A song about what really matters',
    buttonLabel: 'NDE Music Video',
    youtubeUrl: 'https://www.youtube.com/watch?v=eQ86fFWLvys',
    /** The site-wide banner stops showing after this date (the /nde strip and blog card stay). */
    bannerUntil: '2026-11-19',
} as const;

/** localStorage key: set when a visitor dismisses the banner or plays the video. */
export const FEATURED_VIDEO_SEEN_KEY = `pp-featured-video-seen:${FEATURED_VIDEO.videoId}`;

export type FeaturedVideoPlacement = 'banner' | 'nde_strip' | 'blog_card';

/**
 * Send a GA4 event if analytics is loaded (it only loads after cookie consent).
 * Reported as `featured_video` with `action` + `placement` params so plays per
 * placement can be compared in GA.
 */
export function trackFeaturedVideo(action: 'open' | 'play' | 'dismiss', placement: FeaturedVideoPlacement): void {
    if (typeof window === 'undefined') return;
    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    if (typeof gtag !== 'function') return;
    gtag('event', 'featured_video', {
        action,
        placement,
        video_id: FEATURED_VIDEO.videoId,
    });
}

/** Remember that this visitor has seen/dismissed the promotion. Never throws. */
export function markFeaturedVideoSeen(): void {
    try {
        window.localStorage.setItem(FEATURED_VIDEO_SEEN_KEY, '1');
    } catch {
        // Private mode / blocked storage — the banner just shows again next visit.
    }
}

export function hasSeenFeaturedVideo(): boolean {
    try {
        return window.localStorage.getItem(FEATURED_VIDEO_SEEN_KEY) === '1';
    } catch {
        return false;
    }
}

/** Whether the site-wide banner is still within its promotion window. */
export function isBannerActive(now: Date = new Date()): boolean {
    return now <= new Date(`${FEATURED_VIDEO.bannerUntil}T23:59:59Z`);
}
