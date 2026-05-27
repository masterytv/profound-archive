/**
 * Rebuild Viz Caches Pipeline
 *
 * Recomputes all viz_graph_cache entries from source tables.
 * Called weekly by /api/cron/rebuild-viz-caches, after channel scores are fresh.
 *
 * Each rebuild function queries source data, builds the graph JSON, and upserts.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ── Shared Helpers ──────────────────────────────────────────────────────────

/** Paginate all rows from a table */
async function fetchAll<T>(
  sb: SupabaseClient,
  table: string,
  select: string,
  filters?: (q: any) => any,
): Promise<T[]> {
  const PAGE = 1000;
  const all: T[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let q = sb.from(table).select(select).range(offset, offset + PAGE - 1);
    if (filters) q = filters(q);
    const { data, error } = await q;
    if (error) throw new Error(`fetchAll(${table}): ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < PAGE) hasMore = false;
    offset += PAGE;
  }

  return all;
}

async function upsertVizCache(sb: SupabaseClient, vizId: string, graphJson: unknown) {
  const { error } = await sb
    .from('viz_graph_cache')
    .upsert({
      viz_id: vizId,
      graph_json: graphJson,
      updated_at: new Date().toISOString(),
    });
  if (error) throw new Error(`upsert(${vizId}): ${error.message}`);
}

// ── 1. Channel Constellation ────────────────────────────────────────────────

export async function rebuildChannelConstellation(sb: SupabaseClient): Promise<number> {
  // Get all scored channels
  const scores = await fetchAll<any>(sb, 'uap_channel_scores', 
    'channel_id, intelligence_value, credibility_score, encounter_depth, impact_score, authority_score, letter_grade, archetype_primary, archetype_secondary, diversity_index');

  // Get channel metadata
  const channels = await fetchAll<any>(sb, 'uap_channels',
    'channel_id, channel_name, avatar_url, subscriber_count, total_video_count');

  const channelMap = new Map(channels.map((c: any) => [c.channel_id, c]));

  // Get archived video count per channel (tier 1 & 2)
  const vids = await fetchAll<any>(sb, 'uap_vids', 'channel_id', (q: any) => q.in('tier', [1, 2]));
  const archiveCounts = new Map<string, number>();
  for (const v of vids) {
    archiveCounts.set(v.channel_id, (archiveCounts.get(v.channel_id) || 0) + 1);
  }

  const graphChannels = scores.map((s: any) => {
    const ch = channelMap.get(s.channel_id);
    return {
      id: s.channel_id,
      name: ch?.channel_name || s.channel_id,
      avatar: ch?.avatar_url || null,
      subscribers: ch?.subscriber_count || 0,
      videoCount: archiveCounts.get(s.channel_id) || 0,
      intelligence: s.intelligence_value != null ? Math.round(s.intelligence_value * 10) / 10 : null,
      credibility: s.credibility_score != null ? Math.round(s.credibility_score * 10) / 10 : null,
      encounter: s.encounter_depth != null ? Math.round(s.encounter_depth * 100) / 100 : null,
      impact: s.impact_score != null ? Math.round(s.impact_score * 10) / 10 : null,
      authority: s.authority_score != null ? Math.round(s.authority_score * 10) / 10 : null,
      grade: s.letter_grade || 'N/A',
      archetype: s.archetype_primary || null,
      archetypeSecondary: s.archetype_secondary || null,
      diversity: s.diversity_index != null ? Math.round(s.diversity_index * 1000) / 1000 : 0,
      research: null, // computed by channel scores but not stored as a separate field
    };
  }).filter((ch: any) => ch.intelligence != null || ch.credibility != null);

  await upsertVizCache(sb, 'channel-constellation', {
    channels: graphChannels,
    metadata: {
      totalChannels: graphChannels.length,
      computedAt: new Date().toISOString(),
    },
  });

  return graphChannels.length;
}

// ── 2. Hynek Space ──────────────────────────────────────────────────────────

export async function rebuildHynekSpace(sb: SupabaseClient): Promise<number> {
  const encounters = await fetchAll<any>(sb, 'uap_encounters',
    'id, experiencer_name, hynek_type, evidence_score, contact_depth_score, transformation_score, encounter_context, phenomenology_breakdown',
    (q: any) => q.not('hynek_type', 'is', null));

  // Build contactee slug lookup
  const contactees = await fetchAll<any>(sb, 'uap_contactee_profiles', 'slug, display_name');
  const slugMap = new Map<string, string>();
  for (const c of contactees) {
    slugMap.set(c.display_name?.toLowerCase(), c.slug);
  }

  const points = encounters.map((e: any) => {
    const loc = e.encounter_context?.location;
    const country = loc?.country || 'not_stated';
    const entity = e.phenomenology_breakdown?.dominant_entity_type || 'none';
    const name = e.experiencer_name || 'Unknown';
    const slug = slugMap.get(name.toLowerCase()) || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    return {
      id: e.id,
      name,
      slug,
      hynek: e.hynek_type,
      evidence: e.evidence_score || 0,
      contact: e.contact_depth_score || 0,
      transform: e.transformation_score || 0,
      country,
      entity,
    };
  });

  // Compute clusters (group by hynek type)
  const hynekCounts: Record<string, number> = {};
  for (const p of points) {
    hynekCounts[p.hynek] = (hynekCounts[p.hynek] || 0) + 1;
  }
  const clusters = Object.entries(hynekCounts).map(([type, count]) => ({
    id: type,
    label: type,
    count,
  }));

  await upsertVizCache(sb, 'hynek-space', {
    points,
    clusters,
    metadata: {
      totalPoints: points.length,
      computedAt: new Date().toISOString(),
    },
  });

  return points.length;
}

// ── 3. UAP Timeline ─────────────────────────────────────────────────────────

export async function rebuildUapTimeline(sb: SupabaseClient): Promise<number> {
  const encounters = await fetchAll<any>(sb, 'uap_encounters',
    'id, experiencer_name, hynek_type, evidence_score, contact_depth_score, transformation_score, encounter_context, encounter_label, phenomenology_breakdown',
    (q: any) => q.not('encounter_context', 'is', null));

  // Build contactee slug lookup
  const contactees = await fetchAll<any>(sb, 'uap_contactee_profiles', 'slug, display_name');
  const slugMap = new Map<string, string>();
  for (const c of contactees) {
    slugMap.set(c.display_name?.toLowerCase(), c.slug);
  }

  const points: any[] = [];
  for (const e of encounters) {
    const ctx = e.encounter_context;
    const year = ctx?.event_year;
    if (!year || typeof year !== 'number') continue;

    const loc = ctx?.location;
    const country = loc?.country || 'not_stated';
    const city = loc?.nearest_city || null;
    const name = e.experiencer_name || 'Unknown';
    const slug = slugMap.get(name.toLowerCase()) || '';

    // Entity type handling
    const pb = e.phenomenology_breakdown;
    const entityType = pb?.dominant_entity_type || 'none';
    const entityCount = pb?.entity_count || 1;

    // Determine date
    const eventDate = ctx?.event_date || `${year}-01-01`;

    points.push({
      id: e.id,
      name,
      label: e.encounter_label || `${name}'s Encounter`,
      year,
      date: eventDate,
      hynek: e.hynek_type || 'Unknown',
      evidence: e.evidence_score || 0,
      contact: e.contact_depth_score || 0,
      transform: e.transformation_score || 0,
      country: country !== 'not_stated' ? country : null,
      city: city && city !== 'not stated' ? city : null,
      entityType: entityCount > 1 ? 'multi_entity' : entityType,
      entityCount: entityCount > 1 ? entityCount : undefined,
    });
  }

  // Sort by year
  points.sort((a, b) => a.year - b.year);

  const years = points.map(p => p.year);
  const yearRange = years.length > 0 ? [Math.min(...years), Math.max(...years)] : [1900, 2026];

  await upsertVizCache(sb, 'uap-timeline', {
    points,
    metadata: {
      totalPoints: points.length,
      yearRange,
      computedAt: new Date().toISOString(),
    },
  });

  return points.length;
}

