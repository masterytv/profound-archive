// src/app/api/email/cron/route.ts
// GET /api/email/cron
// Called by GitHub Actions every hour. Sends to all leads whose next_send_at <= now().
// Protected by x-cron-secret header.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resend, EMAIL_FROM } from "@/lib/email/resend";
import { VideoEmail } from "@/lib/email/templates/VideoEmail";
import { ARCHETYPES } from "@/lib/quiz/archetypes";
import { render } from "@react-email/render";
import type { ArchetypeId } from "@/lib/quiz/archetypes";

const MAX_BATCH = 50; // Stay well within Resend's free 100/day limit

function computeNextSend(frequency: string): string {
  const now = new Date();
  switch (frequency) {
    case "daily":   now.setDate(now.getDate() + 1); break;
    case "3day":    now.setDate(now.getDate() + 3); break;
    case "weekly":  now.setDate(now.getDate() + 7); break;
    case "monthly": now.setDate(now.getDate() + 30); break;
    default:        now.setDate(now.getDate() + 7);
  }
  return now.toISOString();
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // Fetch all leads due for a send (skip newsletter — broadcast-only list)
  const { data: leads, error } = await supabase
    .from("quiz_leads")
    .select("id, email, archetype, frequency, unsubscribe_token")
    .eq("is_active", true)
    .neq("archetype", "newsletter")
    .or("next_send_at.is.null,next_send_at.lte." + new Date().toISOString())
    .limit(MAX_BATCH);

  if (error) {
    console.error("[email/cron] Failed to fetch leads:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!leads?.length) {
    return NextResponse.json({ sent: 0, message: "No leads due" });
  }

  const results = { sent: 0, failed: 0, errors: [] as string[] };

  for (const lead of leads) {
    try {
      const archetype = lead.archetype as ArchetypeId;
      const archetypeData = ARCHETYPES[archetype];

      // Pick video
      const { data: videoRows, error: rpcError } = await supabase.rpc("pick_video_for_archetype", {
        p_archetype: archetype,
        p_lead_id:   lead.id,
      });

      if (rpcError || !videoRows?.length) {
        console.warn(`[cron] No video for lead ${lead.id} (${archetype}):`, rpcError?.message);
        results.failed++;
        continue;
      }

      const video = videoRows[0] as {
        videoId: string; title: string; channelName: string;
        thumbnailUrl: string | null; viewCount: number | null;
      };

      const unsubscribeUrl = `https://projectprofound.org/unsubscribe?email=${encodeURIComponent(lead.email)}`;

      const html = await render(
        VideoEmail({
          archetypeLabel: archetypeData?.label ?? archetype,
          archetypeIcon:  archetypeData?.icon  ?? "✦",
          videoId:        video.videoId,
          videoTitle:     video.title,
          channelName:    video.channelName,
          thumbnailUrl:   video.thumbnailUrl,
          viewCount:      video.viewCount,
          frequency:      lead.frequency,
          unsubscribeUrl,
        })
      );

      const { data: sendData, error: sendError } = await resend.emails.send({
        from:    EMAIL_FROM,
        to:      [lead.email],
        subject: `A near-death story for ${archetypeData?.label ?? archetype}`,
        html,
      });

      if (sendError) throw new Error(sendError.message);

      // Log + update
      await supabase.from("email_sends").insert({
        lead_id:   lead.id,
        video_id:  video.videoId,
        resend_id: sendData?.id,
      });

      await supabase
        .from("quiz_leads")
        .update({
          last_sent_at: new Date().toISOString(),
          next_send_at: computeNextSend(lead.frequency),
        })
        .eq("id", lead.id);

      results.sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[cron] Failed for lead ${lead.id}:`, msg);
      results.errors.push(`${lead.email}: ${msg}`);
      results.failed++;
    }
  }

  console.log(`[email/cron] Done. Sent: ${results.sent}, Failed: ${results.failed}`);
  return NextResponse.json(results);
}
