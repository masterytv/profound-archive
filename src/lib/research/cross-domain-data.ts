/**
 * Cross-Domain Phenomenology Data
 *
 * Shared compute for /research/cross-domain, /api/research/cross-domain,
 * and the weekly viz cache rebuild.
 *
 * The full corpus (~6.6k nde_analysis + ~6.5k uap_encounters rows) exceeds
 * PostgREST's 1,000-row response cap, so a plain .limit(6000) silently
 * truncates and every aggregate is computed from a 1k-row sample. Two paths
 * around that:
 *
 *   1. Preferred: the cross_domain_aggregates() RPC — aggregation happens in
 *      Postgres and only small count maps cross the wire, which matters on
 *      the Micro tier's limited disk IO budget.
 *   2. Fallback (until the RPC migration is applied): paginate the raw rows
 *      with .range() until exhausted and aggregate in JS.
 *
 * Both paths produce the same CrossDomainAggregates intermediate, so label
 * normalization and result shaping live here in one place.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  normalizeEmotion,
  normalizeCommMethod,
  normalizeEntityType,
  incrementNormalized,
} from '@/lib/research/cross-domain-normalize';

// ─── Public Types ───────────────────────────────────────────────────────────

export interface DomainCount {
  category: string;
  nde: number;
  uap: number;
}

export interface ComparisonDimension {
  label: string;
  description: string;
  data: DomainCount[];
  nde_n: number;
  uap_n: number;
}

export interface OverlapItem {
  phenomenon: string;
  nde_label: string;
  uap_label: string;
  nde_pct: number;
  uap_pct: number;
  significance: number;
  description: string;
}

export interface CrossDomainResult {
  generated_at: string;
  nde_total: number;
  uap_total: number;
  dimensions: ComparisonDimension[];
  overlapping_phenomena: OverlapItem[];
}

// ─── Intermediate Aggregates ────────────────────────────────────────────────

interface CrossDomainAggregates {
  ndeTotal: number;
  ndeCoreTotal: number;
  uapRows: number;
  uapVideoTotal: number;
  // Normalized label → count
  ndeEntityCounts: Map<string, number>;
  ndeCommCounts: Map<string, number>;
  ndeEmotionCounts: Map<string, number>;
  uapEntityCounts: Map<string, number>;
  uapCommCounts: Map<string, number>;
  uapEmotionCounts: Map<string, number>;
  // Raw label → count (no normalization in the original implementation)
  ndeCoreElements: Map<string, number>;
  uapPhysicalCounts: Map<string, number>;
  // Total entity mentions (pre-normalization, matches original counters)
  ndeEntityTotal: number;
  uapEntityTotal: number;
  // Condition counts over uap_encounters rows
  uapTimeDilated: number;
  uapKinestheticExtraordinary: number;
  uapVisualExtraordinary: number;
  uapNoeticActive: number;
  uapShockHigh: number;
  uapAlteredState: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeLabel(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/** Weighted version of incrementNormalized for merging RPC count maps. */
function mergeNormalizedCounts(
  map: Map<string, number>,
  counts: Record<string, number>,
  normalizeFn: (s: string) => string,
  skipRaw?: (raw: string) => boolean,
): void {
  for (const [raw, n] of Object.entries(counts || {})) {
    if (typeof n !== 'number' || n <= 0) continue;
    if (skipRaw?.(raw)) continue;
    const canonical = normalizeFn(raw);
    if (canonical === '__skip__') continue;
    map.set(canonical, (map.get(canonical) || 0) + n);
  }
}

function sumValues(counts: Record<string, number>): number {
  return Object.values(counts || {}).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
}

// Matches the original per-row filters exactly.
const NDE_COMM_SKIP = (raw: string) => raw === 'not_stated' || raw === 'not stated';
const UAP_COMM_SKIP = (raw: string) => raw === 'not_stated';

// ─── Path 1: RPC (aggregation in Postgres) ──────────────────────────────────

/** Shape returned by the cross_domain_aggregates() SQL function. */
interface RpcAggregates {
  nde_total: number;
  nde_core_total: number;
  uap_rows: number;
  uap_video_total: number;
  nde_entity_counts: Record<string, number>;
  nde_comm_counts: Record<string, number>;
  nde_emotion_counts: Record<string, number>;
  nde_core_elements: Record<string, number>;
  uap_entity_counts: Record<string, number>;
  uap_comm_counts: Record<string, number>;
  uap_emotion_counts: Record<string, number>;
  uap_physical_counts: Record<string, number>;
  uap_state_counts: Record<string, number>;
  uap_time_dilated: number;
  uap_kinesthetic_extraordinary: number;
  uap_visual_extraordinary: number;
  uap_noetic_active: number;
  uap_shock_high: number;
}

