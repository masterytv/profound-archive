// src/app/api/email/cron/route.ts
// GET /api/email/cron
// Called by GitHub Actions every hour. Sends to all leads whose next_send_at <= now().
// Protected by x-cron-secret header.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resend, EMAIL_FROM } from "@/lib/email/resend";
import { VideoEmail } from "@/lib/email/templates/VideoEmail";
import { ARCHETYPES } from "@/lib/quiz/archetypes";
import { render } from "@react-email/render";
import type { ArchetypeId } from "@/lib/quiz/archetypes";

const MAX_BATCH = 50; // Stay well within Resend's free 100/day limit

// All recurring emails send at 6:00 AM ET (10:00 UTC).
// This computes the NEXT occurrence of 6am ET based on frequency.
function computeNextSend(frequency: string): string {
  const now = new Date();

  // Target: 10:00 UTC (6am ET / 7am EDT — close enough year-round)
  const TARGET_HOUR_UTC = 10;

  // Start from tomorrow at the target hour
  const next = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    TARGET_HOUR_UTC, 0, 0, 0
  ));

  // If we haven't passed today's target yet, "tomorrow" is still today
  // But for scheduling the NEXT send, always advance at least 1 day
  next.setUTCDate(next.getUTCDate() + 1);

  switch (frequency) {
    case "daily":   /* already +1 day */                    break;
    case "3day":    next.setUTCDate(next.getUTCDate() + 2); break; // +1 already, so +2 more = 3
    case "weekly":  next.setUTCDate(next.getUTCDate() + 6); break; // +1 already, so +6 more = 7
    case "monthly": next.setUTCDate(next.getUTCDate() + 29); break; // +1 already, so +29 more = 30
    default:        next.setUTCDate(next.getUTCDate() + 6); break;
  }

  return next.toISOString();
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service-role client to bypass RLS
  const supabase = adminClient();

  // Fetch all leads due for a send (skip newsletter — broadcast-only list)
  const { data: leads, error } = await supabase
    .from("quiz_leads")
    .select("id, email, archetype, frequency, unsubscribe_token, send_count")
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

  const results = { sent: 0, failed: 0, skipped: 0, errors: [] as string[] };

  // Pre-fetch all templates (avoid N+1 queries)
  const { data: allTemplates } = await supabase
    .from("email_templates")
    .select("archetype, subject, intro_text, cta_text, profile_report");
  const templateMap = new Map(
    (allTemplates ?? []).map(t => [t.archetype, t])
  );

  // Track videos picked this run, keyed by email — prevents same-run dupes
  // when multiple subscriptions for the same email are processed together
  const pickedThisRun = new Map<string, Set<string>>();

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

      // ── Email-wide duplicate guard ──────────────────────────────────────────
      // 1) Check current-run picks for this email (race condition within batch)
      const runPicked = pickedThisRun.get(lead.email) ?? new Set<string>();
      if (runPicked.has(video.videoId)) {
        console.warn(`[cron] Skipping in-run duplicate ${video.videoId} for ${lead.email} (${archetype})`);
        results.skipped++;
        await supabase.from("quiz_leads")
          .update({ next_send_at: computeNextSend(lead.frequency) })
          .eq("id", lead.id);
        continue;
      }

      // 2) Check historical sends for this email across all its leads
      const { data: siblingLeads } = await supabase
        .from("quiz_leads").select("id").eq("email", lead.email);
      if (siblingLeads?.length) {
        const { data: sentRows } = await supabase
          .from("email_sends").select("video_id")
          .in("lead_id", siblingLeads.map(r => r.id));
        const historicallySent = new Set((sentRows ?? []).map(r => r.video_id));
        if (historicallySent.has(video.videoId)) {
          console.warn(`[cron] Skipping historical duplicate ${video.videoId} for ${lead.email} (${archetype})`);
          results.skipped++;
          await supabase.from("quiz_leads")
            .update({ next_send_at: computeNextSend(lead.frequency) })
            .eq("id", lead.id);
          continue;
        }
      }
      // ───────────────────────────────────────────────────────────────────────

      // Get template overrides from pre-fetched map
      const tpl = templateMap.get(archetype);
      const isFirstSend = (lead.send_count ?? 0) === 0;

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
          introText:      tpl?.intro_text     ?? undefined,
          ctaText:        tpl?.cta_text       ?? undefined,
          profileReport:  isFirstSend ? (tpl?.profile_report ?? undefined) : undefined,
        })
      );

      const { data: sendData, error: sendError } = await resend.emails.send({
        from:    EMAIL_FROM,
        to:      [lead.email],
        subject: tpl?.subject ?? `A near-death story for ${archetypeData?.label ?? archetype}`,
        html,
      });

      if (sendError) throw new Error(sendError.message);

      // Record this pick in the in-run dedup map
      runPicked.add(video.videoId);
      pickedThisRun.set(lead.email, runPicked);

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
          send_count:   (lead.send_count ?? 0) + 1,
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
