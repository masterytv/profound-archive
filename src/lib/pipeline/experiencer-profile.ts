/**
 * Experiencer Profile Generation Pipeline
 * 
 * Populates the celebration fields on experiencer_profiles by mining
 * real data from nde_analysis and nde_vids. Every quote and data point
 * traces to an actual video transcript — zero hallucination.
 * 
 * Can be called from:
 * - Admin UI (single profile refresh)
 * - CLI script (batch all profiles)
 * - Future cron job
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CoreElement {
  name: string;
  present: boolean;
  confidence: number;
  quote: string;
}

interface VideoWithAnalysis {
  videoId: string;
  title: string;
  channelId: string | null;
  channel_title: string | null;
  date: string | null;
  thumbnail_url: string | null;
  experiencerFullName: string | null;
  analysis: {
    core_elements: CoreElement[] | null;
    entities: any | null;
    journey_sequence: any | null;
    experience_type: string | null;
    trigger_category: string | null;
    overall_tone: string | null;
    intensity_rating: number | null;
  } | null;
}

interface ChannelAppearance {
  channel_id: string;
  name: string;
  avatar_url: string | null;
  video_count: number;
}

interface HighlightElement {
  name: string;
  quote: string;
  confidence: number;
  video_id: string;
  element_label: string;
}

export interface ProfileGenerationResult {
  slug: string;
  full_name: string;
  status: 'success' | 'no_videos' | 'error';
  video_count: number;
  message?: string;
}

// ─── Element Display Labels ─────────────────────────────────────────────────

const ELEMENT_LABELS: Record<string, string> = {
  out_of_body: 'Out-of-Body Experience',
  tunnel: 'The Tunnel',
  bright_light: 'Brilliant Light',
  deceased_relatives: 'Deceased Loved Ones',
  life_review: 'Life Review',
  being_of_light: 'Being of Light',
  border_boundary: 'Border or Boundary',
  feelings_of_peace: 'Overwhelming Peace',
  cosmic_unity: 'Cosmic Unity',
  time_distortion: 'Time Distortion',
  enhanced_senses: 'Enhanced Senses',
  telepathy: 'Telepathic Communication',
  otherworldly_realm: 'Otherworldly Realm',
  knowledge_download: 'Universal Knowledge',
  choice_to_return: 'Choice to Return',
};

// ─── Theme Derivation ───────────────────────────────────────────────────────

// Maps core elements to the thematic "seeds they plant"
const ELEMENT_TO_THEME: Record<string, string> = {
  feelings_of_peace: 'The profound reality of inner peace',
  being_of_light: 'Encounters with transcendent beings',
  bright_light: 'The transformative power of light',
  life_review: 'Life review as compassion, not judgment',
  cosmic_unity: 'The interconnectedness of all life',
  deceased_relatives: 'Reunion with those we\'ve lost',
  choice_to_return: 'Purpose and the choice to return',
  knowledge_download: 'Universal knowledge beyond words',
  otherworldly_realm: 'Other dimensions of existence',
  telepathy: 'Communication beyond language',
  out_of_body: 'Consciousness beyond the body',
  time_distortion: 'The nature of time and eternity',
  border_boundary: 'The boundary between worlds',
  tunnel: 'The passage between realms',
  enhanced_senses: 'Perception beyond physical senses',
};

// ─── Contribution Label Auto-Suggestion ──────────────────────────────────────

function suggestContributionLabel(
  elements: HighlightElement[],
  videoCount: number,
  channelCount: number,
  experienceType: string | null,
): string {
  const presentElements = new Set(elements.map(e => e.name));

  // Multi-channel presence suggests bridge-building
  if (channelCount >= 3) return 'Bridge Builder';
  
  // Strong veridical/evidential elements
  if (presentElements.has('out_of_body') && presentElements.has('deceased_relatives')) {
    return 'Research Contributor';
  }

  // Strong love/peace themes
  if (presentElements.has('feelings_of_peace') && presentElements.has('being_of_light')) {
    return 'Messenger of Love';
  }

  // Life review focus
  if (presentElements.has('life_review') && presentElements.has('choice_to_return')) {
    return 'Gentle Guide';
  }

  // Default
  return 'Courageous Storyteller';
}

// ─── Main Pipeline ──────────────────────────────────────────────────────────

/**
 * Generate or refresh a single experiencer profile from video data.
 * All content is derived from actual transcripts and analysis — no LLM calls.
 */
