/**
 * Bulk Generate UAP Contactee Profiles
 * 
 * Copy-Modify from: scripts/bulk-generate-experiencer-profiles.ts (NDE)
 * 
 * One-time backfill script to create profiles for all existing named
 * contactees in uap_vids. Groups Tier 1 videos by experiencer_name,
 * creates stub profiles, and enriches each with the data-derivation pipeline.
 * 
 * Usage:
 *   npx tsx scripts/bulk-generate-contactee-profiles.ts
 *   npx tsx scripts/bulk-generate-contactee-profiles.ts --limit 50
 *   npx tsx scripts/bulk-generate-contactee-profiles.ts --dry-run
 * 
 * Key differences from NDE:
 * - Table: uap_contactee_profiles (not experiencer_profiles)
 * - Video table: uap_vids (not nde_vids)
 * - Name column: experiencer_name (not experiencerFullName)
 * - Filter: tier = 1 (not isNde IN ('clear_nde', 'possible_nde'))
 * - ID type: UUID (not bigint)
 * - Score columns: UAP triad (evidence, contact_depth, transformation)
 */

import { createClient } from '@supabase/supabase-js';
import { generateContacteeProfile } from '../src/lib/pipeline/contactee-profile';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// ─── CLI Args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit'));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf('--limit') + 1] || '9999', 10) : 9999;
const DRY_RUN = args.includes('--dry-run');

// ─── Helpers ────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log(`\n🛸 UAP Contactee Profile Generator`);
  console.log(`   Limit: ${LIMIT}`);
  console.log(`   Dry Run: ${DRY_RUN}\n`);

  // 1. Get all Tier 1 videos with experiencer names
  const { data: videos, error: fetchError } = await supabase
    .from('uap_vids')
    .select('video_id, experiencer_name, title, view_count, thumbnail_url, channel_id, channel_name')
    .eq('tier', 1)
    .not('experiencer_name', 'is', null)
    .order('view_count', { ascending: false });

  if (fetchError) {
    console.error('❌ Error fetching videos:', fetchError.message);
    process.exit(1);
  }

  if (!videos || videos.length === 0) {
    console.log('⚠️ No Tier 1 videos with experiencer names found.');
    return;
  }

  // 2. Group by experiencer name (case-insensitive)
  const groups = new Map<string, typeof videos>();
  for (const video of videos) {
    const name = video.experiencer_name!.trim();
    const key = name.toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(video);
  }

  console.log(`📊 Found ${videos.length} Tier 1 videos across ${groups.size} unique contactees\n`);

  // 3. Sort by total views (descending) for priority ordering
  const sorted = Array.from(groups.entries())
    .map(([key, vids]) => ({
      key,
      name: vids[0].experiencer_name!.trim(),
      videos: vids,
      totalViews: vids.reduce((sum, v) => sum + (parseInt(v.view_count, 10) || 0), 0),
    }))
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, LIMIT);

  // 4. Check which profiles already exist
  const { data: existingProfiles } = await supabase
    .from('uap_contactee_profiles')
    .select('slug, display_name');

  const existingSlugs = new Set((existingProfiles || []).map(p => p.slug));
  const existingNames = new Set((existingProfiles || []).map(p => p.display_name.toLowerCase()));

  console.log(`📋 ${existingProfiles?.length || 0} profiles already exist\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;
  let enriched = 0;

  for (let i = 0; i < sorted.length; i++) {
    const group = sorted[i];
    const slug = toSlug(group.name);

    // Skip if already exists
    if (existingSlugs.has(slug) || existingNames.has(group.key)) {
      skipped++;
      continue;
    }

    const videoIds = group.videos.map(v => v.video_id);
    const progress = `[${i + 1}/${sorted.length}]`;

    if (DRY_RUN) {
      console.log(`  ${progress} 🔍 Would create: "${group.name}" (${slug}) — ${videoIds.length} videos, ${group.totalViews.toLocaleString()} views`);
      created++;
      continue;
    }

    // Create stub profile
    try {
      const { data: inserted, error: insertError } = await supabase
        .from('uap_contactee_profiles')
        .insert({
          slug,
          display_name: group.name,
          video_ids: videoIds,
          published_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertError) {
        console.error(`  ${progress} ❌ Insert failed for "${group.name}": ${insertError.message}`);
        errors++;
        continue;
      }

      created++;

      // Enrich the profile
      const result = await generateContacteeProfile(supabase, inserted.id);
      if (result.status === 'success') {
        enriched++;
        console.log(`  ${progress} ✅ ${group.name} — ${videoIds.length} videos, ${group.totalViews.toLocaleString()} views — ${result.message}`);
      } else {
        console.log(`  ${progress} ⚠️ ${group.name} — Created but enrichment: ${result.status} — ${result.message}`);
      }

      // Brief pause to avoid overwhelming the DB
      await new Promise(r => setTimeout(r, 300));
    } catch (err: any) {
      console.error(`  ${progress} ❌ Error for "${group.name}": ${err.message}`);
      errors++;
    }
  }

  console.log(`\n✅ Bulk generation complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Enriched: ${enriched}`);
  console.log(`   Skipped (already exist): ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total profiles: ${(existingProfiles?.length || 0) + created}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
