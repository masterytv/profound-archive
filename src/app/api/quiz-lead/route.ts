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

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { resend } from "@/lib/email/resend";
import { WelcomeEmail } from "@/lib/email/templates/WelcomeEmail";
import { sendFirstStory } from "@/lib/email/sendFirstStory";
import { render } from "@react-email/render";
import { checkRateLimit, isRateLimited, rateLimitResponse } from "@/lib/rate-limit";
import { z } from "zod";
import { addToNewsletter, isNewsletterList } from "@/lib/email/audience";
import { corsHeaders } from "@/lib/email/cors";

// Request shape (S-12). archetype stays a bounded string (compass archetypes,
// newsletter_* lists, and admin test sends all flow through here).
const BodySchema = z.object({
  email: z.string().trim().email().max(320),
  archetype: z.string().min(1).max(100),
  frequency: z.enum(["daily", "3day", "weekly", "monthly"]),
  // Truncate rather than reject: the quiz UI invites unbounded write-ins, and
  // an over-long optional note must never cost us the email capture.
  write_in: z.string().transform((s) => s.slice(0, 500)).optional(),
});

const EMAIL_FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev";

// Throttles (S-3): this route writes rows and sends mail to a caller-supplied
// address — limit per IP and per target email before any side effect.
const IP_LIMIT = { name: "quiz-lead-ip", windowMs: 60_000, max: 5 };
const EMAIL_LIMIT = { name: "quiz-lead-email", windowMs: 3600_000, max: 5 };

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

// The Soul Wisdom site's form posts here from another origin (src/lib/email/cors.ts).
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: NextRequest) {
  const res = await handlePost(req);
  for (const [k, v] of Object.entries(corsHeaders(req.headers.get("origin")))) res.headers.set(k, v);
  return res;
}

async function handlePost(req: NextRequest): Promise<NextResponse> {
  const ipLimited = checkRateLimit(req, IP_LIMIT);
  if (ipLimited) return ipLimited;

  try {
    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const { email, archetype, frequency, write_in } = parsed.data;

    if (isRateLimited(EMAIL_LIMIT, email.toLowerCase())) {
      return rateLimitResponse(EMAIL_LIMIT.windowMs);
    }

    const supabase = adminClient();
    const isNewsletter = isNewsletterList(archetype);

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
      // The newsletter's copy in Resend, for the weekly broadcast (src/lib/email/audience.ts). After the save, and
      // never able to fail the sign-up.
      addToNewsletter(email).catch(e =>
        console.error("[quiz-lead] Resend newsletter contact failed:", e instanceof Error ? e.message : e)
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
      .not("archetype", "like", "newsletter_%");

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
async function sendWelcomeEmail(lead: { email: string; archetype: string; unsubscribe_token: string }) {
  const supabase = adminClient();

  const { data: tmpl } = await supabase
    .from("email_templates")
    .select("subject, intro_text, cta_text, cta_href")
    .eq("archetype", `${lead.archetype}_welcome`)
    .maybeSingle();

  const unsubscribeUrl = `https://projectprofound.org/unsubscribe?token=${lead.unsubscribe_token}`;

  // Sign-ups from the Soul Wisdom Collective site get a welcome that says where they signed up, unless the
  // admin email page has a "newsletter_swc_welcome" template.
  const swc = lead.archetype === "newsletter_swc" ? SWC_WELCOME : null;

  const html = await render(
    WelcomeEmail({
      introText: tmpl?.intro_text ?? swc?.introText ?? undefined,
      ctaText: tmpl?.cta_text ?? swc?.ctaText ?? undefined,
      ctaHref: tmpl?.cta_href ?? swc?.ctaHref ?? undefined,
      unsubscribeUrl,
    })
  );

  const { error } = await resend.emails.send({
    from:    EMAIL_FROM,
    to:      [lead.email],
    subject: tmpl?.subject ?? swc?.subject ?? "Welcome to Project Profound",
    html,
  });

  if (error) {
    console.error("[quiz-lead] welcome Resend error:", error);
  } else {
    console.log(`[quiz-lead] Welcome email sent to ${lead.email}`);
  }
}

const SWC_WELCOME = {
  subject: "Welcome: NDE of the Week from Soul Wisdom Collective and Project Profound",
  introText:
    "Thank you for signing up on Soul Wisdom Collective. Once a week you'll get one email: the week's most-watched " +
    "near-death experience Short, a story from the Project Profound archive, and the newest Soul Wisdom Collective episode.",
  ctaText: "Visit Soul Wisdom Collective",
  ctaHref: "https://soulwisdomcollective.com",
};