// ── 4. UAP Phenomenology ────────────────────────────────────────────────────

// Category colors and label mappings (from scripts/viz-compute-uap-phenomenology.ts)
const PHENOM_CATEGORY_COLORS: Record<string, string> = {
  entity: '#34d399',
  effect: '#fb923c',
  craft: '#60a5fa',
  consciousness: '#c084fc',
};

const PHENOM_LABEL_MAP: Record<string, string> = {
  'entity:humanoid': 'Humanoid', 'entity:grey': 'Grey', 'entity:light_being': 'Light Being',
  'entity:mantis': 'Mantis', 'entity:tall_grey': 'Tall Grey', 'entity:reptilian': 'Reptilian',
  'entity:hybrid': 'Hybrid', 'entity:insectoid_other': 'Insectoid', 'entity:nordic': 'Nordic',
  'entity:robotic': 'Robotic', 'entity:blue_being': 'Blue Being', 'entity:shadow_entity': 'Shadow Entity',
  'entity:tall_white': 'Tall White',
  'effect:electronics_malfunction': 'Electronics Malfunction', 'effect:missing_time': 'Missing Time',
  'effect:nausea': 'Nausea', 'effect:headache': 'Headache', 'effect:fatigue': 'Fatigue',
  'effect:burns': 'Burns', 'effect:car_stall': 'Car Stall', 'effect:paralysis': 'Paralysis',
  'effect:ground_traces': 'Ground Traces', 'effect:camera_failure': 'Camera Failure',
  'effect:tingling': 'Tingling', 'effect:radio_interference': 'Radio Interference',
  'effect:nosebleed': 'Nosebleed', 'effect:eye_irritation': 'Eye Irritation', 'effect:bruises': 'Bruises',
  'effect:vegetation_damage': 'Vegetation Damage', 'effect:pain': 'Pain', 'effect:hair_loss': 'Hair Loss',
  'effect:temperature_change': 'Temperature Change', 'effect:magnetic_anomaly': 'Magnetic Anomaly',
  'effect:compass_deviation': 'Compass Deviation', 'effect:light_anomaly': 'Light Anomaly',
  'effect:phone_disruption': 'Phone Disruption',
  'craft:disc': 'Disc', 'craft:triangle': 'Triangle', 'craft:sphere': 'Sphere',
  'craft:cigar': 'Cigar', 'craft:irregular': 'Irregular', 'craft:tic_tac': 'Tic Tac',
  'craft:diamond': 'Diamond', 'craft:boomerang': 'Boomerang',
  'consciousness:heightened': 'Heightened', 'consciousness:normal_waking': 'Normal Waking',
  'consciousness:dissociated': 'Dissociated', 'consciousness:trance': 'Trance',
  'consciousness:hyper_lucid': 'Hyper-Lucid', 'consciousness:paralysis': 'Paralysis State',
};

