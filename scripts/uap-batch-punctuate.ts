/**
 * UAP Batch Punctuation Script
 *
 * Copy-Modify from: scripts/uap-batch-classify.ts (batch pattern)
 * Module: src/lib/pipeline/punctuate-uap.ts
 *
 * Processes Tier 1+2 UAP videos that have raw subtitles but no punctuated text.
 * - Batches of 5 with 500ms delay (punctuation is CPU-only, no API calls)
 * - Resume support: skips videos that already have subtitles_punctuated
 * - Tier 3 gate: only processes classified (Tier 1+2) videos
 * - Updates uap_vids.subtitles_punctuated, subtitles_cleaned, and intake_status
 *
 * Usage: npx tsx scripts/uap-batch-punctuate.ts
 */

import { createClient } from '@supabase/supabase-js';
import { punctuateUapTranscript, shouldSkipVideo } from '../src/lib/pipeline/punctuate-uap';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 500;
const MAX_VIDEOS_PER_RUN = 1000;

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get status counts
  const { count: totalCount } = await supabase
    .from('uap_vids')
    .select('*', { count: 'exact', head: true });

  const { count: pendingCount } = await supabase
    .from('uap_vids')
    .select('*', { count: 'exact', head: true })
    .in('intake_status', ['classified'])
    .not('raw_timestamped_subtitles', 'is', null)
    .is('subtitles_punctuated', null);

  const { count: alreadyDone } = await supabase
    .from('uap_vids')
    .select('*', { count: 'exact', head: true })
    .not('subtitles_punctuated', 'is', null);

  console.log(`\n📊 UAP Punctuation Status:`);
  console.log(`   Total videos: ${totalCount}`);
  console.log(`   Already punctuated: ${alreadyDone}`);
  console.log(`   Pending (classified + has subtitles): ${pendingCount}`);
  console.log(`   Max this run: ${MAX_VIDEOS_PER_RUN}\n`);

  if (!pendingCount || pendingCount === 0) {
    console.log('✅ No videos need punctuation. Nothing to do.');
    return;
  }

  // Fetch unpunctuated Tier 1+2 videos that have raw subtitles
  const { data: videos, error } = await supabase
    .from('uap_vids')
    .select('video_id, title, tier, intake_status, raw_timestamped_subtitles')
    .in('intake_status', ['classified'])
    .not('raw_timestamped_subtitles', 'is', null)
    .is('subtitles_punctuated', null)
    .order('created_at', { ascending: true })
    .limit(MAX_VIDEOS_PER_RUN);

  if (error) {
    console.error('❌ Error fetching videos:', error.message);
    process.exit(1);
  }

  if (!videos || videos.length === 0) {
    console.log('✅ No pending videos found.');
    return;
  }

  console.log(`🚀 Processing ${videos.length} videos in batches of ${BATCH_SIZE}...\n`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let noSubtitles = 0;

  for (let i = 0; i < videos.length; i += BATCH_SIZE) {
    const batch = videos.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (video) => {
        // Tier 3 gate
        if (shouldSkipVideo(video.tier, video.intake_status)) {
          skipped++;
          return { video_id: video.video_id, status: 'skipped' as const };
        }

        // Punctuate
        const result = punctuateUapTranscript(video.video_id, video.raw_timestamped_subtitles);

        if (!result) {
          noSubtitles++;
          return { video_id: video.video_id, status: 'no_subtitles' as const };
        }

        // Update uap_vids with punctuated text and intake_status
        const { error: updateError } = await supabase
          .from('uap_vids')
          .update({
            subtitles_punctuated: result.punctuated,
            subtitles_cleaned: result.cleaned,
            intake_status: 'punctuated',
          })
          .eq('video_id', video.video_id);

        if (updateError) {
          throw new Error(`DB update failed for ${video.video_id}: ${updateError.message}`);
        }

        return {
          video_id: video.video_id,
          status: 'success' as const,
          chars: result.punctuated.length,
          searchChunks: result.searchChunks.length,
          chatChunks: result.chatChunks.length,
        };
      })
    );

    // Process results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.status === 'success') processed++;
      } else {
        errors++;
        console.error(`  ❌ ${result.reason}`);
      }
    }

    // Progress checkpoint
    console.log(
      `  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${processed}/${videos.length} done | ` +
      `Skipped:${skipped} NoSubs:${noSubtitles} Errors:${errors}`
    );

    // Rate limit delay
    if (i + BATCH_SIZE < videos.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log(`\n✅ Punctuation complete!`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Skipped (Tier 3): ${skipped}`);
  console.log(`   No subtitles: ${noSubtitles}`);
  console.log(`   Errors: ${errors}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
