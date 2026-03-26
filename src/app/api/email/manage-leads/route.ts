// POST /api/email/manage-leads
// Admin-only route for managing quiz_leads (toggle active, etc.)
// Uses service role key to bypass RLS.

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
  const { action, lead_id } = body;

  if (!lead_id) {
    return NextResponse.json({ error: "Missing lead_id" }, { status: 400 });
  }

  const admin = adminClient();

  switch (action) {
    case "toggle_active": {
      // Get current state
      const { data: lead } = await admin
        .from("quiz_leads")
        .select("is_active")
        .eq("id", lead_id)
        .single();
      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }
      const { error } = await admin
        .from("quiz_leads")
        .update({ is_active: !lead.is_active })
        .eq("id", lead_id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, is_active: !lead.is_active });
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}
