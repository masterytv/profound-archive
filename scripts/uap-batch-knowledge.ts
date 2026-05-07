/**
 * UAP Batch Knowledge Extraction (Tier 2)
 *
 * Copy-Modify from: scripts/uap-batch-triad.ts
 * Reference: SPRINT.md Story 2.4.1
 *
 * Extracts structured knowledge from Tier 2 (program/investigative) UAP videos.
 * Uses Claude Sonnet via OpenRouter — more expensive than gpt-4o-mini triad,
 * so defaults to lower concurrency.
 *
 * COST ESTIMATE: Claude Sonnet ~$0.01-0.03/call → ~$50-70 for 2,194 videos.
 * Consider running on a subset first to validate quality.
 *
 * Usage:
 *   npx tsx scripts/uap-batch-knowledge.ts                    # defaults: 1000 limit, 2 concurrency
 *   npx tsx scripts/uap-batch-knowledge.ts --limit 50         # process 50 videos
 *   npx tsx scripts/uap-batch-knowledge.ts --concurrency 3    # 3 parallel
 *   npx tsx scripts/uap-batch-knowledge.ts --dry-run           # preview only
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { extractUapKnowledge } from '../src/lib/pipeline/uap-knowledge';

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
const CONCURRENCY = getArgValue('--concurrency', 2); // Lower default — Claude is pricier
const DRY_RUN = args.includes('--dry-run');

// ─── Stats ──────────────────────────────────────────────────────────────────

let processed = 0;
let skipped = 0;
let errors = 0;
const startTime = Date.now();

// ─── Single Video Knowledge Extraction ──────────────────────────────────────

type ExtractionOutcome = 'processed' | 'skipped' | 'failed';

async function extractOneVideo(video: {
  video_id: string;
  title: string;
  subtitles_punctuated: string;
}): Promise<ExtractionOutcome> {
  // Check if knowledge extraction already exists for this video
  const { data: existing } = await supabase
    .from('uap_analysis')
    .select('video_id, claims')
    .eq('video_id', video.video_id)
    .single();

  // Skip if already has knowledge extraction (claims is the indicator field)
  if (existing?.claims != null && Array.isArray(existing.claims) && existing.claims.length > 0) {
    return 'skipped';
  }

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would extract: ${video.title.slice(0, 70)}`);
    return 'processed';
  }

  const result = await extractUapKnowledge(video.subtitles_punctuated, video.title);

  if (!result) {
    console.error(`  ✗ Extraction failed for ${video.video_id}: ${video.title.slice(0, 50)}`);
    return 'failed';
  }

  // Log results
  const ppl = result.people_mentioned.length;
  const prg = result.programs_mentioned.length;
  const clm = result.claims.length;
  const evt = result.timeline_events.length;
  const cat = result.content_category;
  console.log(
    `  ✓ ${video.video_id} | ${cat} | ${ppl}ppl ${prg}prg ${clm}clm ${evt}evt | ${video.title.slice(0, 55)}`,
  );

  // Build the upsert row
  const analysisRow: Record<string, unknown> = {
    video_id: video.video_id,
    people_mentioned: result.people_mentioned,
    programs_mentioned: result.programs_mentioned,
    claims: result.claims,
    timeline_events: result.timeline_events,
    entities: result.entities_discussed,
    technology_described: result.technology_described,
    consciousness_connections: result.consciousness_connections,
    content_safety: result.content_safety,
    phenomenology: result.metadata,
    overall_tone: result.content_category,
    analysis_model: 'claude-sonnet-4-5',
    analyzed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Upsert — existing row may have been created by triad (shouldn't for Tier 2, but be safe)
  if (existing) {
    const { error: updateError } = await supabase
      .from('uap_analysis')
      .update(analysisRow)
      .eq('video_id', video.video_id);
    if (updateError) {
      console.error(`  ✗ DB update failed for ${video.video_id}:`, updateError.message);
      return 'failed';
    }
  } else {
    const { error: insertError } = await supabase
      .from('uap_analysis')
      .insert(analysisRow);
    if (insertError) {
      console.error(`  ✗ DB insert failed for ${video.video_id}:`, insertError.message);
      return 'failed';
    }
  }

  return 'processed';
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
        const outcome = await extractOneVideo(video);
        switch (outcome) {
          case 'processed': processed++; break;
          case 'skipped': skipped++; break;
          case 'failed': errors++; break;
        }
      } catch (err) {
        errors++;
        console.error(
          `  ✗ [W${workerId}] Error on ${video.video_id}:`,
          err instanceof Error ? err.message : err,
        );
      }

      // Checkpoint every 20 processed
      if ((processed + errors) % 20 === 0 && processed + errors > 0) {
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        const rate = processed > 0 ? (processed / ((Date.now() - startTime) / 1000 / 60)).toFixed(1) : '0';
        console.log(
          `\n  ═══ CHECKPOINT: ${processed} done, ${errors} err, ${skipped} skip | ` +
          `${elapsed}min elapsed | ${rate} vids/min ═══\n`,
        );
      }

      // Delay between calls to avoid rate limits (Claude is slower anyway)
      await sleep(1000);
    }
  }

  // Launch N workers
  const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1));
  await Promise.all(workers);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function runBatchKnowledgeExtraction() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  UAP Knowledge Extraction Batch (Tier 2)');
  console.log(`  Limit: ${BATCH_LIMIT} | Concurrency: ${CONCURRENCY} | Dry Run: ${DRY_RUN}`);
  console.log('═══════════════════════════════════════════════════════════════');

  // Fetch Tier 2 videos with punctuated subtitles
  const { data: videos, error } = await supabase
    .from('uap_vids')
    .select('video_id, title, subtitles_punctuated')
    .eq('tier', 2)
    .not('subtitles_punctuated', 'is', null)
    .neq('intake_status', 'out_of_scope')
    .order('created_at', { ascending: false })
    .limit(BATCH_LIMIT + 200); // Extra to account for skips

  if (error) {
    console.error('Error fetching UAP Tier 2 videos:', error);
    process.exit(1);
  }

  if (!videos || videos.length === 0) {
    console.log('No Tier 2 UAP videos with transcripts found.');
    return;
  }

  // Cost estimate
  const estCostLow = (videos.length * 0.01).toFixed(2);
  const estCostHigh = (videos.length * 0.03).toFixed(2);

  console.log(`Found ${videos.length} Tier 2 candidate videos.`);
  console.log(`Estimated cost: $${estCostLow} - $${estCostHigh} (Claude Sonnet)`);
  console.log(`Estimated time: ~${Math.ceil(videos.length / CONCURRENCY * 30 / 60)} min\n`);

  await processWithConcurrency(videos);

  // Final Summary
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  BATCH COMPLETE');
  console.log(`  Processed: ${processed}`);
  console.log(`  Skipped (already extracted): ${skipped}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Elapsed: ${elapsed} minutes`);
  if (processed > 0) {
    console.log(`  Rate: ${(processed / parseFloat(elapsed)).toFixed(1)} videos/min`);
  }
  console.log('═══════════════════════════════════════════════════════════════');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Run ────────────────────────────────────────────────────────────────────

runBatchKnowledgeExtraction().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