const PHENOM_MIN_FREQ = 10;
const PHENOM_MIN_COOCCUR = 3;

interface PhenomBreakdown {
  dominant_entity_type?: string;
  physical_effects?: {
    temporal?: string[];
    witness_physiological?: string[];
    vehicle_equipment?: string[];
    environmental?: string[];
  };
  craft_observation?: {
    observed?: boolean;
    shape?: string;
  };
  consciousness_alteration?: {
    state_of_consciousness?: string;
  };
}

function extractPhenomTags(pb: PhenomBreakdown): string[] {
  const tags: string[] = [];
  const entity = pb.dominant_entity_type;
  if (entity && !['none', 'unknown', 'not_stated'].includes(entity)) {
    tags.push(`entity:${entity}`);
  }
  const pe = pb.physical_effects;
  if (pe) {
    for (const arr of [pe.temporal, pe.witness_physiological, pe.vehicle_equipment, pe.environmental]) {
      if (Array.isArray(arr)) {
        for (const effect of arr) {
          if (effect && effect !== '' && effect !== 'none' && effect !== 'not_stated') {
            tags.push(`effect:${effect}`);
          }
        }
      }
    }
  }
  const craft = pb.craft_observation;
  if (craft?.observed && craft.shape && !['none', 'unknown', 'not_stated'].includes(craft.shape)) {
    tags.push(`craft:${craft.shape}`);
  }
  const consciousness = pb.consciousness_alteration?.state_of_consciousness;
  if (consciousness && consciousness !== 'not_stated') {
    tags.push(`consciousness:${consciousness}`);
  }
  return [...new Set(tags)];
}

