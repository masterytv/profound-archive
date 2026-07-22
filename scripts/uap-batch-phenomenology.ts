/**
 * UAP Batch Phenomenology Backfill Script
 * 
 * Backfills phenomenology_breakdown for all Tier 1 videos that have
 * punctuated subtitles but no phenomenology breakdown yet.
 * 
 * Usage (from a dev laptop — this is a manual backfill, not a cron job):
 *   1. Build: npx esbuild scripts/uap-batch-phenomenology.ts --bundle --platform=node --outfile=scripts/batch-phenom-compiled.mjs --format=esm
 *   2. Run:   node --env-file=.env.local scripts/batch-phenom-compiled.mjs [--dry-run]
 *
 * The build output (scripts/batch-phenom-compiled.mjs) is gitignored — rebuild it
 * on demand rather than committing it. A committed bundle inlines openai/zod/
 * supabase-js and silently drifts from this source once either side is edited
 * (docs/IMPROVEMENT_PLAN.md A-1). Nothing on the Oracle VM consumes the bundle:
 * the crontab jobs run .ts sources through `npx tsx`, and scripts/deploy-oracle.sh
 * has no bundling step.
 *
 * Options:
 *   --dry-run    Show what would be processed without running analysis
 *   --limit=N    Process at most N videos (default: all)
 * 
 * ONLY RUN AFTER USER APPROVAL FROM STORY 6.1.2 TRIAL TESTING.
 */

import { createClient } from '@supabase/supabase-js';
import { analyzeUapPhenomenology } from '../src/lib/ai/uap-phenomenology';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const CONCURRENCY = 5;
const BATCH_DELAY_MS = 2000;

interface VideoRow {
  video_id: string;
  title: string;
  subtitles_punctuated: string;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

  console.log('🔬 UAP Batch Phenomenology Backfill');
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`  Concurrency: ${CONCURRENCY}`);
  if (limit) console.log(`  Limit: ${limit}`);
  console.log('─'.repeat(60));

  // Find all Tier 1 videos needing phenomenology
  let query = supabase
    .from('uap_vids')
    .select('video_id, title, subtitles_punctuated')
    .eq('tier', 1)
    .not('subtitles_punctuated', 'is', null);

  const { data: allVids, error: fetchError } = await query;
  if (fetchError) {
    console.error('❌ Failed to fetch videos:', fetchError.message);
    process.exit(1);
  }

  // Filter for those missing phenomenology_breakdown
  const { data: existingAnalysis } = await supabase
    .from('uap_analysis')
    .select('video_id')
    .not('phenomenology_breakdown', 'is', null);
  
  const alreadyDone = new Set((existingAnalysis || []).map(a => a.video_id));
  
  let candidates = (allVids || [])
    .filter((v: VideoRow) => !alreadyDone.has(v.video_id) && v.subtitles_punctuated?.length > 500);
  
  if (limit) candidates = candidates.slice(0, limit);

  console.log(`📊 Found ${candidates.length} videos to process (${alreadyDone.size} already done)`);

  if (dryRun) {
    for (const v of candidates) {
      console.log(`  Would process: ${v.video_id} — ${(v as VideoRow).title?.slice(0, 70)}`);
    }
    console.log('\n✅ Dry run complete. Remove --dry-run to process.');
    return;
  }

  // Process in batches of CONCURRENCY
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    const batchNum = Math.floor(i / CONCURRENCY) + 1;
    const totalBatches = Math.ceil(candidates.length / CONCURRENCY);
    
    console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} videos)`);

    const results = await Promise.allSettled(
      batch.map(async (v: VideoRow) => {
        const start = Date.now();
        try {
          const result = await analyzeUapPhenomenology(v.subtitles_punctuated);
          if (!result) {
            console.log(`  ❌ ${v.video_id} — analysis returned null (${((Date.now() - start) / 1000).toFixed(1)}s)`);
            return { videoId: v.video_id, success: false };
          }

          // Save to uap_analysis
          const { error: saveError } = await supabase
            .from('uap_analysis')
            .upsert({
              video_id: v.video_id,
              phenomenology_breakdown: result,
            }, { onConflict: 'video_id' });

          if (saveError) {
            console.log(`  ❌ ${v.video_id} — save failed: ${saveError.message}`);
            return { videoId: v.video_id, success: false };
          }

          console.log(`  ✅ ${v.video_id} — ${v.title?.slice(0, 50)} (${((Date.now() - start) / 1000).toFixed(1)}s)`);
          return { videoId: v.video_id, success: true };
        } catch (err: any) {
          console.log(`  ❌ ${v.video_id} — error: ${err.message} (${((Date.now() - start) / 1000).toFixed(1)}s)`);
          return { videoId: v.video_id, success: false };
        }
      })
    );

    for (const r of results) {
      processed++;
      if (r.status === 'fulfilled' && r.value.success) {
        succeeded++;
      } else {
        failed++;
      }
    }

    // Delay between batches to avoid rate limits
    if (i + CONCURRENCY < candidates.length) {
      console.log(`  ⏳ Waiting ${BATCH_DELAY_MS}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`✅ Backfill complete: ${succeeded}/${processed} succeeded, ${failed} failed`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
