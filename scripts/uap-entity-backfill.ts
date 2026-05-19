/**
 * UAP Entity Backfill Script
 *
 * One-time batch script that reads program_intel_breakdown from ALL
 * existing uap_analysis rows and populates the canonical entity tables
 * (uap_canonical_persons, uap_canonical_orgs, uap_canonical_programs).
 *
 * This is the historical backfill — the live pipeline (intake-uap.ts
 * Step 12.6) handles new videos going forward.
 *
 * Usage:
 *   npx tsx scripts/uap-entity-backfill.ts              # Full run
 *   npx tsx scripts/uap-entity-backfill.ts --dry-run     # Preview counts
 *   npx tsx scripts/uap-entity-backfill.ts --limit 100   # Process first N
 */

import { createClient } from '@supabase/supabase-js';
import { syncEntitiesForVideo, clearEntityCache } from '../src/lib/pipeline/entity-sync';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// ─── CLI Args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getArgValue(name: string, defaultVal: number): number {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1]) return parseInt(args[idx + 1], 10);
  const eq = args.find(a => a.startsWith(`--${name}=`));
  if (eq) return parseInt(eq.split('=')[1], 10);
  return defaultVal;
}

const DRY_RUN = args.includes('--dry-run');
const LIMIT = getArgValue('limit', 50000);
const CACHE_REFRESH_INTERVAL = 50; // Refresh entity cache every N videos

// ─── Paginated Fetch ─────────────────────────────────────────────────────────
// Supabase JS client caps at 1000 rows per request. We paginate to get all.

async function fetchAllVideoIds(supabase: ReturnType<typeof createClient>): Promise<string[]> {
  const PAGE_SIZE = 1000;
  const allIds: string[] = [];
  let offset = 0;

  while (allIds.length < LIMIT) {
    const { data, error } = await supabase
      .from('uap_analysis')
      .select('video_id')
      .not('program_intel_breakdown', 'is', null)
      .order('video_id')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('❌ Error fetching page:', error.message);
      break;
    }

    if (!data || data.length === 0) break;

    allIds.push(...data.map(r => r.video_id));
    offset += PAGE_SIZE;

    // If we got fewer than PAGE_SIZE, we've reached the end
    if (data.length < PAGE_SIZE) break;
  }

  return allIds.slice(0, LIMIT);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  console.log(`\n🔄 UAP Entity Backfill`);
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN (will sync but not persist)' : '🚀 LIVE RUN'}`);
  console.log(`   Limit: ${LIMIT}\n`);

  // Get pre-backfill counts
  const { count: prePersons } = await supabase.from('uap_canonical_persons').select('*', { count: 'exact', head: true });
  const { count: preOrgs } = await supabase.from('uap_canonical_orgs').select('*', { count: 'exact', head: true });
  const { count: prePrograms } = await supabase.from('uap_canonical_programs').select('*', { count: 'exact', head: true });

  console.log(`📊 Pre-backfill counts:`);
  console.log(`   Persons: ${prePersons}`);
  console.log(`   Organizations: ${preOrgs}`);
  console.log(`   Programs: ${prePrograms}\n`);

  // Fetch ALL video_ids with program_intel_breakdown (paginated)
  console.log('📥 Fetching video IDs (paginated)...');
  const videoIds = await fetchAllVideoIds(supabase);

  if (videoIds.length === 0) {
    console.log('✅ No analysis rows with program_intel_breakdown found.');
    return;
  }

  console.log(`🚀 Processing ${videoIds.length} videos...\n`);

  const totals = {
    persons: { created: 0, updated: 0, skipped: 0 },
    orgs: { created: 0, updated: 0, skipped: 0 },
    programs: { created: 0, updated: 0, skipped: 0 },
    errors: 0,
  };

  for (let i = 0; i < videoIds.length; i++) {
    const videoId = videoIds[i];

    // Clear cache periodically so new entities are picked up for dedup
    if (i > 0 && i % CACHE_REFRESH_INTERVAL === 0) {
      clearEntityCache();
      const pct = ((i / videoIds.length) * 100).toFixed(1);
      console.log(
        `  📦 Progress: ${i}/${videoIds.length} (${pct}%) | ` +
        `Created: ${totals.persons.created}P/${totals.orgs.created}O/${totals.programs.created}Pr | ` +
        `Updated: ${totals.persons.updated}P/${totals.orgs.updated}O/${totals.programs.updated}Pr | ` +
        `Errors: ${totals.errors}`
      );
    }

    try {
      const result = await syncEntitiesForVideo(supabase, videoId);

      totals.persons.created += result.persons.created;
      totals.persons.updated += result.persons.updated;
      totals.persons.skipped += result.persons.skipped;
      totals.orgs.created += result.orgs.created;
      totals.orgs.updated += result.orgs.updated;
      totals.orgs.skipped += result.orgs.skipped;
      totals.programs.created += result.programs.created;
      totals.programs.updated += result.programs.updated;
      totals.programs.skipped += result.programs.skipped;

      // Log only if something was created (reduce noise)
      const created = result.persons.created + result.orgs.created + result.programs.created;
      if (created > 0) {
        console.log(
          `  ✅ ${videoId}: +${result.persons.created}P +${result.orgs.created}O +${result.programs.created}Pr`
        );
      }
    } catch (err: any) {
      totals.errors++;
      console.error(`  ❌ ${videoId}: ${err.message}`);
    }
  }

  // Get post-backfill counts
  clearEntityCache();
  const { count: postPersons } = await supabase.from('uap_canonical_persons').select('*', { count: 'exact', head: true });
  const { count: postOrgs } = await supabase.from('uap_canonical_orgs').select('*', { count: 'exact', head: true });
  const { count: postPrograms } = await supabase.from('uap_canonical_programs').select('*', { count: 'exact', head: true });

  console.log(`\n✅ Backfill complete!\n`);
  console.log(`📊 Results:`);
  console.log(`   Persons:       ${prePersons} → ${postPersons} (+${(postPersons || 0) - (prePersons || 0)} new, ${totals.persons.updated} updated)`);
  console.log(`   Organizations: ${preOrgs} → ${postOrgs} (+${(postOrgs || 0) - (preOrgs || 0)} new, ${totals.orgs.updated} updated)`);
  console.log(`   Programs:      ${prePrograms} → ${postPrograms} (+${(postPrograms || 0) - (prePrograms || 0)} new, ${totals.programs.updated} updated)`);
  console.log(`   Errors:        ${totals.errors}`);

  if (DRY_RUN) {
    console.log(`\n⚠️  DRY RUN — changes were written to the database.`);
    console.log(`   The "dry-run" ran the full sync to give you accurate counts.`);
    console.log(`   Run the recount script afterwards: npx tsx scripts/uap-entity-recount.ts`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
