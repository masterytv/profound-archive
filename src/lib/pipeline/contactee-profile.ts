/**
 * UAP Contactee Profile Enrichment Pipeline
 * 
 * Copy-Modify from: src/lib/pipeline/experiencer-profile.ts (NDE)
 * 
 * Populates the enrichment fields on uap_contactee_profiles by mining
 * real data from uap_analysis and uap_vids. Every data point traces
 * to an actual video — zero hallucination.
 * 
 * Key differences from NDE:
 * - Reads from uap_vids / uap_analysis / uap_channels (not nde_*)
 * - Scores: evidence_score, contact_depth_score, transformation_score (not Greyson/veridical)
 * - No NDE core_elements or journey_sequence — uses UAP entities/phenomenology
 * - experience_type: contact/abduction/CE-5/ongoing/mixed (not NDE types)
 * - entity_types derived from uap_analysis.entities
 * - recurrence derived from uap_analysis.recurrence_pattern
 * 
 * Can be called from:
 * - contactee-sync.ts (after intake)
 * - CLI script (batch all profiles)
 * - Admin UI (single profile refresh)
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChannelAppearance {
  channel_id: string;
  name: string;
  avatar_url: string | null;
  video_count: number;
}

export interface ContacteeProfileResult {
  slug: string;
  display_name: string;
  status: 'success' | 'no_videos' | 'error';
  video_count: number;
  message?: string;
}

// ─── Main Pipeline ──────────────────────────────────────────────────────────

/**
 * Generate or refresh a single UAP contactee profile from video data.
 * All content is derived from actual transcripts and analysis — no LLM calls.
 */
