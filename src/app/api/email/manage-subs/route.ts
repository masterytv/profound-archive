import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminUser } from "@/lib/auth/admin-guard";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const supabase = adminClient();
  let email = req.nextUrl.searchParams.get("email");
  const token = req.nextUrl.searchParams.get("token");

  // Security: require either a valid unsubscribe token OR an authenticated admin session.
  // Bare email lookups without auth are blocked to prevent subscription data leaks.
  if (!token && !(await isAdminUser())) {
    return NextResponse.json({ error: "Unauthorized — token or admin session required" }, { status: 401 });
  }

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

  // If a token was provided, verify it actually belongs to this email (prevent token+email mismatch)
  if (token) {
    const { data: verify } = await supabase
      .from("quiz_leads")
      .select("email")
      .eq("unsubscribe_token", token)
      .eq("email", email)
      .maybeSingle();

    if (!verify) {
      return NextResponse.json({ error: "Token does not match email" }, { status: 403 });
    }
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
      if (active) {
        // Upsert — create subscription if new, update if existing
        const { error } = await supabase
          .from("quiz_leads")
          .upsert(
            { email, archetype, is_active: true, frequency: frequency ?? "weekly" },
            { onConflict: "email,archetype", ignoreDuplicates: false }
          );
        return { archetype, ok: !error };
      } else {
        // Deactivate — only update rows that exist
        const { error } = await supabase
          .from("quiz_leads")
          .update({ is_active: false })
          .eq("email", email)
          .eq("archetype", archetype);
        return { archetype, ok: !error };
      }
    })
  );

  return NextResponse.json({ ok: true, results });
}
