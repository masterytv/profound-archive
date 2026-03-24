/**
 * Asset Registry
 *
 * Maps asset keys from PhaseConfig to actual URLs.
 * Phase 1: Uses AI-generated images stored in /public/experiences/penny/ (WebP).
 * Audio assets remain as Supabase Storage placeholders until generated.
 */

const STORAGE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.trim()}/storage/v1/object/public/media`
  : '';

/**
 * Asset map: Key = config asset_key, Value = public URL or local path
 */
const assets: Record<string, string> = {
  // ── Penny's NDE Background Images (AI-generated, WebP compressed) ──
  'bg-hospital-hallway': '/experiences/penny/bg-hospital-hallway.webp',
  'bg-obe-operating-room': '/experiences/penny/bg-obe-operating-room.webp',
  'bg-tunnel-void': '/experiences/penny/bg-tunnel-void.webp',
  'bg-realm-grandmother': '/experiences/penny/bg-realm-grandmother.webp',
  'bg-life-review': '/experiences/penny/bg-life-review.webp',
  'bg-return-light': '/experiences/penny/bg-return-light.webp',

  // ── Audio (Supabase Storage — to be generated via ElevenLabs) ──
  'audio-hospital-ambient': `${STORAGE_BASE}/audio/experiences/penny/hospital-ambient.mp3`,
  'audio-obe-flatline': `${STORAGE_BASE}/audio/experiences/penny/obe-flatline.mp3`,
  'audio-obe-doctors-talking': `${STORAGE_BASE}/audio/experiences/penny/obe-doctors-talking.mp3`,
  'audio-void-tunnel': `${STORAGE_BASE}/audio/experiences/penny/void-tunnel.mp3`,
  'audio-realm-ethereal': `${STORAGE_BASE}/audio/experiences/penny/realm-angelic-choir.mp3`,
  'audio-return-heartbeat': `${STORAGE_BASE}/audio/experiences/penny/return-heartbeat.mp3`,

  // ── Voice Lines (Supabase Storage — to be generated via ElevenLabs TTS) ──
  'voice-grandmother': `${STORAGE_BASE}/audio/experiences/penny/voice-grandmother.mp3`,
  'voice-being-of-light': `${STORAGE_BASE}/audio/experiences/penny/voice-being-of-light.mp3`,
};

/**
 * Resolve an asset key to a URL.
 * Returns a dark gradient placeholder for missing/unknown assets.
 */
export function resolveAsset(key: string): string {
  const url = assets[key];
  if (url) return url;

  console.warn(`[experience] Missing asset: ${key}`);
  return 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">`
    + `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">`
    + `<stop offset="0%" stop-color="#0a0a1e"/>`
    + `<stop offset="100%" stop-color="#1a1a3e"/>`
    + `</linearGradient></defs>`
    + `<rect width="100%" height="100%" fill="url(#g)"/>`
    + `<text x="50%" y="50%" text-anchor="middle" fill="#666" font-size="24">${key}</text>`
    + `</svg>`,
  );
}
