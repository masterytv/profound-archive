/**
 * UAP Event Backfill Script
 *
 * Extracts legislative_events from program_intel_breakdown in uap_analysis
 * and upserts them into uap_events. Uses slug-based deduplication to merge
 * events referenced across multiple videos.
 *
 * Usage:
 *   npx tsx scripts/uap-event-backfill.ts
 *   npx tsx scripts/uap-event-backfill.ts --limit 100
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const args = process.argv.slice(2);

function getArgValue(name: string, defaultVal: number): number {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1]) return parseInt(args[idx + 1], 10);
  return defaultVal;
}

const LIMIT = getArgValue('limit', 50000);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

function normalizeEventName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    // Collapse trailing dates like "Defense Authorization Act (2022)"
    .replace(/\s*\(\d{4}\)\s*$/, '')
    .replace(/\s*-\s*\d{4}\s*$/, '');
}

/**
 * Map the LLM's event_type to our canonical event_type enum.
 * The LLM uses "legislation" but our table uses "congressional", etc.
 */
function mapEventType(raw: string | undefined): string {
  if (!raw) return 'unknown';
  const lower = raw.toLowerCase().trim();
  const mapping: Record<string, string> = {
    legislation: 'congressional',
    congressional: 'congressional',
    hearing: 'congressional',
    disclosure: 'disclosure',
    whistleblower: 'whistleblower',
    crash: 'crash_retrieval',
    crash_retrieval: 'crash_retrieval',
    sighting: 'mass_sighting',
    mass_sighting: 'mass_sighting',
    abduction: 'abduction',
    contact: 'contact',
    military: 'military_encounter',
    military_encounter: 'military_encounter',
    radar: 'radar_visual',
    radar_visual: 'radar_visual',
  };
  return mapping[lower] || 'unknown';
}

/**
 * Extract a year from various date formats:
 * "2023-10-01" → 2023, "December 2022" → 2022, "2017" → 2017
 */
function extractYear(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  // ISO date: 2023-10-01
  const isoMatch = dateStr.match(/^(\d{4})-/);
  if (isoMatch) return parseInt(isoMatch[1], 10);
  // Plain year
  const yearMatch = dateStr.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) return parseInt(yearMatch[0], 10);
  return null;
}

// ─── Paginated Fetch ─────────────────────────────────────────────────────────

async function fetchAllWithEvents(supabase: ReturnType<typeof createClient>) {
  const PAGE_SIZE = 1000;
  const all: any[] = [];
  let offset = 0;

  while (all.length < LIMIT) {
    const { data, error } = await supabase
      .from('uap_analysis')
      .select('video_id, program_intel_breakdown')
      .not('program_intel_breakdown', 'is', null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('❌ Fetch error:', error.message);
      break;
    }
    if (!data || data.length === 0) break;

    // Only keep rows that have legislative_events
    for (const row of data) {
      const events = row.program_intel_breakdown?.legislative_events;
      if (Array.isArray(events) && events.length > 0) {
        all.push(row);
      }
    }

    offset += PAGE_SIZE;
    if (data.length < PAGE_SIZE) break;
  }

  return all;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  console.log(`\n🔄 UAP Event Backfill\n`);

  // Load existing events for dedup
  const { data: existingEvents } = await supabase
    .from('uap_events')
    .select('id, slug, name, video_ids, source_count');

  const existingBySlug = new Map<string, any>();
  for (const ev of (existingEvents || [])) {
    existingBySlug.set(ev.slug, ev);
  }

  console.log(`📊 Existing events: ${existingBySlug.size}`);

  // Fetch all analysis rows with legislative_events
  const rows = await fetchAllWithEvents(supabase);
  console.log(`📥 Found ${rows.length} videos with legislative_events\n`);

  // Build a merged event index: slug → merged event data
  const mergedEvents = new Map<string, {
    name: string;
    slug: string;
    event_date: string | null;
    year: number | null;
    event_type: string;
    description: string | null;
    video_ids: Set<string>;
    participants: Set<string>;
  }>();

  for (const row of rows) {
    const videoId = row.video_id;
    const events = row.program_intel_breakdown.legislative_events;

    for (const ev of events) {
      if (!ev?.name || typeof ev.name !== 'string' || ev.name.length < 3) continue;

      const normalized = normalizeEventName(ev.name);
      const slug = toSlug(normalized);
      if (!slug || slug.length < 3) continue;

      if (mergedEvents.has(slug)) {
        // Merge: add video_id and participants
        const existing = mergedEvents.get(slug)!;
        existing.video_ids.add(videoId);
        if (Array.isArray(ev.participants)) {
          for (const p of ev.participants) {
            if (typeof p === 'string') existing.participants.add(p);
          }
        }
        // Use longest description
        if (ev.quote && (!existing.description || ev.quote.length > existing.description.length)) {
          existing.description = ev.quote;
        }
        // Prefer more specific date
        if (ev.date && !existing.event_date) {
          existing.event_date = ev.date;
          existing.year = extractYear(ev.date) || existing.year;
        }
      } else {
        mergedEvents.set(slug, {
          name: normalized,
          slug,
          event_date: ev.date || null,
          year: extractYear(ev.date),
          event_type: mapEventType(ev.event_type),
          description: ev.quote || null,
          video_ids: new Set([videoId]),
          participants: new Set(
            Array.isArray(ev.participants)
              ? ev.participants.filter((p: any) => typeof p === 'string')
              : []
          ),
        });
      }
    }
  }

  console.log(`🔍 Unique events extracted: ${mergedEvents.size}\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const [slug, ev] of mergedEvents) {
    const videoIdArray = Array.from(ev.video_ids);
    const existing = existingBySlug.get(slug);

    if (existing) {
      // Merge video_ids into existing
      const currentVids = new Set<string>(existing.video_ids || []);
      let hasNew = false;
      for (const vid of videoIdArray) {
        if (!currentVids.has(vid)) {
          currentVids.add(vid);
          hasNew = true;
        }
      }

      if (!hasNew) {
        skipped++;
        continue;
      }

      const mergedVids = Array.from(currentVids);
      const { error } = await supabase
        .from('uap_events')
        .update({
          video_ids: mergedVids,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        console.error(`  ❌ Update failed for "${ev.name}": ${error.message}`);
      } else {
        updated++;
      }
    } else {
      // Create new event
      const newEvent = {
        name: ev.name,
        slug,
        event_date: ev.event_date,
        year: ev.year,
        event_type: ev.event_type,
        description: ev.description,
        video_ids: videoIdArray,
      };

      const { data: inserted, error } = await supabase
        .from('uap_events')
        .insert(newEvent)
        .select('id, slug')
        .single();

      if (error) {
        if (error.code === '23505') {
          skipped++;
        } else {
          console.error(`  ❌ Insert failed for "${ev.name}": ${error.message}`);
        }
      } else {
        existingBySlug.set(slug, inserted);
        created++;
        if (videoIdArray.length >= 2) {
          console.log(`  ✅ ${ev.name} (${videoIdArray.length} videos, ${ev.year || '?'})`);
        }
      }
    }
  }

  // Final counts
  const { count: postCount } = await supabase.from('uap_events').select('*', { count: 'exact', head: true });

  console.log(`\n✅ Event Backfill Complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total events now: ${postCount}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