async function fetchAggregatesViaRpc(sb: SupabaseClient): Promise<CrossDomainAggregates | null> {
  const { data, error } = await sb.rpc('cross_domain_aggregates');
  if (error) {
    // PGRST202 = function not in schema cache, i.e. migration not applied yet.
    const missing = error.code === 'PGRST202' || error.code === '42883';
    console.warn(
      `[cross-domain] RPC ${missing ? 'not available yet' : 'failed'} (${error.code}): ${error.message}. Falling back to paginated scan.`,
    );
    return null;
  }
  const agg = data as RpcAggregates | null;
  if (!agg || !agg.nde_total) {
    console.error('[cross-domain] RPC returned empty aggregates. Falling back to paginated scan.');
    return null;
  }

  const ndeEntityCounts = new Map<string, number>();
  const ndeCommCounts = new Map<string, number>();
  const ndeEmotionCounts = new Map<string, number>();
  const uapEntityCounts = new Map<string, number>();
  const uapCommCounts = new Map<string, number>();
  const uapEmotionCounts = new Map<string, number>();

  mergeNormalizedCounts(ndeEntityCounts, agg.nde_entity_counts, normalizeEntityType);
  mergeNormalizedCounts(ndeCommCounts, agg.nde_comm_counts, normalizeCommMethod, NDE_COMM_SKIP);
  mergeNormalizedCounts(ndeEmotionCounts, agg.nde_emotion_counts, normalizeEmotion);
  mergeNormalizedCounts(uapEntityCounts, agg.uap_entity_counts, normalizeEntityType);
  mergeNormalizedCounts(uapCommCounts, agg.uap_comm_counts, normalizeCommMethod, UAP_COMM_SKIP);
  mergeNormalizedCounts(uapEmotionCounts, agg.uap_emotion_counts, normalizeEmotion);

  const states = agg.uap_state_counts || {};
  const uapAlteredState = Object.entries(states).reduce(
    (sum, [state, n]) => (state !== 'normal' && state !== 'not_stated' ? sum + n : sum),
    0,
  );

  return {
    ndeTotal: agg.nde_total,
    ndeCoreTotal: agg.nde_core_total,
    uapRows: agg.uap_rows,
    uapVideoTotal: agg.uap_video_total,
    ndeEntityCounts,
    ndeCommCounts,
    ndeEmotionCounts,
    uapEntityCounts,
    uapCommCounts,
    uapEmotionCounts,
    ndeCoreElements: new Map(Object.entries(agg.nde_core_elements || {})),
    uapPhysicalCounts: new Map(Object.entries(agg.uap_physical_counts || {})),
    ndeEntityTotal: sumValues(agg.nde_entity_counts),
    uapEntityTotal: sumValues(agg.uap_entity_counts),
    uapTimeDilated: agg.uap_time_dilated,
    uapKinestheticExtraordinary: agg.uap_kinesthetic_extraordinary,
    uapVisualExtraordinary: agg.uap_visual_extraordinary,
    uapNoeticActive: agg.uap_noetic_active,
    uapShockHigh: agg.uap_shock_high,
    uapAlteredState,
  };
}

// ─── Path 2: Paginated Scan (fallback until the RPC migration is applied) ───

/**
 * Paginate all rows from a table. PostgREST caps every response at 1,000
 * rows, so a single .limit(6000) call silently truncates — pages must be
 * walked with .range() until exhausted. Ordered by PK so pages are stable.
 */
async function fetchAll<T>(
  sb: SupabaseClient,
  table: string,
  select: string,
  orderBy: string,
  filters: (q: any) => any,
): Promise<T[] | null> {
  const PAGE = 1000;
  const all: T[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await filters(
      sb.from(table).select(select).order(orderBy, { ascending: true }),
    ).range(offset, offset + PAGE - 1);
    if (error) {
      console.error(`[cross-domain] fetchAll(${table}) failed at offset ${offset}:`, error.message);
      return null;
    }
    if (!data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < PAGE) break;
    offset += PAGE;
  }

  return all;
}