export async function generateExperiencerProfile(
  supabase: SupabaseClient,
  profileId: number,
): Promise<ProfileGenerationResult> {
  // 1. Get the existing profile
  const { data: profile, error: profileError } = await supabase
    .from('experiencer_profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  if (profileError || !profile) {
    return { slug: '', full_name: '', status: 'error', video_count: 0, message: `Profile not found: ${profileError?.message}` };
  }

  const videoIds: string[] = profile.video_ids || [];
  if (videoIds.length === 0) {
    return { slug: profile.slug, full_name: profile.full_name, status: 'no_videos', video_count: 0, message: 'No video_ids linked' };
  }

  // 2. Fetch all linked videos with their analysis
  const { data: videos, error: videosError } = await supabase
    .from('nde_vids')
    .select('videoId, title, channelId, channel_title, date, thumbnail_url, experiencerFullName')
    .in('videoId', videoIds);

  if (videosError || !videos || videos.length === 0) {
    return { slug: profile.slug, full_name: profile.full_name, status: 'no_videos', video_count: 0, message: `Video fetch error: ${videosError?.message}` };
  }

  // 3. Fetch analysis for all videos
  const { data: analyses } = await supabase
    .from('nde_analysis')
    .select('video_id, core_elements, entities, journey_sequence, experience_type, trigger_category, overall_tone, intensity_rating')
    .in('video_id', videoIds);

  const analysisMap = new Map((analyses || []).map(a => [a.video_id, a]));

  // 4. Extract highlight elements (best quotes across all videos)
  const allElements: HighlightElement[] = [];
  for (const video of videos) {
    const analysis = analysisMap.get(video.videoId);
    if (!analysis?.core_elements) continue;

    const elements = analysis.core_elements as CoreElement[];
    for (const el of elements) {
      if (el.present && el.quote && el.quote.trim().length > 10 && el.confidence >= 50) {
        allElements.push({
          name: el.name,
          quote: el.quote.trim(),
          confidence: el.confidence,
          video_id: video.videoId,
          element_label: ELEMENT_LABELS[el.name] || el.name,
        });
      }
    }
  }

  // Sort by confidence descending, then deduplicate by element name (keep best)
  allElements.sort((a, b) => b.confidence - a.confidence);
  const seenElements = new Set<string>();
  const highlightElements: HighlightElement[] = [];
  for (const el of allElements) {
    if (!seenElements.has(el.name)) {
      seenElements.add(el.name);
      highlightElements.push(el);
    }
  }

  // 5. Pick the best highlight quote
  // Prioritize impactful elements for the featured quote
  const impactOrder = ['feelings_of_peace', 'being_of_light', 'choice_to_return', 'cosmic_unity', 'life_review', 'bright_light', 'deceased_relatives', 'otherworldly_realm', 'knowledge_download'];
  let highlightQuote = '';
  let highlightQuoteSource = '';
  
  for (const elementName of impactOrder) {
    const el = highlightElements.find(e => e.name === elementName);
    if (el) {
      highlightQuote = el.quote;
      const video = videos.find(v => v.videoId === el.video_id);
      highlightQuoteSource = video?.channel_title || video?.title || '';
      break;
    }
  }
  // Fallback to highest confidence element
  if (!highlightQuote && highlightElements.length > 0) {
    highlightQuote = highlightElements[0].quote;
    const video = videos.find(v => v.videoId === highlightElements[0].video_id);
    highlightQuoteSource = video?.channel_title || video?.title || '';
  }

  // 6. Build channel appearances
  const channelMap = new Map<string, { name: string; avatar_url: string | null; count: number }>();
  for (const video of videos) {
    if (!video.channelId) continue;
    const existing = channelMap.get(video.channelId);
    if (existing) {
      existing.count++;
    } else {
      channelMap.set(video.channelId, {
        name: video.channel_title || 'Unknown Channel',
        avatar_url: null,
        count: 1,
      });
    }
  }

  // Enrich with channel avatars
  const channelIds = Array.from(channelMap.keys());
  if (channelIds.length > 0) {
    const { data: channels } = await supabase
      .from('channels')
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

  // 7. Derive core themes from most frequent present elements
  const elementFrequency = new Map<string, number>();
  for (const el of allElements) {
    elementFrequency.set(el.name, (elementFrequency.get(el.name) || 0) + 1);
  }
  const coreThemes = Array.from(elementFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => ELEMENT_TO_THEME[name] || name)
    .filter(Boolean);

  // 8. Determine experience type and trigger from most common across videos
  const typeCounts = new Map<string, number>();
  const triggerCounts = new Map<string, number>();
  for (const analysis of analyses || []) {
    if (analysis.experience_type) {
      typeCounts.set(analysis.experience_type, (typeCounts.get(analysis.experience_type) || 0) + 1);
    }
    if (analysis.trigger_category && analysis.trigger_category !== 'unknown') {
      triggerCounts.set(analysis.trigger_category, (triggerCounts.get(analysis.trigger_category) || 0) + 1);
    }
  }
  const experienceType = typeCounts.size > 0
    ? Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : null;
  const triggerCategory = triggerCounts.size > 0
    ? Array.from(triggerCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  // 9. Determine first_shared_year from earliest video date
  const years = videos
    .map(v => v.date ? new Date(v.date).getFullYear() : null)
    .filter((y): y is number => y !== null && !isNaN(y));
  const firstSharedYear = years.length > 0 ? Math.min(...years) : null;

  // 10. Auto-extract photo from first video thumbnail
  let photoUrl = profile.photo_url; // Don't overwrite if admin already set one
  if (!photoUrl) {
    // Use the first video's thumbnail as placeholder
    const firstVideo = videos.find(v => v.thumbnail_url);
    if (firstVideo?.thumbnail_url) {
      // Use high-quality thumbnail
      photoUrl = firstVideo.thumbnail_url.replace('maxresdefault', 'hqdefault');
    }
  }

  // 11. Suggest contribution label (only if still default)
  let contributionLabel = profile.contribution_label;
  if (!contributionLabel || contributionLabel === 'Courageous Storyteller') {
    contributionLabel = suggestContributionLabel(
      highlightElements,
      videos.length,
      channelAppearances.length,
      experienceType,
    );
  }

  // 12. Upsert the enriched profile
  const update: Record<string, any> = {
    highlight_quote: highlightQuote || null,
    highlight_quote_source: highlightQuoteSource || null,
    highlight_elements: highlightElements.slice(0, 15), // All 15 elements max
    channel_appearances: channelAppearances,
    core_themes: coreThemes,
    first_shared_year: firstSharedYear,
    experience_type: experienceType,
    trigger_category: triggerCategory,
    contribution_label: contributionLabel,
    updated_at: new Date().toISOString(),
  };

  // Only set photo if we found one and none was manually set
  if (photoUrl && !profile.photo_url) {
    update.photo_url = photoUrl;
  }

  const { error: updateError } = await supabase
    .from('experiencer_profiles')
    .update(update)
    .eq('id', profileId);

  if (updateError) {
    return { slug: profile.slug, full_name: profile.full_name, status: 'error', video_count: videos.length, message: updateError.message };
  }

  return {
    slug: profile.slug,
    full_name: profile.full_name,
    status: 'success',
    video_count: videos.length,
    message: `Enriched with ${highlightElements.length} elements, ${channelAppearances.length} channels, ${coreThemes.length} themes`,
  };
}

// ─── Batch: Refresh All Profiles ────────────────────────────────────────────

/**
 * Regenerate celebration data for all published experiencer profiles.
 */
export async function refreshAllExperiencerProfiles(
  supabase: SupabaseClient,
): Promise<ProfileGenerationResult[]> {
  const { data: profiles, error } = await supabase
    .from('experiencer_profiles')
    .select('id')
    .not('published_at', 'is', null)
    .order('id');

  if (error || !profiles) {
    console.error('Failed to fetch profiles:', error?.message);
    return [];
  }

  const results: ProfileGenerationResult[] = [];
  for (const profile of profiles) {
    console.log(`[ExperiencerProfile] Processing profile ${profile.id}...`);
    const result = await generateExperiencerProfile(supabase, profile.id);
    results.push(result);
    console.log(`[ExperiencerProfile] ${result.full_name}: ${result.status} — ${result.message}`);
    // Brief pause to avoid overwhelming the DB
    await new Promise(r => setTimeout(r, 200));
  }

  return results;
}

// ─── Helper: Create Supabase Admin Client ───────────────────────────────────

export function createExperiencerPipelineClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase environment variables');
  return createClient(url, key);
}