export async function rebuildUapPhenomenology(sb: SupabaseClient): Promise<{ nodes: number; edges: number }> {
  const encounters = await fetchAll<any>(sb, 'uap_encounters',
    'id, phenomenology_breakdown',
    (q: any) => q.not('phenomenology_breakdown', 'is', null));

  // Extract tags per encounter
  const encounterTags = new Map<string, string[]>();
  for (const enc of encounters) {
    const pb = enc.phenomenology_breakdown as PhenomBreakdown;
    if (!pb) continue;
    const tags = extractPhenomTags(pb);
    if (tags.length > 0) encounterTags.set(enc.id, tags);
  }

  // Compute tag frequencies
  const tagFreq = new Map<string, number>();
  for (const tags of encounterTags.values()) {
    for (const tag of tags) {
      tagFreq.set(tag, (tagFreq.get(tag) || 0) + 1);
    }
  }

  // Filter to minimum frequency
  const validTags = new Set<string>();
  for (const [tag, freq] of tagFreq) {
    if (freq >= PHENOM_MIN_FREQ) validTags.add(tag);
  }

  // Compute co-occurrence pairs
  const pairKey = (a: string, b: string) => a < b ? `${a}|||${b}` : `${b}|||${a}`;
  const cooccur = new Map<string, number>();
  for (const tags of encounterTags.values()) {
    const filtered = tags.filter(t => validTags.has(t));
    for (let i = 0; i < filtered.length; i++) {
      for (let j = i + 1; j < filtered.length; j++) {
        const key = pairKey(filtered[i], filtered[j]);
        cooccur.set(key, (cooccur.get(key) || 0) + 1);
      }
    }
  }

  const validEdges = [...cooccur.entries()].filter(([, w]) => w >= PHENOM_MIN_COOCCUR);
  const totalEncounters = encounterTags.size;

  const nodes = [...validTags].map(tag => {
    const [category] = tag.split(':');
    return {
      id: tag,
      label: PHENOM_LABEL_MAP[tag] || tag.split(':')[1].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      frequency: tagFreq.get(tag) || 0,
      frequencyPct: Math.round(((tagFreq.get(tag) || 0) / totalEncounters) * 100),
      category,
      color: PHENOM_CATEGORY_COLORS[category] || '#888',
    };
  }).sort((a, b) => b.frequency - a.frequency);

  const edges = validEdges.map(([key, weight]) => {
    const [source, target] = key.split('|||');
    return {
      source, target, weight,
      weightPct: Math.round((weight / totalEncounters) * 100),
    };
  }).sort((a, b) => b.weight - a.weight);

  await upsertVizCache(sb, 'uap-phenomenology', {
    nodes, edges,
    metadata: {
      totalEncounters,
      computedAt: new Date().toISOString(),
      minFrequency: PHENOM_MIN_FREQ,
      minCooccurrence: PHENOM_MIN_COOCCUR,
    },
  });

  return { nodes: nodes.length, edges: edges.length };
}

// ── 5. UAP Globe ────────────────────────────────────────────────────────────

