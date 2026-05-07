/**
 * UAP Encounter Context Batch Backfill
 * 
 * Runs the encounter context extraction on all Tier 1 videos that
 * don't yet have encounter_context populated.
 * 
 * Usage:
 *   npx esbuild scripts/uap-batch-context.ts --bundle --platform=node --outfile=scripts/batch-context-compiled.mjs --format=esm
 *   node --env-file=.env.local scripts/batch-context-compiled.mjs --dry-run
 *   node --env-file=.env.local scripts/batch-context-compiled.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { analyzeUapEncounterContext } from '../src/lib/ai/uap-encounter-context';

const CONCURRENCY = 5;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log(`\n📍 UAP Encounter Context Batch Backfill${dryRun ? ' (DRY RUN)' : ''}`);
  console.log('═'.repeat(60));

  // Find Tier 1 videos WITH punctuated transcripts but WITHOUT encounter_context
  const { data: videos, error } = await supabase
    .from('uap_vids')
    .select('video_id, title, subtitles_punctuated')
    .eq('tier', 1)
    .not('subtitles_punctuated', 'is', null)
    .order('title');

  if (error || !videos) {
    console.error('❌ Failed to fetch videos:', error?.message);
    process.exit(1);
  }

  // Filter to those without encounter_context
  const videoIds = videos.map(v => v.video_id);
  const { data: existing } = await supabase
    .from('uap_analysis')
    .select('video_id')
    .in('video_id', videoIds)
    .not('encounter_context', 'is', null);

  const existingIds = new Set((existing ?? []).map(r => r.video_id));
  const pending = videos.filter(v => !existingIds.has(v.video_id));

  console.log(`📊 Total Tier 1 videos: ${videos.length}`);
  console.log(`✅ Already have context: ${existingIds.size}`);
  console.log(`⏳ Pending: ${pending.length}`);
  console.log('─'.repeat(60));

  if (dryRun) {
    console.log('\n🔍 DRY RUN — would process:');
    for (const v of pending) {
      console.log(`  ${v.video_id}  ${v.title?.slice(0, 70)}`);
    }
    console.log(`\nRun without --dry-run to execute.`);
    return;
  }

  if (pending.length === 0) {
    console.log('✅ All videos already have encounter context!');
    return;
  }

  // Process in batches with concurrency limit
  let processed = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const batch = pending.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (video) => {
        if (!video.subtitles_punctuated) return;

        const start = Date.now();
        const result = await analyzeUapEncounterContext(video.subtitles_punctuated);
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);

        if (!result) {
          console.log(`  ❌ ${video.video_id} — failed (${elapsed}s)`);
          failed++;
          return;
        }

        // Upsert to uap_analysis
        const { error: upsertError } = await supabase
          .from('uap_analysis')
          .upsert({
            video_id: video.video_id,
            encounter_context: result,
          }, { onConflict: 'video_id' });

        if (upsertError) {
          console.log(`  ❌ ${video.video_id} — save failed: ${upsertError.message}`);
          failed++;
          return;
        }

        processed++;
        const loc = result.location?.nearest_city || 'unknown';
        const date = result.event_date || '?';
        const mil = result.military_context?.is_military_witness ? '🎖️' : '';
        console.log(`  ✅ ${video.video_id} — ${loc}, ${date} ${mil} (${elapsed}s) [${processed}/${pending.length}]`);
      })
    );

    // Log any unexpected errors
    for (const r of results) {
      if (r.status === 'rejected') {
        console.error(`  💥 Unexpected error:`, r.reason);
        failed++;
      }
    }
  }

  console.log('\n═'.repeat(60));
  console.log(`📊 Done! Processed: ${processed} | Failed: ${failed} | Total: ${pending.length}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
