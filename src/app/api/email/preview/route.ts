// GET /api/email/preview?archetype=griever
// Returns the rendered HTML of the email template for preview in an iframe.
// Supports NDE archetype video emails and newsletter_welcome email.
// force-dynamic: always re-fetch from DB so edits reflect immediately.
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from '@/lib/auth/admin-guard';
import { VideoEmail } from "@/lib/email/templates/VideoEmail";
import { WelcomeEmail } from "@/lib/email/templates/WelcomeEmail";
import { ARCHETYPES } from "@/lib/quiz/archetypes";
import { render } from "@react-email/render";
import type { ArchetypeId } from "@/lib/quiz/archetypes";

export async function GET(req: NextRequest) {
  // Auth guard — admin or super_admin only
  if (!(await isAdminUser())) return new NextResponse('Forbidden', { status: 403 });

  const supabase = await createClient();

  const archetype = req.nextUrl.searchParams.get("archetype") ?? "griever";

  // ── Newsletter welcome preview ───────────────────────────────────────────
  if (archetype.startsWith("newsletter_") && archetype.endsWith("_welcome")) {
    const { data: tpl } = await supabase
      .from("email_templates")
      .select("intro_text, cta_text, cta_href")
      .eq("archetype", archetype)
      .maybeSingle();

    const html = await render(
      WelcomeEmail({
        introText:      tpl?.intro_text ?? undefined,
        ctaText:        tpl?.cta_text   ?? undefined,
        ctaHref:        tpl?.cta_href   ?? undefined,
        unsubscribeUrl: "https://projectprofound.org/unsubscribe?token=preview",
      })
    );
    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": "frame-ancestors 'self'", "X-Frame-Options": "SAMEORIGIN" } });
  }

  // ── NDE archetype video email preview ────────────────────────────────────
  const archetypeId = archetype as ArchetypeId;

  const { data: videoRows } = await supabase.rpc("pick_video_for_archetype", {
    p_archetype: archetypeId,
    p_lead_id:   "00000000-0000-0000-0000-000000000000",
  });

  const video = videoRows?.[0] ?? {
    videoId:      "preview",
    title:        "Sample NDE Account — A Journey Through Light",
    channelName:  "Project Profound",
    thumbnailUrl: null,
    viewCount:    125000,
  };

  const { data: tpl } = await supabase
    .from("email_templates")
    .select("*")
    .eq("archetype", archetypeId)
    .maybeSingle();

  const archetypeData = ARCHETYPES[archetypeId];
  const html = await render(
    VideoEmail({
      archetypeLabel: archetypeData?.destinationLabel ?? archetypeData?.label ?? archetype,
      archetypeIcon:  archetypeData?.icon ?? "✦",
      videoId:        video.videoId,
      videoTitle:     video.title,
      channelName:    video.channelName,
      thumbnailUrl:   video.thumbnailUrl,
      viewCount:      video.viewCount,
      frequency:      "weekly",
      unsubscribeUrl: "https://projectprofound.org/unsubscribe?token=preview",
      introText:      tpl?.intro_text ?? undefined,
      ctaText:        tpl?.cta_text ?? "Watch this story →",
      profileReport:  tpl?.profile_report ?? undefined,
    })
  );

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": "frame-ancestors 'self'", "X-Frame-Options": "SAMEORIGIN" },
  });
}