// Static coordinate lookup for known locations (state/country centroids)
// These were originally geocoded via Google Geocode API
const COORD_LOOKUP: Record<string, { lat: number; lng: number }> = {
  // US States
  'us:alabama': { lat: 32.3, lng: -86.9 }, 'us:alaska': { lat: 63.6, lng: -154.5 },
  'us:arizona': { lat: 34.3, lng: -111.7 }, 'us:arkansas': { lat: 34.8, lng: -92.2 },
  'us:california': { lat: 36.8, lng: -119.4 }, 'us:colorado': { lat: 39.0, lng: -105.5 },
  'us:connecticut': { lat: 41.6, lng: -72.7 }, 'us:delaware': { lat: 39.0, lng: -75.5 },
  'us:florida': { lat: 27.8, lng: -81.8 }, 'us:georgia': { lat: 33.0, lng: -83.6 },
  'us:hawaii': { lat: 19.9, lng: -155.5 }, 'us:idaho': { lat: 44.4, lng: -114.6 },
  'us:illinois': { lat: 40.0, lng: -89.0 }, 'us:indiana': { lat: 39.8, lng: -86.3 },
  'us:iowa': { lat: 42.0, lng: -93.5 }, 'us:kansas': { lat: 38.5, lng: -98.8 },
  'us:kentucky': { lat: 37.5, lng: -85.3 }, 'us:louisiana': { lat: 30.5, lng: -91.9 },
  'us:maine': { lat: 45.3, lng: -69.0 }, 'us:maryland': { lat: 39.0, lng: -76.8 },
  'us:massachusetts': { lat: 42.3, lng: -71.8 }, 'us:michigan': { lat: 43.3, lng: -84.5 },
  'us:minnesota': { lat: 46.3, lng: -94.3 }, 'us:mississippi': { lat: 32.7, lng: -89.7 },
  'us:missouri': { lat: 38.5, lng: -92.3 }, 'us:montana': { lat: 47.0, lng: -109.6 },
  'us:nebraska': { lat: 41.1, lng: -98.3 }, 'us:nevada': { lat: 38.8, lng: -116.4 },
  'us:new_hampshire': { lat: 43.2, lng: -71.6 }, 'us:new_jersey': { lat: 40.1, lng: -74.7 },
  'us:new_mexico': { lat: 34.5, lng: -106.0 }, 'us:new_york': { lat: 43.0, lng: -75.5 },
  'us:north_carolina': { lat: 35.8, lng: -79.8 }, 'us:north_dakota': { lat: 47.5, lng: -100.5 },
  'us:ohio': { lat: 40.4, lng: -82.8 }, 'us:oklahoma': { lat: 35.5, lng: -97.5 },
  'us:oregon': { lat: 43.8, lng: -120.6 }, 'us:pennsylvania': { lat: 41.2, lng: -77.2 },
  'us:rhode_island': { lat: 41.7, lng: -71.5 }, 'us:south_carolina': { lat: 33.8, lng: -81.2 },
  'us:south_dakota': { lat: 44.3, lng: -100.2 }, 'us:tennessee': { lat: 35.5, lng: -86.6 },
  'us:texas': { lat: 31.0, lng: -97.6 }, 'us:utah': { lat: 39.3, lng: -111.7 },
  'us:vermont': { lat: 44.0, lng: -72.7 }, 'us:virginia': { lat: 37.5, lng: -78.8 },
  'us:washington': { lat: 47.4, lng: -120.7 }, 'us:west_virginia': { lat: 38.6, lng: -80.6 },
  'us:wisconsin': { lat: 44.5, lng: -89.8 }, 'us:wyoming': { lat: 43.1, lng: -107.6 },
  'us:washington_dc': { lat: 38.9, lng: -77.0 },
  // Countries
  'country:australia': { lat: -25.3, lng: 133.8 }, 'country:brazil': { lat: -14.2, lng: -51.9 },
  'country:canada': { lat: 56.1, lng: -106.3 }, 'country:united_kingdom': { lat: 55.4, lng: -3.4 },
  'country:france': { lat: 46.6, lng: 2.2 }, 'country:germany': { lat: 51.2, lng: 10.4 },
  'country:japan': { lat: 36.2, lng: 138.3 }, 'country:mexico': { lat: 23.6, lng: -102.6 },
  'country:russia': { lat: 61.5, lng: 105.3 }, 'country:south_africa': { lat: -30.6, lng: 22.9 },
  'country:spain': { lat: 40.5, lng: -3.7 }, 'country:italy': { lat: 41.9, lng: 12.6 },
  'country:china': { lat: 35.9, lng: 104.2 }, 'country:india': { lat: 20.6, lng: 78.9 },
  'country:argentina': { lat: -38.4, lng: -63.6 }, 'country:chile': { lat: -35.7, lng: -71.5 },
  'country:colombia': { lat: 4.6, lng: -74.3 }, 'country:peru': { lat: -9.2, lng: -75.0 },
  'country:turkey': { lat: 38.9, lng: 35.2 }, 'country:iran': { lat: 32.4, lng: 53.7 },
  'country:indonesia': { lat: -0.8, lng: 113.9 }, 'country:philippines': { lat: 12.9, lng: 121.8 },
  'country:belgium': { lat: 50.5, lng: 4.5 }, 'country:netherlands': { lat: 52.1, lng: 5.3 },
  'country:sweden': { lat: 60.1, lng: 18.6 }, 'country:norway': { lat: 60.5, lng: 8.5 },
  'country:finland': { lat: 61.9, lng: 25.7 }, 'country:poland': { lat: 51.9, lng: 19.1 },
  'country:portugal': { lat: 39.4, lng: -8.2 }, 'country:ireland': { lat: 53.1, lng: -7.7 },
  'country:scotland': { lat: 56.5, lng: -4.2 }, 'country:new_zealand': { lat: -40.9, lng: 174.9 },
  'country:egypt': { lat: 26.8, lng: 30.8 }, 'country:nigeria': { lat: 9.1, lng: 8.7 },
  'country:kenya': { lat: -0.0, lng: 37.9 }, 'country:israel': { lat: 31.0, lng: 34.9 },
  'country:zimbabwe': { lat: -19.0, lng: 29.2 }, 'country:costa_rica': { lat: 9.7, lng: -83.8 },
  'country:puerto_rico': { lat: 18.2, lng: -66.6 }, 'country:uruguay': { lat: -32.5, lng: -55.8 },
  'country:switzerland': { lat: 46.8, lng: 8.2 }, 'country:denmark': { lat: 56.3, lng: 9.5 },
  'country:austria': { lat: 47.5, lng: 14.6 }, 'country:ukraine': { lat: 48.4, lng: 31.2 },
  'country:hungary': { lat: 47.2, lng: 19.5 }, 'country:romania': { lat: 45.9, lng: 24.97 },
  'country:czech_republic': { lat: 49.8, lng: 15.5 }, 'country:greece': { lat: 39.1, lng: 21.8 },
  'country:malaysia': { lat: 4.2, lng: 101.9 }, 'country:thailand': { lat: 15.9, lng: 100.9 },
  'country:south_korea': { lat: 35.9, lng: 128.0 }, 'country:pakistan': { lat: 30.4, lng: 69.3 },
  'country:vietnam': { lat: 14.1, lng: 108.3 }, 'country:singapore': { lat: 1.4, lng: 103.8 },
  'country:papua_new_guinea': { lat: -6.3, lng: 147.2 }, 'country:venezuela': { lat: 6.4, lng: -66.6 },
  'country:bolivia': { lat: -16.3, lng: -63.6 }, 'country:paraguay': { lat: -23.4, lng: -58.4 },
  'country:cuba': { lat: 21.5, lng: -77.8 }, 'country:jamaica': { lat: 18.1, lng: -77.3 },
  'country:iceland': { lat: 64.1, lng: -18.5 },
};

