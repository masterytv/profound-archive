// src/app/api/email/weekly-draft/route.ts
// POST /api/email/weekly-draft — Project Profound's weekly "NDE of the Week" as a Resend broadcast (marketing plan
// step 4), to the newsletter's segment (RESEND_SEGMENT_ID).
//
// Tom, 2026-11-19: it sends itself on Mondays at 9:00 am Eastern. So:
//   - called by .github/workflows/nde-of-the-week.yml (CRON_SECRET) on Monday mornings, it makes the broadcast
//     SCHEDULED for 9:00 am ET (sendTime), and emails Tom that it is scheduled, with the link to cancel it in
//     Resend before then. With NEWSLETTER_AUTOSEND=off it makes a draft instead, for Tom to send by hand;
//   - called by an admin (the "Make this week's draft now" button), it only ever makes a DRAFT.
// Nothing is made when there is nothing to put in it (no Short this week and no story): Tom gets an alert instead.
// One broadcast a day: a second call the same day returns the first ("skipped").
// The alert goes to NEWSLETTER_NOTIFY_EMAIL, else to PP's own inbox (EMAIL_REPLY_TO); NEWSLETTER_FROM overrides
// the sender.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { render } from "@react-email/render";
import { hasValidCronSecret } from "@/lib/auth/cron-auth";
import { isAdminUser } from "@/lib/auth/admin-guard";
import { EMAIL_FROM, EMAIL_REPLY_TO, resend } from "@/lib/email/resend";
import { newsletterSegmentId } from "@/lib/email/audience";
import {
  bestShortOfWeek, channelFeedUrl, parseChannelFeed, PP_CHANNEL_ID, ppWeekly, sendTime, weekName, type Story,
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

/** Tells Tom what happened. Best-effort: a failed alert never undoes the broadcast. */
async function tellTom(subject: string, text: string) {
  const to = process.env.NEWSLETTER_NOTIFY_EMAIL?.trim() || EMAIL_REPLY_TO;
  await resend.emails.send({ from: EMAIL_FROM, to: [to], subject, text }).catch((e) => console.error("[weekly-draft] alert failed:", e));
}

const easternTime = (d: Date) =>
  d.toLocaleString("en-US", { timeZone: "America/New_York", weekday: "long", hour: "numeric", minute: "2-digit", timeZoneName: "short" });

export async function POST(req: NextRequest) {
  const fromSchedule = hasValidCronSecret(req);
  if (!fromSchedule && !(await isAdminUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const segmentId = newsletterSegmentId();
  if (!segmentId) return NextResponse.json({ error: "Set RESEND_SEGMENT_ID first (the Resend segment)" }, { status: 400 });

  const now = new Date();
  const name = weekName(now);
  const existing = await resend.broadcasts.list();
  const already = existing.data?.data.find((b) => b.name === name);
  if (already) {
    return NextResponse.json({ ok: true, status: "skipped", broadcastStatus: already.status, id: already.id, url: `https://resend.com/broadcasts/${already.id}` });
  }

  const [feed, story] = await Promise.all([
    fetchText(channelFeedUrl(process.env.PP_YOUTUBE_CHANNEL_ID || PP_CHANNEL_ID)),
    todaysStory(now).catch(() => null),
  ]);
  const content = ppWeekly({ short: feed ? bestShortOfWeek(parseChannelFeed(feed), now) : null, story });
  if (!content.short && !content.story) {
    if (fromSchedule) {
      await tellTom("NDE of the Week was NOT sent this week", "There was nothing to put in it: no Project Profound Short in the last 7 days, and no Story of the Day. Nothing was sent.");
    }
    return NextResponse.json({ ok: false, status: "nothing this week" }, { status: 200 });
  }

  const autosend = fromSchedule && process.env.NEWSLETTER_AUTOSEND !== "off";
  const at = sendTime(now);
  const html = await render(NdeOfTheWeekEmail({ content, campaign: name }));
  const base = {
    segmentId,
    name,
    from: process.env.NEWSLETTER_FROM || EMAIL_FROM,
    replyTo: EMAIL_REPLY_TO,
    subject: content.subject,
    previewText: content.previewText,
    html,
  };
  const created = autosend
    ? await resend.broadcasts.create({ ...base, send: true, scheduledAt: at.toISOString() })
    : await resend.broadcasts.create(base);
  if (created.error) {
    if (fromSchedule) await tellTom("NDE of the Week could not be made", `Resend refused it: ${created.error.message}. Nothing was sent.`);
    return NextResponse.json({ ok: false, status: "error", error: `Resend: ${created.error.message}` }, { status: 502 });
  }
  const url = `https://resend.com/broadcasts/${created.data.id}`;

  if (fromSchedule) {
    await tellTom(
      autosend ? `Scheduled for ${easternTime(at)}: ${content.subject}` : `Draft ready: ${content.subject}`,
      (autosend
        ? `This week's NDE of the Week goes out by itself at ${easternTime(at)}. To stop it, open it in Resend and cancel before then:\n\n${url}`
        : `This week's NDE of the Week is a draft in Resend (automatic sending is off). Read it and press Send:\n\n${url}`) +
        `\n\nShort: ${content.short?.title ?? "none this week"}\nStory: ${content.story?.title ?? "none"}`,
    );
  }

  return NextResponse.json({
    ok: true,
    status: autosend ? "scheduled" : "draft",
    sendsAt: autosend ? at.toISOString() : null,
    id: created.data.id,
    url,
    subject: content.subject,
    short: content.short?.title ?? null,
    story: content.story?.title ?? null,
  });
}
