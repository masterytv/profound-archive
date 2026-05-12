/**
 * Re-run phenomenology analysis for a specific UAP video.
 * Usage: npx tsx scripts/uap-reanalyze-phenom.ts [videoId]
 * Default: DsiKEBAFmm4 (Travis Walton)
 */
import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' }); // Next.js uses .env.local

import { createClient } from '@supabase/supabase-js';
import { analyzeUapPhenomenology } from '../src/lib/ai/uap-phenomenology';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

async function main() {
  const videoId = process.argv[2] || 'DsiKEBAFmm4';
  console.log(`[reanalyze] Target video: ${videoId}`);

  // Fetch transcript
  const { data, error } = await supabase
    .from('uap_vids')
    .select('title, subtitles_punctuated')
    .eq('video_id', videoId)
    .single();

  if (error || !data?.subtitles_punctuated) {
    console.error('Failed to fetch transcript:', error?.message || 'No transcript');
    process.exit(1);
  }

  console.log(`[reanalyze] Video: "${data.title}"`);
  console.log(`[reanalyze] Transcript: ${data.subtitles_punctuated.length} chars`);
  console.log(`[reanalyze] Running phenomenology analysis...`);

  const result = await analyzeUapPhenomenology(data.subtitles_punctuated);

  if (!result) {
    console.error('[reanalyze] ❌ Phenomenology analysis returned null');
    process.exit(1);
  }

  console.log('[reanalyze] ✅ Analysis succeeded!');
  console.log(`  Encounter flow phases: ${result.encounter_flow.length}`);
  console.log(`  Entities: ${result.entity_count} (${result.dominant_entity_type})`);
  console.log(`  Craft observed: ${result.craft_observation.observed}`);
  console.log(`  Hynek: ${result.hynek_classification}`);

  // Save to uap_analysis
  const { error: updateError } = await supabase
    .from('uap_analysis')
    .update({ phenomenology_breakdown: result })
    .eq('video_id', videoId);

  if (updateError) {
    console.error('[reanalyze] Failed to save:', updateError.message);
    process.exit(1);
  }

  console.log('[reanalyze] ✅ Saved to uap_analysis.phenomenology_breakdown');
}

main().catch(console.error);