// Normalize state names to key format
function normalizeStateKey(state: string): string {
  return state.toLowerCase().replace(/\s+/g, '_');
}

export async function rebuildUapGlobe(sb: SupabaseClient): Promise<number> {
  const encounters = await fetchAll<any>(sb, 'uap_encounters',
    'id, hynek_type, encounter_context, phenomenology_breakdown',
    (q: any) => q.not('encounter_context', 'is', null));

  // Aggregate by location
  const locationCounts = new Map<string, {
    count: number;
    label: string;
    state: string | null;
    country: string;
    hynekCounts: Record<string, number>;
    entityCounts: Record<string, number>;
    craftCounts: Record<string, number>;
  }>();

  for (const e of encounters) {
    const loc = e.encounter_context?.location;
    if (!loc) continue;

    const country = loc.country;
    if (!country || country === 'not_stated') continue;

    const state = loc.state_province;
    let locId: string;
    let label: string;
    let stateVal: string | null = null;

    // US states get their own points; other countries are aggregated at country level
    if (country === 'united_states' && state && state !== 'not stated' && state !== 'not_stated') {
      const stateKey = normalizeStateKey(state);
      locId = `us:${stateKey}`;
      label = state;
      stateVal = state;
    } else {
      locId = `country:${country}`;
      label = country.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    }

    const existing = locationCounts.get(locId) || {
      count: 0, label, state: stateVal, country,
      hynekCounts: {}, entityCounts: {}, craftCounts: {},
    };
    existing.count++;

    // Track top categories
    const hynek = e.hynek_type || 'Unknown';
    existing.hynekCounts[hynek] = (existing.hynekCounts[hynek] || 0) + 1;

    const entity = e.phenomenology_breakdown?.dominant_entity_type || 'none';
    existing.entityCounts[entity] = (existing.entityCounts[entity] || 0) + 1;

    const craft = e.phenomenology_breakdown?.craft_observation?.shape || 'none';
    existing.craftCounts[craft] = (existing.craftCounts[craft] || 0) + 1;

    locationCounts.set(locId, existing);
  }

  // Build points with coordinates
  const topOf = (counts: Record<string, number>) => {
    const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
    return sorted[0]?.[0] || 'none';
  };

  const points: any[] = [];
  const unmapped: string[] = [];

  for (const [locId, data] of locationCounts) {
    const coords = COORD_LOOKUP[locId];
    if (!coords) {
      unmapped.push(locId);
      continue;
    }

    points.push({
      id: locId,
      label: data.label,
      lat: coords.lat,
      lng: coords.lng,
      count: data.count,
      state: data.state,
      country: data.label,
      topHynek: topOf(data.hynekCounts),
      topEntity: topOf(data.entityCounts),
      topCraft: topOf(data.craftCounts),
    });
  }

  points.sort((a, b) => b.count - a.count);

  if (unmapped.length > 0) {
    console.warn(`[rebuild-viz-caches] Globe: ${unmapped.length} unmapped locations:`, unmapped.slice(0, 10));
  }

  const totalEncounters = [...locationCounts.values()].reduce((s, d) => s + d.count, 0);

  await upsertVizCache(sb, 'uap-globe', {
    points,
    metadata: {
      totalPoints: points.length,
      totalEncounters,
      unmappedLocations: unmapped.length,
      computedAt: new Date().toISOString(),
    },
  });

  return points.length;
}

