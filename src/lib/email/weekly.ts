// src/lib/email/weekly.ts
// Project Profound's weekly "NDE of the Week" (marketing plan step 4): the week's most-watched Project Profound
// Short and PP's Story of the Day, with one line about the Soul Wisdom Collective podcast. Tom, 2026-11-19: it sends
// itself every Monday at 9:00 am Eastern (/api/email/weekly-draft, run by .github/workflows/nde-of-the-week.yml),
// and Soul Wisdom's own weekly email lives in the soulwisdomnetwork repo. Pure: the feeds are parsed from their
// text, so the tests need no network. No AI: titles and descriptions are the ones already published.

/** The Project Profound YouTube channel (youtube.com/@projectprofound). */
export const PP_CHANNEL_ID = "UCdK8YJ2vVvEJzx-ERKEX6lQ";
export const channelFeedUrl = (channelId: string) => `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
export const PODCAST_LINKS = {
  youtube: "https://www.youtube.com/@SoulWisdomCollective",
  apple: "https://podcasts.apple.com/us/podcast/soul-wisdom-collective/id6836432434",
  spotify: "https://open.spotify.com/show/7lgFLbmk8pLg7b83b3OrbK",
};

export interface ChannelVideo {
  videoId: string;
  title: string;
  url: string;
  published: Date;
  views: number;
  description: string;
}

export interface Story {
  videoId: string;
  title: string;
  channelName: string | null;
  summary: string | null;
}

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();

const tag = (xml: string, name: string) => {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(xml);
  return m ? decode(m[1]) : "";
};

/** A channel's public YouTube feed (its 15 newest videos), with their view counts. */
export function parseChannelFeed(xml: string): ChannelVideo[] {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].flatMap(([, e]) => {
    const videoId = tag(e, "yt:videoId");
    const published = new Date(tag(e, "published"));
    if (!videoId || Number.isNaN(published.getTime())) return [];
    const link = /<link rel="alternate" href="([^"]+)"/.exec(e)?.[1];
    return [{
      videoId,
      title: tag(e, "title"),
      url: link ?? `https://www.youtube.com/watch?v=${videoId}`,
      published,
      views: Number(/<media:statistics views="(\d+)"/.exec(e)?.[1] ?? 0),
      description: tag(e, "media:description"),
    }];
  });
}

/** The most-viewed video published in the 7 days before `now`, Shorts only if asked; null when none went out. */
export function bestOfWeek(videos: ChannelVideo[], now: Date, opts: { shortsOnly?: boolean } = {}): ChannelVideo | null {
  const since = now.getTime() - 7 * 86_400_000;
  const week = videos.filter(
    (v) => v.published.getTime() > since && v.published.getTime() <= now.getTime() && (!opts.shortsOnly || v.url.includes("/shorts/")),
  );
  return week.sort((a, b) => b.views - a.views || b.published.getTime() - a.published.getTime())[0] ?? null;
}

/** PP's Short of the week: the most-viewed Short of the 7 days. */
export const bestShortOfWeek = (videos: ChannelVideo[], now: Date) => bestOfWeek(videos, now, { shortsOnly: true });

/** The first paragraph of a description, without the links and hashtags that follow it on YouTube. */
export function firstParagraph(text: string, max = 400): string {
  const para = text.split(/\n\s*\n/).map((p) => p.trim()).find((p) => p && !/^https?:\/\//.test(p) && !p.startsWith("#")) ?? "";
  if (para.length <= max) return para;
  return `${para.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

/** The first `n` sentences, for a teaser. */
export function sentences(text: string | null, n: number): string {
  if (!text) return "";
  return text.split(/(?<=[.!?])\s+/).slice(0, n).join(" ").trim();
}

/** Adds the UTM tags that tell PP's analytics a visit came from this email. */
export function tagged(url: string, campaign: string): string {
  const u = new URL(url);
  if (!/projectprofound\.org$/.test(u.hostname) && !/soulwisdomcollective\.com$/.test(u.hostname)) return url;
  u.searchParams.set("utm_source", "newsletter");
  u.searchParams.set("utm_medium", "email");
  u.searchParams.set("utm_campaign", campaign);
  return u.toString();
}

/** "nde-of-the-week-2026-11-23": the broadcast's name, one a day, also the UTM campaign. */
export function weekName(now: Date): string {
  return `nde-of-the-week-${now.toISOString().slice(0, 10)}`;
}

export interface PpWeekly {
  subject: string;
  previewText: string;
  short: ChannelVideo | null;
  story: Story | null;
}

/** The subject leads with the Short's title (the week's most-watched), else the story's. */
export function ppWeekly(parts: { short: ChannelVideo | null; story: Story | null }): PpWeekly {
  const lead = parts.short?.title || parts.story?.title || "This week's near-death experiences";
  return {
    ...parts,
    subject: `NDE of the Week: ${lead}`.slice(0, 120),
    previewText: parts.short && parts.story ? "Plus a story from the archive." : "This week's most-watched near-death experience.",
  };
}

/** Minutes east of UTC for New York at `at` (-240 in summer, -300 in winter). */
function newYorkOffsetMinutes(at: Date): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "shortOffset" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value ?? "GMT-5";
  const m = /GMT([+-]\d+)(?::(\d+))?/.exec(name);
  return m ? Number(m[1]) * 60 + Math.sign(Number(m[1])) * Number(m[2] ?? 0) : -300;
}

/**
 * When the email should go out: 9:00 am Eastern on the same New York day as `now` (the job runs that morning), right
 * across the daylight-saving changes. Past 9:00 (a late run), ten minutes from now, so Tom still has a moment to
 * cancel in Resend.
 */
export function sendTime(now: Date, hour = 9): Date {
  const ny = new Date(now.getTime() + newYorkOffsetMinutes(now) * 60_000); // New York wall clock, read as UTC
  const wallNine = Date.UTC(ny.getUTCFullYear(), ny.getUTCMonth(), ny.getUTCDate(), hour, 0, 0);
  let at = wallNine - newYorkOffsetMinutes(new Date(wallNine)) * 60_000;
  at = wallNine - newYorkOffsetMinutes(new Date(at)) * 60_000;
  const soonest = now.getTime() + 10 * 60_000;
  return new Date(Math.max(at, soonest));
}
