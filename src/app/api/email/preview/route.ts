// GET /api/email/preview?archetype=griever
// Returns the rendered HTML of the VideoEmail template for preview in an iframe.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VideoEmail } from "@/lib/email/templates/VideoEmail";
import { ARCHETYPES } from "@/lib/quiz/archetypes";
import { render } from "@react-email/render";
import type { ArchetypeId } from "@/lib/quiz/archetypes";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const archetype = (req.nextUrl.searchParams.get("archetype") ?? "griever") as ArchetypeId;

  // Pick any video for this archetype (ignore dedup for preview)
  const { data: videoRows } = await supabase.rpc("pick_video_for_archetype", {
    p_archetype: archetype,
    p_lead_id:   "00000000-0000-0000-0000-000000000000",
  });

  const video = videoRows?.[0] ?? {
    videoId:      "preview",
    title:        "Sample NDE Account — A Journey Through Light",
    channelName:  "Project Profound",
    thumbnailUrl: null,
    viewCount:    125000,
  };

  // Load custom template copy from DB
  const { data: tpl } = await supabase
    .from("email_templates")
    .select("*")
    .eq("archetype", archetype)
    .single();

  const archetypeData = ARCHETYPES[archetype];
  const html = await render(
    VideoEmail({
      archetypeLabel: archetypeData?.label ?? archetype,
      archetypeIcon:  archetypeData?.icon ?? "✦",
      videoId:        video.videoId,
      videoTitle:     tpl?.intro_text
        ? `${video.title}`
        : video.title,
      channelName:    video.channelName,
      thumbnailUrl:   video.thumbnailUrl,
      viewCount:      video.viewCount,
      frequency:      "weekly",
      unsubscribeUrl: "https://projectprofound.org/unsubscribe?token=preview",
      // pass template customizations if VideoEmail supports them
      introText:      tpl?.intro_text ?? undefined,
      ctaText:        tpl?.cta_text ?? "Watch this story →",
    })
  );

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
