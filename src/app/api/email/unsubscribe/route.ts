// src/app/api/email/unsubscribe/route.ts
// GET /api/email/unsubscribe?token=<unsubscribe_token>
// Sets is_active=false for the subscriber. No auth required — token is the credential.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/unsubscribe?error=missing", req.url));
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("quiz_leads")
    .update({ is_active: false })
    .eq("unsubscribe_token", token)
    .select("id, email, archetype")
    .single();

  if (error || !data) {
    console.error("[unsubscribe] Token not found:", token, error?.message);
    return NextResponse.redirect(new URL("/unsubscribe?error=invalid", req.url));
  }

  // Redirect to the confirmation page with archetype context
  return NextResponse.redirect(
    new URL(`/unsubscribe?success=1&archetype=${data.archetype}`, req.url)
  );
}
