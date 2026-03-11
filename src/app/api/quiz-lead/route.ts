// src/app/api/quiz-lead/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role to bypass RLS — this is a public subscription form
// and must work regardless of whether the caller has an auth session.
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const { email, archetype, frequency } = await req.json();

    if (!email || !archetype || !frequency) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = adminClient();
    const { error } = await supabase
      .from("quiz_leads")
      .upsert(
        { email, archetype, frequency, is_active: true },
        { onConflict: "email,archetype", ignoreDuplicates: false }
      );

    if (error) {
      console.error("[quiz-lead] upsert error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[quiz-lead] unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
