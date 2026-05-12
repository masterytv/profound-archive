/**
 * UAP Contactee Deduplication Script
 * 
 * Finds and merges duplicate contactee profiles before the mass re-analysis run.
 * 
 * Strategy:
 * - Exact slug collisions (shouldn't exist based on audit, but safety check)
 * - Known name variants (middle initials, nicknames, composite entries)
 * - Composite entries like "Betty & Barney Hill" get split into individuals
 * 
 * Usage: npx tsx scripts/uap-contactee-dedup.ts [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

// ─── Known Merge Rules ──────────────────────────────────────────────────────
// [canonical name, ...names to merge into canonical]

const MERGE_RULES: [string, string[]][] = [
  ['Tony Dodd', ['Anthony Dodd']],
  ['Debbie Jordan-Kauble', ['Debra Jordan-Kauble']],
  ['Frank Mannor', ['Frank E. Mannor']],
  ['Leah Haley', ['Leah A. Haley']],
  ['Melvin Brown', ['Melvin E. Brown']],
  ['Joyce Ahrens', ['Ahrens']],
  ['Steven Greer', ['Dr. Steven Greer']],
];

// Composite entries to split into individual profiles
// [composite name, individual names to receive the videos]
const COMPOSITE_SPLITS: [string, string[]][] = [
  ['Betty & Barney Hill', ['Betty Hill', 'Barney Hill']],
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

interface ContacteeRow {
  id: string;
  slug: string;
  display_name: string;
  video_ids: string[] | null;
}

const dryRun = process.argv.includes('--dry-run');
const mergeLog: string[] = [];

function log(msg: string) {
  console.log(msg);
  mergeLog.push(msg);
}

// ─── Merge Function ─────────────────────────────────────────────────────────

async function mergeProfiles(canonicalName: string, duplicateNames: string[]) {
  // Find the canonical profile
  const { data: canonical } = await supabase
    .from('uap_contactee_profiles')
    .select('id, slug, display_name, video_ids')
    .ilike('display_name', canonicalName)
    .maybeSingle();

  for (const dupName of duplicateNames) {
    const { data: duplicate } = await supabase
      .from('uap_contactee_profiles')
      .select('id, slug, display_name, video_ids')
      .ilike('display_name', dupName)
      .maybeSingle();

    if (!duplicate) {
      log(`  SKIP: "${dupName}" not found in DB`);
      continue;
    }

    if (!canonical) {
      // Canonical doesn't exist yet; just rename the duplicate
      log(`  RENAME: "${duplicate.display_name}" → "${canonicalName}"`);
      if (!dryRun) {
        await supabase
          .from('uap_contactee_profiles')
          .update({
            display_name: canonicalName,
            slug: normalizeSlug(canonicalName),
            updated_at: new Date().toISOString(),
          })
          .eq('id', duplicate.id);
      }
      continue;
    }

    // Both exist: merge video_ids from duplicate into canonical, delete duplicate
    const canonicalVideos = canonical.video_ids || [];
    const duplicateVideos = duplicate.video_ids || [];
    const mergedVideos = Array.from(new Set([...canonicalVideos, ...duplicateVideos]));

    log(`  MERGE: "${duplicate.display_name}" (${duplicateVideos.length} videos) → "${canonical.display_name}" (${canonicalVideos.length} videos)`);
    log(`    Combined: ${mergedVideos.length} unique videos`);

    if (!dryRun) {
      // Update canonical with merged video_ids
      await supabase
        .from('uap_contactee_profiles')
        .update({
          video_ids: mergedVideos,
          updated_at: new Date().toISOString(),
        })
        .eq('id', canonical.id);

      // Delete the duplicate
      const { error: deleteError } = await supabase
        .from('uap_contactee_profiles')
        .delete()
        .eq('id', duplicate.id);

      if (deleteError) {
        log(`    ERROR deleting "${dupName}": ${deleteError.message}`);
      } else {
        log(`    DELETED: ${duplicate.id} ("${duplicate.display_name}")`);
      }
    }
  }
}

// ─── Composite Split ────────────────────────────────────────────────────────

async function splitComposite(compositeName: string, individualNames: string[]) {
  const { data: composite } = await supabase
    .from('uap_contactee_profiles')
    .select('id, slug, display_name, video_ids')
    .ilike('display_name', compositeName)
    .maybeSingle();

  if (!composite) {
    log(`  SKIP: Composite "${compositeName}" not found`);
    return;
  }

  const compositeVideos = composite.video_ids || [];
  log(`  SPLIT: "${compositeName}" (${compositeVideos.length} videos) → ${individualNames.join(' + ')}`);

  for (const name of individualNames) {
    const { data: individual } = await supabase
      .from('uap_contactee_profiles')
      .select('id, slug, display_name, video_ids')
      .ilike('display_name', name)
      .maybeSingle();

    if (individual) {
      // Individual exists: merge composite's videos into theirs
      const individualVideos = individual.video_ids || [];
      const merged = Array.from(new Set([...individualVideos, ...compositeVideos]));
      log(`    UPDATE: "${name}" ${individualVideos.length} → ${merged.length} videos`);

      if (!dryRun) {
        await supabase
          .from('uap_contactee_profiles')
          .update({
            video_ids: merged,
            updated_at: new Date().toISOString(),
          })
          .eq('id', individual.id);
      }
    } else {
      // Individual doesn't exist: create from composite
      const slug = normalizeSlug(name);
      log(`    CREATE: "${name}" (slug: ${slug}) with ${compositeVideos.length} videos`);

      if (!dryRun) {
        await supabase
          .from('uap_contactee_profiles')
          .insert({
            slug,
            display_name: name,
            video_ids: compositeVideos,
            published_at: new Date().toISOString(),
          });
      }
    }
  }

  // Delete the composite entry
  log(`    DELETE composite: ${composite.id} ("${compositeName}")`);
  if (!dryRun) {
    const { error } = await supabase
      .from('uap_contactee_profiles')
      .delete()
      .eq('id', composite.id);
    if (error) log(`    ERROR: ${error.message}`);
  }
}

// ─── Auto-Detect Additional Duplicates ──────────────────────────────────────

async function detectFuzzyDuplicates() {
  // Find profiles where slug differs only by middle initial pattern
  const { data: all } = await supabase
    .from('uap_contactee_profiles')
    .select('id, slug, display_name, video_ids')
    .order('display_name');

  if (!all || all.length === 0) return;

  // Group by "simplified slug" (remove single-letter segments that look like initials)
  const groups = new Map<string, ContacteeRow[]>();

  for (const row of all as ContacteeRow[]) {
    // Simplify: remove single-letter parts (middle initials) and common prefixes
    const simplified = row.display_name
      .replace(/\b(Dr|Prof|Gen|Col|Lt|Sgt|Rev|Jr|Sr|III|II)\b\.?/gi, '')
      .replace(/\b[A-Z]\.\s*/g, '') // Remove "E." from "Frank E. Mannor"
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    if (!groups.has(simplified)) groups.set(simplified, []);
    groups.get(simplified)!.push(row);
  }

  // Report groups with more than 1 entry (potential duplicates)
  let found = 0;
  for (const [key, rows] of groups) {
    if (rows.length > 1) {
      // Skip if already in manual rules
      const names = rows.map(r => r.display_name);
      const alreadyHandled = MERGE_RULES.some(([canonical, dupes]) =>
        names.includes(canonical) || dupes.some(d => names.includes(d))
      ) || COMPOSITE_SPLITS.some(([comp]) => names.includes(comp));

      if (alreadyHandled) continue;

      found++;
      log(`  POTENTIAL: "${key}" → ${names.join(', ')}`);
    }
  }

  if (found === 0) log('  No additional fuzzy duplicates detected.');
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  log(`\n${'═'.repeat(60)}`);
  log(`UAP CONTACTEE DEDUP ${dryRun ? '(DRY RUN)' : '(LIVE)'}`);
  log(`${'═'.repeat(60)}\n`);

  // Count before
  const { count: beforeCount } = await supabase
    .from('uap_contactee_profiles')
    .select('*', { count: 'exact', head: true });
  log(`Profiles before: ${beforeCount}`);

  // Step 1: Merge known duplicates
  log('\n── Step 1: Merging known duplicates ──');
  for (const [canonical, dupes] of MERGE_RULES) {
    log(`\nRule: Keep "${canonical}", merge: ${dupes.join(', ')}`);
    await mergeProfiles(canonical, dupes);
  }

  // Step 2: Split composites
  log('\n── Step 2: Splitting composite entries ──');
  for (const [composite, individuals] of COMPOSITE_SPLITS) {
    log(`\nRule: Split "${composite}" → ${individuals.join(' + ')}`);
    await splitComposite(composite, individuals);
  }

  // Step 3: Auto-detect remaining fuzzy duplicates
  log('\n── Step 3: Scanning for additional fuzzy duplicates ──');
  await detectFuzzyDuplicates();

  // Count after
  const { count: afterCount } = await supabase
    .from('uap_contactee_profiles')
    .select('*', { count: 'exact', head: true });
  log(`\nProfiles after: ${afterCount}`);
  log(`Net change: ${(afterCount ?? 0) - (beforeCount ?? 0)}`);

  log(`\n${'═'.repeat(60)}`);
  log(dryRun ? 'DRY RUN COMPLETE — no changes made. Run without --dry-run to apply.' : 'DEDUP COMPLETE');
  log(`${'═'.repeat(60)}\n`);
}

main().catch(console.error);
