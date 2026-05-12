/**
 * Re-analyze UAP videos with DETERMINISTIC timestamp matching.
 * 
 * Usage: npx tsx scripts/reanalyze-timestamps.ts
 * 
 * Strategy:
 *   1. LLM receives clean punctuated transcript (best extraction quality)
 *   2. After LLM returns quotes, deterministic code matches them against
 *      caption segments to find exact timestamps (no LLM math involved)
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { analyzeUapProgramIntel } from '../src/lib/ai/uap-program-intel';
import { analyzeUapPhenomenology } from '../src/lib/ai/uap-phenomenology';
import { analyzeUapEncounterContext } from '../src/lib/ai/uap-encounter-context';
import { addTimestampsToProgramIntel, addTimestampsToPhenomenology } from '../src/lib/ai/match-quote-timestamp';

const VIDEO_IDS = [
  '8R5llIAxRqw',   // Mantis Being (T1 first_person) — testing claims expansion
];

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  console.log(`\n🔄 Re-analyzing ${VIDEO_IDS.length} videos`);
  console.log(`   Strategy: Clean transcript → LLM → Deterministic timestamp matching\n`);

  for (const videoId of VIDEO_IDS) {
    console.log(`\n${'═'.repeat(70)}`);
    
    const { data: video, error } = await supabase
      .from('uap_vids')
      .select('title, subtitles_punctuated, raw_timestamped_subtitles, tier, content_type, duration')
      .eq('video_id', videoId)
      .single();

    if (error || !video?.subtitles_punctuated) {
      console.error(`❌ ${videoId}: Not found or no transcript`);
      continue;
    }

    console.log(`📹 "${video.title}" (${videoId})`);
    console.log(`   Tier ${video.tier} | ${video.content_type} | Duration: ${video.duration}`);
    console.log(`   Transcript: ${video.subtitles_punctuated.length} chars (clean punctuated)`);
    console.log(`   Has caption segments: ${video.raw_timestamped_subtitles ? 'yes' : 'no'}`);

    const updatePayload: Record<string, unknown> = {
      analysis_model: 'gpt-4o-mini',
      analyzed_at: new Date().toISOString(),
    };

    // ── Pass 1: Program Intel ────────────────────────────────────────
    try {
      console.log(`   🔍 Running Program Intel (clean transcript → LLM)...`);
      const start = Date.now();
      const rawResult = await analyzeUapProgramIntel(video.subtitles_punctuated);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      
      if (rawResult) {
        // Post-process: deterministic timestamp matching
        const result = addTimestampsToProgramIntel(rawResult, video.raw_timestamped_subtitles);
        updatePayload.program_intel_breakdown = result;

        const personCount = result.persons?.length ?? 0;
        const claimCount = result.claims?.length ?? 0;
        const personTs = result.persons?.filter((p: any) => p.quote_timestamp_seconds != null).length ?? 0;
        const claimTs = result.claims?.filter((c: any) => c.timestamp_seconds != null).length ?? 0;

        console.log(`   ✅ Program Intel (${elapsed}s)`);
        console.log(`      Persons: ${personCount} extracted, ${personTs} timestamped`);
        console.log(`      Claims: ${claimCount} extracted, ${claimTs} timestamped`);
        
        // Spot-check: show first 3 claims with timestamps
        result.claims?.slice(0, 3).forEach((c: any) => {
          const ts = c.timestamp_seconds != null ? `→ ${c.timestamp_seconds}s` : '→ no match';
          console.log(`      📌 "${c.claim_text?.slice(0, 50)}..." ${ts}`);
        });
      } else {
        console.log(`   ⚠️  Program Intel returned null (${elapsed}s)`);
      }
    } catch (e: any) {
      console.error(`   ❌ Program Intel failed: ${e.message}`);
    }

    // ── Pass 2: Phenomenology ────────────────────────────────────────
    try {
      console.log(`   🔍 Running Phenomenology (clean transcript → LLM)...`);
      const start = Date.now();
      const rawResult = await analyzeUapPhenomenology(video.subtitles_punctuated);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      
      if (rawResult) {
        const result = addTimestampsToPhenomenology(rawResult, video.raw_timestamped_subtitles);
        updatePayload.phenomenology_breakdown = result;

        const flowCount = result.encounter_flow?.length ?? 0;
        const flowTs = result.encounter_flow?.filter((p: any) => p.key_quote_timestamp_seconds != null).length ?? 0;
        const entityCount = result.entities?.length ?? 0;
        const entityTs = result.entities?.filter((e: any) => e.message_quote_timestamp_seconds != null).length ?? 0;

        console.log(`   ✅ Phenomenology (${elapsed}s)`);
        console.log(`      Flow phases: ${flowCount} extracted, ${flowTs} timestamped`);
        console.log(`      Entities: ${entityCount} extracted, ${entityTs} timestamped`);
        
        result.encounter_flow?.slice(0, 3).forEach((p: any) => {
          const ts = p.key_quote_timestamp_seconds != null ? `→ ${p.key_quote_timestamp_seconds}s` : '→ no match';
          console.log(`      📌 "${p.key_quote?.slice(0, 50)}..." ${ts}`);
        });
      } else {
        console.log(`   ⚠️  Phenomenology returned null (${elapsed}s)`);
      }
    } catch (e: any) {
      console.error(`   ❌ Phenomenology failed: ${e.message}`);
    }

    // ── Pass 3: Encounter Context ────────────────────────────────────
    try {
      console.log(`   🔍 Running Encounter Context...`);
      const start = Date.now();
      const result = await analyzeUapEncounterContext(video.subtitles_punctuated);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      if (result) {
        updatePayload.encounter_context = result;
        console.log(`   ✅ Encounter Context (${elapsed}s)`);
      } else {
        console.log(`   ⚠️  Encounter Context returned null (${elapsed}s)`);
      }
    } catch (e: any) {
      console.error(`   ❌ Encounter Context failed: ${e.message}`);
    }

    // ── Save ─────────────────────────────────────────────────────────
    const { error: updateError } = await supabase
      .from('uap_analysis')
      .update(updatePayload)
      .eq('video_id', videoId);

    if (updateError) {
      console.error(`   ❌ Save failed: ${updateError.message}`);
    } else {
      const savedKeys = Object.keys(updatePayload).filter(k => k !== 'analysis_model' && k !== 'analyzed_at');
      console.log(`   💾 Saved: ${savedKeys.join(', ')}`);
    }
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`✅ Done! All ${VIDEO_IDS.length} videos re-analyzed.\n`);
}

main().catch(console.error);