// ── 6. UAP Intelligence Network ─────────────────────────────────────────────

// Node categories and colors (reverse-engineered from existing cache data)
const INTEL_CATEGORY_COLORS: Record<string, string> = {
  gov_military: '#ef4444',
  research_media: '#a78bfa',
  program_confirmed: '#22c55e',
  program_other: '#3b82f6',
  whistleblower: '#f59e0b',
};

const MIN_MENTIONS = 10;
const MIN_SHARED_VIDEOS = 2;

export async function rebuildUapIntelligence(sb: SupabaseClient): Promise<{ nodes: number; edges: number }> {
  // Fetch all analysis rows with people/programs mentioned
  const analyses = await fetchAll<any>(sb, 'uap_analysis',
    'video_id, people_mentioned, programs_mentioned');

  // Build entity → video_id map
  const entityVideos = new Map<string, Set<string>>();
  const entityMeta = new Map<string, { label: string; nodeType: string; subType: string; category: string }>();

  for (const a of analyses) {
    const videoId = a.video_id;

    // People
    if (Array.isArray(a.people_mentioned)) {
      for (const p of a.people_mentioned) {
        if (!p.name || p.name === 'not_stated') continue;
        const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const id = `person:${slug}`;

        if (!entityVideos.has(id)) entityVideos.set(id, new Set());
        entityVideos.get(id)!.add(videoId);

        if (!entityMeta.has(id)) {
          const role = p.role || 'other';
          const category = ['military', 'government'].includes(role) ? 'gov_military'
            : role === 'whistleblower' ? 'whistleblower' : 'research_media';
          entityMeta.set(id, { label: p.name, nodeType: 'person', subType: role, category });
        }
      }
    }

    // Programs
    if (Array.isArray(a.programs_mentioned)) {
      for (const prog of a.programs_mentioned) {
        if (!prog.name || prog.name === 'not_stated') continue;
        const slug = prog.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const id = `program:${slug}`;

        if (!entityVideos.has(id)) entityVideos.set(id, new Set());
        entityVideos.get(id)!.add(videoId);

        if (!entityMeta.has(id)) {
          const status = prog.status || 'other';
          const category = status === 'confirmed' ? 'program_confirmed' : 'program_other';
          entityMeta.set(id, { label: prog.name, nodeType: 'program', subType: prog.type || 'unknown', category });
        }
      }
    }

    // Organizations (from canonical_orgs if available, or from people affiliations)
    // Check if programs_mentioned has org-like entries
  }

  // Also pull from canonical tables for orgs
  const canonicalOrgs = await fetchAll<any>(sb, 'uap_canonical_orgs', 'id, canonical_name, slug, category, total_mentions, linked_video_ids');
  for (const org of canonicalOrgs) {
    if (!org.slug || (org.total_mentions || 0) < MIN_MENTIONS) continue;
    const id = `org:${org.slug}`;
    if (!entityVideos.has(id)) entityVideos.set(id, new Set());

    // Add linked video IDs
    if (Array.isArray(org.linked_video_ids)) {
      for (const vid of org.linked_video_ids) {
        entityVideos.get(id)!.add(vid);
      }
    }

    if (!entityMeta.has(id)) {
      const category = org.category || 'research_media';
      entityMeta.set(id, { label: org.canonical_name, nodeType: 'org', subType: category, category });
    }
  }

  // Filter nodes by minimum mentions
  const validEntities = new Map<string, Set<string>>();
  for (const [id, videos] of entityVideos) {
    if (videos.size >= MIN_MENTIONS) {
      validEntities.set(id, videos);
    }
  }

  // Build nodes
  const nodes = [...validEntities.entries()].map(([id, videos]) => {
    const meta = entityMeta.get(id)!;
    return {
      id,
      label: meta.label,
      nodeType: meta.nodeType,
      subType: meta.subType,
      category: meta.category,
      mentions: videos.size,
      videoCount: videos.size,
      color: INTEL_CATEGORY_COLORS[meta.category] || '#888',
    };
  }).sort((a, b) => b.mentions - a.mentions);

  // Build edges (co-mention in same video)
  const nodeIds = new Set(nodes.map(n => n.id));
  const edgeMap = new Map<string, number>();

  // For each video, find all valid entities mentioned in it
  const videoEntities = new Map<string, string[]>();
  for (const [entityId, videos] of validEntities) {
    for (const vid of videos) {
      if (!videoEntities.has(vid)) videoEntities.set(vid, []);
      videoEntities.get(vid)!.push(entityId);
    }
  }

  for (const entities of videoEntities.values()) {
    const filtered = entities.filter(e => nodeIds.has(e));
    for (let i = 0; i < filtered.length; i++) {
      for (let j = i + 1; j < filtered.length; j++) {
        const key = filtered[i] < filtered[j]
          ? `${filtered[i]}|||${filtered[j]}`
          : `${filtered[j]}|||${filtered[i]}`;
        edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
      }
    }
  }

  const edges = [...edgeMap.entries()]
    .filter(([, w]) => w >= MIN_SHARED_VIDEOS)
    .map(([key, sharedVideos]) => {
      const [source, target] = key.split('|||');
      return { source, target, sharedVideos };
    })
    .sort((a, b) => b.sharedVideos - a.sharedVideos);

  await upsertVizCache(sb, 'uap-intelligence', {
    nodes,
    edges,
    metadata: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      minMentions: MIN_MENTIONS,
      minSharedVideos: MIN_SHARED_VIDEOS,
      computedAt: new Date().toISOString(),
    },
  });

  return { nodes: nodes.length, edges: edges.length };
}

