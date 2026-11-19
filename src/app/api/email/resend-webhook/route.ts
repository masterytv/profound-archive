// src/app/api/email/resend-webhook/route.ts
// POST /api/email/resend-webhook — Resend's webhook (event "contact.updated"), signed with RESEND_WEBHOOK_SECRET.
// When someone unsubscribes from a newsletter broadcast (the "NDE of the Week"), every list they are on in
// quiz_leads is switched off, the drip emails too: one unsubscribe link stops everything we send them
// (marketing plan step 3, Tom 2026-11-18). Other events are acknowledged and ignored; a deleted contact is
// not taken as an unsubscribe (that is housekeeping in Resend's dashboard, not the person's choice).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resend } from "@/lib/email/resend";
import { emailForms } from "@/lib/email/audience";

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });

  const payload = await req.text();
  let event;
  try {
    // Resend signs with Svix: the three svix-* headers carry the message id, time and signature.
    const headers = {
      id: req.headers.get("svix-id") ?? "",
      timestamp: req.headers.get("svix-timestamp") ?? "",
      signature: req.headers.get("svix-signature") ?? "",
    };
    event = resend.webhooks.verify({ payload, headers, webhookSecret: secret });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event.type !== "contact.updated" || !event.data.unsubscribed || !event.data.email) {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  const { data, error } = await supabase
    .from("quiz_leads")
    .update({ is_active: false })
    .in("email", emailForms(event.data.email))
    .eq("is_active", true)
    .select("id");
  if (error) {
    console.error("[resend-webhook] unsubscribe failed:", error.message);
    // A 500 makes Resend retry the delivery later.
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  console.log(`[resend-webhook] unsubscribed from ${data?.length ?? 0} list(s)`);
  return NextResponse.json({ ok: true, lists: data?.length ?? 0 });
}
