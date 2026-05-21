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
    .order('total_mentions', { ascending: false });

  if (!data) return [];

  return data
    .filter((p) => p.slug !== excludeSlug)
    .map((p) => {
      // Parse affiliation JSON string (stored as text, e.g., '["OSS","CIA"]')
      let affiliationStr: string | undefined;
      if (p.affiliation) {
        try {
          const parsed = JSON.parse(p.affiliation);
          affiliationStr = Array.isArray(parsed) ? parsed.join(', ') : String(parsed);
        } catch {
          affiliationStr = p.affiliation;
        }
      }
      const roleStr = p.role?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      return {
        slug: p.slug,
        name: p.canonical_name,
        subtitle: [roleStr, affiliationStr].filter(Boolean).join(' · ') || undefined,
        href: `/uap/persons/${p.slug}`,
        count: p.total_mentions ?? 0,
      };
    });
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
    .order('total_mentions', { ascending: false });

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
    .order('total_mentions', { ascending: false });

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
    .order('source_count', { ascending: false });

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
    .order('total_views', { ascending: false });

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

// ─── Exclusive Entity Discovery ─────────────────────────────────────────────

export interface ExclusiveEntities {
  exclusiveExperiencers: { name: string; slug: string }[];
  exclusiveEvents: { name: string; slug: string }[];
  exclusiveOrgs: { name: string; slug: string }[];
  exclusivePrograms: { name: string; slug: string }[];
  totalEntitiesCovered: number;
}

/**
 * Find entities whose linked_video_ids are entirely within the given channel's
 * video set — meaning no other channel covers them.
 */
export async function findExclusiveEntities(
  channelVideoIds: string[],
): Promise<ExclusiveEntities> {
  if (!channelVideoIds || channelVideoIds.length === 0) {
    return {
      exclusiveExperiencers: [],
      exclusiveEvents: [],
      exclusiveOrgs: [],
      exclusivePrograms: [],
      totalEntitiesCovered: 0,
    };
  }

  const supabase = getSupabase();
  const videoIdSet = new Set(channelVideoIds);

  // Helper: check if ALL of an entity's linked video IDs belong to this channel
  function isExclusive(linkedIds: string[] | null): boolean {
    if (!linkedIds || linkedIds.length === 0) return false;
    return linkedIds.every((id) => videoIdSet.has(id));
  }

  // Fetch all entities overlapping with channel's videos in parallel
  const [experiencers, events, orgs, programs] = await Promise.all([
    supabase
      .from("uap_contactee_profiles")
      .select("slug, display_name, video_ids")
      .overlaps("video_ids", channelVideoIds),
    supabase
      .from("uap_events")
      .select("slug, name, video_ids")
      .overlaps("video_ids", channelVideoIds),
    supabase
      .from("uap_canonical_orgs")
      .select("slug, canonical_name, linked_video_ids")
      .overlaps("linked_video_ids", channelVideoIds),
    supabase
      .from("uap_canonical_programs")
      .select("slug, canonical_name, linked_video_ids")
      .overlaps("linked_video_ids", channelVideoIds),
  ]);

  const allExperiencers = experiencers.data ?? [];
  const allEvents = events.data ?? [];
  const allOrgs = orgs.data ?? [];
  const allPrograms = programs.data ?? [];

  const totalEntitiesCovered =
    allExperiencers.length + allEvents.length + allOrgs.length + allPrograms.length;

  return {
    exclusiveExperiencers: allExperiencers
      .filter((e) => isExclusive(e.video_ids))
      .map((e) => ({ name: e.display_name, slug: e.slug })),
    exclusiveEvents: allEvents
      .filter((e) => isExclusive(e.video_ids))
      .map((e) => ({ name: e.name, slug: e.slug })),
    exclusiveOrgs: allOrgs
      .filter((o) => isExclusive(o.linked_video_ids))
      .map((o) => ({ name: o.canonical_name, slug: o.slug })),
    exclusivePrograms: allPrograms
      .filter((p) => isExclusive(p.linked_video_ids))
      .map((p) => ({ name: p.canonical_name, slug: p.slug })),
    totalEntitiesCovered,
  };
}

// ─── Cross-Channel Guest Overlap ────────────────────────────────────────────

export interface CrossChannelOverlapResult {
  channelId: string;
  channelName: string;
  avatarUrl: string | null;
  sharedGuestCount: number;
  sharedGuests: { name: string; slug: string; type: 'experiencer' | 'person' }[];
  href: string;
}

