// src/app/api/quiz-lead/route.ts
// POST — subscribe to an archetype or newsletter list.
//
// Compass archetype flow (retake-aware):
//   1. Deactivate any existing active compass row for this email
//   2. Insert a fresh row with the new archetype
//   3. If the user is logged in, update profiles.compass_archetype
//   4. Send the first story email
//
// Newsletter flow:
//   1. Upsert (email, newsletter) — idempotent
//   2. Send welcome email
//
// Uses the service role key to bypass RLS.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { resend } from "@/lib/email/resend";
import { WelcomeEmail } from "@/lib/email/templates/WelcomeEmail";
import { sendFirstStory } from "@/lib/email/sendFirstStory";
import { render } from "@react-email/render";

const EMAIL_FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const { email, archetype, frequency, write_in } = await req.json();

    if (!email || !archetype || !frequency) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = adminClient();
    const isNewsletter = archetype === "newsletter";

    if (isNewsletter) {
      // ── Newsletter: simple upsert, idempotent ──
      const { data: upserted, error } = await supabase
        .from("quiz_leads")
        .upsert(
          { email, archetype, frequency, is_active: true },
          { onConflict: "email,archetype", ignoreDuplicates: false }
        )
        .select("id, email, archetype, frequency, unsubscribe_token")
        .single();

      if (error || !upserted) {
        console.error("[quiz-lead] newsletter upsert error:", error?.message);
        return NextResponse.json({ error: error?.message ?? "Upsert failed" }, { status: 500 });
      }

      sendWelcomeEmail(upserted).catch(e =>
        console.error("[quiz-lead] welcome email failed:", e)
      );
      return NextResponse.json({ ok: true });
    }

    // ── Compass archetype: retake-aware ──

    // Step 1: Deactivate any existing active compass row for this email.
    // This is what makes retakes work — the old destination is retired,
    // not stacked on top of.
    await supabase
      .from("quiz_leads")
      .update({ is_active: false })
      .eq("email", email)
      .eq("is_active", true)
      .neq("archetype", "newsletter");

    // Step 2: Get the logged-in user (if any) to link the row to their profile.
    // We use the server client (reads cookies) — this is a Server Component context.
    let userId: string | null = null;
    try {
      const serverSupabase = await createServerClient();
      const { data: { user } } = await serverSupabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      // Not logged in — anonymous subscriber, that's fine
    }

    // Step 3: Upsert the compass row.
    // onConflict = (email, archetype): if the row already exists (even inactive),
    // bring it back to life with updated frequency/write_in instead of failing.
    const { data: upserted, error } = await supabase
      .from("quiz_leads")
      .upsert(
        {
          email,
          archetype,
          frequency,
          is_active: true,
          user_id: userId ?? undefined,
          ...(write_in ? { write_in } : {}),
        },
        { onConflict: "email,archetype", ignoreDuplicates: false }
      )
      .select("id, email, archetype, frequency, unsubscribe_token")
      .single();

    if (error || !upserted) {
      console.error("[quiz-lead] compass upsert error:", error?.message);
      return NextResponse.json({ error: error?.message ?? "Upsert failed" }, { status: 500 });
    }

    // Step 4: If logged in, update profiles.compass_archetype for personalization.
    if (userId) {
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          compass_archetype: archetype,
          compass_taken_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (profileErr) {
        // Non-fatal — log but don't fail the request
        console.error("[quiz-lead] profile compass update error:", profileErr.message);
      }
    }

    // Step 5: Send first story — don't await so response is fast
    sendFirstStory(upserted).catch(e =>
      console.error("[quiz-lead] first story failed:", e)
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[quiz-lead] unexpected error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Unexpected error: ${msg}` }, { status: 500 });
  }
}

// Sends the newsletter welcome email using the customizable DB template
async function sendWelcomeEmail(lead: { email: string; unsubscribe_token: string }) {
  const supabase = adminClient();

  const { data: tmpl } = await supabase
    .from("email_templates")
    .select("subject, intro_text, cta_text")
    .eq("archetype", "newsletter_welcome")
    .maybeSingle();

  const unsubscribeUrl = `https://projectprofound.org/unsubscribe?token=${lead.unsubscribe_token}`;

  const html = await render(
    WelcomeEmail({
      introText:      tmpl?.intro_text ?? undefined,
      ctaText:        tmpl?.cta_text   ?? undefined,
      unsubscribeUrl,
    })
  );

  const { error } = await resend.emails.send({
    from:    EMAIL_FROM,
    to:      [lead.email],
    subject: tmpl?.subject ?? "Welcome to Project Profound",
    html,
  });

  if (error) {
    console.error("[quiz-lead] welcome Resend error:", error);
  } else {
    console.log(`[quiz-lead] Welcome email sent to ${lead.email}`);
  }
}
