/**
 * UAP Entity Mention Recount Script
 *
 * Recalculates `total_mentions` and `linked_video_ids` for all canonical
 * entities from the source of truth (program_intel_breakdown in uap_analysis).
 *
 * Run this after the backfill to ensure accurate counts, or any time you
 * suspect counts have drifted.
 *
 * Usage:
 *   npx tsx scripts/uap-entity-recount.ts
 *   npx tsx scripts/uap-entity-recount.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import {
  normalizePersonName,
  normalizeOrgName,
  normalizeProgramName,
  toSlug,
} from '../src/lib/pipeline/entity-normalizer';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  console.log(`\n📊 UAP Entity Mention Recount`);
  console.log(`   Dry Run: ${DRY_RUN}\n`);

  // 1. Build a reverse index: for each canonical entity, which video_ids mention it?
  // This is authoritative — derived from the raw analysis data.

  // Paginated fetch — Supabase JS caps at 1000 rows per request
  const PAGE_SIZE = 1000;
  const rows: any[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('uap_analysis')
      .select('video_id, program_intel_breakdown')
      .not('program_intel_breakdown', 'is', null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('❌ Failed to fetch analysis rows:', error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;

    rows.push(...data);
    offset += PAGE_SIZE;
    if (data.length < PAGE_SIZE) break;
  }

  console.log(`   Loaded ${rows.length} analysis rows\n`);

  // Build reverse indexes: slug → Set<videoId>
  const personIndex = new Map<string, Set<string>>();
  const orgIndex = new Map<string, Set<string>>();
  const programIndex = new Map<string, Set<string>>();

  for (const row of rows) {
    const intel = row.program_intel_breakdown;
    const videoId = row.video_id;

    // Persons
    for (const p of (intel.persons || [])) {
      if (!p?.name || typeof p.name !== 'string' || p.name.length < 2) continue;
      if (!p.name.includes(' ')) continue; // Skip single-word names
      if (/^(unknown|unnamed|narrator|interviewer|host|anonymous)/i.test(p.name)) continue;
      const slug = toSlug(normalizePersonName(p.name));
      if (!slug) continue;
      if (!personIndex.has(slug)) personIndex.set(slug, new Set());
      personIndex.get(slug)!.add(videoId);
    }

    // Orgs
    for (const o of (intel.organizations || [])) {
      if (!o?.name || typeof o.name !== 'string' || o.name.length < 2) continue;
      const { canonical } = normalizeOrgName(o.name);
      const slug = toSlug(canonical);
      if (!slug) continue;
      if (!orgIndex.has(slug)) orgIndex.set(slug, new Set());
      orgIndex.get(slug)!.add(videoId);
    }

    // Programs
    for (const pr of (intel.programs || [])) {
      if (!pr?.name || typeof pr.name !== 'string' || pr.name.length < 2) continue;
      const { canonical } = normalizeProgramName(pr.name);
      const slug = toSlug(canonical);
      if (!slug) continue;
      if (!programIndex.has(slug)) programIndex.set(slug, new Set());
      programIndex.get(slug)!.add(videoId);
    }
  }

  // 2. Update each canonical entity with correct counts

  // Persons
  const { data: persons } = await supabase
    .from('uap_canonical_persons')
    .select('id, slug, canonical_name, total_mentions, linked_video_ids');

  let personUpdates = 0;
  for (const person of (persons || [])) {
    const videoIds = personIndex.get(person.slug);
    if (!videoIds) continue;

    const videoIdArray = Array.from(videoIds);
    const currentCount = person.total_mentions || 0;
    const currentVids = (person.linked_video_ids || []).length;

    if (videoIdArray.length !== currentCount || videoIdArray.length !== currentVids) {
      if (DRY_RUN) {
        console.log(`  👤 ${person.canonical_name}: ${currentCount} → ${videoIdArray.length} mentions`);
      } else {
        await supabase
          .from('uap_canonical_persons')
          .update({
            total_mentions: videoIdArray.length,
            linked_video_ids: videoIdArray,
            updated_at: new Date().toISOString(),
          })
          .eq('id', person.id);
      }
      personUpdates++;
    }
  }

  // Orgs
  const { data: orgs } = await supabase
    .from('uap_canonical_orgs')
    .select('id, slug, canonical_name, total_mentions, linked_video_ids');

  let orgUpdates = 0;
  for (const org of (orgs || [])) {
    const videoIds = orgIndex.get(org.slug);
    if (!videoIds) continue;

    const videoIdArray = Array.from(videoIds);
    const currentCount = org.total_mentions || 0;
    const currentVids = (org.linked_video_ids || []).length;

    if (videoIdArray.length !== currentCount || videoIdArray.length !== currentVids) {
      if (DRY_RUN) {
        console.log(`  🏢 ${org.canonical_name}: ${currentCount} → ${videoIdArray.length} mentions`);
      } else {
        await supabase
          .from('uap_canonical_orgs')
          .update({
            total_mentions: videoIdArray.length,
            linked_video_ids: videoIdArray,
            updated_at: new Date().toISOString(),
          })
          .eq('id', org.id);
      }
      orgUpdates++;
    }
  }

  // Programs
  const { data: programs } = await supabase
    .from('uap_canonical_programs')
    .select('id, slug, canonical_name, total_mentions, linked_video_ids');

  let programUpdates = 0;
  for (const prog of (programs || [])) {
    const videoIds = programIndex.get(prog.slug);
    if (!videoIds) continue;

    const videoIdArray = Array.from(videoIds);
    const currentCount = prog.total_mentions || 0;
    const currentVids = (prog.linked_video_ids || []).length;

    if (videoIdArray.length !== currentCount || videoIdArray.length !== currentVids) {
      if (DRY_RUN) {
        console.log(`  📋 ${prog.canonical_name}: ${currentCount} → ${videoIdArray.length} mentions`);
      } else {
        await supabase
          .from('uap_canonical_programs')
          .update({
            total_mentions: videoIdArray.length,
            linked_video_ids: videoIdArray,
            updated_at: new Date().toISOString(),
          })
          .eq('id', prog.id);
      }
      programUpdates++;
    }
  }

  console.log(`\n✅ Recount complete!`);
  console.log(`   Persons updated: ${personUpdates}`);
  console.log(`   Orgs updated: ${orgUpdates}`);
  console.log(`   Programs updated: ${programUpdates}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
