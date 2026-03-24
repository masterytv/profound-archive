/**
 * Experience Image Generation Pipeline
 *
 * Generates 3 tiers of oil painting images via fal.ai FLUX.1 [dev]:
 *   - PRE-TUNNEL: muted, desaturated (earthly)
 *   - POST-TUNNEL: hyper-vivid, luminous ("more real than real")
 *   - RETURN: muted with fading golden afterglow
 *
 * Reuses the same fal.ai pattern as blog-image.ts and blog-story.ts.
 * Images are generated at 16:9 landscape, uploaded to Supabase Storage.
 *
 * Usage:
 *   import { generateExperienceImage, VibrancyTier } from './experience-image';
 *   const result = await generateExperienceImage(
 *     'A hospital hallway, fluorescent lights, a figure on a gurney',
 *     'pre-tunnel',
 *     'experiences/penny/bg-hospital-hallway'
 *   );
 */

import { createClient } from '@supabase/supabase-js';

// ─── Vibrancy Tiers ──────────────────────────────────────────────────

export type VibrancyTier = 'pre-tunnel' | 'post-tunnel' | 'return';

const IMAGE_STYLE_BASE = [
  'Oil painting on heavy woven canvas.',
  'Thick directional impasto brushstrokes, each individual stroke clearly visible with raised paint texture.',
  'No visible faces. No text, letters, words, or watermarks.',
  'No photorealism. No smooth gradients. No sharp digital edges.',
  'Pure oil painting with visible canvas weave. Museum quality fine art.',
].join(' ');

const VIBRANCY_PROMPTS: Record<VibrancyTier, string> = {
  'pre-tunnel': [
    'Muted, desaturated palette. Prussian blue, grey-blue, cool slate.',
    'Minimal warm accents. Heavy atmospheric haze. Subdued emotional tone.',
    'Low saturation. The world feels flat, clinical, distant.',
  ].join(' '),

  'post-tunnel': [
    'Hyper-vivid, luminous palette. Deep cobalt blue with brilliant cadmium yellow light.',
    'Colors more saturated than reality. Luminous inner glow emanating from surfaces.',
    'Transcendent atmosphere. Richest possible color depth. Every hue at maximum purity.',
    'Warm golden light, cadmium yellow, pale amber transitioning to cobalt blue and ultramarine at edges.',
    'Deep prussian blue in shadows. Ethereal quality.',
  ].join(' '),

  'return': [
    'Muted palette returning from vivid. Slight warm afterglow remains.',
    'Desaturated earth tones with fading golden warmth at edges.',
    'A sense of fading luminosity. Colors retreating. Bittersweet tone.',
  ].join(' '),
};

// ─── Build Full Prompt ───────────────────────────────────────────────

export function buildExperienceImagePrompt(
  sceneDescription: string,
  vibrancy: VibrancyTier,
): string {
  return [
    IMAGE_STYLE_BASE,
    `Subject: ${sceneDescription}.`,
    VIBRANCY_PROMPTS[vibrancy],
  ].join(' ');
}

// ─── fal.ai Generation ───────────────────────────────────────────────

interface FalResponse {
  images?: Array<{ url: string; width: number; height: number }>;
}

async function generateWithFal(prompt: string): Promise<{ url: string; width: number; height: number }> {
  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) throw new Error('Missing FAL_API_KEY');

  const submitRes = await fetch('https://queue.fal.run/fal-ai/flux/dev', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      image_size: 'landscape_16_9',
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      enable_safety_checker: true,
    }),
  });

  if (!submitRes.ok) throw new Error(`fal.ai submit error ${submitRes.status}`);

  const { request_id, status_url } = await submitRes.json() as { request_id: string; status_url: string };

  // Poll for completion (max 3 minutes)
  for (let i = 0; i < 36; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const pollRes = await fetch(
      status_url ?? `https://queue.fal.run/fal-ai/flux/dev/requests/${request_id}`,
      { headers: { 'Authorization': `Key ${apiKey}` } },
    );
    if (!pollRes.ok) continue;
    const pollData = await pollRes.json() as { status: string; response_url?: string };
    if (pollData.status === 'COMPLETED' && pollData.response_url) {
      const resultRes = await fetch(pollData.response_url, {
        headers: { 'Authorization': `Key ${apiKey}` },
      });
      const result = await resultRes.json() as FalResponse;
      const img = result.images?.[0];
      if (!img) throw new Error('fal.ai returned no images');
      return img;
    }
    if (pollData.status === 'FAILED') throw new Error('fal.ai generation failed');
  }
  throw new Error('fal.ai timed out');
}

// ─── Storage Upload ──────────────────────────────────────────────────

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase environment variables');
  return createClient(url, key);
}

async function uploadToStorage(imageUrl: string, storagePath: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) throw new Error(`Failed to fetch image: ${imageRes.status}`);
  const imageBuffer = await imageRes.arrayBuffer();

  const contentType = imageUrl.includes('.webp') ? 'image/webp'
    : imageUrl.includes('.png') ? 'image/png'
    : 'image/jpeg';

  const { error } = await supabase.storage
    .from('media')
    .upload(storagePath, imageBuffer, { contentType, upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(storagePath);
  return publicUrl;
}

// ─── Main Exported Function ──────────────────────────────────────────

export interface GeneratedImage {
  publicUrl: string;
  prompt: string;
  vibrancy: VibrancyTier;
}

/**
 * Generate a single experience background image.
 *
 * @param sceneDescription - What to depict (e.g., "Hospital hallway with fluorescent lights")
 * @param vibrancy - Color tier: pre-tunnel (muted), post-tunnel (vivid), return (fading)
 * @param storagePath - Path in Supabase media bucket (e.g., "experiences/penny/bg-hospital-hallway.webp")
 */
export async function generateExperienceImage(
  sceneDescription: string,
  vibrancy: VibrancyTier,
  storagePath: string,
): Promise<GeneratedImage> {
  const prompt = buildExperienceImagePrompt(sceneDescription, vibrancy);
  console.log(`[experience-image] Generating ${vibrancy} image: "${sceneDescription.slice(0, 60)}..."`);

  const generated = await generateWithFal(prompt);
  const publicUrl = await uploadToStorage(generated.url, storagePath);

  console.log(`[experience-image] ✓ Uploaded to ${storagePath}`);

  return { publicUrl, prompt, vibrancy };
}
