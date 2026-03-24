/**
 * Experience TTS Pipeline — Being Voices
 *
 * Generates speech for NDE beings (grandmother, God/Being of Light)
 * using ElevenLabs Text-to-Speech API. Pre-generates audio at build
 * time, uploads to Supabase Storage.
 *
 * The voiced lines come from direct transcript quotes only.
 *
 * Usage:
 *   const result = await generateVoiceLine({
 *     text: 'You are in transition between life and death.',
 *     voiceId: 'XB0fDUnXU5powFXDhCwa',  // Charlotte
 *     storagePath: 'audio/experiences/penny/voice-grandmother.mp3',
 *   });
 */

import { createClient } from '@supabase/supabase-js';

// ─── Clients ─────────────────────────────────────────────────────────

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase environment variables');
  return createClient(url, key);
}

// ─── ElevenLabs TTS API ──────────────────────────────────────────────

interface TTSOptions {
  /** The text to speak */
  text: string;
  /** ElevenLabs voice ID */
  voiceId: string;
  /** Speaking style (stability + similarity) */
  stability?: number;
  /** Higher = more expressive */
  similarityBoost?: number;
  /** Model to use (default: eleven_multilingual_v2) */
  model?: string;
}

/**
 * Generate speech audio using ElevenLabs TTS API.
 * Returns raw audio bytes (MP3).
 */
async function generateTTS(options: TTSOptions): Promise<ArrayBuffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('Missing ELEVENLABS_API_KEY');

  const {
    text,
    voiceId,
    stability = 0.5,
    similarityBoost = 0.75,
    model = 'eleven_multilingual_v2',
  } = options;

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`ElevenLabs TTS error ${response.status}: ${errorBody}`);
  }

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

  if (error) throw new Error(`TTS upload failed: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(storagePath);
  return publicUrl;
}

// ─── Preset Voice Profiles ──────────────────────────────────────────

/**
 * Curated voice profiles for NDE beings.
 * Voice IDs come from the ElevenLabs voice library.
 *
 * To browse voices: https://elevenlabs.io/voice-library
 * To list your available voices: GET /v1/voices
 */
export const BEING_VOICES = {
  /** Warm female, older — for grandmother/mother figures */
  grandmother: {
    voiceId: 'XB0fDUnXU5powFXDhCwa', // Charlotte (calm, warm)
    stability: 0.55,
    similarityBoost: 0.7,
  },
  /** Deep, resonant — for God/Being of Light/guides */
  beingOfLight: {
    voiceId: 'onwK4e9ZLuTAKqWW03F9', // Daniel (authoritative, warm)
    stability: 0.45,
    similarityBoost: 0.8,
  },
} as const;

// ─── Main Exported Function ──────────────────────────────────────────

export interface GeneratedVoiceLine {
  publicUrl: string;
  text: string;
  voiceId: string;
  characterCount: number;
}

interface VoiceLineInput {
  /** The being's spoken words (direct quote from transcript) */
  text: string;
  /** ElevenLabs voice ID */
  voiceId: string;
  /** Path in Supabase media bucket */
  storagePath: string;
  /** Voice tuning (optional) */
  stability?: number;
  similarityBoost?: number;
}

/**
 * Generate a being's voice line and upload it to storage.
 *
 * @param input - Voice line parameters
 */
export async function generateVoiceLine(input: VoiceLineInput): Promise<GeneratedVoiceLine> {
  const { text, voiceId, storagePath, stability, similarityBoost } = input;

  console.log(`[experience-tts] Generating voice: "${text.slice(0, 50)}..." (voice: ${voiceId})`);

  const audioBuffer = await generateTTS({
    text,
    voiceId,
    stability,
    similarityBoost,
  });

  const publicUrl = await uploadAudio(audioBuffer, storagePath);

  console.log(`[experience-tts] ✓ Uploaded to ${storagePath} (${(audioBuffer.byteLength / 1024).toFixed(0)}KB, ${text.length} chars)`);

  return {
    publicUrl,
    text,
    voiceId,
    characterCount: text.length,
  };
}
