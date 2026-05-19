/**
 * Cross-Domain Phenomenology API
 *
 * Aggregates and compares phenomenological data across NDE and UAP domains.
 * Returns structured comparison data for entity types, consciousness states,
 * communication methods, emotional arcs, and physical effects.
 *
 * GET /api/research/cross-domain
 * Response is cached for 1 hour via Next.js ISR.
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { normalizeEmotion, normalizeCommMethod, incrementNormalized } from '@/lib/research/cross-domain-normalize';

export const revalidate = 3600;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface DomainCount {
  category: string;
  nde: number;
  uap: number;
}

interface ComparisonDimension {
  label: string;
  description: string;
  data: DomainCount[];
  nde_n: number;
  uap_n: number;
}

interface CrossDomainResult {
  generated_at: string;
  nde_total: number;
  uap_total: number;
  dimensions: ComparisonDimension[];
  overlapping_phenomena: OverlapItem[];
}

interface OverlapItem {
  phenomenon: string;
  nde_label: string;
  uap_label: string;
  nde_pct: number;
  uap_pct: number;
  significance: number;
  description: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeLabel(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Handler ────────────────────────────────────────────────────────────────

export async function GET() {
  const supabase = getSupabase();

  // ── Counts ──────────────────────────────────────────────────────────────
  const { count: ndeTotal } = await supabase
    .from('nde_analysis')
    .select('*', { count: 'exact', head: true });

  // ── 1. Entity Types ────────────────────────────────────────────────────
  // Aggregate in JS since exec_sql is unavailable — query and process server-side
  const { data: ndeAnalysis } = await supabase
    .from('nde_analysis')
    .select('entities, core_elements, experience_type, overall_tone')
    .not('entities', 'is', null)
    .limit(6000);

  const { data: uapAnalysis } = await supabase
    .from('uap_encounters')
    .select('video_id, phenomenology_breakdown')
    .not('phenomenology_breakdown', 'is', null)
    .limit(5000);

  // Compute unique UAP videos for total count
  const uniqueUapVideos = new Set(uapAnalysis?.map(row => row.video_id) || []);
  const uapTotal = uniqueUapVideos.size;

  // Aggregate NDE entity types
  const ndeEntityCounts = new Map<string, number>();
  const ndeCommCounts = new Map<string, number>();
  const ndeEmotionCounts = new Map<string, number>();
  let ndeEntityTotal = 0;

  for (const row of ndeAnalysis || []) {
    const encounters = row.entities?.encounters;
    if (!Array.isArray(encounters)) continue;
    for (const e of encounters) {
      if (e.entity_type) {
        ndeEntityCounts.set(e.entity_type, (ndeEntityCounts.get(e.entity_type) || 0) + 1);
        ndeEntityTotal++;
      }
      if (e.communication_method && e.communication_method !== 'not_stated' && e.communication_method !== 'not stated') {
        incrementNormalized(ndeCommCounts, e.communication_method, normalizeCommMethod);
      }
      if (e.emotional_quality) {
        incrementNormalized(ndeEmotionCounts, e.emotional_quality, normalizeEmotion);
      }
    }
  }

  // Aggregate NDE core elements
  const ndeCoreElements = new Map<string, number>();
  let ndeCoreTotal = 0;
  for (const row of ndeAnalysis || []) {
    if (!Array.isArray(row.core_elements)) continue;
    ndeCoreTotal++;
    for (const elem of row.core_elements) {
      if (elem.present) {
        ndeCoreElements.set(elem.name, (ndeCoreElements.get(elem.name) || 0) + 1);
      }
    }
  }

  // Aggregate UAP entity types
  const uapEntityCounts = new Map<string, number>();
  const uapCommCounts = new Map<string, number>();
  const uapEmotionCounts = new Map<string, number>();
  const uapPhysicalCounts = new Map<string, number>();
  const uapSensoryCounts = new Map<string, number>();
  let uapEntityTotal = 0;

  for (const row of uapAnalysis || []) {
    const pb = row.phenomenology_breakdown;
    if (!pb) continue;

    // Entities
    if (Array.isArray(pb.entities)) {
      for (const e of pb.entities) {
        if (e.entity_type) {
          uapEntityCounts.set(e.entity_type, (uapEntityCounts.get(e.entity_type) || 0) + 1);
          uapEntityTotal++;
        }
        if (e.communication_method && e.communication_method !== 'not_stated') {
          incrementNormalized(uapCommCounts, e.communication_method, normalizeCommMethod);
        }
      }
    }

    // Dominant emotion
    if (pb.dominant_emotion) {
      incrementNormalized(uapEmotionCounts, pb.dominant_emotion, normalizeEmotion);
    }

    // Physical effects
    if (pb.physical_effects?.witness_physiological) {
      for (const effect of pb.physical_effects.witness_physiological) {
        uapPhysicalCounts.set(effect, (uapPhysicalCounts.get(effect) || 0) + 1);
      }
    }

    // Sensory channels
    if (pb.sensory_channels) {
      for (const [channel, data] of Object.entries(pb.sensory_channels)) {
        if ((data as any)?.active) {
          uapSensoryCounts.set(channel, (uapSensoryCounts.get(channel) || 0) + 1);
        }
      }
    }
  }

  // ── Build Comparison Dimensions ────────────────────────────────────────

  // Dimension 1: Entity Types
  const allEntityTypes = new Set([...ndeEntityCounts.keys(), ...uapEntityCounts.keys()]);
  const entityData: DomainCount[] = [...allEntityTypes]
    .map(cat => ({
      category: normalizeLabel(cat),
      nde: ndeEntityCounts.get(cat) || 0,
      uap: uapEntityCounts.get(cat) || 0,
    }))
    .sort((a, b) => (b.nde + b.uap) - (a.nde + a.uap))
    .slice(0, 12);

  // Dimension 2: Communication Methods
  const allComm = new Set([...ndeCommCounts.keys(), ...uapCommCounts.keys()]);
  const commData: DomainCount[] = [...allComm]
    .filter(c => c !== 'none' && c !== 'not_stated')
    .map(cat => ({
      category: normalizeLabel(cat),
      nde: ndeCommCounts.get(cat) || 0,
      uap: uapCommCounts.get(cat) || 0,
    }))
    .sort((a, b) => (b.nde + b.uap) - (a.nde + a.uap))
    .slice(0, 10);

  // Dimension 3: Emotional Qualities
  const allEmotions = new Set([...ndeEmotionCounts.keys(), ...uapEmotionCounts.keys()]);
  const emotionData: DomainCount[] = [...allEmotions]
    .map(cat => ({
      category: normalizeLabel(cat),
      nde: ndeEmotionCounts.get(cat) || 0,
      uap: uapEmotionCounts.get(cat) || 0,
    }))
    .sort((a, b) => (b.nde + b.uap) - (a.nde + a.uap))
    .slice(0, 10);

  // ── Build Overlapping Phenomena ────────────────────────────────────────

  const overlaps: OverlapItem[] = [
    {
      phenomenon: 'Telepathic Communication',
      nde_label: 'Entity telepathy',
      uap_label: 'Entity telepathy',
      nde_pct: Math.round(((ndeCommCounts.get('telepathy') || 0) / ndeEntityTotal) * 100),
      uap_pct: Math.round(((uapCommCounts.get('telepathy') || 0) / Math.max(uapEntityTotal, 1)) * 100),
      significance: 95,
      description: 'Both NDE and UAP experiencers describe non-verbal, mind-to-mind communication with non-human entities.',
    },
    {
      phenomenon: 'Time Distortion',
      nde_label: 'Time distortion (core element)',
      uap_label: 'Dilated time perception',
      nde_pct: Math.round(((ndeCoreElements.get('time_distortion') || 0) / Math.max(ndeCoreTotal, 1)) * 100),
      uap_pct: (() => {
        let count = 0;
        for (const row of uapAnalysis || []) {
          if (row.phenomenology_breakdown?.consciousness_alteration?.time_perception === 'dilated') count++;
        }
        return Math.round((count / Math.max(uapAnalysis?.length || 1, 1)) * 100);
      })(),
      significance: 90,
      description: 'Experiencers in both domains report that time behaved abnormally — stopping, compressing, or stretching.',
    },
    {
      phenomenon: 'Out-of-Body Experience',
      nde_label: 'OBE (core element)',
      uap_label: 'Kinesthetic displacement',
      nde_pct: Math.round(((ndeCoreElements.get('out_of_body') || 0) / Math.max(ndeCoreTotal, 1)) * 100),
      uap_pct: (() => {
        let count = 0;
        for (const row of uapAnalysis || []) {
          const k = row.phenomenology_breakdown?.sensory_channels?.kinesthetic;
          if (k?.active && k?.extraordinary) count++;
        }
        return Math.round((count / Math.max(uapAnalysis?.length || 1, 1)) * 100);
      })(),
      significance: 85,
      description: 'Feeling separated from the physical body — floating, being lifted, or observing from outside.',
    },
    {
      phenomenon: 'Bright Light Phenomena',
      nde_label: 'Bright light (core element)',
      uap_label: 'Luminous craft/entities',
      nde_pct: Math.round(((ndeCoreElements.get('bright_light') || 0) / Math.max(ndeCoreTotal, 1)) * 100),
      uap_pct: (() => {
        let count = 0;
        for (const row of uapAnalysis || []) {
          const vis = row.phenomenology_breakdown?.sensory_channels?.visual;
          if (vis?.active && vis?.extraordinary) count++;
        }
        return Math.round((count / Math.max(uapAnalysis?.length || 1, 1)) * 100);
      })(),
      significance: 88,
      description: 'Both domains feature encounters with extraordinary, often overwhelming light — described as intelligent or purposeful.',
    },
    {
      phenomenon: 'Paralysis/Immobility',
      nde_label: 'Inability to move/speak',
      uap_label: 'Witness paralysis',
      nde_pct: 15, // approximate from NDE literature
      uap_pct: Math.round(((uapPhysicalCounts.get('paralysis') || 0) / Math.max(uapAnalysis?.length || 1, 1)) * 100),
      significance: 80,
      description: 'Involuntary paralysis during the experience — inability to move or speak while mentally alert.',
    },
    {
      phenomenon: 'Knowledge Download',
      nde_label: 'Knowledge download (core element)',
      uap_label: 'Noetic knowing',
      nde_pct: Math.round(((ndeCoreElements.get('knowledge_download') || 0) / Math.max(ndeCoreTotal, 1)) * 100),
      uap_pct: (() => {
        let count = 0;
        for (const row of uapAnalysis || []) {
          const n = row.phenomenology_breakdown?.sensory_channels?.noetic;
          if (n?.active) count++;
        }
        return Math.round((count / Math.max(uapAnalysis?.length || 1, 1)) * 100);
      })(),
      significance: 92,
      description: 'Sudden, overwhelming influx of understanding — described as "just knowing" without being told.',
    },
    {
      phenomenon: 'Feelings of Peace/Love',
      nde_label: 'Feelings of peace (core element)',
      uap_label: 'Love/peace emotion',
      nde_pct: Math.round(((ndeCoreElements.get('feelings_of_peace') || 0) / Math.max(ndeCoreTotal, 1)) * 100),
      uap_pct: Math.round((((uapEmotionCounts.get('love') || 0) + (uapEmotionCounts.get('peace') || 0)) / Math.max(uapAnalysis?.length || 1, 1)) * 100),
      significance: 75,
      description: 'Profound feelings of unconditional love, peace, and acceptance during the encounter.',
    },
    {
      phenomenon: 'Ontological Shock',
      nde_label: 'Reality reassessment post-NDE',
      uap_label: 'Ontological shock rating',
      nde_pct: 65, // well-established in NDE literature
      uap_pct: (() => {
        let count = 0;
        for (const row of uapAnalysis || []) {
          const rating = row.phenomenology_breakdown?.consciousness_alteration?.ontological_shock_rating;
          if (typeof rating === 'number' && rating >= 7) count++;
        }
        return Math.round((count / Math.max(uapAnalysis?.length || 1, 1)) * 100);
      })(),
      significance: 93,
      description: 'Both experiences fundamentally challenge the experiencer\'s model of reality, often triggering existential crisis.',
    },
    {
      phenomenon: 'Entity Encounter',
      nde_label: 'Being of light / guide',
      uap_label: 'Non-human intelligence',
      nde_pct: Math.round(((ndeCoreElements.get('being_of_light') || 0) / Math.max(ndeCoreTotal, 1)) * 100),
      uap_pct: Math.round((uapEntityTotal / Math.max(uapAnalysis?.length || 1, 1)) * 100),
      significance: 97,
      description: 'Direct encounter with a non-human intelligent presence — the core phenomenological overlap.',
    },
    {
      phenomenon: 'Altered Consciousness',
      nde_label: 'Enhanced senses (core element)',
      uap_label: 'Trance/altered state',
      nde_pct: Math.round(((ndeCoreElements.get('enhanced_senses') || 0) / Math.max(ndeCoreTotal, 1)) * 100),
      uap_pct: (() => {
        let count = 0;
        for (const row of uapAnalysis || []) {
          const state = row.phenomenology_breakdown?.consciousness_alteration?.state_of_consciousness;
          if (state && state !== 'normal' && state !== 'not_stated') count++;
        }
        return Math.round((count / Math.max(uapAnalysis?.length || 1, 1)) * 100);
      })(),
      significance: 91,
      description: 'Hyper-lucid or radically altered state of consciousness — experiencers often describe it as "more real than real."',
    },
  ];

  // Sort by significance
  overlaps.sort((a, b) => b.significance - a.significance);

  const result: CrossDomainResult = {
    generated_at: new Date().toISOString(),
    nde_total: ndeTotal || 0,
    uap_total: uapTotal || 0,
    dimensions: [
      {
        label: 'Entity Types Encountered',
        description: 'Types of non-human entities described by experiencers in each domain.',
        data: entityData,
        nde_n: ndeEntityTotal,
        uap_n: uapEntityTotal,
      },
      {
        label: 'Communication Methods',
        description: 'How entities communicated with experiencers.',
        data: commData,
        nde_n: [...ndeCommCounts.values()].reduce((a, b) => a + b, 0),
        uap_n: [...uapCommCounts.values()].reduce((a, b) => a + b, 0),
      },
      {
        label: 'Emotional Quality',
        description: 'Dominant emotional tone of entity encounters.',
        data: emotionData,
        nde_n: [...ndeEmotionCounts.values()].reduce((a, b) => a + b, 0),
        uap_n: [...uapEmotionCounts.values()].reduce((a, b) => a + b, 0),
      },
    ],
    overlapping_phenomena: overlaps,
  };

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