/**
 * Find other channels that share the most guests (experiencers + persons)
 * with the given channel. Caps at top 20 persons/experiencers for performance,
 * then groups their non-channel videos by channel_id.
 */
export async function findCrossChannelOverlap(
  channelVideoIds: string[],
  thisChannelId: string,
): Promise<CrossChannelOverlapResult[]> {
  if (!channelVideoIds || channelVideoIds.length === 0) return [];

  const supabase = getSupabase();
  const videoIdSet = new Set(channelVideoIds);

  // Fetch top 20 experiencers + top 20 persons linked to this channel's videos
  const [experiencerRes, personRes] = await Promise.all([
    supabase
      .from('uap_contactee_profiles')
      .select('slug, display_name, video_ids')
      .overlaps('video_ids', channelVideoIds)
      .order('total_views', { ascending: false })
      .limit(20),
    supabase
      .from('uap_canonical_persons')
      .select('slug, canonical_name, linked_video_ids')
      .overlaps('linked_video_ids', channelVideoIds)
      .order('total_mentions', { ascending: false })
      .limit(20),
  ]);

  // Collect all video IDs that belong to OTHER channels
  const otherVideoIds = new Set<string>();

  // Map: otherVideoId → which guests reference it
  type GuestRef = { name: string; slug: string; type: 'experiencer' | 'person' };
  const videoToGuests = new Map<string, GuestRef[]>();

  for (const exp of experiencerRes.data ?? []) {
    for (const vid of exp.video_ids ?? []) {
      if (!videoIdSet.has(vid)) {
        otherVideoIds.add(vid);
        const refs = videoToGuests.get(vid) ?? [];
        refs.push({ name: exp.display_name, slug: exp.slug, type: 'experiencer' });
        videoToGuests.set(vid, refs);
      }
    }
  }

  for (const person of personRes.data ?? []) {
    for (const vid of person.linked_video_ids ?? []) {
      if (!videoIdSet.has(vid)) {
        otherVideoIds.add(vid);
        const refs = videoToGuests.get(vid) ?? [];
        refs.push({ name: person.canonical_name, slug: person.slug, type: 'person' });
        videoToGuests.set(vid, refs);
      }
    }
  }

  if (otherVideoIds.size === 0) return [];

  // Fetch channel_id for these other videos (batch, cap at 200 for safety)
  const otherVidArr = Array.from(otherVideoIds).slice(0, 200);
  const { data: otherVids } = await supabase
    .from('uap_vids')
    .select('video_id, channel_id')
    .in('video_id', otherVidArr);

  if (!otherVids || otherVids.length === 0) return [];

  // Group by channel_id → unique guests
  const channelGuestMap = new Map<string, Set<string>>();
  const channelGuestDetails = new Map<string, Map<string, GuestRef>>();

  for (const vid of otherVids) {
    if (!vid.channel_id || vid.channel_id === thisChannelId) continue;
    const guests = videoToGuests.get(vid.video_id) ?? [];
    for (const guest of guests) {
      const key = `${guest.type}:${guest.slug}`;
      if (!channelGuestMap.has(vid.channel_id)) {
        channelGuestMap.set(vid.channel_id, new Set());
        channelGuestDetails.set(vid.channel_id, new Map());
      }
      channelGuestMap.get(vid.channel_id)!.add(key);
      channelGuestDetails.get(vid.channel_id)!.set(key, guest);
    }
  }

  // Sort by shared guest count, take top 8
  const ranked = Array.from(channelGuestMap.entries())
    .map(([chId, guestKeys]) => ({
      channelId: chId,
      count: guestKeys.size,
      guests: Array.from(channelGuestDetails.get(chId)!.values()),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  if (ranked.length === 0) return [];

  // Fetch channel names + avatars
  const channelIds = ranked.map((r) => r.channelId);
  const { data: channels } = await supabase
    .from('uap_channels')
    .select('channel_id, channel_name, avatar_url')
    .in('channel_id', channelIds)
    .eq('hidden', false);

  const channelInfo = new Map(
    (channels ?? []).map((c) => [c.channel_id, c]),
  );

  return ranked
    .filter((r) => channelInfo.has(r.channelId))
    .map((r) => {
      const info = channelInfo.get(r.channelId)!;
      return {
        channelId: r.channelId,
        channelName: info.channel_name,
        avatarUrl: info.avatar_url ?? null,
        sharedGuestCount: r.count,
        sharedGuests: r.guests.slice(0, 5),
        href: `/uap/channels/${r.channelId}`,
      };
    });
}
