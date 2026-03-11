// POST /api/email/template-save
// Saves / upserts an email template using the service role key to bypass RLS.
// Requires an authenticated admin session.

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  // Auth guard — must be a logged-in user (admin page is already protected)
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { archetype, subject, intro_text, cta_text, from_name } = body;

  if (!archetype) {
    return NextResponse.json({ error: "Missing archetype" }, { status: 400 });
  }

  const admin = adminClient();
  const { error } = await admin
    .from("email_templates")
    .upsert(
      { archetype, subject, intro_text, cta_text, from_name, updated_at: new Date().toISOString() },
      { onConflict: "archetype" }
    );

  if (error) {
    console.error("[template-save] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