async function fetchAggregatesViaPagination(sb: SupabaseClient): Promise<CrossDomainAggregates | null> {
  const { count: ndeTotal, error: countError } = await sb
    .from('nde_analysis')
    .select('*', { count: 'exact', head: true });

  const ndeAnalysis = await fetchAll<any>(
    sb, 'nde_analysis', 'entities, core_elements', 'video_id',
    (q) => q.not('entities', 'is', null),
  );

  const uapAnalysis = await fetchAll<any>(
    sb, 'uap_encounters', 'video_id, phenomenology_breakdown', 'id',
    (q) => q.not('phenomenology_breakdown', 'is', null),
  );

  // A failed or empty read must surface as null, never as zeroed aggregates.
  if (countError || !ndeAnalysis?.length || !uapAnalysis) {
    console.error(
      '[cross-domain] DB queries failed:',
      countError?.message || 'nde_analysis/uap_encounters returned no rows',
    );
    return null;
  }

  // ── Aggregate NDE ───────────────────────────────────────────────────────
  const ndeEntityCounts = new Map<string, number>();
  const ndeCommCounts = new Map<string, number>();
  const ndeEmotionCounts = new Map<string, number>();
  let ndeEntityTotal = 0;

  for (const row of ndeAnalysis) {
    const encounters = row.entities?.encounters;
    if (!Array.isArray(encounters)) continue;
    for (const e of encounters) {
      if (e.entity_type) {
        incrementNormalized(ndeEntityCounts, e.entity_type, normalizeEntityType);
        ndeEntityTotal++;
      }
      if (e.communication_method && !NDE_COMM_SKIP(e.communication_method)) {
        incrementNormalized(ndeCommCounts, e.communication_method, normalizeCommMethod);
      }
      if (e.emotional_quality) {
        incrementNormalized(ndeEmotionCounts, e.emotional_quality, normalizeEmotion);
      }
    }
  }

  const ndeCoreElements = new Map<string, number>();
  let ndeCoreTotal = 0;
  for (const row of ndeAnalysis) {
    if (!Array.isArray(row.core_elements)) continue;
    ndeCoreTotal++;
    for (const elem of row.core_elements) {
      if (elem.present) {
        ndeCoreElements.set(elem.name, (ndeCoreElements.get(elem.name) || 0) + 1);
      }
    }
  }

  // ── Aggregate UAP ───────────────────────────────────────────────────────
  const uapEntityCounts = new Map<string, number>();
  const uapCommCounts = new Map<string, number>();
  const uapEmotionCounts = new Map<string, number>();
  const uapPhysicalCounts = new Map<string, number>();
  let uapEntityTotal = 0;
  let uapTimeDilated = 0;
  let uapKinestheticExtraordinary = 0;
  let uapVisualExtraordinary = 0;
  let uapNoeticActive = 0;
  let uapShockHigh = 0;
  let uapAlteredState = 0;

  for (const row of uapAnalysis) {
    const pb = row.phenomenology_breakdown;
    if (!pb) continue;

    if (Array.isArray(pb.entities)) {
      for (const e of pb.entities) {
        if (e.entity_type) {
          incrementNormalized(uapEntityCounts, e.entity_type, normalizeEntityType);
          uapEntityTotal++;
        }
        if (e.communication_method && !UAP_COMM_SKIP(e.communication_method)) {
          incrementNormalized(uapCommCounts, e.communication_method, normalizeCommMethod);
        }
      }
    }

    if (pb.dominant_emotion) {
      incrementNormalized(uapEmotionCounts, pb.dominant_emotion, normalizeEmotion);
    }

    if (pb.physical_effects?.witness_physiological) {
      for (const effect of pb.physical_effects.witness_physiological) {
        uapPhysicalCounts.set(effect, (uapPhysicalCounts.get(effect) || 0) + 1);
      }
    }

    const ca = pb.consciousness_alteration;
    if (ca?.time_perception === 'dilated') uapTimeDilated++;
    if (typeof ca?.ontological_shock_rating === 'number' && ca.ontological_shock_rating >= 7) uapShockHigh++;
    if (ca?.state_of_consciousness && ca.state_of_consciousness !== 'normal' && ca.state_of_consciousness !== 'not_stated') {
      uapAlteredState++;
    }

    const sc = pb.sensory_channels;
    if (sc?.kinesthetic?.active && sc?.kinesthetic?.extraordinary) uapKinestheticExtraordinary++;
    if (sc?.visual?.active && sc?.visual?.extraordinary) uapVisualExtraordinary++;
    if (sc?.noetic?.active) uapNoeticActive++;
  }

  return {
    ndeTotal: ndeTotal || 0,
    ndeCoreTotal,
    uapRows: uapAnalysis.length,
    uapVideoTotal: new Set(uapAnalysis.map(row => row.video_id)).size,
    ndeEntityCounts,
    ndeCommCounts,
    ndeEmotionCounts,
    uapEntityCounts,
    uapCommCounts,
    uapEmotionCounts,
    ndeCoreElements,
    uapPhysicalCounts,
    ndeEntityTotal,
    uapEntityTotal,
    uapTimeDilated,
    uapKinestheticExtraordinary,
    uapVisualExtraordinary,
    uapNoeticActive,
    uapShockHigh,
    uapAlteredState,
  };
}

