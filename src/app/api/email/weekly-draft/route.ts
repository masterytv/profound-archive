// src/app/api/email/weekly-draft/route.ts
// POST /api/email/weekly-draft — the weekly "NDE of the Week" newsletter as a Resend broadcast DRAFT (marketing plan
// step 4, Tom 2026-11-18). Nothing is sent to subscribers here: Tom opens the draft in Resend, reads it and presses
// Send. Called by .github/workflows/nde-of-the-week.yml (CRON_SECRET) on Thursdays, or by an admin. One draft per
// day: a second call the same day returns the first ({ "skipped": true }).
//
// Needs RESEND_SEGMENT_ID (the newsletter's segment). NEWSLETTER_NOTIFY_EMAIL, if set, gets a short "draft ready"
// email with the link; NEWSLETTER_FROM overrides the sender.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { render } from "@react-email/render";
import { hasValidCronSecret } from "@/lib/auth/cron-auth";
import { isAdminUser } from "@/lib/auth/admin-guard";
import { EMAIL_FROM, EMAIL_REPLY_TO, resend } from "@/lib/email/resend";
import { newsletterSegmentId } from "@/lib/email/audience";
import {
  bestShortOfWeek, newestEpisode, parseChannelFeed, PODCAST_FEED_URL, PP_CHANNEL_ID, weekName, weeklyContent, type Story,
} from "@/lib/email/weekly";
import { NdeOfTheWeekEmail } from "@/lib/email/templates/NdeOfTheWeekEmail";
import { STORY_POOL_SIZE, storyOfTheDay } from "@/lib/story-of-the-day";

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

export async function POST(req: NextRequest) {
  if (!hasValidCronSecret(req) && !(await isAdminUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const segmentId = newsletterSegmentId();
  if (!segmentId) return NextResponse.json({ error: "Set RESEND_SEGMENT_ID first" }, { status: 400 });

  const now = new Date();
  const name = weekName(now);
  const existing = await resend.broadcasts.list();
  const already = existing.data?.data.find((b) => b.name === name);
  if (already) return NextResponse.json({ ok: true, skipped: true, id: already.id, url: `https://resend.com/broadcasts/${already.id}` });

  const [channelXml, podcastXml, story] = await Promise.all([
    fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${process.env.PP_YOUTUBE_CHANNEL_ID || PP_CHANNEL_ID}`),
    fetchText(PODCAST_FEED_URL),
    todaysStory(now).catch(() => null),
  ]);
  const content = weeklyContent({
    short: channelXml ? bestShortOfWeek(parseChannelFeed(channelXml), now) : null,
    story,
    episode: podcastXml ? newestEpisode(podcastXml) : null,
  });
  if (!content.short && !content.story && !content.episode) {
    return NextResponse.json({ error: "Nothing to put in this week's email (no Short, story or episode found)" }, { status: 502 });
  }

  const html = await render(NdeOfTheWeekEmail({ content, campaign: name }));
  const created = await resend.broadcasts.create({
    segmentId,
    name,
    from: process.env.NEWSLETTER_FROM || EMAIL_FROM,
    replyTo: EMAIL_REPLY_TO,
    subject: content.subject,
    previewText: content.previewText,
    html,
  });
  if (created.error) return NextResponse.json({ error: `Resend: ${created.error.message}` }, { status: 502 });
  const url = `https://resend.com/broadcasts/${created.data.id}`;

  const notify = process.env.NEWSLETTER_NOTIFY_EMAIL?.trim();
  if (notify) {
    await resend.emails
      .send({
        from: EMAIL_FROM,
        to: [notify],
        subject: `Draft ready: ${content.subject}`,
        text: `This week's newsletter is a draft in Resend. Read it and press Send when it looks right:\n\n${url}\n\n` +
          `Short: ${content.short?.title ?? "none this week"}\nStory: ${content.story?.title ?? "none"}\nEpisode: ${content.episode?.title ?? "none"}`,
      })
      .catch((e) => console.error("[weekly-draft] notify failed:", e));
  }

  return NextResponse.json({
    ok: true,
    id: created.data.id,
    url,
    subject: content.subject,
    short: content.short?.title ?? null,
    story: content.story?.title ?? null,
    episode: content.episode?.title ?? null,
  });
}