// ── Orchestrator ────────────────────────────────────────────────────────────

export interface VizCacheResult {
  constellation: number;
  hynekSpace: number;
  timeline: number;
  phenomenology: { nodes: number; edges: number };
  globe: number;
  intelligence: { nodes: number; edges: number };
  duration_ms: number;
  errors: string[];
}

export async function rebuildAllVizCaches(sb: SupabaseClient): Promise<VizCacheResult> {
  const start = Date.now();
  const errors: string[] = [];
  const result: VizCacheResult = {
    constellation: 0, hynekSpace: 0, timeline: 0,
    phenomenology: { nodes: 0, edges: 0 }, globe: 0,
    intelligence: { nodes: 0, edges: 0 },
    duration_ms: 0, errors: [],
  };

  // Run each rebuild, catching individual errors to avoid blocking others
  const tasks: Array<{ name: string; fn: () => Promise<void> }> = [
    { name: 'channel-constellation', fn: async () => { result.constellation = await rebuildChannelConstellation(sb); } },
    { name: 'hynek-space', fn: async () => { result.hynekSpace = await rebuildHynekSpace(sb); } },
    { name: 'uap-timeline', fn: async () => { result.timeline = await rebuildUapTimeline(sb); } },
    { name: 'uap-phenomenology', fn: async () => { result.phenomenology = await rebuildUapPhenomenology(sb); } },
    { name: 'uap-globe', fn: async () => { result.globe = await rebuildUapGlobe(sb); } },
    { name: 'uap-intelligence', fn: async () => { result.intelligence = await rebuildUapIntelligence(sb); } },
  ];

  for (const task of tasks) {
    try {
      console.log(`[rebuild-viz-caches] Starting ${task.name}...`);
      await task.fn();
      console.log(`[rebuild-viz-caches] ✅ ${task.name} complete`);
    } catch (err) {
      const msg = `${task.name}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`[rebuild-viz-caches] ❌ ${msg}`);
      errors.push(msg);
    }
  }

  result.duration_ms = Date.now() - start;
  result.errors = errors;
  return result;
}
