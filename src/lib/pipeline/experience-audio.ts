/**
 * Experience Audio Generation Pipeline
 *
 * Generates ambient music loops via ElevenLabs Sound Effects API.
 * Uploads to Supabase Storage (media/audio/experiences/).
 *
 * Generates 30s MP3 loops at 128kbps, kept under 500KB per file.
 *
 * Usage:
 *   const result = await generateExperienceAudio(
 *     'Sterile hospital ambiance with distant beeping monitors and quiet ventilation',
 *     'audio/experiences/penny/hospital-ambient.mp3'
 *   );
 */

import { createClient } from '@supabase/supabase-js';

// ─── Clients ─────────────────────────────────────────────────────────

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase environment variables');
  return createClient(url, key);
}

// ─── ElevenLabs Sound Effects API ────────────────────────────────────

interface ElevenLabsSoundEffectResponse {
  audio_base64?: string;
}

/**
 * Generate ambient audio using ElevenLabs Sound Effects API.
 * Returns the raw audio buffer as an ArrayBuffer.
 *
 * API docs: https://elevenlabs.io/docs/api-reference/sound-generation
 */
async function generateWithElevenLabs(
  prompt: string,
  durationSeconds: number = 30,
): Promise<ArrayBuffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('Missing ELEVENLABS_API_KEY');

  const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: prompt,
      duration_seconds: durationSeconds,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`ElevenLabs SFX API error ${response.status}: ${errorBody}`);
  }

  // The API returns raw audio bytes (MP3)
  return response.arrayBuffer();
}

// ─── Storage Upload ──────────────────────────────────────────────────

async function uploadAudio(audioBuffer: ArrayBuffer, storagePath: string): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.storage
    .from('media')
    .upload(storagePath, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    });

  if (error) throw new Error(`Audio upload failed: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(storagePath);
  return publicUrl;
}

// ─── Main Exported Function ──────────────────────────────────────────

export interface GeneratedAudio {
  publicUrl: string;
  prompt: string;
  durationSeconds: number;
}

/**
 * Generate an ambient audio loop and upload it to storage.
 *
 * @param prompt - Descriptive prompt for the sound (e.g., "gentle ethereal chimes with warm pad")
 * @param storagePath - Path in Supabase media bucket
 * @param durationSeconds - Duration in seconds (default: 30)
 */
export async function generateExperienceAudio(
  prompt: string,
  storagePath: string,
  durationSeconds: number = 30,
): Promise<GeneratedAudio> {
  console.log(`[experience-audio] Generating ${durationSeconds}s ambient: "${prompt.slice(0, 60)}..."`);

  const audioBuffer = await generateWithElevenLabs(prompt, durationSeconds);
  const publicUrl = await uploadAudio(audioBuffer, storagePath);

  console.log(`[experience-audio] ✓ Uploaded to ${storagePath} (${(audioBuffer.byteLength / 1024).toFixed(0)}KB)`);

  return { publicUrl, prompt, durationSeconds };
}
