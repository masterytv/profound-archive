// src/lib/story-of-the-day.ts
// Which video is the home page's Story of the Day: one of the 100 most-viewed clear NDE videos with an AI summary,
// the same for everyone through each UTC day. Shared by the home page (components/home/StoryOfTheDay.tsx) and the
// weekly email (src/lib/email/weekly.ts), so both show the same story.

/** Seeded shuffle — deterministic within each 24-hour window. */
export function seededShuffle<T>(array: T[], seed: number): T[] {
    const shuffled = [...array];
    let s = seed;
    for (let i = shuffled.length - 1; i > 0; i--) {
        s = (s * 1664525 + 1013904223) & 0x7fffffff;
        const j = s % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export const STORY_POOL_SIZE = 100;
const ONE_DAY_MS = 86_400_000;

/** The pool's pick for the day `now` falls in. */
export function storyOfTheDay<T>(pool: T[], now = Date.now()): T | null {
    return seededShuffle(pool, Math.floor(now / ONE_DAY_MS))[0] ?? null;
}
