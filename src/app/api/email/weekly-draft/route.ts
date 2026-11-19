// src/app/api/email/weekly-draft/route.ts
// POST /api/email/weekly-draft[?newsletter=pp|swc] — the weekly emails as Resend broadcast DRAFTS (marketing plan
// step 4; Tom 2026-11-19: one email per site). Nothing is sent to subscribers here: Tom opens each draft in Resend,
// reads it and presses Send. Without ?newsletter, both are made. Called by .github/workflows/nde-of-the-week.yml
// (CRON_SECRET) on Thursdays, or by an admin. One draft per newsletter per day: a second call the same day returns
// the first ("skipped").
//
//   pp:  "NDE of the Week" to RESEND_SEGMENT_ID, from NEWSLETTER_FROM (else RESEND_FROM).
//   swc: "Soul Wisdom Video of the Week" to RESEND_SWC_SEGMENT_ID, from soulwisdomcollective.com (verified in the
//        same Resend account; NEWSLETTER_SWC_FROM overrides), replies to the show's public address.
// A newsletter whose segment is not set is reported as not set up. NEWSLETTER_NOTIFY_EMAIL, if set, gets a short
// "draft ready" email with the links.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { render } from "@react-email/render";
import { hasValidCronSecret } from "@/lib/auth/cron-auth";
import { isAdminUser } from "@/lib/auth/admin-guard";
import { EMAIL_FROM, EMAIL_REPLY_TO, resend } from "@/lib/email/resend";
import { NEWSLETTERS, segmentIdOf, type Newsletter } from "@/lib/email/audience";
import {
  bestOfWeek, bestShortOfWeek, channelFeedUrl, newestEpisode, parseChannelFeed, PODCAST_FEED_URL, PP_CHANNEL_ID, ppWeekly,
  SWC_CHANNEL_ID, swcWeekly, weekName, type Story,
} from "@/lib/email/weekly";
import { NdeOfTheWeekEmail } from "@/lib/email/templates/NdeOfTheWeekEmail";
import { SwcVideoOfTheWeekEmail } from "@/lib/email/templates/SwcVideoOfTheWeekEmail";
import { STORY_POOL_SIZE, storyOfTheDay } from "@/lib/story-of-the-day";

/** soulwisdomcollective.com is verified in Resend (Tom, 2026-11-19), so Soul Wisdom's email comes from its own site. */
const SWC_FROM = "Soul Wisdom Collective <newsletter@soulwisdomcollective.com>";
/** The show's public address (it is in the podcast feed), for replies to the Soul Wisdom email. */
const SWC_REPLY_TO = "soulwisdomcollective@gmail.com";

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "user-agent": "ProjectProfound-Newsletter/1.0" }, cache: "no-store", signal: AbortSignal.timeout(20_000) });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

/** Today's Story of the Day, picked exactly as the home page picks it. */
async function todaysStory(now: Date): Promise<Story | null> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  const { data } = await supabase
    .from("nde_vids")
    .select("videoId, title, channelName, analysis_nde_summary")
    .eq("isNde", "clear_nde")
    .not("analysis_nde_summary", "is", null)
    .not("viewCount", "is", null)
    .order("viewCount", { ascending: false })
    .limit(STORY_POOL_SIZE);
  const pick = storyOfTheDay(data ?? [], now.getTime());
  return pick ? { videoId: pick.videoId, title: pick.title, channelName: pick.channelName, summary: pick.analysis_nde_summary } : null;
}

