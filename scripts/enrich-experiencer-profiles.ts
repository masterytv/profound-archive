/**
 * Batch Experiencer Profile Enrichment Script
 * 
 * Processes profiles in batches of 50 with pauses to stay within
 * Micro-tier DB limits (1 GB RAM, 87 Mbps baseline IO).
 * 
 * Usage: npx tsx scripts/enrich-experiencer-profiles.ts [--batch-size 50] [--only-new]
 */

import { createClient } from '@supabase/supabase-js';
import { generateExperiencerProfile } from '../src/lib/pipeline/experiencer-profile';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const BATCH_SIZE = parseInt(process.argv.find((_, i, a) => a[i - 1] === '--batch-size') || '50', 10);
const ONLY_NEW = process.argv.includes('--only-new');

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  // Fetch profiles to enrich
  let query = supabase
    .from('experiencer_profiles')
    .select('id, full_name, slug, highlight_quote')
    .not('published_at', 'is', null)
    .order('id');

  if (ONLY_NEW) {
    // Only process profiles without enrichment data yet
    query = query.is('highlight_quote', null);
  }

  const { data: profiles, error } = await query;

  if (error || !profiles) {
    console.error('❌ Failed to fetch profiles:', error?.message);
    process.exit(1);
  }

  console.log(`\n🚀 Enriching ${profiles.length} profiles in batches of ${BATCH_SIZE}\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
    const batch = profiles.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(profiles.length / BATCH_SIZE);

    console.log(`\n── Batch ${batchNum}/${totalBatches} (profiles ${i + 1}-${i + batch.length}) ──`);

    for (const profile of batch) {
      try {
        const result = await generateExperiencerProfile(supabase, profile.id);
        
        if (result.status === 'success') {
          successCount++;
          console.log(`  ✅ ${result.full_name} — ${result.message}`);
        } else if (result.status === 'no_videos') {
          skipCount++;
          console.log(`  ⏭️  ${result.full_name} — ${result.message}`);
        } else {
          errorCount++;
          console.log(`  ❌ ${result.full_name} — ${result.message}`);
        }
      } catch (err: any) {
        errorCount++;
        console.error(`  ❌ ${profile.full_name} — ${err.message}`);
      }

      // 200ms pause between each profile
      await new Promise(r => setTimeout(r, 200));
    }

    // 2s pause between batches to let the DB breathe
    if (i + BATCH_SIZE < profiles.length) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const pct = ((i + batch.length) / profiles.length * 100).toFixed(1);
      console.log(`\n  ⏳ ${pct}% done (${elapsed}s elapsed) — pausing 2s...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n════════════════════════════════════════`);
  console.log(`✅ Done in ${totalTime}s`);
  console.log(`   Enriched: ${successCount}`);
  console.log(`   Skipped:  ${skipCount}`);
  console.log(`   Errors:   ${errorCount}`);
  console.log(`════════════════════════════════════════\n`);
}

main().catch(console.error);
