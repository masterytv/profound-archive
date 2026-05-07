/**
 * Re-enrich all UAP contactee profiles that were created as stubs.
 * 
 * Run after fixing the published_at → date column bug.
 * 
 * Usage: npx tsx scripts/re-enrich-contactee-profiles.ts [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import { generateContacteeProfile } from '../src/lib/pipeline/contactee-profile';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log(`\n🔄 Re-enriching UAP Contactee Profiles`);
  console.log(`   Dry Run: ${DRY_RUN}\n`);

  // Fetch all profiles that need enrichment (total_views is null = never enriched)
  const { data: profiles, error } = await supabase
    .from('uap_contactee_profiles')
    .select('id, slug, display_name')
    .is('avg_evidence_score', null)
    .order('created_at');

  if (error || !profiles) {
    console.error('❌ Error fetching profiles:', error?.message);
    process.exit(1);
  }

  console.log(`📋 Found ${profiles.length} un-enriched profiles\n`);

  if (DRY_RUN) {
    for (const p of profiles.slice(0, 10)) {
      console.log(`  🔍 Would enrich: "${p.display_name}" (${p.slug})`);
    }
    if (profiles.length > 10) console.log(`  ... and ${profiles.length - 10} more`);
    return;
  }

  let enriched = 0;
  let errors = 0;

  for (let i = 0; i < profiles.length; i++) {
    const p = profiles[i];
    const progress = `[${i + 1}/${profiles.length}]`;

    try {
      const result = await generateContacteeProfile(supabase, p.id);
      if (result.status === 'success') {
        enriched++;
        console.log(`  ${progress} ✅ ${result.display_name} — ${result.message}`);
      } else {
        console.log(`  ${progress} ⚠️ ${result.display_name} — ${result.status}: ${result.message}`);
      }
    } catch (err: any) {
      errors++;
      console.error(`  ${progress} ❌ ${p.display_name}: ${err.message}`);
    }

    // Brief pause
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n✅ Re-enrichment complete!`);
  console.log(`   Enriched: ${enriched}`);
  console.log(`   Errors: ${errors}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
