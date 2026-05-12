import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeUapPhenomenology } from '@/lib/ai/uap-phenomenology';
import { analyzeUapEncounterContext } from '@/lib/ai/uap-encounter-context';
import { analyzeUapProgramIntel } from '@/lib/ai/uap-program-intel';
import { addTimestampsToProgramIntel, addTimestampsToPhenomenology } from '@/lib/ai/match-quote-timestamp';

export const dynamic = 'force-dynamic';

/**
 * POST /api/uap/intake/reanalyze
 * Targeted re-analysis of specific UAP videos.
 * Re-runs selected analysis passes without full pipeline reset.
 * Timestamps are added deterministically via caption segment matching (not LLM).
 *
 * Body: { videoId: string, secret: string, passes?: ('phenomenology' | 'encounter_context' | 'program_intel')[] }
 * Default passes: ['phenomenology', 'encounter_context', 'program_intel']
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, secret, passes = ['phenomenology', 'encounter_context', 'program_intel'] } = body;

    // Auth check
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    // Fetch transcript + raw timestamped segments for post-processing
    const { data: video, error: videoError } = await supabase
      .from('uap_vids')
      .select('title, subtitles_punctuated, raw_timestamped_subtitles')
      .eq('video_id', videoId)
      .single();

    if (videoError || !video?.subtitles_punctuated) {
      return NextResponse.json(
        { error: 'Video not found or no transcript', details: videoError?.message },
        { status: 404 }
      );
    }

    console.log(`[reanalyze] Video: "${video.title}" (${videoId})`);
    console.log(`[reanalyze] Transcript: ${video.subtitles_punctuated.length} chars`);
    console.log(`[reanalyze] Passes: ${passes.join(', ')}`);

    const results: Record<string, unknown> = {};
    const updatePayload: Record<string, unknown> = {};

    // Run phenomenology pass (uses clean punctuated transcript)
    if (passes.includes('phenomenology')) {
      console.log('[reanalyze] Running phenomenology analysis...');
      const phenomRaw = await analyzeUapPhenomenology(video.subtitles_punctuated);
      results.phenomenology = phenomRaw ? 'success' : 'failed';
      if (phenomRaw) {
        // Post-process: deterministic timestamp matching
        updatePayload.phenomenology_breakdown = addTimestampsToPhenomenology(
          phenomRaw, video.raw_timestamped_subtitles
        );
      }
    }

    // Run encounter context pass
    if (passes.includes('encounter_context')) {
      console.log('[reanalyze] Running encounter context analysis...');
      const contextResult = await analyzeUapEncounterContext(video.subtitles_punctuated);
      results.encounter_context = contextResult ? 'success' : 'failed';
      if (contextResult) {
        updatePayload.encounter_context = contextResult;
      }
    }

    // Run program intel pass
    if (passes.includes('program_intel')) {
      console.log('[reanalyze] Running program intel analysis...');
      const intelRaw = await analyzeUapProgramIntel(video.subtitles_punctuated);
      results.program_intel = intelRaw ? 'success' : 'failed';
      if (intelRaw) {
        // Post-process: deterministic timestamp matching
        updatePayload.program_intel_breakdown = addTimestampsToProgramIntel(
          intelRaw, video.raw_timestamped_subtitles
        );
      }
    }

    // Save results
    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabase
        .from('uap_analysis')
        .update(updatePayload)
        .eq('video_id', videoId);

      if (updateError) {
        console.error('[reanalyze] Save error:', updateError.message);
        return NextResponse.json(
          { error: 'Failed to save results', details: updateError.message },
          { status: 500 }
        );
      }
    }

    console.log('[reanalyze] ✅ Complete:', results);
    return NextResponse.json({ videoId, results, saved: Object.keys(updatePayload) });
  } catch (error) {
    console.error('[reanalyze] Error:', error);
    return NextResponse.json(
      { error: 'Internal error', details: String(error) },
      { status: 500 }
    );
  }
}
