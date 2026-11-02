/**
 * Experiencer Profile Sync
 * 
 * Automatically creates or updates experiencer profiles when videos
 * are processed through the intake pipeline. Ensures every named
 * experiencer gets a profile page with zero LLM calls — all
 * enrichment uses the existing data-derivation pipeline.
 * 
 * Called from intake.ts Step 14.5, after analysis completes.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { generateExperiencerProfile } from './experiencer-profile';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExperiencerSyncResult {
  created: boolean;
  updated: boolean;
  enriched: boolean;
  slug: string;
  profileId: number;
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

const normalize = (text: string | null) =>
  (text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const containsWords = (text: string, words: string) => ` ${text} `.includes(` ${words} `);

/**
 * Hosts get credited as the experiencer on videos where they interview someone
 * else, so the credit alone isn't enough: the title or description must name
 * them, and on their own channel only the title counts.
 */
function namesExperiencer(
  video: { title: string | null; description: string | null; channelName: string | null },
  name: string,
): boolean {
  const fullName = normalize(name);
  if (containsWords(normalize(video.title), fullName)) return true;

  const surname = fullName.split(' ').pop()!;
  return !containsWords(normalize(video.channelName), surname)
    && containsWords(normalize(video.description), fullName);
}

/**
 * Other NDE videos credited to this name. A single word like "Dave" can't tell
 * two people apart, so only full names pull in other videos.
 */
async function findVideoIdsByName(supabase: SupabaseClient, name: string): Promise<string[]> {
  if (!name.includes(' ')) return [];

  const { data } = await supabase
    .from('nde_vids')
    .select('videoId, title, description, channelName')
    .ilike('experiencerFullName', name)
    .in('isNde', ['clear_nde', 'possible_nde']);

  return (data || []).filter((v: any) => namesExperiencer(v, name)).map((v: any) => v.videoId);
}

// ─── Main ───────────────────────────────────────────────────────────────────

/**
 * Sync an experiencer profile after a video is processed.
 *
 * 1. Checks if a profile already exists for this name (case-insensitive)
 * 2. If exists → adds this videoId and any other videos for this name, re-enriches
 * 3. If not → gathers all video_ids for this name, creates stub, enriches
 *
 * @param supabase - Admin client with service role key
 * @param experiencerFullName - The AI-extracted experiencer name
 * @param videoId - The just-processed video ID
 * @returns SyncResult with creation/update/enrichment status
 */
export async function syncExperiencerProfile(
  supabase: SupabaseClient,
  experiencerFullName: string,
  videoId: string,
): Promise<ExperiencerSyncResult> {
  const trimmedName = experiencerFullName.trim();
  if (!trimmedName) {
    return { created: false, updated: false, enriched: false, slug: '', profileId: 0, videoCount: 0, message: 'Empty name' };
  }

  // 1. Check if profile already exists (case-insensitive match)
  const { data: existingProfile } = await supabase
    .from('experiencer_profiles')
    .select('id, slug, full_name, video_ids')
    .ilike('full_name', trimmedName)
    .limit(1)
    .maybeSingle();

  if (existingProfile) {
    // Profile exists — ensure video_ids includes this videoId and its same-name videos
    const currentVideoIds: string[] = existingProfile.video_ids || [];
    const updatedVideoIds = Array.from(new Set([
      ...currentVideoIds,
      videoId,
      ...await findVideoIdsByName(supabase, trimmedName),
    ]));

    if (updatedVideoIds.length === currentVideoIds.length) {
      // Already linked — just re-enrich to refresh data
      const enrichResult = await generateExperiencerProfile(supabase, existingProfile.id);
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

    // New videos for existing experiencer — save to video_ids
    const { error: updateError } = await supabase
      .from('experiencer_profiles')
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
    const enrichResult = await generateExperiencerProfile(supabase, existingProfile.id);
    return {
      created: false,
      updated: true,
      enriched: enrichResult.status === 'success',
      slug: existingProfile.slug,
      profileId: existingProfile.id,
      videoCount: updatedVideoIds.length,
      message: `Added ${updatedVideoIds.length - currentVideoIds.length} video(s), now ${updatedVideoIds.length} videos. ${enrichResult.message}`,
    };
  }

  // 2. Profile doesn't exist — gather ALL videos for this experiencer name
  //    (there may be other videos with the same name already in the DB)
  const allVideoIds = Array.from(
    new Set([
      ...await findVideoIdsByName(supabase, trimmedName),
      videoId, // Ensure the current video is always included
    ])
  );

  // 3. Create the stub profile
  const slug = toSlug(trimmedName);

  // Guard against slug collision (e.g., "John Smith Jr" vs "John Smith Jr.")
  const { data: slugCheck } = await supabase
    .from('experiencer_profiles')
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
    .from('experiencer_profiles')
    .insert({
      slug,
      full_name: trimmedName,
      video_ids: allVideoIds,
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertError) {
    return {
      created: false, updated: false, enriched: false,
      slug, profileId: 0, videoCount: allVideoIds.length,
      message: `Insert failed: ${insertError.message}`,
    };
  }

  // 4. Enrich the new profile using existing data pipeline (no LLM calls)
  const enrichResult = await generateExperiencerProfile(supabase, inserted.id);

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
