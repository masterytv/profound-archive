/**
 * Compute UAP Phenomenology co-occurrence graph and insert into viz_graph_cache.
 * 
 * Run via: npx tsx scripts/viz-compute-uap-phenomenology.ts
 * Requires SUPABASE_SERVICE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

// ── Category colors and label mappings ──────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  entity: '#34d399',       // Emerald
  effect: '#fb923c',       // Amber/Orange
  craft: '#60a5fa',        // Blue
  consciousness: '#c084fc', // Purple
};

const LABEL_MAP: Record<string, string> = {
  // Entity types
  'entity:humanoid': 'Humanoid',
  'entity:grey': 'Grey',
  'entity:light_being': 'Light Being',
  'entity:mantis': 'Mantis',
  'entity:tall_grey': 'Tall Grey',
  'entity:reptilian': 'Reptilian',
  'entity:hybrid': 'Hybrid',
  'entity:insectoid_other': 'Insectoid',
  'entity:nordic': 'Nordic',
  'entity:robotic': 'Robotic',
  'entity:blue_being': 'Blue Being',
  'entity:shadow_entity': 'Shadow Entity',
  'entity:tall_white': 'Tall White',
  // Physical effects
  'effect:electronics_malfunction': 'Electronics Malfunction',
  'effect:missing_time': 'Missing Time',
  'effect:nausea': 'Nausea',
  'effect:headache': 'Headache',
  'effect:fatigue': 'Fatigue',
  'effect:burns': 'Burns',
  'effect:car_stall': 'Car Stall',
  'effect:paralysis': 'Paralysis',
  'effect:ground_traces': 'Ground Traces',
  'effect:camera_failure': 'Camera Failure',
  'effect:tingling': 'Tingling',
  'effect:radio_interference': 'Radio Interference',
  'effect:nosebleed': 'Nosebleed',
  'effect:eye_irritation': 'Eye Irritation',
  'effect:bruises': 'Bruises',
  'effect:vegetation_damage': 'Vegetation Damage',
  'effect:pain': 'Pain',
  'effect:hair_loss': 'Hair Loss',
  'effect:temperature_change': 'Temperature Change',
  'effect:magnetic_anomaly': 'Magnetic Anomaly',
  'effect:compass_deviation': 'Compass Deviation',
  'effect:light_anomaly': 'Light Anomaly',
  'effect:phone_disruption': 'Phone Disruption',
  // Craft shapes
  'craft:disc': 'Disc',
  'craft:triangle': 'Triangle',
  'craft:sphere': 'Sphere',
  'craft:cigar': 'Cigar',
  'craft:irregular': 'Irregular',
  'craft:tic_tac': 'Tic Tac',
  'craft:diamond': 'Diamond',
  'craft:boomerang': 'Boomerang',
  // Consciousness states
  'consciousness:heightened': 'Heightened',
  'consciousness:normal_waking': 'Normal Waking',
  'consciousness:dissociated': 'Dissociated',
  'consciousness:trance': 'Trance',
  'consciousness:hyper_lucid': 'Hyper-Lucid',
  'consciousness:paralysis': 'Paralysis State',
};

// Minimum occurrences to include a tag as a node
const MIN_FREQ = 10;

// Minimum co-occurrences to include an edge
const MIN_COOCCUR = 3;

// ── Extract tags from a single encounter ────────────────────────────────────

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

function extractTags(pb: PhenomBreakdown): string[] {
  const tags: string[] = [];

  // Entity type
  const entity = pb.dominant_entity_type;
  if (entity && !['none', 'unknown', 'not_stated'].includes(entity)) {
    tags.push(`entity:${entity}`);
  }

  // Physical effects (4 sub-arrays)
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

  // Craft shape
  const craft = pb.craft_observation;
  if (craft?.observed && craft.shape && !['none', 'unknown', 'not_stated'].includes(craft.shape)) {
    tags.push(`craft:${craft.shape}`);
  }

  // Consciousness state
  const consciousness = pb.consciousness_alteration?.state_of_consciousness;
  if (consciousness && consciousness !== 'not_stated') {
    tags.push(`consciousness:${consciousness}`);
  }

  return [...new Set(tags)]; // dedupe
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching UAP encounters with phenomenology data...');

  const { data: encounters, error } = await sb
    .from('uap_encounters')
    .select('id, phenomenology_breakdown')
    .not('phenomenology_breakdown', 'is', null);

  if (error) throw error;
  console.log(`Loaded ${encounters.length} encounters`);

  // Step 1: Extract tags per encounter
  const encounterTags: Map<string, string[]> = new Map();
  for (const enc of encounters) {
    const pb = enc.phenomenology_breakdown as PhenomBreakdown;
    if (!pb) continue;
    const tags = extractTags(pb);
    if (tags.length > 0) {
      encounterTags.set(enc.id, tags);
    }
  }
  console.log(`${encounterTags.size} encounters have valid tags`);

  // Step 2: Compute tag frequencies
  const tagFreq: Map<string, number> = new Map();
  for (const tags of encounterTags.values()) {
    for (const tag of tags) {
      tagFreq.set(tag, (tagFreq.get(tag) || 0) + 1);
    }
  }

  // Filter to minimum frequency
  const validTags = new Set<string>();
  for (const [tag, freq] of tagFreq) {
    if (freq >= MIN_FREQ) validTags.add(tag);
  }
  console.log(`${validTags.size} tags meet minimum frequency of ${MIN_FREQ}`);

  // Step 3: Compute co-occurrence pairs
  const pairKey = (a: string, b: string) => a < b ? `${a}|||${b}` : `${b}|||${a}`;
  const cooccur: Map<string, number> = new Map();

  for (const tags of encounterTags.values()) {
    const filtered = tags.filter(t => validTags.has(t));
    for (let i = 0; i < filtered.length; i++) {
      for (let j = i + 1; j < filtered.length; j++) {
        const key = pairKey(filtered[i], filtered[j]);
        cooccur.set(key, (cooccur.get(key) || 0) + 1);
      }
    }
  }

  // Filter edges by minimum co-occurrence
  const validEdges = [...cooccur.entries()].filter(([, w]) => w >= MIN_COOCCUR);
  console.log(`${validEdges.length} edges meet minimum co-occurrence of ${MIN_COOCCUR}`);

  // Step 4: Build graph JSON
  const totalEncounters = encounterTags.size;

  const nodes = [...validTags].map(tag => {
    const [category] = tag.split(':');
    return {
      id: tag,
      label: LABEL_MAP[tag] || tag.split(':')[1].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      frequency: tagFreq.get(tag) || 0,
      frequencyPct: Math.round(((tagFreq.get(tag) || 0) / totalEncounters) * 100),
      category,
      color: CATEGORY_COLORS[category] || '#888',
    };
  }).sort((a, b) => b.frequency - a.frequency);

  const edges = validEdges.map(([key, weight]) => {
    const [source, target] = key.split('|||');
    return {
      source,
      target,
      weight,
      weightPct: Math.round((weight / totalEncounters) * 100),
    };
  }).sort((a, b) => b.weight - a.weight);

  const graphJson = {
    nodes,
    edges,
    metadata: {
      totalEncounters,
      computedAt: new Date().toISOString(),
      minFrequency: MIN_FREQ,
      minCooccurrence: MIN_COOCCUR,
    },
  };

  console.log(`Graph: ${nodes.length} nodes, ${edges.length} edges`);
  console.log(`Categories: ${[...new Set(nodes.map(n => n.category))].join(', ')}`);
  console.log(`Top 5 nodes: ${nodes.slice(0, 5).map(n => `${n.label} (${n.frequencyPct}%)`).join(', ')}`);
  console.log(`Top 5 edges: ${edges.slice(0, 5).map(e => `${e.source} <-> ${e.target} (${e.weight})`).join(', ')}`);

  // Step 5: Upsert into viz_graph_cache
  const { error: upsertError } = await sb
    .from('viz_graph_cache')
    .upsert({
      viz_id: 'uap-phenomenology',
      graph_json: graphJson,
      updated_at: new Date().toISOString(),
    });

  if (upsertError) {
    console.error('Upsert error:', upsertError);
    throw upsertError;
  }

  console.log('✅ Saved to viz_graph_cache with viz_id = "uap-phenomenology"');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
