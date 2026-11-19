// src/app/api/email/newsletter-sync/route.ts
// POST /api/email/newsletter-sync — admin only. Copies everyone active on a newsletter list in quiz_leads into that
// newsletter's Resend segment (src/lib/email/audience.ts): PP's lists into RESEND_SEGMENT_ID, the Soul Wisdom list
// into RESEND_SWC_SEGMENT_ID. A newsletter whose segment is not set is skipped. Run once after the segments are set
// (the "Copy subscribers to Resend" button on /admin/email); safe to run again, it only adds or re-subscribes the
// people PP has as active. Nobody is unsubscribed here: the webhook and the unsubscribe page do that.
// Returns counts only, never addresses.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminUser } from "@/lib/auth/admin-guard";
import { addToNewsletter, listsOf, NEWSLETTERS, segmentIdOf } from "@/lib/email/audience";

// Resend allows a few requests a second; three calls per contact at most.
const PAUSE_MS = 700;

export async function POST() {
  if (!(await isAdminUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ready = NEWSLETTERS.filter((n) => segmentIdOf(n));
  if (!ready.length) {
    return NextResponse.json({ error: "Set RESEND_SEGMENT_ID and RESEND_SWC_SEGMENT_ID first (the Resend segments)" }, { status: 400 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  const result: Record<string, { total: number; added: number; updated: number; failed: number } | "not set up"> = {};
  for (const newsletter of NEWSLETTERS) {
    if (!ready.includes(newsletter)) {
      result[newsletter] = "not set up";
      continue;
    }
    const { data, error } = await supabase.from("quiz_leads").select("email").in("archetype", listsOf(newsletter)).eq("is_active", true);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const emails = [...new Map((data ?? []).map((r) => [r.email.trim().toLowerCase(), r.email.trim()])).values()];
    const counts = { total: emails.length, added: 0, updated: 0, failed: 0 };
    for (const email of emails) {
      try {
        const r = await addToNewsletter(email, newsletter);
        if (r === "added") counts.added++;
        else if (r === "updated") counts.updated++;
      } catch (e) {
        counts.failed++;
        console.error(`[newsletter-sync] one ${newsletter} contact failed:`, e instanceof Error ? e.message : e);
      }
      await new Promise((r) => setTimeout(r, PAUSE_MS));
    }
    result[newsletter] = counts;
  }
  return NextResponse.json({ ok: true, ...result });
}
