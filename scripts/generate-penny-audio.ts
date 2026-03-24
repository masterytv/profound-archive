#!/usr/bin/env npx tsx
/**
 * Generate Penny's NDE Audio Assets
 *
 * Generates 3 ambient loops (ElevenLabs SFX) + 2 TTS voice lines (ElevenLabs TTS)
 * and uploads them to Supabase Storage (media bucket).
 *
 * Usage:
 *   npx tsx scripts/generate-penny-audio.ts
 *
 * Requires: ELEVENLABS_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local from project root
config({ path: resolve(process.cwd(), '.env.local') });

import { generateExperienceAudio } from '../src/lib/pipeline/experience-audio';
import { generateVoiceLine, BEING_VOICES } from '../src/lib/pipeline/experience-tts';

// ─── Asset Definitions ───────────────────────────────────────────────

const AMBIENT_LOOPS = [
  {
    prompt: 'Sterile hospital ambiance with distant beeping monitors, quiet ventilation hum, and soft fluorescent buzz',
    storagePath: 'audio/experiences/penny/hospital-ambient.mp3',
    durationSeconds: 30,
  },
  {
    prompt: 'Warm ethereal atmosphere with gentle celestial chimes, soft resonant pads, and a distant choir-like hum',
    storagePath: 'audio/experiences/penny/realm-ethereal.mp3',
    durationSeconds: 30,
  },
  {
    prompt: 'Slow heartbeat rhythm growing stronger with warm low-frequency pulse and gentle breath-like whoosh',
    storagePath: 'audio/experiences/penny/return-heartbeat.mp3',
    durationSeconds: 30,
  },
];

const VOICE_LINES = [
  {
    text: 'You are in transition between life and death. You are safe. You are loved.',
    voiceId: BEING_VOICES.grandmother.voiceId,
    storagePath: 'audio/experiences/penny/voice-grandmother.mp3',
    stability: BEING_VOICES.grandmother.stability,
    similarityBoost: BEING_VOICES.grandmother.similarityBoost,
  },
  {
    text: 'Every act of kindness ripples outward. Your thoughts have power. Forgive, and free the energy trapped within you.',
    voiceId: BEING_VOICES.beingOfLight.voiceId,
    storagePath: 'audio/experiences/penny/voice-being-of-light.mp3',
    stability: BEING_VOICES.beingOfLight.stability,
    similarityBoost: BEING_VOICES.beingOfLight.similarityBoost,
  },
];

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('🎵 Penny NDE Audio Generation Pipeline\n');
  console.log('━'.repeat(60));

  // Validate env
  const missing = [];
  if (!process.env.ELEVENLABS_API_KEY) missing.push('ELEVENLABS_API_KEY');
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!process.env.SUPABASE_SERVICE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    missing.push('SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY');
  }
  if (missing.length > 0) {
    console.error(`❌ Missing env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  const results: { asset: string; url: string; size: string }[] = [];

  // ── Generate Ambient Loops ──
  console.log('\n🔊 Generating Ambient Loops (ElevenLabs SFX)\n');

  for (const loop of AMBIENT_LOOPS) {
    try {
      const result = await generateExperienceAudio(
        loop.prompt,
        loop.storagePath,
        loop.durationSeconds,
      );
      results.push({
        asset: loop.storagePath,
        url: result.publicUrl,
        size: '~',
      });
      console.log(`   ✅ ${loop.storagePath}\n`);
    } catch (err) {
      console.error(`   ❌ ${loop.storagePath}: ${err instanceof Error ? err.message : err}\n`);
    }
  }

  // ── Generate TTS Voice Lines ──
  console.log('\n🗣️  Generating TTS Voice Lines (ElevenLabs TTS)\n');

  for (const voice of VOICE_LINES) {
    try {
      const result = await generateVoiceLine(voice);
      results.push({
        asset: voice.storagePath,
        url: result.publicUrl,
        size: `${result.characterCount} chars`,
      });
      console.log(`   ✅ ${voice.storagePath}\n`);
    } catch (err) {
      console.error(`   ❌ ${voice.storagePath}: ${err instanceof Error ? err.message : err}\n`);
    }
  }

  // ── Summary ──
  console.log('\n' + '━'.repeat(60));
  console.log(`\n📊 Results: ${results.length}/5 assets generated\n`);
  for (const r of results) {
    console.log(`   ${r.asset}`);
    console.log(`   → ${r.url}\n`);
  }

  if (results.length < 5) {
    console.log(`\n⚠️  ${5 - results.length} asset(s) failed. Check errors above.`);
    process.exit(1);
  }

  console.log('\n✅ All audio assets generated and uploaded successfully!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
