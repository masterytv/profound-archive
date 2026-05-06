/**
 * UAP Batch Classification Script
 * 
 * Copy-Modify from: scripts/analyze_greyson_batch.ts (batch pattern)
 * Classifier: src/lib/ai/classify-uap.ts
 * 
 * Classifies all unclassified uap_vids using gpt-4o-mini.
 * - Processes in batches of 10 with 1s delay between batches
 * - Resume support: skips already-classified rows
 * - Tier 3 gate: marks out_of_scope videos immediately
 * - Progress logging: processed/total/errors
 * 
 * Usage: npx tsx scripts/uap-batch-classify.ts
 * 
 * Cloud Run 300s limit: processes in chunks. Run multiple times if needed.
 */

import { createClient } from '@supabase/supabase-js';
import { classifyUapContent } from '../src/lib/ai/classify-uap';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000;
const MAX_VIDEOS_PER_RUN = 1000; // 100 batches of 10

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get total counts
  const { count: totalCount } = await supabase
    .from('uap_vids')
    .select('*', { count: 'exact', head: true });

  const { count: pendingCount } = await supabase
    .from('uap_vids')
    .select('*', { count: 'exact', head: true })
    .eq('intake_status', 'pending');

  const { count: classifiedCount } = await supabase
    .from('uap_vids')
    .select('*', { count: 'exact', head: true })
    .neq('intake_status', 'pending');

  console.log(`\n📊 UAP Classification Status:`);
  console.log(`   Total: ${totalCount}`);
  console.log(`   Classified: ${classifiedCount}`);
  console.log(`   Pending: ${pendingCount}`);
  console.log(`   Max this run: ${MAX_VIDEOS_PER_RUN}\n`);

  if (!pendingCount || pendingCount === 0) {
    console.log('✅ All videos already classified. Nothing to do.');
    return;
  }

  // Fetch unclassified videos
  const { data: videos, error } = await supabase
    .from('uap_vids')
    .select('video_id, title, description, channel_name, raw_timestamped_subtitles')
    .eq('intake_status', 'pending')
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
  let errors = 0;
  let tier1Count = 0;
  let tier2Count = 0;
  let tier3Count = 0;

  for (let i = 0; i < videos.length; i += BATCH_SIZE) {
    const batch = videos.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.allSettled(
      batch.map(async (video) => {
        // Extract raw transcript text from the JSONB subtitles
        let transcript = '';
        if (video.raw_timestamped_subtitles) {
          const subs = video.raw_timestamped_subtitles;
          if (Array.isArray(subs)) {
            transcript = subs.map((s: { text?: string }) => s.text || '').join(' ');
          } else if (typeof subs === 'string') {
            transcript = subs;
          }
        }

        const classification = await classifyUapContent(
          transcript,
          video.title,
          video.description,
          video.channel_name
        );

        if (!classification) {
          throw new Error(`Classification returned null for ${video.video_id}`);
        }

        // Determine intake_status based on tier
        const intakeStatus = classification.tier === 3 ? 'out_of_scope' : 'classified';

        // Update the video record
        const { error: updateError } = await supabase
          .from('uap_vids')
          .update({
            content_type: classification.content_type,
            tier: classification.tier,
            track: classification.track,
            experiencer_name: classification.experiencer_name,
            intake_status: intakeStatus,
            classified_at: new Date().toISOString(),
            classifier_model: 'gpt-4o-mini',
          })
          .eq('video_id', video.video_id);

        if (updateError) {
          throw new Error(`DB update failed for ${video.video_id}: ${updateError.message}`);
        }

        return { video_id: video.video_id, ...classification };
      })
    );

    // Process results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        processed++;
        const r = result.value;
        if (r.tier === 1) tier1Count++;
        else if (r.tier === 2) tier2Count++;
        else tier3Count++;
      } else {
        errors++;
        console.error(`  ❌ ${result.reason}`);
      }
    }

    // Progress log
    console.log(
      `  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${processed}/${videos.length} done | ` +
      `T1:${tier1Count} T2:${tier2Count} T3:${tier3Count} | Errors:${errors}`
    );

    // Rate limit delay between batches
    if (i + BATCH_SIZE < videos.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log(`\n✅ Classification complete!`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Tier 1 (Encounters): ${tier1Count}`);
  console.log(`   Tier 2 (Program): ${tier2Count}`);
  console.log(`   Tier 3 (Out of Scope): ${tier3Count}`);
  console.log(`   Errors: ${errors}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
