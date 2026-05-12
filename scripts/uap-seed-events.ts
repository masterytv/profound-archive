/**
 * UAP Events Seed Script
 * 
 * 1. Scans all existing uap_analysis.timeline_events JSONB arrays
 * 2. Deduplicates by fuzzy title+year matching
 * 3. Seeds well-known UAP events that may not yet appear in analyzed videos
 * 4. Cross-references uap_contactee_profiles to populate contactee_ids
 * 
 * Usage: npx tsx scripts/uap-seed-events.ts [--dry-run]
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const dryRun = process.argv.includes('--dry-run');

// ─── Well-Known Events ──────────────────────────────────────────────────────

interface EventSeed {
  name: string;
  slug: string;
  aliases: string[];
  event_date: string;
  year: number;
  location: string;
  country: string;
  description: string;
  event_type: string;
  witness_count?: number;
  contactee_names?: string[]; // will be resolved to contactee_ids
}

const WELL_KNOWN_EVENTS: EventSeed[] = [
  {
    name: 'Roswell Incident',
    slug: 'roswell-incident',
    aliases: ['Roswell Crash', 'Roswell UFO Incident', 'Roswell 1947', 'Roswell'],
    event_date: '1947-07-08',
    year: 1947,
    location: 'Roswell, New Mexico',
    country: 'United States',
    description: 'An object crashed on a ranch near Roswell. The U.S. military initially reported recovery of a "flying disc" before retracting the statement. Decades later, witnesses came forward describing non-human debris and bodies.',
    event_type: 'crash_retrieval',
    contactee_names: ['Jesse Marcel', 'Glenn Dennis'],
  },
  {
    name: 'Hill Abduction',
    slug: 'hill-abduction',
    aliases: ['Betty and Barney Hill', 'Hill Case', 'Zeta Reticuli Incident', 'Betty Hill Abduction', 'Barney Hill Abduction'],
    event_date: '1961-09-19',
    year: 1961,
    location: 'White Mountains, New Hampshire',
    country: 'United States',
    description: 'Betty and Barney Hill reported being abducted by extraterrestrial beings while driving through rural New Hampshire. Their account, retrieved partly through hypnosis, became the first widely publicized alien abduction case.',
    event_type: 'abduction',
    contactee_names: ['Betty Hill', 'Barney Hill'],
  },
  {
    name: 'Phoenix Lights',
    slug: 'phoenix-lights',
    aliases: ['Phoenix Lights 1997', 'Lights Over Phoenix', 'The Phoenix Lights Incident'],
    event_date: '1997-03-13',
    year: 1997,
    location: 'Phoenix, Arizona',
    country: 'United States',
    description: 'Thousands of witnesses observed a massive V-shaped formation of lights silently traversing the Phoenix metropolitan area. A second event later that night involved stationary lights over the Sierra Estrella range.',
    event_type: 'mass_sighting',
    witness_count: 10000,
    contactee_names: ['Fife Symington'],
  },
  {
    name: 'Rendlesham Forest Incident',
    slug: 'rendlesham-forest',
    aliases: ['Rendlesham Forest', 'Bentwaters Incident', 'Woodbridge UFO', 'Britains Roswell'],
    event_date: '1980-12-26',
    year: 1980,
    location: 'Rendlesham Forest, Suffolk, England',
    country: 'United Kingdom',
    description: 'Over two nights, U.S. Air Force personnel stationed at RAF Woodbridge reported seeing strange lights and a triangular craft in Rendlesham Forest. Deputy base commander Lt. Col. Charles Halt recorded observations on audio tape.',
    event_type: 'military_encounter',
    contactee_names: ['Charles Halt', 'Jim Penniston', 'John Burroughs', 'Larry Warren'],
  },
  {
    name: 'USS Nimitz Tic Tac Encounter',
    slug: 'uss-nimitz-tic-tac',
    aliases: ['Tic Tac UFO', 'Nimitz Encounter', '2004 USS Nimitz', 'Tic Tac Incident', 'USS Nimitz UFO'],
    event_date: '2004-11-14',
    year: 2004,
    location: 'Off the coast of San Diego, California',
    country: 'United States',
    description: 'Navy fighter pilots from the USS Nimitz carrier strike group encountered a white, oblong object (dubbed "Tic Tac") that exhibited extraordinary flight characteristics including instantaneous acceleration and transmedium travel.',
    event_type: 'military_encounter',
    contactee_names: ['David Fravor', 'Alex Dietrich', 'Chad Underwood'],
  },
  {
    name: 'Tehran UFO Incident',
    slug: 'tehran-ufo-incident',
    aliases: ['Tehran 1976', '1976 Tehran UFO', 'Iranian UFO Incident'],
    event_date: '1976-09-19',
    year: 1976,
    location: 'Tehran, Iran',
    country: 'Iran',
    description: 'Iranian Air Force F-4 Phantom jets were scrambled to intercept a bright object over Tehran. Pilots reported instrument malfunctions and weapons system failures when approaching the object.',
    event_type: 'military_encounter',
  },
  {
    name: 'Belgian UFO Wave',
    slug: 'belgian-ufo-wave',
    aliases: ['Belgian Wave', 'Belgium Triangle', 'Belgian Triangle UFO', '1989 Belgian Wave'],
    event_date: '1989-11-29',
    year: 1989,
    location: 'Belgium',
    country: 'Belgium',
    description: 'Over several months, thousands of people across Belgium reported sightings of large, silent triangular craft. The Belgian Air Force scrambled F-16 fighters and tracked anomalous radar returns.',
    event_type: 'mass_sighting',
    witness_count: 13500,
  },
  {
    name: 'Travis Walton Abduction',
    slug: 'travis-walton-abduction',
    aliases: ['Travis Walton', 'Fire in the Sky', 'Walton Abduction', 'Snowflake Arizona Abduction'],
    event_date: '1975-11-05',
    year: 1975,
    location: 'Apache-Sitgreaves National Forest, Arizona',
    country: 'United States',
    description: 'Logger Travis Walton was allegedly struck by a beam of light from a hovering craft and disappeared for five days. Six coworkers witnessed the event and passed polygraph tests.',
    event_type: 'abduction',
    witness_count: 7,
    contactee_names: ['Travis Walton'],
  },
  {
    name: 'Ariel School Encounter',
    slug: 'ariel-school',
    aliases: ['Ariel School', 'Ruwa Zimbabwe UFO', 'Zimbabwe School Sighting', 'Ariel School Zimbabwe'],
    event_date: '1994-09-16',
    year: 1994,
    location: 'Ruwa, Zimbabwe',
    country: 'Zimbabwe',
    description: 'Approximately 62 schoolchildren at Ariel School in Ruwa reported seeing a silver craft land near their playground and small beings emerge. Researcher John Mack interviewed the children extensively.',
    event_type: 'contact',
    witness_count: 62,
    contactee_names: ['John Mack'],
  },
  {
    name: 'Pascagoula Abduction',
    slug: 'pascagoula-abduction',
    aliases: ['Pascagoula', 'Hickson-Parker Abduction', 'Pascagoula Mississippi'],
    event_date: '1973-10-11',
    year: 1973,
    location: 'Pascagoula, Mississippi',
    country: 'United States',
    description: 'Charles Hickson and Calvin Parker reported being taken aboard an egg-shaped craft by robotic-looking beings while fishing on the Pascagoula River.',
    event_type: 'abduction',
    witness_count: 2,
    contactee_names: ['Charles Hickson', 'Calvin Parker'],
  },
  {
    name: 'Cash-Landrum Incident',
    slug: 'cash-landrum',
    aliases: ['Cash-Landrum', 'Piney Woods Incident', 'Cash Landrum UFO'],
    event_date: '1980-12-29',
    year: 1980,
    location: 'Piney Woods, Texas',
    country: 'United States',
    description: 'Betty Cash, Vickie Landrum, and Colby Landrum encountered a diamond-shaped object emitting intense heat on a Texas road. All three suffered radiation-like symptoms requiring hospitalization.',
    event_type: 'military_encounter',
    witness_count: 3,
    contactee_names: ['Betty Cash', 'Vickie Landrum', 'Colby Landrum'],
  },
  {
    name: 'Westall UFO Encounter',
    slug: 'westall-ufo',
    aliases: ['Westall 1966', 'Westall School UFO', 'Melbourne UFO 1966'],
    event_date: '1966-04-06',
    year: 1966,
    location: 'Westall, Melbourne, Australia',
    country: 'Australia',
    description: 'Over 200 students and teachers at two schools in Westall witnessed a grey saucer-shaped object descend into a field, hover, and then rapidly ascend.',
    event_type: 'mass_sighting',
    witness_count: 200,
  },
  {
    name: '2017 New York Times UAP Disclosure',
    slug: 'nyt-uap-disclosure-2017',
    aliases: ['AATIP Disclosure', 'Pentagon UFO Program', 'NYT UFO Story 2017'],
    event_date: '2017-12-16',
    year: 2017,
    location: 'Washington, D.C.',
    country: 'United States',
    description: 'The New York Times revealed the existence of the Advanced Aerospace Threat Identification Program (AATIP), a secret Pentagon program investigating UAPs. The story included declassified Navy videos.',
    event_type: 'disclosure',
    contactee_names: ['Luis Elizondo', 'Harry Reid'],
  },
  {
    name: '2023 Congressional UAP Hearing',
    slug: 'congressional-uap-hearing-2023',
    aliases: ['Grusch Hearing', 'UAP Hearing July 2023', 'Congress UFO Hearing'],
    event_date: '2023-07-26',
    year: 2023,
    location: 'Washington, D.C.',
    country: 'United States',
    description: 'David Grusch, a former intelligence official, testified under oath before Congress that the U.S. government possesses non-human craft and biologics. Navy pilots Ryan Graves and David Fravor also testified.',
    event_type: 'congressional',
    contactee_names: ['David Grusch', 'Ryan Graves', 'David Fravor'],
  },
  {
    name: 'Varginha Incident',
    slug: 'varginha-incident',
    aliases: ['Varginha UFO', 'Varginha Brazil', 'Brazilian Roswell'],
    event_date: '1996-01-20',
    year: 1996,
    location: 'Varginha, Brazil',
    country: 'Brazil',
    description: 'Multiple witnesses in Varginha reported seeing strange creatures after a reported UFO crash. The Brazilian military allegedly captured one or more beings. A soldier involved reportedly died under mysterious circumstances.',
    event_type: 'crash_retrieval',
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function fuzzyMatch(a: string, b: string): boolean {
  const na = normalizeForMatch(a);
  const nb = normalizeForMatch(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  // Check word overlap: if >70% of words match, consider it a match
  const wordsA = new Set(na.split(' '));
  const wordsB = new Set(nb.split(' '));
  const overlap = [...wordsA].filter(w => wordsB.has(w)).length;
  const maxLen = Math.max(wordsA.size, wordsB.size);
  return maxLen > 1 && overlap / maxLen >= 0.7;
}

async function resolveContacteeIds(
  supabase: SupabaseClient,
  names: string[]
): Promise<string[]> {
  if (!names || names.length === 0) return [];
  
  const ids: string[] = [];
  for (const name of names) {
    const { data } = await supabase
      .from('uap_contactee_profiles')
      .select('id')
      .ilike('display_name', name)
      .limit(1)
      .maybeSingle();
    if (data) ids.push(data.id);
  }
  return ids;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`UAP EVENTS SEED ${dryRun ? '(DRY RUN)' : '(LIVE)'}`);
  console.log(`${'═'.repeat(60)}\n`);

  // Step 1: Check existing events count
  const { count: existingCount } = await supabase
    .from('uap_events')
    .select('*', { count: 'exact', head: true });
  console.log(`Existing events: ${existingCount ?? 0}`);

  // Step 2: Extract events from existing timeline_events JSONB
  console.log('\n── Step 1: Extracting from uap_analysis.timeline_events ──');
  const { data: analyses } = await supabase
    .from('uap_analysis')
    .select('video_id, timeline_events')
    .not('timeline_events', 'is', null);

  interface ExtractedEvent {
    title: string;
    year: number;
    date: string;
    description: string | null;
    videoIds: Set<string>;
  }

  const extractedMap = new Map<string, ExtractedEvent>();

  for (const row of (analyses || []) as any[]) {
    const events = row.timeline_events;
    if (!Array.isArray(events)) continue;

    for (const event of events) {
      if (!event?.title && !event?.event) continue;
      const title = (event.title || event.event || '').trim();
      const year = event.year || (event.date ? parseInt(event.date, 10) : null);
      if (!year || isNaN(year)) continue;

      const key = normalizeForMatch(`${title} ${year}`);
      
      if (extractedMap.has(key)) {
        extractedMap.get(key)!.videoIds.add(row.video_id);
      } else {
        extractedMap.set(key, {
          title,
          year,
          date: event.date || `${year}`,
          description: event.description || event.details || null,
          videoIds: new Set([row.video_id]),
        });
      }
    }
  }

  console.log(`  Found ${extractedMap.size} unique events from ${(analyses || []).length} analyzed videos`);

  // Step 3: Match extracted events against well-known events
  console.log('\n── Step 2: Matching against well-known events ──');
  const matchedVideoIds = new Map<string, Set<string>>(); // slug -> video_ids from extracted data

  for (const [, extracted] of extractedMap) {
    for (const known of WELL_KNOWN_EVENTS) {
      const allNames = [known.name, ...known.aliases];
      const isMatch = allNames.some(alias => fuzzyMatch(extracted.title, alias)) 
        || (extracted.year === known.year && fuzzyMatch(extracted.title, known.name));
      
      if (isMatch) {
        if (!matchedVideoIds.has(known.slug)) {
          matchedVideoIds.set(known.slug, new Set());
        }
        for (const vid of extracted.videoIds) {
          matchedVideoIds.get(known.slug)!.add(vid);
        }
        console.log(`  MATCH: "${extracted.title}" (${extracted.year}) → ${known.name}`);
        break;
      }
    }
  }

  // Step 4: Upsert well-known events
  console.log('\n── Step 3: Seeding well-known events ──');
  let created = 0;
  let updated = 0;

  for (const seed of WELL_KNOWN_EVENTS) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('uap_events')
      .select('id, slug, video_ids')
      .eq('slug', seed.slug)
      .maybeSingle();

    // Collect video_ids from matched extracted events
    const extractedVids = matchedVideoIds.get(seed.slug) || new Set<string>();
    const existingVids = new Set<string>(existing?.video_ids || []);
    const mergedVids = Array.from(new Set([...existingVids, ...extractedVids]));

    // Resolve contactee IDs
    const contacteeIds = await resolveContacteeIds(supabase, seed.contactee_names || []);

    if (existing) {
      // Update with any new video_ids
      if (mergedVids.length > existingVids.size || contacteeIds.length > 0) {
        console.log(`  UPDATE: ${seed.name} (${mergedVids.length} videos, ${contacteeIds.length} contactees)`);
        if (!dryRun) {
          await supabase
            .from('uap_events')
            .update({
              video_ids: mergedVids,
              contactee_ids: contacteeIds,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        }
        updated++;
      } else {
        console.log(`  EXISTS: ${seed.name} (no changes)`);
      }
    } else {
      console.log(`  CREATE: ${seed.name} (${mergedVids.length} videos, ${contacteeIds.length} contactees)`);
      if (!dryRun) {
        const { error } = await supabase
          .from('uap_events')
          .insert({
            slug: seed.slug,
            name: seed.name,
            aliases: seed.aliases,
            event_date: seed.event_date,
            year: seed.year,
            location: seed.location,
            country: seed.country,
            description: seed.description,
            event_type: seed.event_type,
            video_ids: mergedVids,
            contactee_ids: contacteeIds,
            witness_count: seed.witness_count || null,
          });
        if (error) {
          console.log(`    ERROR: ${error.message}`);
        } else {
          created++;
        }
      } else {
        created++;
      }
    }
  }

  // Step 5: Seed unmatched extracted events as "unknown" type (if they have 2+ video references)
  console.log('\n── Step 4: Seeding notable unmatched events ──');
  let unmatchedCreated = 0;

  for (const [key, extracted] of extractedMap) {
    // Skip if matched to a well-known event
    let wasMatched = false;
    for (const known of WELL_KNOWN_EVENTS) {
      const allNames = [known.name, ...known.aliases];
      if (allNames.some(alias => fuzzyMatch(extracted.title, alias))) {
        wasMatched = true;
        break;
      }
    }
    if (wasMatched) continue;

    // Only auto-create if referenced by 2+ videos (signal of significance)
    if (extracted.videoIds.size < 2) continue;

    const slug = extracted.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80);

    // Check for existing
    const { data: exists } = await supabase
      .from('uap_events')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (exists) continue;

    console.log(`  CREATE (auto): "${extracted.title}" (${extracted.year}, ${extracted.videoIds.size} videos)`);
    if (!dryRun) {
      await supabase
        .from('uap_events')
        .insert({
          slug,
          name: extracted.title,
          event_date: extracted.date,
          year: extracted.year,
          event_type: 'unknown',
          video_ids: Array.from(extracted.videoIds),
        });
    }
    unmatchedCreated++;
  }

  // Summary
  const { count: finalCount } = await supabase
    .from('uap_events')
    .select('*', { count: 'exact', head: true });

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Well-known events created: ${created}`);
  console.log(`Well-known events updated: ${updated}`);
  console.log(`Auto-detected events created: ${unmatchedCreated}`);
  console.log(`Total events in DB: ${finalCount ?? '?'}`);
  console.log(dryRun ? 'DRY RUN COMPLETE' : 'SEED COMPLETE');
  console.log(`${'═'.repeat(60)}\n`);
}

main().catch(console.error);
