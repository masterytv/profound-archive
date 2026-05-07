/**
 * UAP Contactee Data Layer
 * 
 * Server-side data fetching functions for UAP contactee profiles.
 * Uses anon client (buildClient pattern) for SSG-safe fetching.
 * 
 * Copy-Modify from: src/lib/data/ patterns (NDE experiencer data)
 */

import { createClient } from '@supabase/supabase-js';

// ─── Client ─────────────────────────────────────────────────────────────────

function buildClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ContacteeProfile {
  id: string;
  slug: string;
  display_name: string;
  is_anonymous: boolean;
  summary: string | null;
  bio: string | null;
  photo_url: string | null;
  video_ids: string[];
  channel_ids: string[];
  experience_type: string | null;
  entity_types: string[];
  recurrence: string | null;
  core_themes: string[];
  avg_evidence_score: number | null;
  avg_contact_depth: number | null;
  avg_transformation_score: number | null;
  social_links: Record<string, string>;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  // Enrichment fields
  highlight_quote: string | null;
  highlight_quote_source: string | null;
  channel_appearances: ChannelAppearance[];
  first_shared_year: number | null;
  total_views: number;
  contribution_label: string | null;
}

export interface ChannelAppearance {
  channel_id: string;
  name: string;
  avatar_url: string | null;
  video_count: number;
}

export interface ContacteeVideo {
  video_id: string;
  title: string;
  channel_name: string | null;
  channel_id: string | null;
  published_at: string | null;
  thumbnail_url: string | null;
  view_count: string | null;
  tier: number;
  track: string | null;
  content_type: string | null;
  duration: string | null;
}

export interface ContacteeVideoWithAnalysis extends ContacteeVideo {
  analysis: {
    evidence_score: number | null;
    contact_depth_score: number | null;
    transformation_score: number | null;
    experience_type: string | null;
    entities: any | null;
    overall_tone: string | null;
    recurrence_pattern: string | null;
    hynek_type: string | null;
    vallee_type: string | null;
  } | null;
}

export interface ContacteeListItem {
  id: string;
  slug: string;
  display_name: string;
  photo_url: string | null;
  experience_type: string | null;
  entity_types: string[];
  recurrence: string | null;
  video_count: number;
  avg_evidence_score: number | null;
  avg_contact_depth: number | null;
  avg_transformation_score: number | null;
  total_views: number;
  contribution_label: string | null;
  highlight_quote: string | null;
  first_shared_year: number | null;
}

// ─── Data Functions ─────────────────────────────────────────────────────────

/**
 * Fetch a single contactee profile by slug.
 */
export async function getContacteeProfile(slug: string): Promise<ContacteeProfile | null> {
  const supabase = buildClient();

  const { data, error } = await supabase
    .from('uap_contactee_profiles')
    .select('*')
    .eq('slug', slug)
    .not('published_at', 'is', null)
    .single();

  if (error || !data) return null;

  return {
    ...data,
    video_ids: data.video_ids || [],
    channel_ids: data.channel_ids || [],
    entity_types: data.entity_types || [],
    core_themes: data.core_themes || [],
    channel_appearances: data.channel_appearances || [],
    social_links: data.social_links || {},
    total_views: data.total_views || 0,
  } as ContacteeProfile;
}

/**
 * Fetch all published contactee profiles for the directory page.
 */
export async function getContacteeList(options?: {
  sort?: 'evidence' | 'contact_depth' | 'transformation' | 'videos' | 'views' | 'name';
  limit?: number;
}): Promise<ContacteeListItem[]> {
  const supabase = buildClient();
  const { sort = 'views', limit = 200 } = options || {};

  // Determine sort column
  let orderCol: string;
  let ascending = false;
  switch (sort) {
    case 'evidence': orderCol = 'avg_evidence_score'; break;
    case 'contact_depth': orderCol = 'avg_contact_depth'; break;
    case 'transformation': orderCol = 'avg_transformation_score'; break;
    case 'videos': orderCol = 'total_views'; break; // Proxy — actual video count needs computed
    case 'name': orderCol = 'display_name'; ascending = true; break;
    case 'views':
    default: orderCol = 'total_views'; break;
  }

  const { data, error } = await supabase
    .from('uap_contactee_profiles')
    .select('id, slug, display_name, photo_url, experience_type, entity_types, recurrence, video_ids, avg_evidence_score, avg_contact_depth, avg_transformation_score, total_views, contribution_label, highlight_quote, first_shared_year')
    .not('published_at', 'is', null)
    .order(orderCol, { ascending, nullsFirst: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((p: any) => ({
    id: p.id,
    slug: p.slug,
    display_name: p.display_name,
    photo_url: p.photo_url,
    experience_type: p.experience_type,
    entity_types: p.entity_types || [],
    recurrence: p.recurrence,
    video_count: (p.video_ids || []).length,
    avg_evidence_score: p.avg_evidence_score,
    avg_contact_depth: p.avg_contact_depth,
    avg_transformation_score: p.avg_transformation_score,
    total_views: p.total_views || 0,
    contribution_label: p.contribution_label,
    highlight_quote: p.highlight_quote,
    first_shared_year: p.first_shared_year,
  }));
}

/**
 * Fetch videos for a contactee with their analysis data.
 */
export async function getContacteeVideos(videoIds: string[]): Promise<ContacteeVideoWithAnalysis[]> {
  if (!videoIds.length) return [];

  const supabase = buildClient();

  // Fetch videos
  const { data: videos, error: videosError } = await supabase
    .from('uap_vids')
    .select('video_id, title, channel_name, channel_id, published_at, thumbnail_url, view_count, tier, track, content_type, duration')
    .in('video_id', videoIds)
    .order('view_count', { ascending: false });

  if (videosError || !videos) return [];

  // Fetch analysis for these videos
  const { data: analyses } = await supabase
    .from('uap_analysis')
    .select('video_id, evidence_score, contact_depth_score, transformation_score, experience_type, entities, overall_tone, recurrence_pattern, hynek_type, vallee_type')
    .in('video_id', videoIds);

  const analysisMap = new Map((analyses || []).map(a => [a.video_id, a]));

  return videos.map((v: any) => {
    const analysis = analysisMap.get(v.video_id);
    return {
      ...v,
      analysis: analysis
        ? {
            evidence_score: analysis.evidence_score,
            contact_depth_score: analysis.contact_depth_score,
            transformation_score: analysis.transformation_score,
            experience_type: analysis.experience_type,
            entities: analysis.entities,
            overall_tone: analysis.overall_tone,
            recurrence_pattern: analysis.recurrence_pattern,
            hynek_type: analysis.hynek_type,
            vallee_type: analysis.vallee_type,
          }
        : null,
    };
  });
}

/**
 * Fetch all published contactee slugs for static generation.
 */
export async function getAllContacteeSlugs(): Promise<string[]> {
  const supabase = buildClient();

  const { data, error } = await supabase
    .from('uap_contactee_profiles')
    .select('slug')
    .not('published_at', 'is', null);

  if (error || !data) return [];
  return data.map((p: any) => p.slug);
}
