// src/lib/email/weekly.ts
// The two weekly emails (marketing plan step 4; Tom 2026-11-19: one per site), each made into a Resend broadcast
// draft that Tom reads and sends himself (/api/email/weekly-draft):
//   - "pp", "NDE of the Week": the week's most-watched Project Profound Short and PP's Story of the Day, with one
//     line about the Soul Wisdom Collective podcast;
//   - "swc", "Soul Wisdom Video of the Week": the week's most-watched Soul Wisdom video (a Short, clip or episode)
//     and the newest podcast episode, with one line about Project Profound.
// Pure: the feeds are parsed from their text, so the tests need no network. No AI: titles and descriptions are the
// ones already published.

/** The Project Profound YouTube channel (youtube.com/@projectprofound). */
export const PP_CHANNEL_ID = "UCdK8YJ2vVvEJzx-ERKEX6lQ";
/** The Soul Wisdom Collective YouTube channel (youtube.com/@SoulWisdomCollective). */
export const SWC_CHANNEL_ID = "UC-W6WwHWh_hEOasLNryyAhQ";
export const channelFeedUrl = (channelId: string) => `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
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

export type Newsletter = "pp" | "swc";

/** "nde-of-the-week-2026-11-19" or "swc-video-of-the-week-…": the broadcast's name, one a day, also the UTM campaign. */
export function weekName(newsletter: Newsletter, now: Date): string {
  return `${newsletter === "pp" ? "nde-of-the-week" : "swc-video-of-the-week"}-${now.toISOString().slice(0, 10)}`;
}

export interface PpWeekly {
  newsletter: "pp";
  subject: string;
  previewText: string;
  short: ChannelVideo | null;
  story: Story | null;
}

export interface SwcWeekly {
  newsletter: "swc";
  subject: string;
  previewText: string;
  video: ChannelVideo | null;
  episode: PodcastEpisode | null;
}

/** PP's email: the subject leads with the Short's title (the week's most-watched), else the story's. */
export function ppWeekly(parts: { short: ChannelVideo | null; story: Story | null }): PpWeekly {
  const lead = parts.short?.title || parts.story?.title || "This week's near-death experiences";
  return {
    newsletter: "pp",
    ...parts,
    subject: `NDE of the Week: ${lead}`.slice(0, 120),
    previewText: parts.short && parts.story ? "Plus a story from the archive." : "This week's most-watched near-death experience.",
  };
}

/** Soul Wisdom's email: the subject leads with the week's most-watched video, else the newest episode. */
export function swcWeekly(parts: { video: ChannelVideo | null; episode: PodcastEpisode | null }): SwcWeekly {
  // The video may be the newest episode itself; then the episode is not shown twice.
  const episode = parts.episode && parts.video && parts.episode.title === parts.video.title ? null : parts.episode;
  const lead = parts.video?.title || episode?.title || "This week on Soul Wisdom";
  return {
    newsletter: "swc",
    video: parts.video,
    episode,
    subject: `Soul Wisdom Video of the Week: ${lead}`.slice(0, 120),
    previewText: episode ? `Plus our newest episode: ${episode.title}`.slice(0, 140) : "This week's most-watched conversation.",
  };
}
