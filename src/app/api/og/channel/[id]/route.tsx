import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

// ─── Client ─────────────────────────────────────────────────────────────────

function buildClient() {
  // Use service role key on server if available to bypass RLS
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
  );
}

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3001';
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCount(n: number | null): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ─── Route Handler ──────────────────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = buildClient();

  // Convert local logo to base64 data URL so Satori doesn't need to fetch it over HTTP
  let logoBase64: string | undefined = undefined;
  try {
    const logoPath = path.join(process.cwd(), "public", "logo-new-light.png");
    const logoBuffer = fs.readFileSync(logoPath);
    logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
  } catch (err) {
    console.error("[OG Channel Route] Failed to read logo file:", err);
  }

  // Fetch channel + scores in parallel
  const [channelRes, scoresRes] = await Promise.all([
    supabase
      .from("uap_channels")
      .select("channel_id, channel_name, avatar_url, subscriber_count, video_count")
      .eq("channel_id", id)
      .single(),
    supabase
      .from("uap_channel_scores")
      .select(
        "intelligence_value, credibility_score, letter_grade, archetype_primary, personality_code",
      )
      .eq("channel_id", id)
      .single(),
  ]);

  const channel = channelRes.data;
  const scores = scoresRes.data;

  if (!channel) {
    return new Response("Channel not found", { status: 404 });
  }

  const letterGrade = scores?.letter_grade ?? "—";
  const archetype = scores?.archetype_primary ?? "Unclassified";
  const personalityCode = scores?.personality_code ?? "—";
  const intelligenceValue =
    scores?.intelligence_value != null
      ? Number(scores.intelligence_value).toFixed(1)
      : "—";
  const credibilityScore =
    scores?.credibility_score != null
      ? Number(scores.credibility_score).toFixed(1)
      : "—";

  // Why JSX → ImageResponse: next/og renders JSX to a PNG at the edge.
  // This image becomes the og:image for social sharing previews.
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#0f172a",
          padding: "48px 56px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top row: Avatar + Channel Name + Grade */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            marginBottom: "32px",
          }}
        >
          {/* Avatar */}
          {channel.avatar_url ? (
            <img
              src={channel.avatar_url}
              width={80}
              height={80}
              style={{
                borderRadius: "50%",
                border: "3px solid #22c55e",
              }}
            />
          ) : (
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 36,
                fontWeight: 800,
                color: "white",
              }}
            >
              {channel.channel_name?.charAt(0) ?? "?"}
            </div>
          )}

          {/* Channel name */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: "#f8fafc",
                lineHeight: 1.1,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {channel.channel_name}
            </div>
            <div
              style={{
                fontSize: 16,
                color: "#22c55e",
                marginTop: 6,
                fontWeight: 600,
              }}
            >
              {archetype}
            </div>
          </div>

          {/* Letter grade */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "12px 24px",
              borderRadius: 16,
              background: "rgba(34, 197, 94, 0.15)",
              border: "2px solid rgba(34, 197, 94, 0.3)",
            }}
          >
            <div
              style={{
                fontSize: 48,
                fontWeight: 900,
                color: "#22c55e",
                lineHeight: 1,
              }}
            >
              {letterGrade}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#94a3b8",
                marginTop: 4,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Authority
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          {[
            { label: "Videos", value: formatCount(channel.video_count) },
            {
              label: "Subscribers",
              value: formatCount(channel.subscriber_count),
            },
            { label: "Intelligence", value: intelligenceValue },
            { label: "Credibility", value: credibilityScore },
            { label: "Type Code", value: personalityCode },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flex: 1,
                padding: "16px 8px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: "#f8fafc",
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#64748b",
                  marginTop: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Spacer + Footer */}
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logoBase64 && (
              <img
                src={logoBase64}
                alt="Project Profound"
                width={200}
                height={47}
                style={{ objectFit: "contain" }}
              />
            )}
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#475569",
            }}
          >
            projectprofound.org/uap/channels
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
