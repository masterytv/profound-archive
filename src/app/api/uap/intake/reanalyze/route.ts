import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeUapPhenomenology } from '@/lib/ai/uap-phenomenology';
import { analyzeUapEncounterContext } from '@/lib/ai/uap-encounter-context';

export const dynamic = 'force-dynamic';

/**
 * POST /api/uap/intake/reanalyze
 * Targeted re-analysis of specific UAP videos.
 * Re-runs selected analysis passes without full pipeline reset.
 *
 * Body: { videoId: string, secret: string, passes?: ('phenomenology' | 'encounter_context')[] }
 * Default passes: ['phenomenology', 'encounter_context']
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, secret, passes = ['phenomenology', 'encounter_context'] } = body;

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

    // Fetch transcript
    const { data: video, error: videoError } = await supabase
      .from('uap_vids')
      .select('title, subtitles_punctuated')
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

    // Run phenomenology pass
    if (passes.includes('phenomenology')) {
      console.log('[reanalyze] Running phenomenology analysis...');
      const phenomResult = await analyzeUapPhenomenology(video.subtitles_punctuated);
      results.phenomenology = phenomResult ? 'success' : 'failed';
      if (phenomResult) {
        updatePayload.phenomenology_breakdown = phenomResult;
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
