import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeUapPhenomenology } from '@/lib/ai/uap-phenomenology';
import { analyzeUapEncounterContext } from '@/lib/ai/uap-encounter-context';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/uap/intake/reanalyze
 *
 * Re-runs phenomenology and/or encounter context analysis for a specific video.
 * Used when schema fixes require re-processing without full pipeline re-run.
 *
 * Body: { videoId: string, secret: string, passes?: string[] }
 * passes defaults to ['phenomenology', 'encounter_context']
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { videoId, secret, passes } = body;

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!videoId) {
    return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  // Fetch transcript
  const { data: vid, error: vidError } = await supabase
    .from('uap_vids')
    .select('title, subtitles_punctuated, tier')
    .eq('video_id', videoId)
    .single();

  if (vidError || !vid?.subtitles_punctuated) {
    return NextResponse.json({
      error: vidError?.message || 'No transcript found',
    }, { status: 404 });
  }

  if (vid.tier !== 1) {
    return NextResponse.json({
      error: `Video is Tier ${vid.tier}, phenomenology is Tier 1 only`,
    }, { status: 400 });
  }

  const activePasses = passes || ['phenomenology', 'encounter_context'];
  const results: Record<string, any> = {};
  const updates: Record<string, any> = {};

  // Run requested passes in parallel
  const promises: Promise<void>[] = [];

  if (activePasses.includes('phenomenology')) {
    promises.push(
      analyzeUapPhenomenology(vid.subtitles_punctuated).then(r => {
        results.phenomenology = r ? 'success' : 'failed';
        if (r) updates.phenomenology_breakdown = r;
      })
    );
  }

  if (activePasses.includes('encounter_context')) {
    promises.push(
      analyzeUapEncounterContext(vid.subtitles_punctuated).then(r => {
        results.encounter_context = r ? 'success' : 'failed';
        if (r) updates.encounter_context = r;
      })
    );
  }

  await Promise.all(promises);

  // Save results
  if (Object.keys(updates).length > 0) {
    const { error: saveError } = await supabase
      .from('uap_analysis')
      .update(updates)
      .eq('video_id', videoId);

    if (saveError) {
      return NextResponse.json({
        error: `Save failed: ${saveError.message}`,
        results,
      }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    videoId,
    title: vid.title,
    results,
    updatedFields: Object.keys(updates),
  });
}