/** The email for one newsletter: subject, preview, HTML and what went in it; null when there is nothing to send. */
async function compose(newsletter: Newsletter, now: Date, campaign: string) {
  if (newsletter === "pp") {
    const [feed, story] = await Promise.all([
      fetchText(channelFeedUrl(process.env.PP_YOUTUBE_CHANNEL_ID || PP_CHANNEL_ID)),
      todaysStory(now).catch(() => null),
    ]);
    const content = ppWeekly({ short: feed ? bestShortOfWeek(parseChannelFeed(feed), now) : null, story });
    if (!content.short && !content.story) return null;
    return {
      content,
      html: await render(NdeOfTheWeekEmail({ content, campaign })),
      from: process.env.NEWSLETTER_FROM || EMAIL_FROM,
      replyTo: EMAIL_REPLY_TO,
      summary: { short: content.short?.title ?? null, story: content.story?.title ?? null },
    };
  }
  const [feed, podcast] = await Promise.all([
    fetchText(channelFeedUrl(process.env.SWC_YOUTUBE_CHANNEL_ID || SWC_CHANNEL_ID)),
    fetchText(PODCAST_FEED_URL),
  ]);
  const content = swcWeekly({ video: feed ? bestOfWeek(parseChannelFeed(feed), now) : null, episode: podcast ? newestEpisode(podcast) : null });
  if (!content.video && !content.episode) return null;
  return {
    content,
    html: await render(SwcVideoOfTheWeekEmail({ content, campaign })),
    from: process.env.NEWSLETTER_SWC_FROM || SWC_FROM,
    replyTo: SWC_REPLY_TO,
    summary: { video: content.video?.title ?? null, episode: content.episode?.title ?? null },
  };
}

type Outcome =
  | { status: "made" | "skipped"; id: string; url: string; subject?: string; [k: string]: unknown }
  | { status: "not set up" | "nothing this week" | "error"; error?: string };

async function draft(newsletter: Newsletter, now: Date, existingNames: Map<string, string>): Promise<Outcome> {
  const segmentId = segmentIdOf(newsletter);
  if (!segmentId) return { status: "not set up" };
  const name = weekName(newsletter, now);
  const already = existingNames.get(name);
  if (already) return { status: "skipped", id: already, url: `https://resend.com/broadcasts/${already}` };

  const email = await compose(newsletter, now, name);
  if (!email) return { status: "nothing this week" };
  const created = await resend.broadcasts.create({
    segmentId,
    name,
    from: email.from,
    replyTo: email.replyTo,
    subject: email.content.subject,
    previewText: email.content.previewText,
    html: email.html,
  });
  if (created.error) return { status: "error", error: `Resend: ${created.error.message}` };
  return { status: "made", id: created.data.id, url: `https://resend.com/broadcasts/${created.data.id}`, subject: email.content.subject, ...email.summary };
}

export async function POST(req: NextRequest) {
  if (!hasValidCronSecret(req) && !(await isAdminUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const asked = req.nextUrl.searchParams.get("newsletter");
  if (asked && !NEWSLETTERS.includes(asked as Newsletter)) {
    return NextResponse.json({ error: "newsletter must be pp or swc" }, { status: 400 });
  }
  const which = asked ? [asked as Newsletter] : NEWSLETTERS;
  if (!which.some((n) => segmentIdOf(n))) {
    return NextResponse.json({ error: "Set RESEND_SEGMENT_ID and RESEND_SWC_SEGMENT_ID first (the Resend segments)" }, { status: 400 });
  }

  const now = new Date();
  const existing = await resend.broadcasts.list();
  const existingNames = new Map((existing.data?.data ?? []).map((b) => [b.name, b.id] as [string, string]));
  const results = Object.fromEntries(
    await Promise.all(which.map(async (n) => [n, await draft(n, now, existingNames).catch((e) => ({ status: "error", error: String(e) }))] as const)),
  ) as Record<Newsletter, Outcome>;

  const made = Object.entries(results).filter(([, r]) => r.status === "made") as [Newsletter, Extract<Outcome, { url: string }>][];
  const notify = process.env.NEWSLETTER_NOTIFY_EMAIL?.trim();
  if (notify && made.length) {
    await resend.emails
      .send({
        from: EMAIL_FROM,
        to: [notify],
        subject: `Newsletter draft${made.length > 1 ? "s" : ""} ready: ${made.map(([, r]) => r.subject).join(" / ")}`,
        text:
          "This week's newsletter drafts are in Resend. Read each one and press Send when it looks right:\n\n" +
          made.map(([n, r]) => `${n === "pp" ? "Project Profound" : "Soul Wisdom"}: ${r.subject}\n${r.url}`).join("\n\n"),
      })
      .catch((e) => console.error("[weekly-draft] notify failed:", e));
  }

  const failed = Object.values(results).some((r) => r.status === "error");
  return NextResponse.json({ ok: !failed, ...results }, { status: failed ? 502 : 200 });
}
