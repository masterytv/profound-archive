/**
 * UAP Fix Encounters Route
 * 
 * POST /api/uap/fix-encounters
 * 
 * Finds all videos where the encounter segmenter over-split a single
 * experiencer's life story into multiple encounter rows. For each:
 *   1. Deletes all encounter rows for the video
 *   2. Inserts ONE clean encounter row using the full transcript
 *   3. Updates uap_vids.multi_encounter = false, encounter_count = 1
 * 
 * Body: { dryRun?: boolean }
 * Auth: CRON_SECRET bearer token
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase environment variables');
  return createClient(url, key);
}

export async function POST(request: Request) {
  // Auth check — CRON_SECRET only
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isDebug = process.env.IS_DEBUG_MODE;

  if (!isDebug && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const dryRun = body.dryRun === true;

  const supabase = getSupabaseAdmin();

  // ── Find affected videos ──────────────────────────────────────────────────
  // Videos where encounter_count > 1 but all encounter rows have the same name
  const { data: allEncounters, error: fetchError } = await supabase
    .from('uap_encounters')
    .select('id, video_id, experiencer_name, source_type, encounter_index')
    .order('video_id')
    .order('encounter_index');

  if (fetchError) {
    return NextResponse.json({ error: `Failed to fetch encounters: ${fetchError.message}` }, { status: 500 });
  }

  // Group by video_id
  const byVideo = new Map<string, typeof allEncounters>();
  for (const enc of allEncounters || []) {
    const group = byVideo.get(enc.video_id) || [];
    group.push(enc);
    byVideo.set(enc.video_id, group);
  }

  // Find videos with multiple encounter rows but only 1 distinct name
  const videosToFix: Array<{
    videoId: string;
    encounterCount: number;
    experiencerName: string;
    sourceType: string;
    encounterIds: string[];
  }> = [];

  for (const [videoId, encounters] of byVideo) {
    if (encounters.length <= 1) continue;

    const distinctNames = new Set(encounters.map(e => e.experiencer_name.toLowerCase().trim()));
    if (distinctNames.size === 1) {
      videosToFix.push({
        videoId,
        encounterCount: encounters.length,
        experiencerName: encounters[0].experiencer_name,
        sourceType: encounters[0].source_type,
        encounterIds: encounters.map(e => e.id),
      });
    }
  }

  console.log(`[fix-encounters] Found ${videosToFix.length} videos with over-split encounters`);

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      fixedCount: videosToFix.length,
      videoIds: videosToFix.map(v => v.videoId),
      details: videosToFix.map(v => ({
        videoId: v.videoId,
        experiencer: v.experiencerName,
        currentEncounterCount: v.encounterCount,
        willBecome: 1,
      })),
    });
  }

  // ── Fix each video ────────────────────────────────────────────────────────
  const results: Array<{ videoId: string; status: string; deleted: number }> = [];

  for (const video of videosToFix) {
    try {
      // Delete ALL encounter rows for this video
      const { error: deleteError } = await supabase
        .from('uap_encounters')
        .delete()
        .eq('video_id', video.videoId);

      if (deleteError) {
        results.push({ videoId: video.videoId, status: 'delete_failed', deleted: 0 });
        continue;
      }

      // Insert ONE clean encounter row with no analysis (reanalyze will fill it)
      const { error: insertError } = await supabase
        .from('uap_encounters')
        .insert({
          video_id: video.videoId,
          experiencer_name: video.experiencerName,
          source_type: video.sourceType,
          encounter_label: `${video.experiencerName}'s Encounter`,
          encounter_index: 0,
          segment_text: null, // null = use full transcript
          analysis_model: null,
          analyzed_at: null,
        });

      if (insertError) {
        results.push({ videoId: video.videoId, status: 'insert_failed', deleted: video.encounterCount });
        continue;
      }

      // Update uap_vids flags
      await supabase
        .from('uap_vids')
        .update({
          multi_encounter: false,
          encounter_count: 1,
        })
        .eq('video_id', video.videoId);

      results.push({
        videoId: video.videoId,
        status: 'consolidated',
        deleted: video.encounterCount - 1,
      });

      console.log(`[fix-encounters] ✅ ${video.videoId}: ${video.encounterCount} → 1 (${video.experiencerName})`);
    } catch (err: any) {
      results.push({ videoId: video.videoId, status: `error: ${err.message}`, deleted: 0 });
    }
  }

  const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0);
  const successCount = results.filter(r => r.status === 'consolidated').length;

  return NextResponse.json({
    fixedCount: successCount,
    totalEncountersDeleted: totalDeleted,
    videoIds: videosToFix.map(v => v.videoId),
    results,
  });
}
