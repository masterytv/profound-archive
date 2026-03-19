/**
 * Bulk Generate Experiencer Profiles
 * 
 * Groups nde_vids by experiencerFullName, ranks by total views,
 * creates new experiencer_profiles rows for the top N, and enriches
 * each using the existing pipeline (no LLM calls — pure data derivation).
 * 
 * Usage: npx tsx scripts/bulk-generate-experiencer-profiles.ts [--limit 100] [--dry-run]
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { generateExperiencerProfile } from '../src/lib/pipeline/experiencer-profile';

// ─── Config ─────────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 100;

// ─── Helpers ────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = DEFAULT_LIMIT;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    }
    if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }

  return { limit, dryRun };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const { limit, dryRun } = parseArgs();

  // Load .env.local
  const envContent = readFileSync('.env.local', 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!
  );

  console.log(`\n🔍 Finding top ${limit} named experiencers by total views...\n`);

  // 1. Query all named experiencers grouped by full name
  //    Supabase client caps at 1000 rows — use RPC or paginate.
  //    Since we need aggregation, use a raw SQL call via rpc.
  const { data: topExperiencers, error: queryError } = await supabase.rpc(
    'get_top_experiencers_by_views',
    { result_limit: limit }
  ).throwOnError();

  // If the RPC doesn't exist yet, fall back to manual pagination
  if (queryError) {
    console.error('RPC not found — using fallback query approach');
    process.exit(1);
  }

  console.log(`Found ${topExperiencers.length} experiencers with full names.\n`);

  // 2. Get existing profile names so we skip them
  const { data: existingProfiles } = await supabase
    .from('experiencer_profiles')
    .select('full_name');

  const existingNames = new Set(
    (existingProfiles || []).map((p: any) => p.full_name.toLowerCase())
  );

  console.log(`${existingNames.size} profiles already exist — will skip those.\n`);

  // 3. Filter out existing profiles
  const newExperiencers = topExperiencers.filter(
    (e: any) => !existingNames.has(e.full_name.toLowerCase())
  );

  console.log(`${newExperiencers.length} new profiles to create.\n`);

  if (dryRun) {
    console.log('── DRY RUN ── Would create profiles for:\n');
    for (const e of newExperiencers) {
      console.log(`  ${e.full_name} — ${e.video_count} videos, ${Number(e.total_views).toLocaleString()} views`);
    }
    console.log('\nRun without --dry-run to create profiles.');
    return;
  }

  // 4. Create profiles and enrich each one
  let created = 0;
  let enriched = 0;
  let errors = 0;

  for (const exp of newExperiencers) {
    const slug = toSlug(exp.full_name);
    const videoIds: string[] = exp.video_ids;

    console.log(`[${created + 1}/${newExperiencers.length}] ${exp.full_name} (${videoIds.length} videos, ${Number(exp.total_views).toLocaleString()} views)`);

    try {
      // Insert the new profile (or find existing on re-run)
      let profileId: number;

      const { data: existing } = await supabase
        .from('experiencer_profiles')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (existing) {
        console.log(`  ↳ Profile already exists (re-run), enriching...`);
        profileId = existing.id;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('experiencer_profiles')
          .insert({
            slug,
            full_name: exp.full_name,
            video_ids: videoIds,
            published_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (insertError) {
          console.error(`  ✗ Insert failed: ${insertError.message}`);
          errors++;
          continue;
        }
        profileId = inserted.id;
        created++;
      }

      // Enrich using existing pipeline
      const result = await generateExperiencerProfile(supabase, profileId);
      if (result.status === 'success') {
        console.log(`  ✓ Enriched: ${result.message}`);
        enriched++;
      } else {
        console.log(`  ⚠ Enrich ${result.status}: ${result.message}`);
      }
    } catch (err: any) {
      console.error(`  ✗ Error: ${err.message}`);
      errors++;
    }

    // Brief pause to avoid hammering the DB
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Created:  ${created}`);
  console.log(`  Enriched: ${enriched}`);
  console.log(`  Errors:   ${errors}`);
  console.log(`  Skipped:  ${existingNames.size} (already existed)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main().catch(console.error);
