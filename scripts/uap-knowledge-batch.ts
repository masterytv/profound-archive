/**
 * UAP Knowledge Extraction Batch Script
 * 
 * Runs extractUapKnowledge() from uap-knowledge.ts against Tier 2 videos
 * that have transcripts but no extracted knowledge (people_mentioned IS NULL).
 * 
 * Uses Claude Sonnet via OpenRouter for nuanced long-form extraction.
 * 
 * Usage:
 *   npx tsx scripts/uap-knowledge-batch.ts
 *   npx tsx scripts/uap-knowledge-batch.ts --limit 10
 *   npx tsx scripts/uap-knowledge-batch.ts --dry-run
 *   npx tsx scripts/uap-knowledge-batch.ts --offset 50
 * 
 * Note: Sonnet is slower and more expensive than mini. Batch size is 3
 * with 3s delay between to avoid rate limits.
 */

import { createClient } from '@supabase/supabase-js';
import { extractUapKnowledge } from '../src/lib/pipeline/uap-knowledge';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// ─── CLI Args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getArgValue(name: string, defaultVal: number): number {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1]) return parseInt(args[idx + 1], 10);
  const eq = args.find(a => a.startsWith(`--${name}=`));
  if (eq) return parseInt(eq.split('=')[1], 10);
  return defaultVal;
}

const LIMIT = getArgValue('limit', 500);
const OFFSET = getArgValue('offset', 0);
const DRY_RUN = args.includes('--dry-run');
const BATCH_SIZE = 3; // Claude Sonnet is slow — small batches
const BATCH_DELAY_MS = 3000;

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log(`\n🔬 UAP Knowledge Extraction Batch`);
  console.log(`   Limit: ${LIMIT}`);
  console.log(`   Offset: ${OFFSET}`);
  console.log(`   Dry Run: ${DRY_RUN}`);
  console.log(`   Batch Size: ${BATCH_SIZE}`);
  console.log(`   Delay: ${BATCH_DELAY_MS}ms\n`);

  // Check OpenRouter key
  if (!DRY_RUN && !process.env.OPENROUTER_API_KEY) {
    console.error('❌ Missing OPENROUTER_API_KEY environment variable');
    process.exit(1);
  }

  // Get total counts for status display
  const { count: totalAnalysis } = await supabase
    .from('uap_analysis')
    .select('*', { count: 'exact', head: true });

  const { count: alreadyExtracted } = await supabase
    .from('uap_analysis')
    .select('*', { count: 'exact', head: true })
    .not('people_mentioned', 'is', null);

  console.log(`📊 Analysis Status:`);
  console.log(`   Total analysis rows: ${totalAnalysis}`);
  console.log(`   Already extracted: ${alreadyExtracted}`);
  console.log(`   Pending: ${(totalAnalysis || 0) - (alreadyExtracted || 0)}\n`);

  // Fetch videos that need knowledge extraction
  // Join uap_analysis (exists) with uap_vids (has transcript) where people_mentioned IS NULL
  const { data: pending, error: fetchError } = await supabase
    .from('uap_analysis')
    .select(`
      video_id,
      uap_vids!inner(title, subtitles_punctuated, tier)
    `)
    .is('people_mentioned', null)
    .order('video_id')
    .range(OFFSET, OFFSET + LIMIT - 1);

  if (fetchError) {
    console.error('❌ Error fetching pending videos:', fetchError.message);
    process.exit(1);
  }

  if (!pending || pending.length === 0) {
    console.log('✅ No pending videos need knowledge extraction.');
    return;
  }

  // Filter to only those with transcripts
  const eligible = pending.filter((row: any) => {
    const vid = row.uap_vids;
    return vid?.subtitles_punctuated && vid.subtitles_punctuated.length > 100;
  });

  console.log(`🚀 Processing ${eligible.length} videos (${pending.length} fetched, ${pending.length - eligible.length} skipped for missing transcripts)\n`);

  let processed = 0;
  let errors = 0;
  let extracted = 0;

  for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
    const batch = eligible.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (row: any) => {
        const vid = row.uap_vids;
        const videoId = row.video_id;
        const title = vid?.title || '';
        const transcript = vid?.subtitles_punctuated || '';

        if (DRY_RUN) {
          console.log(`  🔍 Would extract: "${title}" (${videoId}) — ${transcript.length} chars`);
          return { videoId, extracted: false, dry: true };
        }

        // Call the knowledge extraction pipeline
        const knowledge = await extractUapKnowledge(transcript, title);

        if (!knowledge) {
          console.error(`  ⚠️ Extraction returned null for ${videoId}: "${title}"`);
          return { videoId, extracted: false };
        }

        // Write results to uap_analysis
        const { error: updateError } = await supabase
          .from('uap_analysis')
          .update({
            people_mentioned: knowledge.people_mentioned,
            claims: knowledge.claims,
            programs_mentioned: knowledge.programs_mentioned,
            timeline_events: knowledge.timeline_events,
            // entities_discussed maps to existing entities column for Tier 2
            // Only write if not already populated by triad analysis
            technology_described: knowledge.technology_described,
            consciousness_connections: knowledge.consciousness_connections,
            content_safety: knowledge.content_safety,
            updated_at: new Date().toISOString(),
          })
          .eq('video_id', videoId);

        if (updateError) {
          throw new Error(`DB update failed for ${videoId}: ${updateError.message}`);
        }

        return {
          videoId,
          extracted: true,
          people: knowledge.people_mentioned.length,
          claims: knowledge.claims.length,
          events: knowledge.timeline_events.length,
          programs: knowledge.programs_mentioned.length,
        };
      })
    );

    // Process results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        processed++;
        const r = result.value as any;
        if (r.extracted) {
          extracted++;
          console.log(
            `  ✅ ${r.videoId}: ${r.people} people, ${r.claims} claims, ${r.events} events, ${r.programs} programs`
          );
        } else if (r.dry) {
          extracted++; // Count for dry-run reporting
        }
      } else {
        errors++;
        console.error(`  ❌ ${result.reason}`);
      }
    }

    // Progress log
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(eligible.length / BATCH_SIZE);
    console.log(
      `  📦 Batch ${batchNum}/${totalBatches}: ${processed}/${eligible.length} done | ` +
      `Extracted: ${extracted} | Errors: ${errors}`
    );

    // Rate limit delay between batches
    if (i + BATCH_SIZE < eligible.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log(`\n✅ Knowledge extraction complete!`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Extracted: ${extracted}`);
  console.log(`   Errors: ${errors}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
