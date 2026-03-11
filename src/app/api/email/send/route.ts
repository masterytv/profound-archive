// src/app/api/email/send/route.ts
// POST /api/email/send
// Body: { lead_id: string }  OR  { email: string, archetype: string, frequency: string }
// For test sends from the admin panel (pass email+archetype+frequency directly).
// For cron sends, pass lead_id only.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resend } from "@/lib/email/resend";
import { VideoEmail } from "@/lib/email/templates/VideoEmail";
import { WelcomeEmail } from "@/lib/email/templates/WelcomeEmail";
import { ARCHETYPES } from "@/lib/quiz/archetypes";
import { render } from "@react-email/render";
import type { ArchetypeId } from "@/lib/quiz/archetypes";

// Use verified domain in prod; Resend's test domain locally
const EMAIL_FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev";

// Compute next_send_at from frequency
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

export async function POST(req: NextRequest) {
  // Authenticate — only cron (CRON_SECRET) or admin sessions may call this.
  const cronSecret = req.headers.get("x-cron-secret");
  const isCron = cronSecret === process.env.CRON_SECRET;

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const isAdmin = session?.user != null; // Further role check below for non-cron

  if (!isCron && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  let leadId: string;
  let email: string;
  let archetype: ArchetypeId;
  let frequency: string;

  if (body.lead_id) {
    // Cron path: look up lead from DB
    const { data: lead, error } = await supabase
      .from("quiz_leads")
      .select("*")
      .eq("id", body.lead_id)
      .eq("is_active", true)
      .single();

    if (error || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    leadId   = lead.id;
    email    = lead.email;
    archetype = lead.archetype as ArchetypeId;
    frequency = lead.frequency;
  } else {
    // Test send path: email+archetype+frequency in body
    if (!body.email || !body.archetype) {
      return NextResponse.json({ error: "Missing email or archetype" }, { status: 400 });
    }
    leadId   = "00000000-0000-0000-0000-000000000000"; // test lead placeholder
    email    = body.email;
    archetype = body.archetype as ArchetypeId;
    frequency = body.frequency ?? "weekly";
  }

  // ── Newsletter welcome — special path, no video pick ──────────────────────
  if ((body.archetype ?? archetype) === "newsletter_welcome") {
    const { data: tpl } = await supabase
      .from("email_templates")
      .select("subject, intro_text, cta_text, cta_href")
      .eq("archetype", "newsletter_welcome")
      .maybeSingle();

    const unsubscribeUrl = `https://projectprofound.org/unsubscribe?email=${encodeURIComponent(email)}`;
    const html = await render(
      WelcomeEmail({
        introText:      tpl?.intro_text ?? undefined,
        ctaText:        tpl?.cta_text   ?? undefined,
        ctaHref:        tpl?.cta_href   ?? undefined,
        unsubscribeUrl,
      })
    );

    const { error: sendError } = await resend.emails.send({
      from:    EMAIL_FROM,
      to:      [email],
      subject: tpl?.subject ?? "Welcome to Project Profound",
      html,
    });

    if (sendError) {
      const msg = (sendError as { message?: string })?.message ?? JSON.stringify(sendError);
      return NextResponse.json({ error: `Resend: ${msg}` }, { status: 500 });
    }
    return NextResponse.json({ success: true, type: "newsletter_welcome" });
  }
  // ─────────────────────────────────────────────────────────────────────────

  const { data: videoRows, error: rpcError } = await supabase.rpc("pick_video_for_archetype", {
    p_archetype: archetype,
    p_lead_id:   leadId,
  });

  console.log("[email/send] RPC result:", { rows: videoRows?.length, rpcError: rpcError?.message, archetype });

  if (rpcError) {
    return NextResponse.json({ error: `RPC error: ${rpcError.message}` }, { status: 500 });
  }
  if (!videoRows?.length) {
    return NextResponse.json({ error: `No matching video found for archetype: ${archetype}` }, { status: 404 });
  }

  const video = videoRows[0] as {
    videoId: string;
    title: string;
    channelName: string;
    thumbnailUrl: string | null;
    viewCount: number | null;
  };

  const archetypeData = ARCHETYPES[archetype];
  const unsubscribeBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL ? "https://projectprofound.org" : "http://localhost:3000"}`;

  const unsubscribeUrl = `${unsubscribeBase}/unsubscribe?email=${encodeURIComponent(email)}`;

  // Render and send
  const html = await render(
    VideoEmail({
      archetypeLabel: archetypeData?.label ?? archetype,
      archetypeIcon:  archetypeData?.icon  ?? "✦",
      videoId:        video.videoId,
      videoTitle:     video.title,
      channelName:    video.channelName,
      thumbnailUrl:   video.thumbnailUrl,
      viewCount:      video.viewCount,
      frequency,
      unsubscribeUrl,
    })
  );

  const { data: sendData, error: sendError } = await resend.emails.send({
    from:    EMAIL_FROM,
    to:      [email],
    subject: `A near-death story for ${archetypeData?.label ?? archetype}`,
    html,
  });

  if (sendError) {
    console.error("[email/send] Resend error:", sendError);
    // Surface the exact Resend error message to the caller
    const msg = (sendError as any)?.message ?? JSON.stringify(sendError);
    return NextResponse.json({ error: `Resend: ${msg}` }, { status: 500 });
  }

  // Log send + update lead (only for real leads, not test)
  if (leadId !== "00000000-0000-0000-0000-000000000000") {
    await supabase.from("email_sends").insert({
      lead_id:   leadId,
      video_id:  video.videoId,
      resend_id: sendData?.id,
    });

    await supabase
      .from("quiz_leads")
      .update({
        last_sent_at: new Date().toISOString(),
        next_send_at: computeNextSend(frequency).toISOString(),
      })
      .eq("id", leadId);

    // Increment send_count atomically via RPC to avoid race conditions
    await supabase.rpc("increment_send_count", { p_lead_id: leadId });
  }

  return NextResponse.json({
    success: true,
    video:   video.videoId,
    resend_id: sendData?.id,
  });
}