// ─── Result Shaping ─────────────────────────────────────────────────────────

function buildCrossDomainResult(agg: CrossDomainAggregates): CrossDomainResult {
  const {
    ndeEntityCounts, ndeCommCounts, ndeEmotionCounts, ndeCoreElements,
    uapEntityCounts, uapCommCounts, uapEmotionCounts, uapPhysicalCounts,
    ndeEntityTotal, uapEntityTotal, ndeCoreTotal, uapRows,
  } = agg;

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

  // Dimension 3: Emotional Qualities — fixed valence order (positive → neutral → negative)
  const emotionOrder = [
    'love', 'peace', 'joy', 'compassion', 'awe', 'excitement',
    'curiosity', 'neutral', 'authority', 'shock', 'anxiety', 'fear',
  ];
  const emotionData: DomainCount[] = emotionOrder.map(key => ({
    category: normalizeLabel(key),
    nde: ndeEmotionCounts.get(key) || 0,
    uap: uapEmotionCounts.get(key) || 0,
  }));

  const uapDenom = Math.max(uapRows, 1);
  const corePct = (name: string) =>
    Math.round(((ndeCoreElements.get(name) || 0) / Math.max(ndeCoreTotal, 1)) * 100);

  const overlaps: OverlapItem[] = [
    {
      phenomenon: 'Telepathic Communication',
      nde_label: 'Entity telepathy',
      uap_label: 'Entity telepathy',
      nde_pct: Math.round(((ndeCommCounts.get('telepathy') || 0) / Math.max(ndeEntityTotal, 1)) * 100),
      uap_pct: Math.round(((uapCommCounts.get('telepathy') || 0) / Math.max(uapEntityTotal, 1)) * 100),
      significance: 95,
      description: 'Both NDE and UAP experiencers describe non-verbal, mind-to-mind communication with non-human entities.',
    },
    {
      phenomenon: 'Time Distortion',
      nde_label: 'Time distortion (core element)',
      uap_label: 'Dilated time perception',
      nde_pct: corePct('time_distortion'),
      uap_pct: Math.round((agg.uapTimeDilated / uapDenom) * 100),
      significance: 90,
      description: 'Experiencers in both domains report that time behaved abnormally — stopping, compressing, or stretching.',
    },
    {
      phenomenon: 'Out-of-Body Experience',
      nde_label: 'OBE (core element)',
      uap_label: 'Kinesthetic displacement',
      nde_pct: corePct('out_of_body'),
      uap_pct: Math.round((agg.uapKinestheticExtraordinary / uapDenom) * 100),
      significance: 85,
      description: 'Feeling separated from the physical body — floating, being lifted, or observing from outside.',
    },
    {
      phenomenon: 'Bright Light Phenomena',
      nde_label: 'Bright light (core element)',
      uap_label: 'Luminous craft/entities',
      nde_pct: corePct('bright_light'),
      uap_pct: Math.round((agg.uapVisualExtraordinary / uapDenom) * 100),
      significance: 88,
      description: 'Both domains feature encounters with extraordinary, often overwhelming light — described as intelligent or purposeful.',
    },
    {
      phenomenon: 'Paralysis/Immobility',
      nde_label: 'Inability to move/speak',
      uap_label: 'Witness paralysis',
      nde_pct: 15, // approximate from NDE literature
      uap_pct: Math.round(((uapPhysicalCounts.get('paralysis') || 0) / uapDenom) * 100),
      significance: 80,
      description: 'Involuntary paralysis during the experience — inability to move or speak while mentally alert.',
    },
    {
      phenomenon: 'Knowledge Download',
      nde_label: 'Knowledge download (core element)',
      uap_label: 'Noetic knowing',
      nde_pct: corePct('knowledge_download'),
      uap_pct: Math.round((agg.uapNoeticActive / uapDenom) * 100),
      significance: 92,
      description: 'Sudden, overwhelming influx of understanding — described as "just knowing" without being told.',
    },
    {
      phenomenon: 'Feelings of Peace/Love',
      nde_label: 'Feelings of peace (core element)',
      uap_label: 'Love/peace emotion',
      nde_pct: corePct('feelings_of_peace'),
      uap_pct: Math.round((((uapEmotionCounts.get('love') || 0) + (uapEmotionCounts.get('peace') || 0)) / uapDenom) * 100),
      significance: 75,
      description: 'Profound feelings of unconditional love, peace, and acceptance during the encounter.',
    },
    {
      phenomenon: 'Ontological Shock',
      nde_label: 'Reality reassessment post-NDE',
      uap_label: 'Ontological shock rating',
      nde_pct: 65, // well-established in NDE literature
      uap_pct: Math.round((agg.uapShockHigh / uapDenom) * 100),
      significance: 93,
      description: 'Both experiences fundamentally challenge the experiencer\'s model of reality, often triggering existential crisis.',
    },
    {
      phenomenon: 'Entity Encounter',
      nde_label: 'Being of light / guide',
      uap_label: 'Non-human intelligence',
      nde_pct: corePct('being_of_light'),
      uap_pct: Math.round((uapEntityTotal / uapDenom) * 100),
      significance: 97,
      description: 'Direct encounter with a non-human intelligent presence — the core phenomenological overlap.',
    },
    {
      phenomenon: 'Altered Consciousness',
      nde_label: 'Enhanced senses (core element)',
      uap_label: 'Trance/altered state',
      nde_pct: corePct('enhanced_senses'),
      uap_pct: Math.round((agg.uapAlteredState / uapDenom) * 100),
      significance: 91,
      description: 'Hyper-lucid or radically altered state of consciousness — experiencers often describe it as "more real than real."',
    },
  ];

  overlaps.sort((a, b) => b.significance - a.significance);

  return {
    generated_at: new Date().toISOString(),
    nde_total: agg.ndeTotal,
    uap_total: agg.uapVideoTotal,
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
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Compute the full cross-domain comparison from source tables.
 * Never throws; returns null on any failure so callers can distinguish
 * "no data" from a zeroed result (which must never be rendered or cached).
 */
export async function computeCrossDomainResult(sb: SupabaseClient): Promise<CrossDomainResult | null> {
  try {
    const agg = (await fetchAggregatesViaRpc(sb)) ?? (await fetchAggregatesViaPagination(sb));
    if (!agg || agg.ndeTotal === 0) return null;
    return buildCrossDomainResult(agg);
  } catch (error) {
    console.error('[cross-domain] compute failed:', error);
    return null;
  }
}

/**
 * Read the cached result from viz_graph_cache. A zeroed cache row is a
 * poisoned write from a failed render (all-zero aggregates cached on
 * 2026-05-28 blanked this page for weeks) — ignore it and recompute
 * rather than serving it forever.
 */
export async function readCrossDomainCache(sb: SupabaseClient): Promise<CrossDomainResult | null> {
  const { data, error } = await sb
    .from('viz_graph_cache')
    .select('graph_json')
    .eq('viz_id', 'cross-domain')
    .maybeSingle();
  if (error) {
    console.warn('[cross-domain] Cache read failed:', error.message);
    return null;
  }
  const cached = data?.graph_json as unknown as CrossDomainResult | undefined;
  return cached && cached.nde_total > 0 ? cached : null;
}

/** Guarded cache write — an empty result must never poison the cache. */
export async function writeCrossDomainCache(sb: SupabaseClient, result: CrossDomainResult): Promise<void> {
  if (result.nde_total <= 0) return;
  const { error } = await sb
    .from('viz_graph_cache')
    .upsert({
      viz_id: 'cross-domain',
      graph_json: result,
      updated_at: new Date().toISOString(),
    });
  if (error) console.error('[cross-domain] Failed to write cache:', error.message);
  else console.log('[cross-domain] Successfully cached cross-domain data');
}
