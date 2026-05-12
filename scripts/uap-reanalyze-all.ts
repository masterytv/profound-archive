#!/usr/bin/env npx tsx
/**
 * UAP Re-Analysis Script
 * 
 * Re-runs the analysis pipeline (Program Intel, Phenomenology, Encounter Context,
 * Evidence/Contact/Transformation triads, Summary, and Video Stats) on all
 * previously analyzed videos using the hardened Sprint 7 schemas.
 * 
 * This does NOT re-scrape YouTube or re-transcribe — it uses the existing
 * subtitles_punctuated and raw_timestamped_subtitles from the database.
 *
 * Usage:
 *   npx tsx scripts/uap-reanalyze-all.ts
 *   npx tsx scripts/uap-reanalyze-all.ts --dry-run     # Preview without writing
 *   npx tsx scripts/uap-reanalyze-all.ts --video ABC   # Re-analyze single video
 *   npx tsx scripts/uap-reanalyze-all.ts --stats-only  # Only recompute stats from existing data
 *
 * Environment: Requires .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';
import { analyzeUapProgramIntel } from '../src/lib/ai/uap-program-intel';
import { analyzeUapPhenomenology } from '../src/lib/ai/uap-phenomenology';
import { analyzeUapEncounterContext } from '../src/lib/ai/uap-encounter-context';
import { analyzeUapEvidenceScore } from '../src/lib/ai/uap-evidence';
import { analyzeUapContactDepthScore } from '../src/lib/ai/uap-contact-depth';
import { analyzeUapTransformationScore } from '../src/lib/ai/uap-transformation';
import { generateUapSummary } from '../src/lib/ai/uap-summary';
import { addTimestampsToProgramIntel, addTimestampsToPhenomenology } from '../src/lib/ai/match-quote-timestamp';
import { computeVideoStats, mergeEncounterStats } from '../src/lib/pipeline/compute-video-stats';

// ─── Config ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const STATS_ONLY = args.includes('--stats-only');
const SINGLE_VIDEO = args.includes('--video') ? args[args.indexOf('--video') + 1] : null;

// Delay between videos to avoid rate limits (ms)
const DELAY_BETWEEN_VIDEOS = 3000;

// ─── Supabase Client ─────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnalyzedVideo {
  video_id: string;
  title: string;
  tier: number;
  content_type: string;
  subtitles_punctuated: string;
  raw_timestamped_subtitles: any;
  experiencer_name: string | null;
}

interface ReanalysisResult {
  video_id: string;
  title: string;
  tier: number;
  status: 'success' | 'partial' | 'failed' | 'skipped';
  intel: boolean;
  encounters: number;
  stats: boolean;
  duration_ms: number;
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function truncate(s: string, max = 60) {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

// ─── Stats-Only Mode ─────────────────────────────────────────────────────────

async function recomputeStatsOnly(): Promise<void> {
  console.log('\n📊 STATS-ONLY MODE — Recomputing uap_video_stats from existing analysis data\n');

  // Fetch all videos with program_intel_breakdown
  const { data: analysisRows, error } = await supabase
    .from('uap_analysis')
    .select('video_id, program_intel_breakdown');

  if (error || !analysisRows) {
    console.error('❌ Failed to fetch analysis rows:', error?.message);
    return;
  }

  let success = 0;
  let failed = 0;

  for (const row of analysisRows) {
    if (!row.program_intel_breakdown) continue;

    try {
      const stats = computeVideoStats(row.video_id, row.program_intel_breakdown);

      // Also fetch encounter-level aggregates
      const { data: encounterRows } = await supabase
        .from('uap_encounters')
        .select('evidence_score, contact_depth_score, transformation_score, phenomenology_breakdown')
        .eq('video_id', row.video_id);

      if (encounterRows && encounterRows.length > 0) {
        const hasCraft = encounterRows.some((r: any) =>
          r.phenomenology_breakdown?.craft_observation?.observed === true
        );
        const dominantEntity = encounterRows[0]?.phenomenology_breakdown?.dominant_entity_type || null;
        const evidenceScores = encounterRows.map((r: any) => r.evidence_score).filter(Boolean);
        const contactScores = encounterRows.map((r: any) => r.contact_depth_score).filter(Boolean);
        const transScores = encounterRows.map((r: any) => r.transformation_score).filter(Boolean);

        const merged = mergeEncounterStats(stats, {
          encounterCount: encounterRows.length,
          dominantEntityType: dominantEntity,
          maxEvidenceScore: evidenceScores.length > 0 ? Math.max(...evidenceScores) : null,
          maxContactDepthScore: contactScores.length > 0 ? Math.max(...contactScores) : null,
          maxTransformationScore: transScores.length > 0 ? Math.max(...transScores) : null,
          hasCraftObservation: hasCraft,
        });

        if (!DRY_RUN) {
          await supabase.from('uap_video_stats').upsert(merged, { onConflict: 'video_id' });
        }
      } else {
        if (!DRY_RUN) {
          await supabase.from('uap_video_stats').upsert(stats, { onConflict: 'video_id' });
        }
      }

      success++;
      console.log(`  ✅ ${row.video_id} — stats computed`);
    } catch (e: any) {
      failed++;
      console.log(`  ❌ ${row.video_id} — ${e.message}`);
    }
  }

  console.log(`\n📊 Stats recompute complete: ${success} success, ${failed} failed\n`);
}

// ─── Full Re-Analysis ────────────────────────────────────────────────────────

async function reanalyzeVideo(video: AnalyzedVideo): Promise<ReanalysisResult> {
  const start = Date.now();
  const result: ReanalysisResult = {
    video_id: video.video_id,
    title: video.title,
    tier: video.tier,
    status: 'failed',
    intel: false,
    encounters: 0,
    stats: false,
    duration_ms: 0,
  };

  const transcript = video.subtitles_punctuated;
  if (!transcript) {
    result.error = 'No punctuated transcript';
    result.status = 'skipped';
    result.duration_ms = Date.now() - start;
    return result;
  }

  const rawTimestamped = video.raw_timestamped_subtitles;

  try {
    // ── A. Program Intel + Summary ──────────────────────────────────
    console.log(`  🔍 Running Program Intel + Summary...`);
    const [programIntelRaw, summaryResult] = await Promise.all([
      analyzeUapProgramIntel(transcript).catch((e: Error) => {
        console.log(`    ⚠️  Program Intel failed: ${e.message}`);
        return null;
      }),
      generateUapSummary(transcript).catch((e: Error) => {
        console.log(`    ⚠️  Summary failed: ${e.message}`);
        return null;
      }),
    ]);

    // Post-process timestamps
    const programIntelResult = programIntelRaw && rawTimestamped
      ? addTimestampsToProgramIntel(programIntelRaw, rawTimestamped)
      : programIntelRaw;

    // Persist intel + summary
    if (programIntelResult && !DRY_RUN) {
      await supabase.from('uap_analysis').upsert({
        video_id: video.video_id,
        program_intel_breakdown: programIntelResult,
        analysis_model: 'gpt-4o-mini',
        analyzed_at: new Date().toISOString(),
      }, { onConflict: 'video_id' });
      result.intel = true;
    }

    if (summaryResult?.uap_summary && !DRY_RUN) {
      await supabase.from('uap_vids')
        .update({ analysis_uap_summary: summaryResult.uap_summary })
        .eq('video_id', video.video_id);
    }

    console.log(`    INTEL=${programIntelResult ? '✓' : '—'} SUMMARY=${summaryResult ? '✓' : '—'}`);

    // ── Compute + upsert video stats ────────────────────────────────
    if (programIntelResult && !DRY_RUN) {
      try {
        const stats = computeVideoStats(video.video_id, programIntelResult);
        await supabase.from('uap_video_stats').upsert(stats, { onConflict: 'video_id' });
        result.stats = true;
        console.log(`    📊 Stats: persons=${stats.persons_count} claims=${stats.claims_count} tone=${stats.video_tone}`);
      } catch (e: any) {
        console.log(`    ⚠️  Stats failed: ${e.message}`);
      }
    }

    // ── B. Encounter Analysis (Tier 1 + retold encounters) ──────────
    const hasEncounterContent = video.content_type === 'first_person'
      || video.content_type === 'interview'
      || video.content_type === 'retold_encounter';

    if (hasEncounterContent) {
      console.log(`  🛸 Running Encounter Analysis...`);

      // Get existing encounters for this video (we reuse segment structure)
      const { data: existingEncounters } = await supabase
        .from('uap_encounters')
        .select('id, experiencer_name, source_type, encounter_label, encounter_index, segment_text')
        .eq('video_id', video.video_id)
        .order('encounter_index');

      if (existingEncounters && existingEncounters.length > 0) {
        for (const enc of existingEncounters) {
          const encText = enc.segment_text || transcript;
          const runTriad = enc.source_type === 'direct_experiencer'
            || enc.source_type === 'interview_with_experiencer';

          console.log(`    👤 ${enc.experiencer_name} (${enc.source_type})...`);

          // Run per-encounter analyses in parallel
          const encounterPromises: Promise<any>[] = [
            analyzeUapPhenomenology(encText).catch((e: Error) => {
              console.log(`      ⚠️  Phenom failed: ${e.message}`);
              return null;
            }),
            analyzeUapEncounterContext(encText).catch((e: Error) => {
              console.log(`      ⚠️  Context failed: ${e.message}`);
              return null;
            }),
          ];

          if (runTriad) {
            encounterPromises.push(
              analyzeUapEvidenceScore(encText).catch((e: Error) => {
                console.log(`      ⚠️  Evidence failed: ${e.message}`);
                return null;
              }),
              analyzeUapContactDepthScore(encText).catch((e: Error) => {
                console.log(`      ⚠️  Contact Depth failed: ${e.message}`);
                return null;
              }),
              analyzeUapTransformationScore(encText).catch((e: Error) => {
                console.log(`      ⚠️  Transformation failed: ${e.message}`);
                return null;
              }),
            );
          }

          const results = await Promise.all(encounterPromises);
          const [phenomResult, contextResult] = results;
          const evidenceResult = runTriad ? results[2] : null;
          const contactDepthResult = runTriad ? results[3] : null;
          const transformationResult = runTriad ? results[4] : null;

          // Build update record
          const updateRow: Record<string, any> = {
            analysis_model: 'gpt-4o-mini',
            analyzed_at: new Date().toISOString(),
          };

          if (phenomResult) {
            updateRow.phenomenology_breakdown = rawTimestamped
              ? addTimestampsToPhenomenology(phenomResult, rawTimestamped)
              : phenomResult;
          }
          if (contextResult) updateRow.encounter_context = contextResult;

          if (evidenceResult) {
            updateRow.evidence_score = evidenceResult.total_score;
            updateRow.evidence_breakdown = evidenceResult;
          }
          if (contactDepthResult) {
            updateRow.contact_depth_score = contactDepthResult.total_score;
            updateRow.contact_depth_breakdown = contactDepthResult.breakdown;
          }
          if (transformationResult) {
            updateRow.transformation_score = transformationResult.quantitative_metrics.full_transformation_score;
            updateRow.transformation_breakdown = {
              quantitative_metrics: transformationResult.quantitative_metrics,
              domain_analysis: transformationResult.domain_analysis,
              qualitative_profile: transformationResult.qualitative_profile,
            };
          }

          if (!DRY_RUN) {
            await supabase.from('uap_encounters')
              .update(updateRow)
              .eq('id', enc.id);
          }

          const scores = runTriad
            ? ` ESS=${evidenceResult?.total_score ?? '—'} CDS=${contactDepthResult?.total_score ?? '—'} CTI=${transformationResult?.quantitative_metrics?.full_transformation_score ?? '—'}`
            : ' (no triad)';
          console.log(`      PHENOM=${phenomResult ? '✓' : '—'} CTX=${contextResult ? '✓' : '—'}${scores}`);
          result.encounters++;
        }

        // Merge encounter stats
        if (!DRY_RUN) {
          const { data: updatedEncounters } = await supabase
            .from('uap_encounters')
            .select('evidence_score, contact_depth_score, transformation_score, phenomenology_breakdown')
            .eq('video_id', video.video_id);

          if (updatedEncounters && updatedEncounters.length > 0) {
            const hasCraft = updatedEncounters.some((r: any) =>
              r.phenomenology_breakdown?.craft_observation?.observed === true
            );
            const dominantEntity = updatedEncounters[0]?.phenomenology_breakdown?.dominant_entity_type || null;
            const evidenceScores = updatedEncounters.map((r: any) => r.evidence_score).filter(Boolean);
            const contactScores = updatedEncounters.map((r: any) => r.contact_depth_score).filter(Boolean);
            const transScores = updatedEncounters.map((r: any) => r.transformation_score).filter(Boolean);

            const encounterStats = mergeEncounterStats({ video_id: video.video_id }, {
              encounterCount: updatedEncounters.length,
              dominantEntityType: dominantEntity,
              maxEvidenceScore: evidenceScores.length > 0 ? Math.max(...evidenceScores) : null,
              maxContactDepthScore: contactScores.length > 0 ? Math.max(...contactScores) : null,
              maxTransformationScore: transScores.length > 0 ? Math.max(...transScores) : null,
              hasCraftObservation: hasCraft,
            });
            await supabase.from('uap_video_stats').upsert(encounterStats, { onConflict: 'video_id' });
          }
        }
      } else {
        console.log(`    ℹ️  No existing encounter rows — skipping per-encounter analysis`);
      }
    }

    result.status = result.intel ? 'success' : 'partial';
  } catch (e: any) {
    result.error = e.message;
    result.status = 'failed';
  }

  result.duration_ms = Date.now() - start;
  return result;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  UAP Re-Analysis Script — Sprint 7 Hardened Schemas  ║
╠══════════════════════════════════════════════════════╣
║  Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : STATS_ONLY ? 'STATS ONLY      ' : 'FULL RE-ANALYSIS'}                           ║
╚══════════════════════════════════════════════════════╝
`);

  // Stats-only shortcut
  if (STATS_ONLY) {
    await recomputeStatsOnly();
    return;
  }

  // Fetch analyzed videos
  let query = supabase
    .from('uap_vids')
    .select('video_id, title, tier, content_type, subtitles_punctuated, raw_timestamped_subtitles, experiencer_name')
    .in('intake_status', ['complete']);

  if (SINGLE_VIDEO) {
    query = query.eq('video_id', SINGLE_VIDEO);
  }

  // Only re-analyze videos that have been analyzed before
  const { data: videos, error } = await query.order('tier').order('title');

  if (error || !videos) {
    console.error('❌ Failed to fetch videos:', error?.message);
    process.exit(1);
  }

  // Filter to only videos that have existing analysis
  const { data: analyzedIds } = await supabase
    .from('uap_analysis')
    .select('video_id');

  const analyzedSet = new Set((analyzedIds || []).map(r => r.video_id));
  const targetVideos = SINGLE_VIDEO
    ? videos
    : videos.filter(v => analyzedSet.has(v.video_id));

  console.log(`📋 Found ${targetVideos.length} videos to re-analyze\n`);

  if (targetVideos.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  // Preview
  for (const v of targetVideos) {
    console.log(`  [Tier ${v.tier}] ${v.video_id} — ${truncate(v.title)}`);
  }
  console.log('');

  if (DRY_RUN) {
    console.log('🏁 DRY RUN complete — no data was written.\n');
    return;
  }

  // Process each video
  const results: ReanalysisResult[] = [];
  let processed = 0;

  for (const video of targetVideos) {
    processed++;
    console.log(`\n━━━ [${processed}/${targetVideos.length}] Tier ${video.tier}: ${truncate(video.title, 50)} ━━━`);

    const result = await reanalyzeVideo(video);
    results.push(result);

    const icon = result.status === 'success' ? '✅' : result.status === 'partial' ? '🟡' : '❌';
    console.log(`  ${icon} ${result.status.toUpperCase()} in ${(result.duration_ms / 1000).toFixed(1)}s`);

    // Pause between videos to be kind to rate limits
    if (processed < targetVideos.length) {
      console.log(`  ⏳ Waiting ${DELAY_BETWEEN_VIDEOS / 1000}s before next video...`);
      await sleep(DELAY_BETWEEN_VIDEOS);
    }
  }

  // ─── Summary Report ─────────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════╗
║                 RE-ANALYSIS COMPLETE                  ║
╠══════════════════════════════════════════════════════╣`);

  const success = results.filter(r => r.status === 'success').length;
  const partial = results.filter(r => r.status === 'partial').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const totalEncounters = results.reduce((sum, r) => sum + r.encounters, 0);
  const totalDuration = results.reduce((sum, r) => sum + r.duration_ms, 0);

  console.log(`║  ✅ Success:  ${String(success).padStart(3)} videos                          ║`);
  console.log(`║  🟡 Partial:  ${String(partial).padStart(3)} videos                          ║`);
  console.log(`║  ❌ Failed:   ${String(failed).padStart(3)} videos                          ║`);
  console.log(`║  ⏭️  Skipped:  ${String(skipped).padStart(3)} videos                          ║`);
  console.log(`║  🛸 Encounters: ${String(totalEncounters).padStart(3)}                               ║`);
  console.log(`║  ⏱️  Total time: ${(totalDuration / 1000 / 60).toFixed(1)} min                          ║`);
  console.log(`╚══════════════════════════════════════════════════════╝`);

  // Print failures
  const failures = results.filter(r => r.status === 'failed');
  if (failures.length > 0) {
    console.log('\n❌ Failed videos:');
    for (const f of failures) {
      console.log(`  ${f.video_id} — ${f.title}: ${f.error}`);
    }
  }

  // ─── Quick Cross-Video Analytics ──────────────────────────────────────────
  console.log('\n\n📊 QUICK CROSS-VIDEO ANALYTICS\n');

  const { data: statsRows } = await supabase
    .from('uap_video_stats')
    .select('*');

  if (statsRows && statsRows.length > 0) {
    const total = statsRows.length;
    const totalPersons = statsRows.reduce((s, r) => s + (r.persons_count || 0), 0);
    const totalClaims = statsRows.reduce((s, r) => s + (r.claims_count || 0), 0);
    const totalPrograms = statsRows.reduce((s, r) => s + (r.programs_count || 0), 0);

    const withPsi = statsRows.filter(r => r.has_psi_content).length;
    const withBiologics = statsRows.filter(r => r.has_biologics_claim).length;
    const withCrash = statsRows.filter(r => r.has_crash_retrieval_claim).length;
    const withOath = statsRows.filter(r => r.has_under_oath_claims).length;
    const withCraft = statsRows.filter(r => r.has_craft_observation).length;

    // Tone distribution
    const toneMap: Record<string, number> = {};
    for (const r of statsRows) {
      if (r.video_tone) toneMap[r.video_tone] = (toneMap[r.video_tone] || 0) + 1;
    }

    // Entity type distribution
    const entityMap: Record<string, number> = {};
    for (const r of statsRows) {
      if (r.dominant_entity_type && r.dominant_entity_type !== 'none') {
        entityMap[r.dominant_entity_type] = (entityMap[r.dominant_entity_type] || 0) + 1;
      }
    }

    console.log(`  📹 Videos analyzed: ${total}`);
    console.log(`  👤 Total persons extracted: ${totalPersons} (avg ${(totalPersons / total).toFixed(1)}/video)`);
    console.log(`  📝 Total claims extracted: ${totalClaims} (avg ${(totalClaims / total).toFixed(1)}/video)`);
    console.log(`  🏛️  Total programs mentioned: ${totalPrograms}`);
    console.log('');
    console.log(`  🧠 Videos with PSI/consciousness content: ${withPsi}/${total} (${((withPsi / total) * 100).toFixed(0)}%)`);
    console.log(`  🧬 Videos with biologics claims: ${withBiologics}/${total} (${((withBiologics / total) * 100).toFixed(0)}%)`);
    console.log(`  💥 Videos with crash retrieval claims: ${withCrash}/${total} (${((withCrash / total) * 100).toFixed(0)}%)`);
    console.log(`  ✋ Videos with under-oath claims: ${withOath}/${total} (${((withOath / total) * 100).toFixed(0)}%)`);
    console.log(`  🛸 Videos with craft observation: ${withCraft}/${total} (${((withCraft / total) * 100).toFixed(0)}%)`);
    console.log('');

    console.log('  🎭 Video Tone Distribution:');
    const sortedTones = Object.entries(toneMap).sort((a, b) => b[1] - a[1]);
    for (const [tone, count] of sortedTones) {
      const bar = '█'.repeat(Math.ceil(count / total * 30));
      console.log(`    ${tone.padEnd(18)} ${String(count).padStart(3)} (${((count / total) * 100).toFixed(0)}%) ${bar}`);
    }

    if (Object.keys(entityMap).length > 0) {
      console.log('\n  👽 Dominant Entity Types (from encounters):');
      const sortedEntities = Object.entries(entityMap).sort((a, b) => b[1] - a[1]);
      for (const [entity, count] of sortedEntities) {
        console.log(`    ${entity.padEnd(20)} ${count}`);
      }
    }

    // Intelligence value distribution
    const intelValues = statsRows.map(r => r.intelligence_value).filter(Boolean);
    if (intelValues.length > 0) {
      const avgIntel = intelValues.reduce((s, v) => s + v, 0) / intelValues.length;
      const maxIntel = Math.max(...intelValues);
      const highValueCount = intelValues.filter(v => v >= 7).length;
      console.log(`\n  🎯 Intelligence Value: avg=${avgIntel.toFixed(1)}/10, max=${maxIntel}/10, high-value (≥7): ${highValueCount} videos`);
    }
  } else {
    console.log('  No stats available yet.');
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
