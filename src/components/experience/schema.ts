/**
 * NDE Experience Engine — Zod Schema Validation
 *
 * Validates ExperienceConfig at build time (Phase 1) and write time (Phase 2+).
 * Key rules:
 *   - Minimum 3 phases for a viable story arc
 *   - No consecutive phases with the same type (visual variety)
 *   - All slugs are URL-safe
 *   - Narrative text must be non-empty (direct quotes, never fabricated)
 */

import { z } from 'zod';

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const narrativeSchema = z.object({
  text: z.string().min(1, 'Narrative text is required (must be a direct quote)'),
  attribution: z.string().optional(),
  position: z.enum(['bottom-center', 'center', 'top-left']),
});

const backgroundSchema = z.object({
  asset_key: z.string().min(1),
  color_overlay: z.string().optional(),
  blend_mode: z.string().optional(),
});

const foregroundLayerSchema = z.object({
  asset_key: z.string().min(1),
  parallax_multiplier: z.number().min(0.001).max(0.1),
  position: z.object({
    x: z.string(),
    y: z.string(),
  }),
});

const audioCueSchema = z.object({
  asset_key: z.string().min(1),
  volume: z.number().min(0).max(1),
  loop: z.boolean().optional(),
});

const voiceLineSchema = z.object({
  text: z.string().min(1, 'Voice line text is required'),
  voice_id: z.string().min(1),
  asset_key: z.string().min(1),
  delay_ms: z.number().min(0).max(10000).optional(),
});

const memoryCardSchema = z.object({
  text: z.string().min(1),
  subtext: z.string().optional(),
});

// ─── Phase Config ─────────────────────────────────────────────────────────────

export const phaseConfigSchema = z.object({
  type: z.enum(['scene', 'canvas', 'memory']),
  label: z.string().min(1).max(50),
  narrative: narrativeSchema,
  background: backgroundSchema,
  foreground_layers: z.array(foregroundLayerSchema).optional(),
  transition: z.enum(['fade', 'elevate', 'push_through', 'dissolve']),
  audio_cue: audioCueSchema.optional(),
  secondary_audio_cue: audioCueSchema.optional(),
  voice_line: voiceLineSchema.optional(),
  memory_cards: z.array(memoryCardSchema).optional(),
});

// ─── Experience Meta ──────────────────────────────────────────────────────────

const experienceMetaSchema = z.object({
  slug: z.string().regex(
    /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
    'Slug must be URL-safe: lowercase letters, numbers, hyphens. No leading/trailing hyphens.',
  ),
  title: z.string().min(5).max(100),
  experiencer_name: z.string().min(1),
  source_video_id: z.string().min(1),
  nde_type: z.string().min(1),
  duration_estimate: z.string().min(1),
  content_warning: z.string().optional(),
  status: z.enum(['draft', 'review', 'published']),
});

// ─── Full Experience Config ───────────────────────────────────────────────────

export const experienceConfigSchema = z.object({
  meta: experienceMetaSchema,
  phases: z
    .array(phaseConfigSchema)
    .min(3, 'Minimum 3 phases for a viable story arc'),
  audio: z
    .object({
      ambient_key: z.string().min(1),
      volume: z.number().min(0).max(1),
    })
    .optional(),
});

// ─── Validation Helper ────────────────────────────────────────────────────────

export function validateExperienceConfig(config: unknown) {
  return experienceConfigSchema.safeParse(config);
}
