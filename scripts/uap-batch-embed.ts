/**
 * UAP Batch Embedding Script
 *
 * Copy-Modify from: scripts/uap-batch-classify.ts (batch pattern)
 *                    src/lib/pipeline/intake.ts (generateEmbeddings, lines 662-769)
 * Module: src/lib/pipeline/embed-uap.ts
 *
 * Generates embeddings for punctuated UAP videos:
 *   1. Re-chunks the punctuated text into search+chat chunks
 *   2. Generates embeddings via OpenAI text-embedding-3-small
 *   3. Inserts into uap_punctuated_embeddings and uap_chatbot_chunks
 *
 * - Processes Tier 1+2 videos only (intake_status = 'punctuated')
 * - Batches of 3 (each video = many API calls, so conservative)
 * - Resume support: skips videos that already have embeddings
 * - Tier 3 gate enforced
 *
 * Usage: npx tsx scripts/uap-batch-embed.ts
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { punctuateUapTranscript, shouldSkipVideo } from '../src/lib/pipeline/punctuate-uap';
import { embedUapVideo } from '../src/lib/pipeline/embed-uap';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const BATCH_SIZE = 3; // Conservative — each video makes many OpenAI embedding calls
const BATCH_DELAY_MS = 2000;
const MAX_VIDEOS_PER_RUN = 100;

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  // Get status counts
  const { count: totalPunctuated } = await supabase
    .from('uap_vids')
    .select('*', { count: 'exact', head: true })
    .eq('intake_status', 'punctuated');

  // Videos that are punctuated but don't have embeddings yet
  // Check by looking for videos with intake_status='punctuated' (not yet 'embedded')
  const { count: pendingCount } = await supabase
    .from('uap_vids')
    .select('*', { count: 'exact', head: true })
    .eq('intake_status', 'punctuated');

  const { count: alreadyEmbedded } = await supabase
    .from('uap_vids')
    .select('*', { count: 'exact', head: true })
    .eq('intake_status', 'embedded');

  console.log(`\n📊 UAP Embedding Status:`);
  console.log(`   Total punctuated: ${totalPunctuated}`);
  console.log(`   Already embedded: ${alreadyEmbedded}`);
  console.log(`   Pending: ${pendingCount}`);
  console.log(`   Max this run: ${MAX_VIDEOS_PER_RUN}\n`);

  if (!pendingCount || pendingCount === 0) {
    console.log('✅ No videos need embedding. Nothing to do.');
    return;
  }

  // Fetch punctuated videos that need embedding
  const { data: videos, error } = await supabase
    .from('uap_vids')
    .select('video_id, title, tier, intake_status, raw_timestamped_subtitles, subtitles_punctuated')
    .eq('intake_status', 'punctuated')
    .not('subtitles_punctuated', 'is', null)
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
  let totalSearchChunks = 0;
  let totalChatChunks = 0;

  for (let i = 0; i < videos.length; i += BATCH_SIZE) {
    const batch = videos.slice(i, i + BATCH_SIZE);

    // Process sequentially within batch to control OpenAI rate limits
    for (const video of batch) {
      try {
        // Tier 3 gate
        if (shouldSkipVideo(video.tier, video.intake_status)) {
          skipped++;
          continue;
        }

        // Re-generate chunks from raw subtitles (we need the structured chunks)
        const punctResult = punctuateUapTranscript(video.video_id, video.raw_timestamped_subtitles);
        if (!punctResult) {
          console.log(`  ⚠️ ${video.video_id}: No chunks generated, skipping`);
          skipped++;
          continue;
        }

        // Generate and insert embeddings
        const embedResult = await embedUapVideo(
          supabase,
          openai,
          video.video_id,
          punctResult.searchChunks,
          punctResult.chatChunks,
        );

        // Update intake_status to 'embedded'
        await supabase
          .from('uap_vids')
          .update({ intake_status: 'embedded' })
          .eq('video_id', video.video_id);

        processed++;
        totalSearchChunks += embedResult.searchChunksInserted;
        totalChatChunks += embedResult.chatChunksInserted;
      } catch (err: any) {
        errors++;
        console.error(`  ❌ ${video.video_id}: ${err.message}`);
      }
    }

    // Progress checkpoint
    console.log(
      `  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${processed}/${videos.length} done | ` +
      `Search:${totalSearchChunks} Chat:${totalChatChunks} | Skipped:${skipped} Errors:${errors}`
    );

    // Rate limit delay
    if (i + BATCH_SIZE < videos.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log(`\n✅ Embedding complete!`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Search chunks inserted: ${totalSearchChunks}`);
  console.log(`   Chat chunks inserted: ${totalChatChunks}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
