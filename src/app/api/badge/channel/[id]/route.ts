import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// ─── Client ─────────────────────────────────────────────────────────────────

function buildClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCount(n: number | null): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─── Route Handler ──────────────────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = buildClient();

  const [channelRes, scoresRes] = await Promise.all([
    supabase
      .from("uap_channels")
      .select("channel_id, channel_name, video_count")
      .eq("channel_id", id)
      .single(),
    supabase
      .from("uap_channel_scores")
      .select("letter_grade, archetype_primary")
      .eq("channel_id", id)
      .single(),
  ]);

  const channel = channelRes.data;
  const scores = scoresRes.data;

  if (!channel) {
    return new NextResponse("Channel not found", { status: 404 });
  }

  const name = escapeXml(channel.channel_name ?? "Unknown Channel");
  const videoCount = formatCount(channel.video_count);
  const grade = escapeXml(scores?.letter_grade ?? "—");
  const archetype = escapeXml(scores?.archetype_primary ?? "Unclassified");

  // Shields.io-style flat badge with 4 segments
  const segments = [
    { text: "Project Profound", bg: "#0f172a", color: "#94a3b8" },
    { text: `${videoCount} Videos`, bg: "#1e293b", color: "#e2e8f0" },
    { text: `Authority: ${grade}`, bg: "#166534", color: "#bbf7d0" },
    { text: archetype, bg: "#15803d", color: "#dcfce7" },
  ];

  // Calculate segment widths (roughly 7.5px per char + 20px padding)
  const charWidth = 7.2;
  const padding = 20;
  const segmentWidths = segments.map(
    (s) => s.text.length * charWidth + padding,
  );
  const totalWidth = segmentWidths.reduce((a, b) => a + b, 0);
  const height = 22;

  let x = 0;
  const rects: string[] = [];
  const texts: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const w = segmentWidths[i];

    // Rounded corners on first/last segment
    const isFirst = i === 0;
    const isLast = i === segments.length - 1;
    const rx = isFirst || isLast ? 4 : 0;

    if (isFirst) {
      rects.push(
        `<rect x="${x}" y="0" width="${w}" height="${height}" fill="${seg.bg}" rx="${rx}" />`,
      );
    } else if (isLast) {
      rects.push(
        `<rect x="${x}" y="0" width="${w}" height="${height}" fill="${seg.bg}" rx="${rx}" />`,
      );
    } else {
      rects.push(
        `<rect x="${x}" y="0" width="${w}" height="${height}" fill="${seg.bg}" />`,
      );
    }

    texts.push(
      `<text x="${x + w / 2}" y="15" fill="${seg.color}" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle">${escapeXml(seg.text)}</text>`,
    );

    x += w;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${name} — Project Profound Channel Badge">
  <title>${name} — Project Profound Channel Badge</title>
  <clipPath id="r"><rect width="${totalWidth}" height="${height}" rx="4" /></clipPath>
  <g clip-path="url(#r)">
    ${rects.join("\n    ")}
  </g>
  ${texts.join("\n  ")}
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
