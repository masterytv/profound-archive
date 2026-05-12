/**
 * UAP Video Stats Computation Utility
 *
 * Pure function that extracts aggregate stats from program_intel_breakdown JSONB
 * and writes to the uap_video_stats table for fast dashboard/filter queries.
 *
 * Called by intake-uap.ts after each analysis completes.
 * Stats table avoids unpacking JSONB on every query — critical for the
 * 365 Facts engine and admin dashboards operating over 5,000+ videos.
 */

import type { UapProgramIntelResult } from '@/lib/ai/uap-program-intel';

export interface VideoStatsRow {
  video_id: string;
  persons_count: number;
  organizations_count: number;
  programs_count: number;
  claims_count: number;
  locations_count: number;
  technologies_count: number;
  psi_mentions_count: number;
  legislative_events_count: number;
  secrecy_mechanisms_count: number;
  has_psi_content: boolean;
  has_craft_observation: boolean;
  has_biologics_claim: boolean;
  has_crash_retrieval_claim: boolean;
  has_under_oath_claims: boolean;
  video_tone: string | null;
  intelligence_value: number | null;
  encounter_count?: number;
  dominant_entity_type?: string;
  max_evidence_score?: number;
  max_contact_depth_score?: number;
  max_transformation_score?: number;
  computed_at: string;
}

/**
 * Compute aggregate stats from a UapProgramIntelResult.
 * All fields derived deterministically from the structured extraction output.
 */
export function computeVideoStats(
  videoId: string,
  intel: UapProgramIntelResult
): VideoStatsRow {
  const claims = intel.claims ?? [];

  return {
    video_id: videoId,

    // Entity counts — direct array lengths
    persons_count: (intel.persons ?? []).length,
    organizations_count: (intel.organizations ?? []).length,
    programs_count: (intel.programs ?? []).length,
    claims_count: claims.length,
    locations_count: (intel.locations ?? []).length,
    technologies_count: (intel.technologies ?? []).length,
    psi_mentions_count: (intel.psi_consciousness ?? []).length,
    legislative_events_count: (intel.legislative_events ?? []).length,
    secrecy_mechanisms_count: (intel.secrecy_mechanisms ?? []).length,

    // Boolean flags — scan claims for specific categories
    has_psi_content: (intel.psi_consciousness ?? []).length > 0,
    has_craft_observation: false, // Will be set by encounter-level analysis
    has_biologics_claim: claims.some(c => c.category === 'biologics'),
    has_crash_retrieval_claim: claims.some(c => c.category === 'crash_retrieval'),
    has_under_oath_claims: claims.some(c => c.under_oath === true),

    // Video-level classification
    video_tone: intel.video_tone ?? null,
    intelligence_value: intel.intelligence_value ?? null,

    // Encounter-level fields left unset — populated separately after phenomenology
    computed_at: new Date().toISOString(),
  };
}

/**
 * Merge encounter-level aggregates into an existing stats row.
 * Called after phenomenology + triad analysis completes for Tier 1 videos.
 */
export function mergeEncounterStats(
  base: Partial<VideoStatsRow>,
  encounterData: {
    encounterCount: number;
    dominantEntityType: string | null;
    maxEvidenceScore: number | null;
    maxContactDepthScore: number | null;
    maxTransformationScore: number | null;
    hasCraftObservation: boolean;
  }
): Partial<VideoStatsRow> {
  return {
    ...base,
    encounter_count: encounterData.encounterCount,
    dominant_entity_type: encounterData.dominantEntityType ?? undefined,
    max_evidence_score: encounterData.maxEvidenceScore ?? undefined,
    max_contact_depth_score: encounterData.maxContactDepthScore ?? undefined,
    max_transformation_score: encounterData.maxTransformationScore ?? undefined,
    has_craft_observation: encounterData.hasCraftObservation,
    computed_at: new Date().toISOString(),
  };
}