export async function generateContacteeProfile(
  supabase: SupabaseClient,
  profileId: string,
): Promise<ContacteeProfileResult> {
  // 1. Get the existing profile
  const { data: profile, error: profileError } = await supabase
    .from('uap_contactee_profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  if (profileError || !profile) {
    return { slug: '', display_name: '', status: 'error', video_count: 0, message: `Profile not found: ${profileError?.message}` };
  }

  const videoIds: string[] = profile.video_ids || [];
  if (videoIds.length === 0) {
    return { slug: profile.slug, display_name: profile.display_name, status: 'no_videos', video_count: 0, message: 'No video_ids linked' };
  }

  // 2. Fetch all linked videos
  const { data: videos, error: videosError } = await supabase
    .from('uap_vids')
    .select('video_id, title, channel_id, channel_name, date, thumbnail_url, view_count')
    .in('video_id', videoIds);

  if (videosError || !videos || videos.length === 0) {
    return { slug: profile.slug, display_name: profile.display_name, status: 'no_videos', video_count: 0, message: `Video fetch error: ${videosError?.message}` };
  }

  // 3. Fetch analysis for all videos (triad scores + derived data)
  const { data: analyses } = await supabase
    .from('uap_analysis')
    .select('video_id, evidence_score, contact_depth_score, transformation_score, experience_type, entities, phenomenology, overall_tone, recurrence_pattern')
    .in('video_id', videoIds);

  // 3b. Compute average triad scores
  const evidenceScores = (analyses || []).map((a: any) => a.evidence_score).filter((v: any): v is number => v != null);
  const contactDepthScores = (analyses || []).map((a: any) => a.contact_depth_score).filter((v: any): v is number => v != null);
  const transformScores = (analyses || []).map((a: any) => a.transformation_score).filter((v: any): v is number => v != null);

  const avgEvidence = evidenceScores.length ? evidenceScores.reduce((a: number, b: number) => a + b, 0) / evidenceScores.length : null;
  const avgContactDepth = contactDepthScores.length ? contactDepthScores.reduce((a: number, b: number) => a + b, 0) / contactDepthScores.length : null;
  const avgTransformation = transformScores.length ? transformScores.reduce((a: number, b: number) => a + b, 0) / transformScores.length : null;

  // Compute total views across all linked videos
  const totalViews = videos.reduce((sum, v: any) => sum + (parseInt(v.view_count, 10) || 0), 0);

  // 4. Build channel appearances
  const channelMap = new Map<string, { name: string; avatar_url: string | null; count: number }>();
  for (const video of videos) {
    if (!video.channel_id) continue;
    const existing = channelMap.get(video.channel_id);
    if (existing) {
      existing.count++;
    } else {
      channelMap.set(video.channel_id, {
        name: video.channel_name || 'Unknown Channel',
        avatar_url: null,
        count: 1,
      });
    }
  }

  // Enrich with channel avatars from uap_channels
  const channelIds = Array.from(channelMap.keys());
  if (channelIds.length > 0) {
    const { data: channels } = await supabase
      .from('uap_channels')
      .select('channel_id, avatar_url')
      .in('channel_id', channelIds);

    for (const ch of channels || []) {
      const entry = channelMap.get(ch.channel_id);
      if (entry) entry.avatar_url = ch.avatar_url;
    }
  }

  const channelAppearances: ChannelAppearance[] = Array.from(channelMap.entries())
    .map(([channel_id, data]) => ({
      channel_id,
      name: data.name,
      avatar_url: data.avatar_url,
      video_count: data.count,
    }))
    .sort((a, b) => b.video_count - a.video_count);

  // 5. Determine experience type (most common across videos)
  const typeCounts = new Map<string, number>();
  for (const analysis of analyses || []) {
    if (analysis.experience_type) {
      typeCounts.set(analysis.experience_type, (typeCounts.get(analysis.experience_type) || 0) + 1);
    }
  }
  const experienceType = typeCounts.size > 0
    ? Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  // 6. Extract entity types from analysis
  const entityTypeSet = new Set<string>();
  for (const analysis of analyses || []) {
    if (analysis.entities && typeof analysis.entities === 'object') {
      // entities can be { encounters: [...] } or [...]
      const entityList = Array.isArray(analysis.entities)
        ? analysis.entities
        : Array.isArray((analysis.entities as any).encounters)
          ? (analysis.entities as any).encounters
          : [];
      for (const entity of entityList) {
        if (entity?.type) entityTypeSet.add(entity.type);
      }
    }
  }
  const entityTypes = Array.from(entityTypeSet);

  // 7. Determine recurrence pattern (most common)
  const recurrenceCounts = new Map<string, number>();
  for (const analysis of analyses || []) {
    if (analysis.recurrence_pattern) {
      recurrenceCounts.set(analysis.recurrence_pattern, (recurrenceCounts.get(analysis.recurrence_pattern) || 0) + 1);
    }
  }
  const recurrence = recurrenceCounts.size > 0
    ? Array.from(recurrenceCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  // 8. Derive core themes from phenomenology and overall tone
  const themeSet = new Set<string>();
  for (const analysis of analyses || []) {
    if (analysis.overall_tone) themeSet.add(analysis.overall_tone);
    if (analysis.phenomenology && typeof analysis.phenomenology === 'object') {
      // Extract notable phenomenon categories
      const phenom = analysis.phenomenology as any;
      if (phenom.light_phenomena) themeSet.add('Light phenomena');
      if (phenom.time_distortion) themeSet.add('Time distortion');
      if (phenom.telepathy || phenom.telepathic_communication) themeSet.add('Telepathic communication');
      if (phenom.paralysis) themeSet.add('Paralysis');
      if (phenom.missing_time) themeSet.add('Missing time');
      if (phenom.physical_effects) themeSet.add('Physical effects');
    }
  }
  const coreThemes = Array.from(themeSet).slice(0, 8);

  // 9. Determine first_shared_year from earliest video date
  const years = videos
    .map(v => (v as any).date ? new Date((v as any).date).getFullYear() : null)
    .filter((y): y is number => y !== null && !isNaN(y));
  const firstSharedYear = years.length > 0 ? Math.min(...years) : null;

  // 10. Auto-extract photo from first video thumbnail (don't overwrite admin-set)
  let photoUrl = profile.photo_url;
  if (!photoUrl) {
    const firstVideo = videos.find(v => v.thumbnail_url);
    if (firstVideo?.thumbnail_url) {
      photoUrl = firstVideo.thumbnail_url;
    }
  }

  // 11. Pick a highlight quote from phenomenology or overall tone
  // For UAP we don't have NDE core_elements with quotes, so we derive
  // from the video title or analysis summary if available
  let highlightQuote = profile.highlight_quote;
  let highlightQuoteSource = profile.highlight_quote_source;
  // Only auto-set if not already set (admin can override)
  if (!highlightQuote && videos.length > 0) {
    // Use the most-viewed video's title as a stand-in until admin sets a real quote
    const sorted = [...videos].sort((a, b) => (parseInt(b.view_count, 10) || 0) - (parseInt(a.view_count, 10) || 0));
    highlightQuote = sorted[0].title || null;
    highlightQuoteSource = sorted[0].channel_name || null;
  }

  // 12. Suggest contribution label
  let contributionLabel = profile.contribution_label;
  if (!contributionLabel) {
    if (channelAppearances.length >= 3) {
      contributionLabel = 'Prominent Witness';
    } else if (entityTypes.includes('being') && entityTypes.includes('craft')) {
      contributionLabel = 'Multi-Phenomenon Experiencer';
    } else if (recurrence === 'ongoing') {
      contributionLabel = 'Ongoing Contact';
    } else {
      contributionLabel = 'Encounter Witness';
    }
  }

  // 13. Upsert the enriched profile
  const update: Record<string, any> = {
    highlight_quote: highlightQuote || null,
    highlight_quote_source: highlightQuoteSource || null,
    channel_appearances: channelAppearances,
    core_themes: coreThemes,
    entity_types: entityTypes,
    experience_type: experienceType,
    recurrence: recurrence,
    first_shared_year: firstSharedYear,
    total_views: totalViews,
    avg_evidence_score: avgEvidence,
    avg_contact_depth: avgContactDepth,
    avg_transformation_score: avgTransformation,
    contribution_label: contributionLabel,
    channel_ids: channelIds,
    updated_at: new Date().toISOString(),
  };

  // Only set photo if we found one and none was manually set
  if (photoUrl && !profile.photo_url) {
    update.photo_url = photoUrl;
  }

  const { error: updateError } = await supabase
    .from('uap_contactee_profiles')
    .update(update)
    .eq('id', profileId);

  if (updateError) {
    return { slug: profile.slug, display_name: profile.display_name, status: 'error', video_count: videos.length, message: updateError.message };
  }

  return {
    slug: profile.slug,
    display_name: profile.display_name,
    status: 'success',
    video_count: videos.length,
    message: `Enriched: ${channelAppearances.length} channels, ${coreThemes.length} themes, ${entityTypes.length} entity types`,
  };
}

// ─── Batch: Refresh All Profiles ────────────────────────────────────────────

/**
 * Regenerate enrichment data for all published UAP contactee profiles.
 */
export async function refreshAllContacteeProfiles(
  supabase: SupabaseClient,
): Promise<ContacteeProfileResult[]> {
  const { data: profiles, error } = await supabase
    .from('uap_contactee_profiles')
    .select('id')
    .not('published_at', 'is', null)
    .order('created_at');

  if (error || !profiles) {
    console.error('Failed to fetch contactee profiles:', error?.message);
    return [];
  }

  const results: ContacteeProfileResult[] = [];
  for (const profile of profiles) {
    console.log(`[ContacteeProfile] Processing profile ${profile.id}...`);
    const result = await generateContacteeProfile(supabase, profile.id);
    results.push(result);
    console.log(`[ContacteeProfile] ${result.display_name}: ${result.status} — ${result.message}`);
    // Brief pause to avoid overwhelming the DB
    await new Promise(r => setTimeout(r, 200));
  }

  return results;
}
