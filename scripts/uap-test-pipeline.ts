#!/usr/bin/env npx tsx
/**
 * UAP Pipeline Test Runner
 * 
 * Clears existing data and re-runs the full dual-analysis pipeline
 * on a curated set of test videos covering all classification scenarios.
 * 
 * Usage: npx tsx scripts/uap-test-pipeline.ts [--video VIDEO_ID] [--delay SECONDS]
 * 
 * Options:
 *   --video VIDEO_ID   Run only a specific video (by ID or URL)
 *   --delay SECONDS    Delay between videos in seconds (default: 10)
 *   --skip-clear       Don't clear existing data before re-running
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { processUapVideoIntake } from '../src/lib/pipeline/intake-uap';

// ─── Test Video Registry ─────────────────────────────────────────────────────

interface TestVideo {
  id: string;
  label: string;
  expectedTier: 1 | 2;
  expectedType: string;
  notes: string;
}

const TEST_VIDEOS: TestVideo[] = [
  // ── Tier 1: First-Person Encounters ──
  {
    id: '1X7oaO4MKtU',
    label: 'Julius (First-Person)',
    expectedTier: 1,
    expectedType: 'first_person',
    notes: 'Direct experiencer telling their own story',
  },
  {
    id: 'DsiKEBAFmm4',
    label: 'Travis Walton (Interview)',
    expectedTier: 1,
    expectedType: 'interview',
    notes: 'Interview with the actual experiencer',
  },
  // ── Tier 2: Retold Encounters ──
  {
    id: 'SDx0uMPivJY',
    label: 'Carl Higdon (Retold)',
    expectedTier: 2,
    expectedType: 'retold_encounter',
    notes: 'Narrator retelling a single encounter. Should still get phenomenology + encounter context.',
  },
  {
    id: 'JuYYsmQ2ulI',
    label: '3 Retold Encounters',
    expectedTier: 2,
    expectedType: 'documentary_survey',
    notes: 'Video with three retold encounters — should produce 3 encounter rows',
  },
  // ── Tier 1/2: Multi-Encounter (First-Person) ──
  {
    id: 'VMKTjjxXn28',
    label: 'Documentary: Multiple First-Person',
    expectedTier: 2,
    expectedType: 'documentary_survey',
    notes: 'Documentary with multiple first-person accounts — should segment and analyze each',
  },
  {
    id: 'bQgRCmBPfjA',
    label: 'Short First-Person Accounts',
    expectedTier: 2,
    expectedType: 'documentary_survey',
    notes: 'Shorter first-person accounts — AI may struggle with brevity',
  },
  {
    id: 'LiwBM-xa0Z0',
    label: 'Multiple Encounters (Names Missing)',
    expectedTier: 2,
    expectedType: 'documentary_survey',
    notes: 'Names not all in transcript — tests unnamed witness labeling',
  },
  {
    id: '_PaQmnq_nAc',
    label: 'Ancient History Encounters',
    expectedTier: 2,
    expectedType: 'documentary_survey',
    notes: 'Multiple accounts from ancient history — tests era detection',
  },
  // ── Tier 2: Research & Intelligence ──
  {
    id: '9p99lTsC7wQ',
    label: 'Legacy Programs (Research)',
    expectedTier: 2,
    expectedType: 'research_analysis',
    notes: 'Pure research/program analysis — should NOT produce encounter rows',
  },
  {
    id: '4ckCzwhk784',
    label: 'Breaking News (Disclosure)',
    expectedTier: 2,
    expectedType: 'news_commentary',
    notes: 'Breaking news about UFO documents — program intel only',
  },
  {
    id: 'tzvGLiDvZ_U',
    label: '2-Hour Panel Event',
    expectedTier: 2,
    expectedType: 'program_disclosure',
    notes: 'Long event with witnesses and analysts — should NOT pick up encounters unless direct testimony is given',
  },
];

// ─── Supabase Client ─────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key);
}

// ─── Clear Existing Data ─────────────────────────────────────────────────────

async function clearVideoData(supabase: any, videoId: string) {
  console.log(`  🗑️  Clearing existing data for ${videoId}...`);
  
  // Delete in dependency order
  await supabase.from('uap_encounters').delete().eq('video_id', videoId);
  await supabase.from('uap_analysis').delete().eq('video_id', videoId);
  await supabase.from('uap_punctuated_embeddings').delete().eq('video_id', videoId);
  await supabase.from('uap_chatbot_chunks').delete().eq('video_id', videoId);
  await supabase.from('uap_vids').delete().eq('video_id', videoId);
  
  console.log(`  ✅ Cleared`);
}

// ─── Run Pipeline ────────────────────────────────────────────────────────────

async function runVideo(video: TestVideo, supabase: any, skipClear: boolean) {
  const divider = '═'.repeat(70);
  console.log(`\n${divider}`);
  console.log(`🎬 ${video.label}`);
  console.log(`   ID: ${video.id}`);
  console.log(`   Expected: Tier ${video.expectedTier} / ${video.expectedType}`);
  console.log(`   Notes: ${video.notes}`);
  console.log(divider);

  if (!skipClear) {
    await clearVideoData(supabase, video.id);
  }

  const url = `https://www.youtube.com/watch?v=${video.id}`;
  const startTime = Date.now();

  try {
    const result = await processUapVideoIntake(url);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`\n  ── Result ──`);
    console.log(`  Status: ${result.status}`);
    console.log(`  Title: ${result.title}`);
    console.log(`  Tier: ${result.tier} (expected: ${video.expectedTier})`);
    console.log(`  Content Type: ${result.content_type}`);
    console.log(`  Time: ${elapsed}s`);
    
    // Check classification accuracy
    const tierMatch = result.tier === video.expectedTier;
    console.log(`  Tier Match: ${tierMatch ? '✅' : '❌ MISMATCH'}`);

    // Check encounter rows
    const { data: encounters } = await supabase
      .from('uap_encounters')
      .select('experiencer_name, source_type, evidence_score, contact_depth_score, transformation_score')
      .eq('video_id', video.id)
      .order('encounter_index');

    if (encounters && encounters.length > 0) {
      console.log(`  Encounters: ${encounters.length}`);
      for (const enc of encounters) {
        const triad = enc.evidence_score != null
          ? `ESS=${enc.evidence_score} CDS=${enc.contact_depth_score} CTI=${enc.transformation_score}`
          : 'no triad';
        console.log(`    → ${enc.experiencer_name} (${enc.source_type}) [${triad}]`);
      }
    } else {
      console.log(`  Encounters: 0 (no encounter content detected)`);
    }

    // Check program intel
    const { data: analysis } = await supabase
      .from('uap_analysis')
      .select('program_intel_breakdown')
      .eq('video_id', video.id)
      .single();
    
    const hasIntel = analysis?.program_intel_breakdown != null;
    console.log(`  Program Intel: ${hasIntel ? '✓' : '—'}`);

    return { videoId: video.id, status: result.status, tier: result.tier, encounters: encounters?.length || 0, elapsed };
  } catch (err: any) {
    console.error(`  ❌ PIPELINE ERROR: ${err.message}`);
    return { videoId: video.id, status: 'error', tier: null, encounters: 0, elapsed: ((Date.now() - startTime) / 1000).toFixed(1) };
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const singleVideoArg = args.indexOf('--video') !== -1 ? args[args.indexOf('--video') + 1] : null;
  const delaySeconds = args.indexOf('--delay') !== -1 ? parseInt(args[args.indexOf('--delay') + 1]) : 10;
  const skipClear = args.includes('--skip-clear');

  // Extract video ID from URL if needed
  const singleVideoId = singleVideoArg
    ? (singleVideoArg.includes('youtube.com') || singleVideoArg.includes('youtu.be')
        ? new URL(singleVideoArg.startsWith('http') ? singleVideoArg : `https://${singleVideoArg}`).searchParams.get('v') || singleVideoArg
        : singleVideoArg)
    : null;

  const supabase = getSupabase();

  const videosToRun = singleVideoId
    ? TEST_VIDEOS.filter(v => v.id === singleVideoId)
    : TEST_VIDEOS;

  if (singleVideoId && videosToRun.length === 0) {
    // Run ad-hoc video not in registry
    console.log(`\n⚠️  Video ${singleVideoId} not in test registry — running as ad-hoc`);
    const adhoc: TestVideo = {
      id: singleVideoId,
      label: 'Ad-hoc Video',
      expectedTier: 2,
      expectedType: 'unknown',
      notes: 'Not in test registry',
    };
    await runVideo(adhoc, supabase, skipClear);
    return;
  }

  console.log(`\n${'━'.repeat(70)}`);
  console.log(`  UAP Dual Analysis Pipeline Test Runner`);
  console.log(`  Videos: ${videosToRun.length} | Delay: ${delaySeconds}s | Clear: ${!skipClear}`);
  console.log(`${'━'.repeat(70)}`);

  const results: any[] = [];

  for (let i = 0; i < videosToRun.length; i++) {
    const video = videosToRun[i];
    const result = await runVideo(video, supabase, skipClear);
    results.push(result);

    // Delay between videos to avoid rate limits
    if (i < videosToRun.length - 1) {
      console.log(`\n  ⏳ Waiting ${delaySeconds}s before next video...`);
      await new Promise(r => setTimeout(r, delaySeconds * 1000));
    }
  }

  // ── Summary Report ──
  console.log(`\n${'━'.repeat(70)}`);
  console.log(`  SUMMARY REPORT`);
  console.log(`${'━'.repeat(70)}`);
  console.log(`\n  ${'Video ID'.padEnd(15)} ${'Status'.padEnd(12)} ${'Tier'.padEnd(6)} ${'Encounters'.padEnd(12)} Time`);
  console.log(`  ${'─'.repeat(60)}`);
  for (const r of results) {
    console.log(`  ${r.videoId.padEnd(15)} ${r.status.padEnd(12)} ${String(r.tier ?? '—').padEnd(6)} ${String(r.encounters).padEnd(12)} ${r.elapsed}s`);
  }
  console.log(`\n  Total: ${results.length} videos processed`);
  console.log(`  Errors: ${results.filter(r => r.status === 'error' || r.status === 'failed').length}`);
  console.log(`  Total encounters: ${results.reduce((sum: number, r: any) => sum + r.encounters, 0)}`);
}

main().catch(console.error);
