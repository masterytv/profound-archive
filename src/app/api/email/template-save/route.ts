// POST /api/email/template-save
// Saves / upserts an email template using the service role key to bypass RLS.
// Requires an authenticated admin session.

import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { isAdminUser } from '@/lib/auth/admin-guard';

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function POST(req: NextRequest) {
  // Auth guard — admin or super_admin only
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { archetype, subject, intro_text, cta_text, from_name, profile_report } = body;

  if (!archetype) {
    return NextResponse.json({ error: "Missing archetype" }, { status: 400 });
  }

  const admin = adminClient();
  const { error } = await admin
    .from("email_templates")
    .upsert(
      { archetype, subject, intro_text, cta_text, cta_href: body.cta_href ?? null, from_name, profile_report: profile_report ?? null, updated_at: new Date().toISOString() },
      { onConflict: "archetype" }
    );

  if (error) {
    console.error("[template-save] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
