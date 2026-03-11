// src/app/api/email/manage-subs/route.ts
// GET  /api/email/manage-subs?token=xxx   → returns all subscriptions for that email
// POST /api/email/manage-subs             → { token, updates: [{ archetype, active, frequency? }] }
// Auth credential = unsubscribe_token (no user session required — token IS the credential)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token || token === "test") {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const supabase = await createClient();

  // Find the email via token
  const { data: lead, error } = await supabase
    .from("quiz_leads")
    .select("email")
    .eq("unsubscribe_token", token)
    .single();

  if (error || !lead) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  // Get ALL subscriptions for this email
  const { data: subs } = await supabase
    .from("quiz_leads")
    .select("id, archetype, frequency, is_active, unsubscribe_token")
    .eq("email", lead.email)
    .order("created_at", { ascending: true });

  return NextResponse.json({ email: lead.email, subs: subs ?? [] });
}

export async function POST(req: NextRequest) {
  const { token, updates } = await req.json() as {
    token: string;
    updates: { archetype: string; active: boolean; frequency?: string }[];
  };

  if (!token || !updates?.length) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = await createClient();

  // Verify token → get email
  const { data: lead, error } = await supabase
    .from("quiz_leads")
    .select("email")
    .eq("unsubscribe_token", token)
    .single();

  if (error || !lead) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  // Apply each update
  const results = await Promise.all(
    updates.map(async ({ archetype, active, frequency }) => {
      const patch: Record<string, unknown> = { is_active: active };
      if (frequency) patch.frequency = frequency;

      const { error: updateErr } = await supabase
        .from("quiz_leads")
        .update(patch)
        .eq("email", lead.email)
        .eq("archetype", archetype);

      return { archetype, ok: !updateErr };
    })
  );

  return NextResponse.json({ ok: true, results });
}
