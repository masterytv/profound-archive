// src/app/api/quiz-lead/route.ts
// POST — subscribe to an archetype or newsletter list.
// After upsert:
//   • Newsletter: sends a welcome email immediately
//   • NDE-Type archetype: sends the first matched video immediately
// Uses the service role key to bypass RLS (public form, works regardless of auth state).

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
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
    const { email, archetype, frequency } = await req.json();

    if (!email || !archetype || !frequency) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = adminClient();

    // Upsert — if already subscribed, update frequency + re-activate
    const { data: upserted, error } = await supabase
      .from("quiz_leads")
      .upsert(
        { email, archetype, frequency, is_active: true },
        { onConflict: "email,archetype", ignoreDuplicates: false }
      )
      .select("id, email, archetype, frequency, unsubscribe_token")
      .single();

    if (error || !upserted) {
      console.error("[quiz-lead] upsert error:", error?.message);
      return NextResponse.json({ error: error?.message ?? "Upsert failed" }, { status: 500 });
    }

    // Fire immediate email — don't await so the response is fast
    if (archetype === "newsletter") {
      // Welcome email for newsletter subscribers
      sendWelcomeEmail(upserted).catch(e =>
        console.error("[quiz-lead] welcome email failed:", e)
      );
    } else {
      // First video story for NDE-type subscribers
      sendFirstStory(upserted).catch(e =>
        console.error("[quiz-lead] first story failed:", e)
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[quiz-lead] unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

// Sends the newsletter welcome email using the customizable DB template
async function sendWelcomeEmail(lead: { email: string; unsubscribe_token: string }) {
  const supabase = adminClient();

  // Fetch customized welcome copy from email_templates
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
