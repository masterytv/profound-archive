/**
 * UAP Contactee Profile Sync
 * 
 * Copy-Modify from: src/lib/pipeline/experiencer-sync.ts (NDE)
 * 
 * Automatically creates or updates UAP contactee profiles when videos
 * are processed through the intake pipeline. Ensures every named
 * contactee gets a profile page with zero LLM calls — all
 * enrichment uses the existing data-derivation pipeline.
 * 
 * Called from intake-uap.ts Step 12.5, after classification/intake completes.
 * 
 * Key differences from NDE:
 * - Table: uap_contactee_profiles (not experiencer_profiles)
 * - Video table: uap_vids (not nde_vids)
 * - Name column: experiencer_name (not experiencerFullName)
 * - ID type: UUID (not bigint)
 * - Name field: display_name (not full_name)
 * - Filter: tier = 1 (not isNde IN ('clear_nde', 'possible_nde'))
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { generateContacteeProfile } from './contactee-profile';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ContacteeSyncResult {
  created: boolean;
  updated: boolean;
  enriched: boolean;
  slug: string;
  profileId: string;
  videoCount: number;
  message: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert a full name to a URL-safe slug */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// ─── Main ───────────────────────────────────────────────────────────────────

/**
 * Sync a UAP contactee profile after a video is processed.
 * 
 * 1. Checks if a profile already exists for this name (case-insensitive)
 * 2. If exists → ensures the new videoId is in video_ids, re-enriches
 * 3. If not → gathers all Tier 1 video_ids for this name, creates stub, enriches
 * 
 * @param supabase - Admin client with service role key
 * @param contacteeName - The AI-extracted experiencer/contactee name
 * @param videoId - The just-processed video ID
 * @returns SyncResult with creation/update/enrichment status
 */
export async function syncContacteeProfile(
  supabase: SupabaseClient,
  contacteeName: string,
  videoId: string,
): Promise<ContacteeSyncResult> {
  const trimmedName = contacteeName.trim();
  if (!trimmedName) {
    return { created: false, updated: false, enriched: false, slug: '', profileId: '', videoCount: 0, message: 'Empty name' };
  }

  // 1. Check if profile already exists (case-insensitive match)
  const { data: existingProfile } = await supabase
    .from('uap_contactee_profiles')
    .select('id, slug, display_name, video_ids')
    .ilike('display_name', trimmedName)
    .limit(1)
    .maybeSingle();

  if (existingProfile) {
    // Profile exists — ensure video_ids includes this new videoId
    const currentVideoIds: string[] = existingProfile.video_ids || [];

    if (currentVideoIds.includes(videoId)) {
      // Already linked — just re-enrich to refresh data
      const enrichResult = await generateContacteeProfile(supabase, existingProfile.id);
      return {
        created: false,
        updated: false,
        enriched: enrichResult.status === 'success',
        slug: existingProfile.slug,
        profileId: existingProfile.id,
        videoCount: currentVideoIds.length,
        message: `Already linked, re-enriched: ${enrichResult.message}`,
      };
    }

    // New video for existing contactee — append to video_ids
    const updatedVideoIds = [...currentVideoIds, videoId];
    const { error: updateError } = await supabase
      .from('uap_contactee_profiles')
      .update({
        video_ids: updatedVideoIds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingProfile.id);

    if (updateError) {
      return {
        created: false, updated: false, enriched: false,
        slug: existingProfile.slug, profileId: existingProfile.id,
        videoCount: currentVideoIds.length,
        message: `Failed to update video_ids: ${updateError.message}`,
      };
    }

    // Re-enrich with the new video included
    const enrichResult = await generateContacteeProfile(supabase, existingProfile.id);
    return {
      created: false,
      updated: true,
      enriched: enrichResult.status === 'success',
      slug: existingProfile.slug,
      profileId: existingProfile.id,
      videoCount: updatedVideoIds.length,
      message: `Added video, now ${updatedVideoIds.length} videos. ${enrichResult.message}`,
    };
  }

  // 2. Profile doesn't exist — gather ALL Tier 1 videos for this contactee name
  //    (there may be other videos with the same name already in the DB)
  const { data: allVideos } = await supabase
    .from('uap_vids')
    .select('video_id')
    .ilike('experiencer_name', trimmedName)
    .eq('tier', 1);

  const allVideoIds = Array.from(
    new Set([
      ...(allVideos || []).map((v: any) => v.video_id),
      videoId, // Ensure the current video is always included
    ])
  );

  // 3. Create the stub profile
  const slug = toSlug(trimmedName);

  // Guard against slug collision (e.g., "John Smith Jr" vs "John Smith Jr.")
  const { data: slugCheck } = await supabase
    .from('uap_contactee_profiles')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (slugCheck) {
    // Slug exists but name didn't match — edge case with slightly different spelling
    // Skip creation to avoid confusion; the admin can merge manually
    return {
      created: false, updated: false, enriched: false,
      slug, profileId: slugCheck.id, videoCount: 0,
      message: `Slug "${slug}" already exists for a different name variant. Manual review needed.`,
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from('uap_contactee_profiles')
    .insert({
      slug,
      display_name: trimmedName,
      video_ids: allVideoIds,
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertError) {
    return {
      created: false, updated: false, enriched: false,
      slug, profileId: '', videoCount: allVideoIds.length,
      message: `Insert failed: ${insertError.message}`,
    };
  }

  // 4. Enrich the new profile using existing data pipeline (no LLM calls)
  const enrichResult = await generateContacteeProfile(supabase, inserted.id);

  return {
    created: true,
    updated: false,
    enriched: enrichResult.status === 'success',
    slug,
    profileId: inserted.id,
    videoCount: allVideoIds.length,
    message: `Created with ${allVideoIds.length} video(s). ${enrichResult.message}`,
  };
}
