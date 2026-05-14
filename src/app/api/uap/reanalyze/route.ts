/**
 * UAP Video Re-Analysis Route
 * 
 * POST /api/uap/reanalyze — Re-runs analysis pipeline on an already-ingested video.
 * Uses the existing subtitles_punctuated from the database (no re-scrape).
 * 
 * Body: { videoId: string, mode?: "full" | "stats_only" }
 * Auth: Admin session OR IS_DEBUG_MODE
 * 
 * This bypasses the tsx EPERM issue by running inside the Next.js dev server process.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { analyzeUapProgramIntel } from '@/lib/ai/uap-program-intel';
import { analyzeUapPhenomenology } from '@/lib/ai/uap-phenomenology';
import { analyzeUapEncounterContext } from '@/lib/ai/uap-encounter-context';
import { analyzeUapEvidenceScore } from '@/lib/ai/uap-evidence';
import { analyzeUapContactDepthScore } from '@/lib/ai/uap-contact-depth';
import { analyzeUapTransformationScore } from '@/lib/ai/uap-transformation';
import { generateUapSummary } from '@/lib/ai/uap-summary';
import { addTimestampsToProgramIntel, addTimestampsToPhenomenology } from '@/lib/ai/match-quote-timestamp';
import { computeVideoStats, mergeEncounterStats } from '@/lib/pipeline/compute-video-stats';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase environment variables');
  return createClient(url, key);
}

async function checkAuth(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  if (process.env.IS_DEBUG_MODE) return true;

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const adminSupabase = getSupabaseAdmin();
    const { data: profile } = await adminSupabase
      .from('profiles').select('role').eq('id', user.id).single();
    return profile?.role === 'admin' || profile?.role === 'super_admin';
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const isAuthorized = await checkAuth(request);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const videoId: string = body.videoId;
  const mode: string = body.mode || 'full';

  if (!videoId) {
    return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const startTime = Date.now();

  console.log(`[reanalyze] Starting ${mode} re-analysis for ${videoId}`);

  // Fetch video data
  const { data: video, error: fetchError } = await supabase
    .from('uap_vids')
    .select('video_id, title, tier, content_type, subtitles_punctuated, raw_timestamped_subtitles, experiencer_name')
    .eq('video_id', videoId)
    .single();

  if (fetchError || !video) {
    console.error(`[reanalyze] Video lookup failed for ${videoId}:`, fetchError?.message, fetchError?.code);
    return NextResponse.json({ error: `Video not found: ${videoId}`, details: fetchError?.message }, { status: 404 });
  }

  if (!video.subtitles_punctuated) {
    return NextResponse.json({ error: 'No transcript available for this video' }, { status: 400 });
  }

  const results: Record<string, any> = { videoId, title: video.title, tier: video.tier, mode };

  try {
    // ── A. Program Intel + Summary (always run) ────────────────────
    console.log(`[reanalyze] Running Program Intel + Summary for "${video.title}"...`);
    const [programIntelRaw, summaryResult] = await Promise.all([
      analyzeUapProgramIntel(video.subtitles_punctuated).catch((e: Error) => {
        console.log(`[reanalyze] Program Intel failed: ${e.message}`);
        return null;
      }),
      generateUapSummary(video.subtitles_punctuated).catch((e: Error) => {
        console.log(`[reanalyze] Summary failed: ${e.message}`);
        return null;
      }),
    ]);

    // Post-process timestamps
    const programIntelResult = programIntelRaw && video.raw_timestamped_subtitles
      ? addTimestampsToProgramIntel(programIntelRaw, video.raw_timestamped_subtitles)
      : programIntelRaw;

    // Persist intel
    if (programIntelResult) {
      await supabase.from('uap_analysis').upsert({
        video_id: videoId,
        program_intel_breakdown: programIntelResult,
        analysis_model: 'gpt-4o-mini',
        analyzed_at: new Date().toISOString(),
      }, { onConflict: 'video_id' });
      results.intel = true;
      results.video_tone = programIntelResult.video_tone;
      results.persons_count = programIntelResult.persons?.length ?? 0;
      results.claims_count = programIntelResult.claims?.length ?? 0;
    }

    // Persist summary
    if (summaryResult?.uap_summary) {
      await supabase.from('uap_vids')
        .update({ analysis_uap_summary: summaryResult.uap_summary })
        .eq('video_id', videoId);
      results.summary = true;
    }

    // ── Compute + upsert video stats ──────────────────────────────
    if (programIntelResult) {
      const stats = computeVideoStats(videoId, programIntelResult);
      await supabase.from('uap_video_stats').upsert(stats, { onConflict: 'video_id' });
      results.stats = true;
      results.stats_tone = stats.video_tone;
      results.stats_intelligence = stats.intelligence_value;
    }

    // ── B. Encounter Analysis (Tier 1 + retold encounters) ────────
    const hasEncounterContent = video.content_type === 'first_person'
      || video.content_type === 'interview'
      || video.content_type === 'retold_encounter';

    if (hasEncounterContent) {
      console.log(`[reanalyze] Running Encounter Analysis...`);

      const { data: existingEncounters } = await supabase
        .from('uap_encounters')
        .select('id, experiencer_name, source_type, encounter_label, encounter_index, segment_text')
        .eq('video_id', videoId)
        .order('encounter_index');

      results.encounter_count = existingEncounters?.length ?? 0;

      if (existingEncounters && existingEncounters.length > 0) {
        for (const enc of existingEncounters) {
          const encText = enc.segment_text || video.subtitles_punctuated;
          const runTriad = enc.source_type === 'direct_experiencer'
            || enc.source_type === 'interview_with_experiencer';

          console.log(`[reanalyze] Analyzing encounter: ${enc.experiencer_name} (${enc.source_type})`);

          const encounterPromises: Promise<any>[] = [
            analyzeUapPhenomenology(encText).catch(() => null),
            analyzeUapEncounterContext(encText).catch(() => null),
          ];

          if (runTriad) {
            encounterPromises.push(
              analyzeUapEvidenceScore(encText).catch(() => null),
              analyzeUapContactDepthScore(encText).catch(() => null),
              analyzeUapTransformationScore(encText).catch(() => null),
            );
          }

          const analysisResults = await Promise.all(encounterPromises);
          const [phenomResult, contextResult] = analysisResults;
          const evidenceResult = runTriad ? analysisResults[2] : null;
          const contactDepthResult = runTriad ? analysisResults[3] : null;
          const transformationResult = runTriad ? analysisResults[4] : null;

          const updateRow: Record<string, any> = {
            analysis_model: 'gpt-4o-mini',
            analyzed_at: new Date().toISOString(),
          };

          if (phenomResult) {
            updateRow.phenomenology_breakdown = video.raw_timestamped_subtitles
              ? addTimestampsToPhenomenology(phenomResult, video.raw_timestamped_subtitles)
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

          await supabase.from('uap_encounters').update(updateRow).eq('id', enc.id);
        }

        // Merge encounter stats
        const { data: updatedEncounters } = await supabase
          .from('uap_encounters')
          .select('evidence_score, contact_depth_score, transformation_score, phenomenology_breakdown')
          .eq('video_id', videoId);

        if (updatedEncounters && updatedEncounters.length > 0) {
          const hasCraft = updatedEncounters.some((r: any) =>
            r.phenomenology_breakdown?.craft_observation?.observed === true
          );
          const dominantEntity = updatedEncounters[0]?.phenomenology_breakdown?.dominant_entity_type || null;
          const evidenceScores = updatedEncounters.map((r: any) => r.evidence_score).filter(Boolean);
          const contactScores = updatedEncounters.map((r: any) => r.contact_depth_score).filter(Boolean);
          const transScores = updatedEncounters.map((r: any) => r.transformation_score).filter(Boolean);

          const encounterStats = mergeEncounterStats({ video_id: videoId }, {
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
    }

    results.status = 'success';
    results.duration_ms = Date.now() - startTime;
    console.log(`[reanalyze] ✅ Complete for ${videoId} in ${results.duration_ms}ms — tone=${results.video_tone}`);
    return NextResponse.json(results);

  } catch (error: any) {
    console.error(`[reanalyze] ❌ Error for ${videoId}:`, error);
    return NextResponse.json({
      ...results,
      status: 'failed',
      error: error.message,
      duration_ms: Date.now() - startTime,
    }, { status: 500 });
  }
}
