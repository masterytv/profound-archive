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

import { isDebugBypass } from '@/lib/debug-mode';
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
  const isDebug = isDebugBypass();

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

  // Helper: extract base person name (before " & ", " and " suffixes)
  const getBaseName = (name: string): string => {
    const lower = name.toLowerCase().trim();
    const ampIdx = lower.indexOf(' & ');
    if (ampIdx > 0) return lower.slice(0, ampIdx).trim();
    const andIdx = lower.indexOf(' and ');
    if (andIdx > 0) return lower.slice(0, andIdx).trim();
    return lower;
  };

  // Helper: check if two names refer to the same person (fuzzy match)
  const isSamePerson = (a: string, b: string): boolean => {
    const aFull = a.toLowerCase().trim();
    const bFull = b.toLowerCase().trim();
    if (aFull === bFull) return true;
    const aBase = getBaseName(a);
    const bBase = getBaseName(b);
    if (aBase === bBase) return true;
    if (aBase.includes(bBase) || bBase.includes(aBase)) return true;
    if (aFull.includes(bFull) || bFull.includes(aFull)) return true;
    return false;
  };

  // Find videos with multiple encounter rows for the same person
  // Uses fuzzy matching to catch "Person" + "Person & Wife" variants
  const videosToFix: Array<{
    videoId: string;
    encounterCount: number;
    groups: Array<{
      experiencerName: string;
      sourceType: string;
      count: number;
    }>;
    encounterIds: string[];
  }> = [];

  for (const [videoId, encounters] of byVideo) {
    if (encounters.length <= 1) continue;

    // Build fuzzy groups: cluster names that match the same person
    const groups: Array<typeof encounters> = [];
    for (const enc of encounters) {
      let placed = false;
      for (const group of groups) {
        if (isSamePerson(enc.experiencer_name, group[0].experiencer_name)) {
          group.push(enc);
          placed = true;
          break;
        }
      }
      if (!placed) {
        groups.push([enc]);
      }
    }

    // Check if any person has duplicate rows (>1 row for same person)
    const hasDuplicates = groups.some(g => g.length > 1);
    if (hasDuplicates) {
      videosToFix.push({
        videoId,
        encounterCount: encounters.length,
        groups: groups.map(g => ({
          experiencerName: g
            .map(e => e.experiencer_name)
            .sort((a, b) => a.length - b.length)[0], // shortest = cleanest
          sourceType: g.find(e =>
            e.source_type === 'direct_experiencer' || e.source_type === 'interview_with_experiencer'
          )?.source_type || g[0].source_type,
          count: g.length,
        })),
        encounterIds: encounters.map(e => e.id),
      });
    }
  }

  const totalWillBecome = videosToFix.reduce((sum, v) => sum + v.groups.length, 0);

  console.log(`[fix-encounters] Found ${videosToFix.length} videos with over-split encounters (${totalWillBecome} total after fix)`);

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      fixedCount: videosToFix.length,
      videoIds: videosToFix.map(v => v.videoId),
      details: videosToFix.map(v => ({
        videoId: v.videoId,
        currentEncounterCount: v.encounterCount,
        willBecome: v.groups.length,
        persons: v.groups.map(g => `${g.experiencerName} (${g.count}→1)`),
      })),
    });
  }

  // ── Fix each video ────────────────────────────────────────────────────────
  const results: Array<{ videoId: string; status: string; deleted: number; newCount: number }> = [];

  for (const video of videosToFix) {
    try {
      // Delete ALL encounter rows for this video
      const { error: deleteError } = await supabase
        .from('uap_encounters')
        .delete()
        .eq('video_id', video.videoId);

      if (deleteError) {
        results.push({ videoId: video.videoId, status: 'delete_failed', deleted: 0, newCount: 0 });
        continue;
      }

      // Insert ONE clean encounter row PER distinct person (no analysis — reanalyze will fill it)
      const rowsToInsert = video.groups.map((g, i) => ({
        video_id: video.videoId,
        experiencer_name: g.experiencerName,
        source_type: g.sourceType,
        encounter_label: `${g.experiencerName}'s Encounter`,
        encounter_index: i,
        segment_text: null, // null = use full transcript
        analysis_model: null,
        analyzed_at: null,
      }));

      const { error: insertError } = await supabase
        .from('uap_encounters')
        .insert(rowsToInsert);

      if (insertError) {
        results.push({ videoId: video.videoId, status: 'insert_failed', deleted: video.encounterCount, newCount: 0 });
        continue;
      }

      // Update uap_vids flags
      const isMulti = video.groups.length > 1;
      await supabase
        .from('uap_vids')
        .update({
          multi_encounter: isMulti,
          encounter_count: video.groups.length,
        })
        .eq('video_id', video.videoId);

      results.push({
        videoId: video.videoId,
        status: 'consolidated',
        deleted: video.encounterCount - video.groups.length,
        newCount: video.groups.length,
      });

      console.log(`[fix-encounters] ✅ ${video.videoId}: ${video.encounterCount} → ${video.groups.length} (${video.groups.map(g => g.experiencerName).join(', ')})`);
    } catch (err: any) {
      results.push({ videoId: video.videoId, status: `error: ${err.message}`, deleted: 0, newCount: 0 });
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

