/**
 * UAP Batch Triad Analysis Orchestrator (Parallelized)
 *
 * Copy-Modify from: scripts/analyze_greyson_batch.ts
 *
 * Runs all three UAP-CET triad modules PER VIDEO:
 * 1. Evidence Strength (UAP-ESS, 7-28)
 * 2. Contact Depth (UAP-CDS, 0-32)
 * 3. Transformation (UAP-CTI, 0-60 full / 0-50 comparable)
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - All 3 API calls run IN PARALLEL per video (~20s vs ~60s sequential)
 * - Multiple videos processed concurrently (configurable --concurrency N)
 * - Default: 3 concurrent videos = ~589 videos in ~65 min
 *
 * SUPABASE I/O: Minimal. ~3 queries/video (2 SELECT + 1 UPSERT).
 * At 3 concurrency = ~9 queries/min. MICRO tier handles this trivially.
 * DO NOT upsize Supabase compute for this workload.
 *
 * Usage:
 *   npx tsx scripts/uap-batch-triad.ts                    # defaults: 1000 limit, 3 concurrency
 *   npx tsx scripts/uap-batch-triad.ts --limit 50         # process 50 videos
 *   npx tsx scripts/uap-batch-triad.ts --concurrency 5    # 5 parallel videos
 *   npx tsx scripts/uap-batch-triad.ts --dry-run           # preview only
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { analyzeUapEvidenceScore, classifyEvidenceScore } from '../src/lib/ai/uap-evidence';
import { analyzeUapContactDepthScore, classifyContactDepthScore } from '../src/lib/ai/uap-contact-depth';
import {
  analyzeUapTransformationScore,
  classifyFullTransformationScore,
} from '../src/lib/ai/uap-transformation';

// ─── Environment ────────────────────────────────────────────────────────────

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ─── CLI Args ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getArgValue(flag: string, defaultVal: number): number {
  const idx = args.indexOf(flag);
  return idx !== -1 ? parseInt(args[idx + 1], 10) : defaultVal;
}

const BATCH_LIMIT = getArgValue('--limit', 1000);
const CONCURRENCY = getArgValue('--concurrency', 3);
const DRY_RUN = args.includes('--dry-run');

// ─── Stats ──────────────────────────────────────────────────────────────────

let processed = 0;
let skipped = 0;
let errors = 0;
const startTime = Date.now();

// ─── Single Video Analysis (all 3 calls in parallel) ────────────────────────

async function analyzeOneVideo(video: {
  video_id: string;
  title: string;
  subtitles_punctuated: string;
}): Promise<boolean> {
  // Check if analysis already exists
  const { data: existing } = await supabase
    .from('uap_analysis')
    .select('video_id, evidence_score, contact_depth_score, transformation_score')
    .eq('video_id', video.video_id)
    .single();

  if (
    existing?.evidence_score != null &&
    existing?.contact_depth_score != null &&
    existing?.transformation_score != null
  ) {
    skipped++;
    return true; // Already done
  }

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would analyze: ${video.title}`);
    return true;
  }

  // Run all 3 analyses IN PARALLEL (independent of each other)
  const [evidenceResult, contactResult, transformResult] = await Promise.all([
    analyzeUapEvidenceScore(video.subtitles_punctuated),
    analyzeUapContactDepthScore(video.subtitles_punctuated),
    analyzeUapTransformationScore(video.subtitles_punctuated),
  ]);

  // Check for failures
  const failures: string[] = [];
  if (!evidenceResult) failures.push('ESS');
  if (!contactResult) failures.push('CDS');
  if (!transformResult) failures.push('CTI');

  if (failures.length === 3) {
    console.error(`  ✗ All 3 analyses failed for ${video.video_id}`);
    return false;
  }

  // Log results
  const ess = evidenceResult ? `${evidenceResult.total_score}/28` : 'FAIL';
  const cds = contactResult ? `${contactResult.total_score}/32` : 'FAIL';
  const cti = transformResult
    ? `${transformResult.quantitative_metrics.full_transformation_score}/60`
    : 'FAIL';
  console.log(`  ✓ ${video.video_id} | ESS:${ess} CDS:${cds} CTI:${cti} | ${video.title.slice(0, 60)}`);

  // Build the upsert row (only include successful analyses)
  const analysisRow: Record<string, unknown> = {
    video_id: video.video_id,
    analysis_model: 'gpt-4o-mini',
    analyzed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (evidenceResult) {
    analysisRow.evidence_score = evidenceResult.total_score;
    analysisRow.evidence_breakdown = evidenceResult;
  }
  if (contactResult) {
    analysisRow.contact_depth_score = contactResult.total_score;
    analysisRow.contact_depth_breakdown = contactResult;
  }
  if (transformResult) {
    analysisRow.transformation_score =
      transformResult.quantitative_metrics.full_transformation_score;
    analysisRow.transformation_breakdown = transformResult;
  }

  // Write to DB
  if (existing) {
    const { error: updateError } = await supabase
      .from('uap_analysis')
      .update(analysisRow)
      .eq('video_id', video.video_id);
    if (updateError) {
      console.error(`  ✗ DB update failed for ${video.video_id}:`, updateError.message);
      return false;
    }
  } else {
    const { error: insertError } = await supabase
      .from('uap_analysis')
      .insert(analysisRow);
    if (insertError) {
      console.error(`  ✗ DB insert failed for ${video.video_id}:`, insertError.message);
      return false;
    }
  }

  return true;
}

// ─── Concurrency Pool ──────────────────────────────────────────────────────

async function processWithConcurrency(
  videos: Array<{ video_id: string; title: string; subtitles_punctuated: string }>,
) {
  let index = 0;

  async function worker(workerId: number) {
    while (index < videos.length && processed + errors < BATCH_LIMIT) {
      const i = index++;
      const video = videos[i];

      try {
        const success = await analyzeOneVideo(video);
        if (success && !DRY_RUN && !(
          // Don't count skipped as processed
          skipped > 0 && processed === 0
        )) {
          processed++;
        }
      } catch (err) {
        errors++;
        console.error(
          `  ✗ [W${workerId}] Error on ${video.video_id}:`,
          err instanceof Error ? err.message : err,
        );
      }

      // Checkpoint every 25 processed
      if ((processed + errors) % 25 === 0 && processed + errors > 0) {
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        const rate = (processed / ((Date.now() - startTime) / 1000 / 60)).toFixed(1);
        const remaining = Math.ceil((BATCH_LIMIT - processed - errors) / parseFloat(rate));
        console.log(
          `\n  ═══ CHECKPOINT: ${processed} done, ${errors} err, ${skipped} skip | ` +
          `${elapsed}min elapsed | ${rate} vids/min | ~${remaining}min remaining ═══\n`,
        );
      }

      // Small delay to avoid hammering OpenAI rate limits
      await sleep(500);
    }
  }

  // Launch N workers
  const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1));
  await Promise.all(workers);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function runBatchTriadAnalysis() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  UAP Triad Analysis Batch (Parallelized)');
  console.log(`  Limit: ${BATCH_LIMIT} | Concurrency: ${CONCURRENCY} | Dry Run: ${DRY_RUN}`);
  console.log('═══════════════════════════════════════════════════════════════');

  // Fetch Tier 1 videos with punctuated subtitles
  const { data: videos, error } = await supabase
    .from('uap_vids')
    .select('video_id, title, subtitles_punctuated')
    .eq('tier', 1)
    .not('subtitles_punctuated', 'is', null)
    .neq('intake_status', 'out_of_scope')
    .order('created_at', { ascending: false })
    .limit(BATCH_LIMIT + 100); // Fetch extra to account for skips

  if (error) {
    console.error('Error fetching UAP videos:', error);
    process.exit(1);
  }

  if (!videos || videos.length === 0) {
    console.log('No Tier 1 UAP videos with transcripts found.');
    return;
  }

  console.log(`Found ${videos.length} Tier 1 candidate videos.`);
  console.log(`Estimated time: ~${Math.ceil(videos.length / CONCURRENCY * 20 / 60)} min\n`);

  await processWithConcurrency(videos);

  // Final Summary
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  BATCH COMPLETE');
  console.log(`  Processed: ${processed}`);
  console.log(`  Skipped (already analyzed): ${skipped}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Elapsed: ${elapsed} minutes`);
  console.log(`  Rate: ${(processed / parseFloat(elapsed)).toFixed(1)} videos/min`);
  console.log('═══════════════════════════════════════════════════════════════');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Run ────────────────────────────────────────────────────────────────────

runBatchTriadAnalysis().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
