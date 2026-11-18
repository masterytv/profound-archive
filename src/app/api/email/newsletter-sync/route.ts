// src/app/api/email/newsletter-sync/route.ts
// POST /api/email/newsletter-sync — admin only. Copies everyone active on a newsletter list in quiz_leads into the
// Resend segment the weekly broadcast goes to (src/lib/email/audience.ts). Run once after RESEND_SEGMENT_ID is set
// (the "Copy subscribers to Resend" button on /admin/email); safe to run again, it only adds or re-subscribes the
// people PP has as active. Nobody is unsubscribed here: the webhook and the unsubscribe page do that.
// Returns counts only, never addresses.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminUser } from "@/lib/auth/admin-guard";
import { addToNewsletter, NEWSLETTER_LISTS, newsletterSegmentId } from "@/lib/email/audience";

// Resend allows a few requests a second; three calls per new contact at most.
const PAUSE_MS = 700;

export async function POST() {
  if (!(await isAdminUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!newsletterSegmentId()) {
    return NextResponse.json({ error: "Set RESEND_SEGMENT_ID first (the Resend segment for the newsletter)" }, { status: 400 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  const { data, error } = await supabase
    .from("quiz_leads")
    .select("email")
    .in("archetype", [...NEWSLETTER_LISTS])
    .eq("is_active", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const emails = [...new Map((data ?? []).map((r) => [r.email.trim().toLowerCase(), r.email.trim()])).values()];
  const counts = { total: emails.length, added: 0, updated: 0, failed: 0 };
  for (const email of emails) {
    try {
      const r = await addToNewsletter(email);
      if (r === "added") counts.added++;
      else if (r === "updated") counts.updated++;
    } catch (e) {
      counts.failed++;
      console.error("[newsletter-sync] one contact failed:", e instanceof Error ? e.message : e);
    }
    await new Promise((r) => setTimeout(r, PAUSE_MS));
  }
  return NextResponse.json({ ok: true, ...counts });
}
