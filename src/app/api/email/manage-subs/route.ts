// src/app/api/email/manage-subs/route.ts
// GET  /api/email/manage-subs?email=xxx@example.com  → returns all subscriptions for that email
// POST /api/email/manage-subs  → { email, updates: [{ archetype, active, frequency? }] }
// Uses service role to bypass RLS — no user auth required.
// Email is the primary key; token is only used as a resolver (legacy email links).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const supabase = adminClient();
  let email = req.nextUrl.searchParams.get("email");
  const token = req.nextUrl.searchParams.get("token");

  // If token provided instead of email, resolve it to an email first (legacy links)
  if (!email && token) {
    const { data: lead } = await supabase
      .from("quiz_leads")
      .select("email")
      .eq("unsubscribe_token", token)
      .maybeSingle();

    if (!lead) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }
    email = lead.email;
  }

  if (!email) {
    return NextResponse.json({ error: "email or token required" }, { status: 400 });
  }

  // Get ALL subscriptions for this email
  const { data: subs } = await supabase
    .from("quiz_leads")
    .select("id, archetype, frequency, is_active, unsubscribe_token")
    .eq("email", email)
    .order("created_at", { ascending: true });

  return NextResponse.json({ email, subs: subs ?? [] });
}

export async function POST(req: NextRequest) {
  const { email, updates } = await req.json() as {
    email: string;
    updates: { archetype: string; active: boolean; frequency?: string }[];
  };

  if (!email || !updates?.length) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = adminClient();

  // Apply each update using service role (bypasses RLS)
  const results = await Promise.all(
    updates.map(async ({ archetype, active, frequency }) => {
      const patch: Record<string, unknown> = { is_active: active };
      if (frequency) patch.frequency = frequency;

      const { error } = await supabase
        .from("quiz_leads")
        .update(patch)
        .eq("email", email)
        .eq("archetype", archetype);

      return { archetype, ok: !error };
    })
  );

  return NextResponse.json({ ok: true, results });
}
