/**
 * Featured video — Project Profound's own NDE music video.
 *
 * Promoted in three places: a persistent banner across the NDE section, a strip
 * under the /nde hero search, and a card at the end of every NDE blog post. Deliberately
 * kept out of nde_vids: it's a song, not a testimony, and must not skew the
 * archive's channel stats or search.
 *
 * To swap or retire the promotion, edit this file only (set `enabled: false`
 * to remove the banner, strip and blog card everywhere).
 */

export const FEATURED_VIDEO = {
    videoId: 'eQ86fFWLvys',
    title: 'It Was You – A Song About What Really Matters (Near-Death Experience Music Video)',
    shortTitle: 'It Was You',
    tagline: 'A song about what really matters',
    buttonLabel: 'NDE Music Video',
    youtubeUrl: 'https://www.youtube.com/watch?v=eQ86fFWLvys',
    /** Master switch: false removes the banner, /nde strip and blog card everywhere. */
    enabled: true,
} as const;

/**
 * The NDE section — the pages in the header's "Explore NDE" menu plus the NDE
 * detail pages they lead to. The banner shows on these and nowhere else
 * (not on /uap, the homepage, about, admin or auth pages).
 */
export const NDE_SECTION_PREFIXES = [
    '/nde',
    '/search', '/search2', '/search3',
    '/video', '/video-2025', '/video-explore', '/explore',
    '/experiencer', '/experiencers', '/experience',
    '/channel', '/channels',
    '/scale', '/compass', '/questions', '/chat-compassionate',
    '/blog',
    '/visualize/nde-elements',
] as const;

/** Whether a path belongs to the NDE section (exact prefix match or a sub-path of one). */
export function isNdeSectionPath(pathname: string): boolean {
    return NDE_SECTION_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export type FeaturedVideoPlacement = 'banner' | 'nde_strip' | 'blog_card';

/**
 * Send a GA4 event if analytics is loaded (it only loads after cookie consent).
 * Reported as `featured_video` with `action` + `placement` params so plays per
 * placement can be compared in GA.
 */
export function trackFeaturedVideo(action: 'open' | 'play', placement: FeaturedVideoPlacement): void {
    if (typeof window === 'undefined') return;
    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    if (typeof gtag !== 'function') return;
    gtag('event', 'featured_video', {
        action,
        placement,
        video_id: FEATURED_VIDEO.videoId,
    });
}
