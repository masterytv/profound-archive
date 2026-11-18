// src/lib/email/weekly.ts
// The weekly "NDE of the Week" email (marketing plan step 4, Tom 2026-11-18): the week's most-watched Project
// Profound Short, PP's story of the day and the newest Soul Wisdom Collective episode, made into a Resend broadcast
// draft that Tom reads and sends himself (/api/email/weekly-draft). Pure: the feeds are parsed from their text, so
// the tests need no network. No AI: titles and descriptions are the ones already published.

/** The Project Profound YouTube channel (youtube.com/@projectprofound). */
export const PP_CHANNEL_ID = "UCdK8YJ2vVvEJzx-ERKEX6lQ";
export const PODCAST_FEED_URL = "https://soulwisdomcollective.com/podcast/feed.xml";
export const PODCAST_LINKS = {
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

export interface PodcastEpisode {
  title: string;
  description: string;
  published: Date | null;
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

/** The most-viewed Short published in the 7 days before `now`; null when none went out. */
export function bestShortOfWeek(videos: ChannelVideo[], now: Date): ChannelVideo | null {
  const since = now.getTime() - 7 * 86_400_000;
  const week = videos.filter((v) => v.published.getTime() > since && v.published.getTime() <= now.getTime() && v.url.includes("/shorts/"));
  return week.sort((a, b) => b.views - a.views || b.published.getTime() - a.published.getTime())[0] ?? null;
}

/** The newest episode in the podcast's RSS feed (items are newest first, but sorted here all the same). */
export function newestEpisode(xml: string): PodcastEpisode | null {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, i]) => {
    const d = new Date(tag(i, "pubDate"));
    return { title: tag(i, "title"), description: tag(i, "description"), published: Number.isNaN(d.getTime()) ? null : d };
  });
  return items.filter((i) => i.title).sort((a, b) => (b.published?.getTime() ?? 0) - (a.published?.getTime() ?? 0))[0] ?? null;
}

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

/** "nde-of-the-week-2026-11-19": the broadcast's name, one a week, also the UTM campaign. */
export function weekName(now: Date): string {
  return `nde-of-the-week-${now.toISOString().slice(0, 10)}`;
}

export interface WeeklyContent {
  subject: string;
  previewText: string;
  short: ChannelVideo | null;
  story: Story | null;
  episode: PodcastEpisode | null;
}

/** The subject leads with the Short's title (the week's most-watched), else the story's. */
export function weeklyContent(parts: { short: ChannelVideo | null; story: Story | null; episode: PodcastEpisode | null }): WeeklyContent {
  const lead = parts.short?.title || parts.story?.title || parts.episode?.title || "This week's near-death experiences";
  return {
    ...parts,
    subject: `NDE of the Week: ${lead}`.slice(0, 120),
    previewText: [parts.story && "a story from the archive", parts.episode && "a new Soul Wisdom episode"].filter(Boolean).length
      ? `Plus ${[parts.story && "a story from the archive", parts.episode && "a new Soul Wisdom episode"].filter(Boolean).join(" and ")}.`
      : "This week's most-watched near-death experience.",
  };
}
