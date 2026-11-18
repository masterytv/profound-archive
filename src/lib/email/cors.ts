// src/lib/email/cors.ts
// Which other sites may post a newsletter sign-up to /api/quiz-lead: the Soul Wisdom Collective site, whose
// sign-up form joins PP's one list (marketing plan step 3, Tom 2026-11-18), its staging site, and local dev.
// Extra origins can be added with NEWSLETTER_ALLOWED_ORIGINS (comma-separated).

const DEFAULT_ORIGINS = [
  "https://soulwisdomcollective.com",
  "https://www.soulwisdomcollective.com",
  "https://staging.soulwisdomcollective.com",
  "http://localhost:3000",
];

export function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  const extra = (process.env.NEWSLETTER_ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return [...DEFAULT_ORIGINS, ...extra].includes(origin) ? origin : null;
}

/** CORS headers for a request from an allowed site; none otherwise (the browser then refuses it). */
export function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = allowedOrigin(origin);
  if (!allowed) return {};
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
