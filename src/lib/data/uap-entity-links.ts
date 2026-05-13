/**
 * UAP Cross-Entity Link Discovery
 *
 * Finds related entities across all UAP tables using the shared-video-ids
 * strategy: if Entity A and Entity B both reference Video Z, they are related.
 *
 * Uses PostgreSQL's `&&` (array overlap) operator for efficient matching.
 */

import { createClient } from '@supabase/supabase-js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LinkedEntity {
  slug: string;
  name: string;
  subtitle?: string;
  href: string;
  count?: number; // shared video count or total mentions
}

export interface LinkedChannel {
  channel_id: string;
  name: string;
  avatar_url: string | null;
  video_count: number;
  href: string;
}

// ─── Client ─────────────────────────────────────────────────────────────────

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ─── Link Finders ───────────────────────────────────────────────────────────

/**
 * Find persons of interest that share videos with the given video IDs.
 */
export async function findLinkedPersons(
  videoIds: string[],
  excludeSlug?: string,
): Promise<LinkedEntity[]> {
  if (!videoIds || videoIds.length === 0) return [];
  const supabase = getSupabase();

  const { data } = await supabase
    .from('uap_canonical_persons')
    .select('slug, canonical_name, role, affiliation, total_mentions, linked_video_ids')
    .overlaps('linked_video_ids', videoIds)
    .order('total_mentions', { ascending: false })
    .limit(20);

  if (!data) return [];

  return data
    .filter((p) => p.slug !== excludeSlug)
    .map((p) => ({
      slug: p.slug,
      name: p.canonical_name,
      subtitle: [p.role?.replace(/_/g, ' '), p.affiliation].filter(Boolean).join(' · ') || undefined,
      href: `/uap/persons/${p.slug}`,
      count: p.total_mentions ?? 0,
    }));
}

/**
 * Find programs that share videos with the given video IDs.
 */
export async function findLinkedPrograms(
  videoIds: string[],
  excludeSlug?: string,
): Promise<LinkedEntity[]> {
  if (!videoIds || videoIds.length === 0) return [];
  const supabase = getSupabase();

  const { data } = await supabase
    .from('uap_canonical_programs')
    .select('slug, canonical_name, program_type, total_mentions, linked_video_ids')
    .overlaps('linked_video_ids', videoIds)
    .order('total_mentions', { ascending: false })
    .limit(20);

  if (!data) return [];

  return data
    .filter((p) => p.slug !== excludeSlug)
    .map((p) => ({
      slug: p.slug,
      name: p.canonical_name,
      subtitle: p.program_type?.replace(/_/g, ' ') || undefined,
      href: `/uap/programs/${p.slug}`,
      count: p.total_mentions ?? 0,
    }));
}

/**
 * Find organizations that share videos with the given video IDs.
 */
export async function findLinkedOrgs(
  videoIds: string[],
  excludeSlug?: string,
): Promise<LinkedEntity[]> {
  if (!videoIds || videoIds.length === 0) return [];
  const supabase = getSupabase();

  const { data } = await supabase
    .from('uap_canonical_orgs')
    .select('slug, canonical_name, org_type, total_mentions, linked_video_ids')
    .overlaps('linked_video_ids', videoIds)
    .order('total_mentions', { ascending: false })
    .limit(20);

  if (!data) return [];

  return data
    .filter((o) => o.slug !== excludeSlug)
    .map((o) => ({
      slug: o.slug,
      name: o.canonical_name,
      subtitle: o.org_type?.replace(/_/g, ' ') || undefined,
      href: `/uap/organizations/${o.slug}`,
      count: o.total_mentions ?? 0,
    }));
}

/**
 * Find events that share videos with the given video IDs.
 */
export async function findLinkedEvents(
  videoIds: string[],
  excludeSlug?: string,
): Promise<LinkedEntity[]> {
  if (!videoIds || videoIds.length === 0) return [];
  const supabase = getSupabase();

  const { data } = await supabase
    .from('uap_events')
    .select('slug, name, year, event_type, source_count, video_ids')
    .overlaps('video_ids', videoIds)
    .order('source_count', { ascending: false })
    .limit(20);

  if (!data) return [];

  return data
    .filter((e) => e.slug !== excludeSlug)
    .map((e) => ({
      slug: e.slug,
      name: e.name,
      subtitle: [e.year?.toString(), e.event_type?.replace(/_/g, ' ')].filter(Boolean).join(' · ') || undefined,
      href: `/uap/events/${e.slug}`,
      count: e.source_count ?? 0,
    }));
}

/**
 * Find experiencers (contactees) that share videos with the given video IDs.
 */
export async function findLinkedExperiencers(
  videoIds: string[],
  excludeSlug?: string,
): Promise<LinkedEntity[]> {
  if (!videoIds || videoIds.length === 0) return [];
  const supabase = getSupabase();

  const { data } = await supabase
    .from('uap_contactee_profiles')
    .select('slug, display_name, experience_type, video_ids')
    .overlaps('video_ids', videoIds)
    .order('total_views', { ascending: false })
    .limit(20);

  if (!data) return [];

  return data
    .filter((c) => c.slug !== excludeSlug)
    .map((c) => ({
      slug: c.slug,
      name: c.display_name,
      subtitle: c.experience_type?.replace(/_/g, ' ') || undefined,
      href: `/uap/experiencer/${c.slug}`,
      count: c.video_ids?.length ?? 0,
    }));
}

/**
 * Find channels that appear in the given video IDs.
 * Unlike the other finders, this queries uap_vids to get channel_ids,
 * then joins to uap_channels for display data.
 */
export async function findLinkedChannels(
  videoIds: string[],
): Promise<LinkedChannel[]> {
  if (!videoIds || videoIds.length === 0) return [];
  const supabase = getSupabase();

  // Get distinct channel_ids from the videos
  const { data: videos } = await supabase
    .from('uap_vids')
    .select('channel_id, channel_name')
    .in('video_id', videoIds)
    .not('channel_id', 'is', null);

  if (!videos || videos.length === 0) return [];

  // Aggregate by channel_id
  const channelMap = new Map<string, { name: string; count: number }>();
  for (const v of videos) {
    if (!v.channel_id) continue;
    const existing = channelMap.get(v.channel_id);
    if (existing) {
      existing.count++;
    } else {
      channelMap.set(v.channel_id, { name: v.channel_name || 'Unknown', count: 1 });
    }
  }

  // Fetch channel details
  const channelIds = Array.from(channelMap.keys());
  const { data: channels } = await supabase
    .from('uap_channels')
    .select('channel_id, channel_name, avatar_url')
    .in('channel_id', channelIds);

  const channelDetails = new Map(
    (channels || []).map((c) => [c.channel_id, c]),
  );

  return channelIds
    .map((id) => {
      const agg = channelMap.get(id)!;
      const detail = channelDetails.get(id);
      return {
        channel_id: id,
        name: detail?.channel_name || agg.name,
        avatar_url: detail?.avatar_url || null,
        video_count: agg.count,
        href: `/uap/channels/${id}`,
      };
    })
    .sort((a, b) => b.video_count - a.video_count);
}
