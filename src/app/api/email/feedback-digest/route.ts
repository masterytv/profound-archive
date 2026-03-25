// src/app/api/email/feedback-digest/route.ts
// GET /api/email/feedback-digest
// Sends a weekly feedback digest email to all admin users.
// Protected by x-cron-secret header (same as other cron routes).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resend, EMAIL_FROM } from "@/lib/email/resend";
import { FeedbackDigestEmail, type FeedbackEntry } from "@/lib/email/templates/FeedbackDigestEmail";
import { render } from "@react-email/render";

// Service client for cross-table reads (profiles + auth.users + ces_feedback)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function GET(req: NextRequest) {
  // Auth: cron secret only
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();

  // ── 1. Determine the time window (last 7 days) ───────────────────────────
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const periodLabel = `${weekAgo.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  // ── 2. Fetch feedback from the last 7 days ────────────────────────────────
  const { data: feedbackRows, error: fbError } = await supabase
    .from("ces_feedback")
    .select("created_at, score, reason, path, source, feature, context_id")
    .gte("created_at", weekAgo.toISOString())
    .order("created_at", { ascending: false });

  if (fbError) {
    console.error("[feedback-digest] Failed to fetch feedback:", fbError.message);
    return NextResponse.json({ error: fbError.message }, { status: 500 });
  }

  const entries = (feedbackRows ?? []) as FeedbackEntry[];
  const totalCount = entries.length;

  // Average CES score (only entries with score > 0, since 0 = open-ended feedback)
  const scoredEntries = entries.filter((e) => e.score > 0);
  const avgScore = scoredEntries.length > 0
    ? scoredEntries.reduce((sum, e) => sum + e.score, 0) / scoredEntries.length
    : null;

  // ── 3. Fetch admin emails ─────────────────────────────────────────────────
  const { data: adminProfiles, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["admin", "super_admin"]);

  if (profileError || !adminProfiles?.length) {
    console.error("[feedback-digest] No admin profiles found:", profileError?.message);
    return NextResponse.json({ error: "No admin profiles found" }, { status: 500 });
  }

  // Look up emails from auth.users via admin API
  const adminEmails: string[] = [];
  for (const profile of adminProfiles) {
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(profile.id);
    if (!userError && userData?.user?.email) {
      adminEmails.push(userData.user.email);
    }
  }

  if (!adminEmails.length) {
    console.error("[feedback-digest] Could not resolve any admin emails");
    return NextResponse.json({ error: "No admin emails resolved" }, { status: 500 });
  }

  // Deduplicate (e.g., if same email has multiple admin accounts)
  const uniqueEmails = [...new Set(adminEmails)];

  // ── 4. Render and send the digest ─────────────────────────────────────────
  const html = await render(
    FeedbackDigestEmail({
      entries,
      periodLabel,
      totalCount,
      avgScore,
    })
  );

  const results = { sent: 0, failed: 0, errors: [] as string[] };

  for (const email of uniqueEmails) {
    try {
      const { error: sendError } = await resend.emails.send({
        from: EMAIL_FROM,
        to: [email],
        subject: `[Project Profound] Weekly Feedback Digest — ${totalCount} entries (${periodLabel})`,
        html,
      });

      if (sendError) {
        throw new Error((sendError as { message?: string })?.message ?? JSON.stringify(sendError));
      }
      results.sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[feedback-digest] Failed to send to ${email}:`, msg);
      results.errors.push(`${email}: ${msg}`);
      results.failed++;
    }
  }

  console.log(
    `[feedback-digest] Done. Period: ${periodLabel}, Entries: ${totalCount}, Sent to: ${results.sent}/${uniqueEmails.length}`
  );

  return NextResponse.json({
    period: periodLabel,
    totalFeedback: totalCount,
    withComments: entries.filter((e) => e.reason).length,
    avgScore: avgScore?.toFixed(1) ?? null,
    emailsSent: results.sent,
    emailsFailed: results.failed,
    errors: results.errors,
  });
}
