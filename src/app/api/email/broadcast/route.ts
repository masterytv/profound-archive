// src/app/api/email/broadcast/route.ts
// POST /api/email/broadcast
// Body: { archetype: string, subject: string, bodyText: string, ctaText?: string, ctaHref?: string }
// Sends a custom broadcast email to all active subscribers of the given archetype (or "all").
// Logs campaign to email_campaigns table.
// Admin-only. Returns { campaign_id, sent, failed, total, errors }.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { resend } from "@/lib/email/resend";
import { BroadcastEmail } from "@/lib/email/templates/BroadcastEmail";
import { render } from "@react-email/render";

const EMAIL_FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev";

export async function POST(req: NextRequest) {
  // Auth guard — admin only
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" && profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { archetype, subject, bodyText, ctaText, ctaHref } = await req.json();
  if (!archetype || typeof archetype !== "string") {
    return NextResponse.json({ error: "Missing archetype" }, { status: 400 });
  }
  if (!subject || !bodyText) {
    return NextResponse.json({ error: "Missing subject or body" }, { status: 400 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Fetch all active subscribers — optionally filtered by archetype
  let query = admin
    .from("quiz_leads")
    .select("id, email, archetype, frequency")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (archetype !== "all") {
    query = query.eq("archetype", archetype);
  }

  const { data: leads, error: fetchError } = await query;

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!leads?.length) {
    return NextResponse.json({ error: "No active subscribers found" }, { status: 404 });
  }

  // Render the email HTML once (same for all recipients)
  const html = await render(
    BroadcastEmail({
      subject,
      bodyText,
      ctaText: ctaText || undefined,
      ctaHref: ctaHref || undefined,
      // unsubscribeUrl will be personalized per recipient below
    })
  );

  // Create campaign record
  const { data: campaign, error: campaignError } = await admin
    .from("email_campaigns")
    .insert({
      subject,
      body_text: bodyText,
      body_html: html,
      target_archetype: archetype,
      total_count: leads.length,
      status: "sending",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (campaignError) {
    return NextResponse.json({ error: `Campaign creation failed: ${campaignError.message}` }, { status: 500 });
  }

  const campaignId = campaign.id;
  const errors: string[] = [];
  let sent = 0;
  let failed = 0;

  for (const lead of leads) {
    try {
      // Re-render with personalized unsubscribe URL per recipient
      const personalizedHtml = await render(
        BroadcastEmail({
          subject,
          bodyText,
          ctaText: ctaText || undefined,
          ctaHref: ctaHref || undefined,
          unsubscribeUrl: `https://projectprofound.org/unsubscribe?email=${encodeURIComponent(lead.email)}`,
        })
      );

      const { error: sendError } = await resend.emails.send({
        from: EMAIL_FROM,
        to: [lead.email],
        subject,
        html: personalizedHtml,
      });

      if (sendError) {
        failed++;
        errors.push(`${lead.email}: ${(sendError as { message?: string })?.message ?? "Send failed"}`);
        continue;
      }

      sent++;
    } catch (err) {
      failed++;
      errors.push(`${lead.email}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Update campaign record with results
  await admin
    .from("email_campaigns")
    .update({
      sent_count: sent,
      failed_count: failed,
      status: failed === leads.length ? "failed" : "sent",
      errors: errors.length > 0 ? errors : [],
      sent_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  return NextResponse.json({ campaign_id: campaignId, sent, failed, total: leads.length, errors });
}
