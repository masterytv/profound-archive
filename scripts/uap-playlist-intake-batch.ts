/**
 * UAP Playlist Intake Batch Script
 * 
 * Accelerates the ingestion of playlist videos (priority 1).
 * Bypasses the 10-minute cron limit.
 * 
 * Features:
 * - Concurrent processing (defaults to 3 streams).
 * - Graceful shutdown on SIGINT (Ctrl+C).
 * - Picks up where it left off (auto-resets stuck 'processing' videos on boot).
 * 
 * Usage: npx tsx scripts/uap-playlist-intake-batch.ts
 */

import { createClient } from '@supabase/supabase-js';
import { processUapVideoIntake } from '../src/lib/pipeline/intake-uap';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const CONCURRENCY = 3; 

let isShuttingDown = false;

// Handle Graceful Shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 [SIGINT] Shutting down gracefully... Please wait for the current videos to finish processing.');
  isShuttingDown = true;
});

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
    }
  );

  console.log('🚀 Starting UAP Playlist Intake Batch...');

  // 1. Reset any videos that got stuck in 'processing' state from a previous killed run
  console.log('🔄 Resetting any stuck processing videos...');
  const { error: resetError } = await supabase
    .from('uap_scan_queue')
    .update({ status: 'pending' })
    .eq('status', 'processing')
    .eq('priority', 1);

  if (resetError) {
    console.error('❌ Failed to reset stuck videos:', resetError.message);
  }

  // 2. Fetch the total count to show progress
  const { count: pendingCount } = await supabase
    .from('uap_scan_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
    .eq('priority', 1);

  console.log(`📊 Found ${pendingCount} pending playlist videos to process.`);

  let processedCount = 0;
  const executing = new Set<Promise<void>>();

  // Loop until we run out of pending items or user hits Ctrl+C
  while (!isShuttingDown) {
    // We fetch a small batch to keep memory low and always get the freshest queue state
    const { data: items, error: fetchError } = await supabase
      .from('uap_scan_queue')
      .select('id, video_url, video_id, channel_id, retry_count')
      .eq('status', 'pending')
      .eq('priority', 1)
      .order('created_at', { ascending: true })
      .limit(CONCURRENCY);

    if (fetchError) {
      console.error('❌ Queue fetch error:', fetchError.message);
      break;
    }

    if (!items || items.length === 0) {
      console.log('✅ Queue is empty! All playlist videos have been processed.');
      break;
    }

    // Process the fetched batch concurrently
    for (const item of items) {
      if (isShuttingDown) break;

      // Mark as processing immediately so another stream doesn't pick it up
      await supabase
        .from('uap_scan_queue')
        .update({ status: 'processing' })
        .eq('id', item.id);

      const p = processVideo(supabase, item).finally(() => {
        executing.delete(p);
      });

      executing.add(p);
      processedCount++;
    }

    // Wait for the current batch to finish before fetching the next
    // This creates a safe wave-like concurrency pattern.
    await Promise.all(executing);
  }

  console.log(`\n🛑 Exited. Processed ${processedCount} videos this session.`);
}

/**
 * Wraps the intake logic and updates the uap_scan_queue appropriately.
 */
async function processVideo(supabase: any, item: any) {
  let finalStatus = 'failed';
  let intakeStatus = 'failed';
  let resultError: string | null = null;
  let tier: number | null = null;

  console.log(`[▶️] Starting video: ${item.video_id}`);

  try {
    const result = await processUapVideoIntake(item.video_url);
    intakeStatus = result.status;
    tier = result.tier ?? null;

    const isSkipped = result.status === 'no_captions'
      || result.status === 'already_exists'
      || result.status === 'out_of_scope'
      || result.status === 'is_short'
      || result.status === 'drm_protected';

    finalStatus = (result.status === 'complete' || result.status === 'already_exists')
      ? 'complete'
      : isSkipped
        ? 'skipped'
        : 'failed';

    resultError = result.error
      || (finalStatus === 'failed' ? `Intake returned status: ${result.status}` : null);

    if (finalStatus === 'failed') {
      console.error(`[❌] Video ${item.video_id} failed:`, resultError);
    } else if (isSkipped) {
      console.log(`[⏭️] Skipped ${item.video_id} (${result.status})`);
    } else {
      console.log(`[✅] Completed ${item.video_id} (Tier ${tier})`);
    }

    // Auto-retry for transient caption fetch failures
    if (result.status === 'caption_fetch_failed') {
      const currentRetries = item.retry_count || 0;
      const maxRetries = 3;
      if (currentRetries < maxRetries) {
        console.log(`[⚠️] Auto-retrying ${item.video_id} — caption fetch failed (attempt ${currentRetries + 1}/${maxRetries})`);
        finalStatus = 'pending';  
      }
    }

  } catch (err: any) {
    const errorMsg = err.message || String(err);
    console.error(`[❌] Video ${item.video_id} threw error:`, errorMsg);
    finalStatus = 'failed';
    intakeStatus = 'failed';
    resultError = errorMsg;
  }

  // Build the queue update payload
  const queueUpdate: Record<string, any> = {
    status: finalStatus,
    processed_at: new Date().toISOString(),
    intake_result: intakeStatus,
    error: resultError,
  };

  // Track retry count for auto-retry items reset to pending
  if (finalStatus === 'pending') {
    queueUpdate.retry_count = (item.retry_count || 0) + 1;
    queueUpdate.processed_at = null;
  }

  await supabase
    .from('uap_scan_queue')
    .update(queueUpdate)
    .eq('id', item.id);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
