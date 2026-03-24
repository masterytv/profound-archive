/**
 * Generate Penny's NDE Audio Assets (Standalone — no project imports)
 * 
 * Uses native fetch to call ElevenLabs + Supabase Storage APIs directly.
 * Runs without node_modules access (bypasses macOS sandbox).
 *
 * Usage: node scripts/generate-penny-audio.mjs
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ─── Load .env.local manually ────────────────────────────────────────
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const ELEVENLABS_KEY = env.ELEVENLABS_API_KEY;
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!ELEVENLABS_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing env vars. Need: ELEVENLABS_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// ─── ElevenLabs Sound Effects ────────────────────────────────────────

async function generateSFX(prompt, durationSeconds = 30) {
  console.log(`   📡 Calling ElevenLabs SFX API (${durationSeconds}s)...`);
  const res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: prompt, duration_seconds: durationSeconds }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => 'Unknown');
    throw new Error(`SFX API ${res.status}: ${body}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

// ─── ElevenLabs TTS ──────────────────────────────────────────────────

async function generateTTS(text, voiceId, stability = 0.5, similarityBoost = 0.75) {
  console.log(`   📡 Calling ElevenLabs TTS API (voice: ${voiceId})...`);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability, similarity_boost: similarityBoost },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => 'Unknown');
    throw new Error(`TTS API ${res.status}: ${body}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

// ─── Supabase Storage Upload ─────────────────────────────────────────

async function uploadToStorage(buffer, storagePath) {
  const url = `${SUPABASE_URL}/storage/v1/object/media/${storagePath}`;
  console.log(`   📤 Uploading to ${storagePath} (${(buffer.length / 1024).toFixed(0)} KB)...`);

  const res = await fetch(url, {
    method: 'PUT',  // upsert
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'audio/mpeg',
      'x-upsert': 'true',
    },
    body: buffer,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => 'Unknown');
    throw new Error(`Storage upload ${res.status}: ${body}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/media/${storagePath}`;
}

// ─── Asset Definitions ───────────────────────────────────────────────

const AMBIENT_LOOPS = [
  {
    name: 'hospital-ambient',
    prompt: 'Sterile hospital ambiance with distant beeping monitors, quiet ventilation hum, and soft fluorescent buzz',
    storagePath: 'audio/experiences/penny/hospital-ambient.mp3',
    durationSeconds: 30,
  },
  {
    name: 'realm-ethereal',
    prompt: 'Warm ethereal atmosphere with gentle celestial chimes, soft resonant pads, and a distant choir-like hum',
    storagePath: 'audio/experiences/penny/realm-ethereal.mp3',
    durationSeconds: 30,
  },
  {
    name: 'return-heartbeat',
    prompt: 'Slow heartbeat rhythm growing stronger with warm low-frequency pulse and gentle breath-like whoosh',
    storagePath: 'audio/experiences/penny/return-heartbeat.mp3',
    durationSeconds: 30,
  },
];

const VOICE_LINES = [
  {
    name: 'voice-grandmother',
    text: 'You are in transition between life and death. You are safe. You are loved.',
    voiceId: 'XB0fDUnXU5powFXDhCwa',  // Charlotte
    storagePath: 'audio/experiences/penny/voice-grandmother.mp3',
    stability: 0.55,
    similarityBoost: 0.7,
  },
  {
    name: 'voice-being-of-light',
    text: 'Every act of kindness ripples outward. Your thoughts have power. Forgive, and free the energy trapped within you.',
    voiceId: 'onwK4e9ZLuTAKqWW03F9',  // Daniel
    storagePath: 'audio/experiences/penny/voice-being-of-light.mp3',
    stability: 0.45,
    similarityBoost: 0.8,
  },
];

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('🎵 Penny NDE Audio Generation Pipeline\n');
  console.log('━'.repeat(60));

  let successCount = 0;

  // Ambient loops
  console.log('\n🔊 Generating Ambient Loops\n');
  for (const loop of AMBIENT_LOOPS) {
    console.log(`\n── ${loop.name} ──`);
    console.log(`   Prompt: "${loop.prompt.slice(0, 70)}..."`);
    try {
      const buffer = await generateSFX(loop.prompt, loop.durationSeconds);
      const publicUrl = await uploadToStorage(buffer, loop.storagePath);
      console.log(`   ✅ Done → ${publicUrl}`);
      successCount++;
    } catch (err) {
      console.error(`   ❌ Failed: ${err.message}`);
    }
  }

  // Voice lines
  console.log('\n\n🗣️  Generating TTS Voice Lines\n');
  for (const voice of VOICE_LINES) {
    console.log(`\n── ${voice.name} ──`);
    console.log(`   Text: "${voice.text.slice(0, 60)}..."`);
    try {
      const buffer = await generateTTS(voice.text, voice.voiceId, voice.stability, voice.similarityBoost);
      const publicUrl = await uploadToStorage(buffer, voice.storagePath);
      console.log(`   ✅ Done → ${publicUrl}`);
      successCount++;
    } catch (err) {
      console.error(`   ❌ Failed: ${err.message}`);
    }
  }

  // Summary
  console.log('\n\n' + '━'.repeat(60));
  console.log(`\n📊 Results: ${successCount}/5 assets generated`);

  if (successCount < 5) {
    console.log(`⚠️  ${5 - successCount} asset(s) failed.`);
    process.exit(1);
  }
  console.log('\n✅ All audio assets generated and uploaded!');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
