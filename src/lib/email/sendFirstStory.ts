// src/lib/email/sendFirstStory.ts
// Shared helper: picks a video for an archetype lead and sends the first story email immediately.
// Called from the quiz-lead route after a new subscription is created.
// Also used by the manual send route. Uses the service role key to bypass RLS.

import { createClient } from "@supabase/supabase-js";
import { resend } from "@/lib/email/resend";
import { VideoEmail } from "@/lib/email/templates/VideoEmail";
import { ARCHETYPES } from "@/lib/quiz/archetypes";
import { render } from "@react-email/render";
import type { ArchetypeId } from "@/lib/quiz/archetypes";

const EMAIL_FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function computeNextSend(frequency: string): Date {
  const now = new Date();
  switch (frequency) {
    case "daily":   now.setDate(now.getDate() + 1); break;
    case "3day":    now.setDate(now.getDate() + 3); break;
    case "weekly":  now.setDate(now.getDate() + 7); break;
    case "monthly": now.setDate(now.getDate() + 30); break;
    default:        now.setDate(now.getDate() + 7);
  }
  return now;
}

interface LeadInfo {
  id: string;
  email: string;
  archetype: string;
  frequency: string;
  unsubscribe_token: string;
}

/**
 * Picks a video and sends the first archetype story email immediately.
 * Returns { ok: true } or { ok: false, error: string }.
 */
export async function sendFirstStory(lead: LeadInfo): Promise<{ ok: boolean; error?: string }> {
  const supabase = adminClient();
  const archetype = lead.archetype as ArchetypeId;
  const archetypeData = ARCHETYPES[archetype];

  // Pick a video for this archetype
  const { data: videoRows, error: rpcError } = await supabase.rpc("pick_video_for_archetype", {
    p_archetype: archetype,
    p_lead_id:   lead.id,
  });

  if (rpcError || !videoRows?.length) {
    console.warn(`[sendFirstStory] No video for ${archetype}:`, rpcError?.message);
    return { ok: false, error: rpcError?.message ?? "No matching video" };
  }

  const video = videoRows[0] as {
    videoId: string; title: string; channelName: string;
    thumbnailUrl: string | null; viewCount: number | null;
  };

  // Fetch customized template content from DB (if any)
  const { data: tmpl } = await supabase
    .from("email_templates")
    .select("subject, intro_text, cta_text")
    .eq("archetype", archetype)
    .maybeSingle();

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
      introText:      tmpl?.intro_text ?? undefined,
      ctaText:        tmpl?.cta_text   ?? undefined,
    })
  );

  const subject = tmpl?.subject ?? `Your first NDE story for ${archetypeData?.label ?? archetype}`;

  const { data: sendData, error: sendError } = await resend.emails.send({
    from:    EMAIL_FROM,
    to:      [lead.email],
    subject,
    html,
  });

  if (sendError) {
    const msg = (sendError as { message?: string }).message ?? JSON.stringify(sendError);
    console.error(`[sendFirstStory] Resend error for ${lead.email}:`, msg);
    return { ok: false, error: msg };
  }

  // Log the send + set next_send_at so cron won't double-send
  await Promise.all([
    supabase.from("email_sends").insert({
      lead_id:   lead.id,
      video_id:  video.videoId,
      resend_id: sendData?.id,
    }),
    supabase
      .from("quiz_leads")
      .update({
        last_sent_at: new Date().toISOString(),
        next_send_at: computeNextSend(lead.frequency).toISOString(),
        send_count:   1,
      })
      .eq("id", lead.id),
  ]);

  console.log(`[sendFirstStory] Sent to ${lead.email} (${archetype}), resend_id=${sendData?.id}`);
  return { ok: true };
}
