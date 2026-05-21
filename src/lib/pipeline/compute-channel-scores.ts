/**
 * Channel Score Recomputation Module
 *
 * Recomputes ALL channel-level metrics from source data tables:
 *   - uap_vids (tier, content_type, duration, date, views, engagement)
 *   - uap_video_stats (intelligence_value, persons_count, programs_count)
 *   - uap_encounters (evidence_score, contact_depth_score, transformation_score)
 *
 * Formulas match docs/channel-scores.md exactly.
 * Called weekly by pg_cron → /api/cron/recompute-channel-scores
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChannelScoreRow {
  channel_id: string;
  intelligence_value: number | null;
  credibility_score: number | null;
  encounter_depth: number | null;
  impact_score: number | null;
  authority_score: number | null;
  letter_grade: string;
  archetype_primary: string | null;
  archetype_secondary: string | null;
  archetype_tertiary: string | null;
  personality_code: string;
  archive_rank: number;
  views_rank: number;
  engagement_rate: number | null;
  volume_intensity: number | null;
  views_per_video: number | null;
  engagement_vs_avg: number | null;
  views_per_video_vs_avg: number | null;
  diversity_index: number | null;
  diversity_rank: number | null;
  content_type_distribution: Record<string, number>;
  avg_video_duration_seconds: number | null;
  posting_cadence: string | null;
  months_active: number | null;
  first_video_date: string | null;
  encounter_score: number | null;
  research_score: number | null;
  computed_at: string;
}

interface VideoRow {
  video_id: string;
  channel_id: string;
  tier: number;
  content_type: string | null;
  duration: string | null;
  date: string | null;
  view_count: number | null;
  comments_count: number | null;
  likes: number | null;
}

interface StatsRow {
  video_id: string;
  intelligence_value: number | null;
  persons_count: number | null;
  programs_count: number | null;
}

interface EncounterRow {
  video_id: string;
  evidence_score: number | null;
  contact_depth_score: number | null;
  transformation_score: number | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Paginate through all rows of a Supabase table */
async function fetchAll<T>(
  supabase: SupabaseClient,
  table: string,
  select: string,
  filters?: (q: any) => any,
): Promise<T[]> {
  const PAGE = 1000;
  const all: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let q = supabase.from(table).select(select).range(from, from + PAGE - 1);
    if (filters) q = filters(q);
    const { data, error } = await q;
    if (error) {
      console.error(`[compute-channel-scores] Pagination error on ${table}:`, error.message);
      break;
    }
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      all.push(...(data as T[]));
      from += PAGE;
      if (data.length < PAGE) hasMore = false;
    }
  }
  return all;
}

/** Parse ISO 8601 duration (PT1H30M15S) to seconds */
function parseDurationToSeconds(d: string | null): number | null {
  if (!d) return null;
  const match = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  return (parseInt(match[1] || '0') * 3600) + (parseInt(match[2] || '0') * 60) + parseInt(match[3] || '0');
}

/** Shannon diversity index, normalized to [0, 1] */
function shannonDiversity(counts: Record<string, number>, archiveTypeCount: number): number {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0 || archiveTypeCount <= 1) return 0;

  let H = 0;
  for (const count of Object.values(counts)) {
    if (count > 0) {
      const p = count / total;
      H -= p * Math.log(p);
    }
  }
  // Normalize by ln(N) where N = total distinct content types across archive
  return H / Math.log(archiveTypeCount);
}

/** Compute letter grade from authority score (0-100) */
function letterGrade(authority: number | null): string {
  if (authority == null) return 'F';
  if (authority >= 85) return 'A+';
  if (authority >= 75) return 'A';
  if (authority >= 60) return 'B';
  if (authority >= 45) return 'C';
  if (authority >= 30) return 'D';
  return 'F';
}

/** Determine posting cadence from monthly counts */
function computeCadence(monthlyPostCounts: number[]): string {
  if (monthlyPostCounts.length === 0) return 'inactive';
  const avg = monthlyPostCounts.reduce((a, b) => a + b, 0) / monthlyPostCounts.length;
  if (avg >= 8) return 'prolific';  // 2+ per week
  if (avg >= 4) return 'weekly';
  if (avg >= 1) return 'biweekly';
  return 'sporadic';
}

// ─── Archetype Classification ───────────────────────────────────────────────

interface ArchetypeScore {
  name: string;
  score: number;
}

function classifyArchetypes(dist: Record<string, number>): [string | null, string | null, string | null] {
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  if (total === 0) return [null, null, null];

  const pct = (type: string) => ((dist[type] || 0) / total) * 100;

  const archetypes: ArchetypeScore[] = [];

  // Deep Intelligence: research_analysis >= 30% OR investigative_journalism >= 15%
  const deepIntelScore = Math.max(pct('research_analysis') / 30, pct('investigative_journalism') / 15);
  archetypes.push({ name: 'Deep Intelligence', score: deepIntelScore });

  // First Person Encounters: first_person >= 30%
  archetypes.push({ name: 'First Person Encounters', score: pct('first_person') / 30 });

  // Documentary: documentary_survey >= 20% OR retold_encounter >= 25%
  const docScore = Math.max(pct('documentary_survey') / 20, pct('retold_encounter') / 25);
  archetypes.push({ name: 'Documentary', score: docScore });

  // News & Commentary: news_commentary >= 20% OR program_disclosure >= 40%
  const newsScore = Math.max(pct('news_commentary') / 20, pct('program_disclosure') / 40);
  archetypes.push({ name: 'News & Commentary', score: newsScore });

  // Interview Hub: interview >= 40%
  archetypes.push({ name: 'Interview Hub', score: pct('interview') / 40 });

  // Advocacy & Disclosure: program_disclosure >= 30% AND first_person >= 15%
  const advocacyScore = Math.min(pct('program_disclosure') / 30, pct('first_person') / 15);
  archetypes.push({ name: 'Advocacy & Disclosure', score: advocacyScore });

  // Sort by score descending
  archetypes.sort((a, b) => b.score - a.score);

  return [
    archetypes[0]?.score > 0 ? archetypes[0].name : null,
    archetypes[1]?.score > 0 ? archetypes[1].name : null,
    archetypes[2]?.score > 0 ? archetypes[2].name : null,
  ];
}

// ─── Personality Code ───────────────────────────────────────────────────────

function computePersonalityCode(
  dist: Record<string, number>,
  avgDurationSeconds: number | null,
  channelIntelligence: number | null,
  medianIntelligence: number,
): string {
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  if (total === 0) return 'IBN'; // default fallback

  // Dimension 1: Content Focus — I(ntelligence) vs E(ncounters)
  const researchCount = (dist['research_analysis'] || 0) + (dist['program_disclosure'] || 0) + (dist['investigative_journalism'] || 0);
  const encounterCount = (dist['first_person'] || 0) + (dist['interview'] || 0);
  const dim1 = researchCount > encounterCount ? 'I' : 'E';

  // Dimension 2: Style — D(eep-dive) vs B(readth)
  const avgMinutes = (avgDurationSeconds ?? 0) / 60;
  const dim2 = avgMinutes > 30 ? 'D' : 'B';

  // Dimension 3: Tone — A(nalytical) vs N(arrative)
  const dim3 = (channelIntelligence ?? 0) > medianIntelligence ? 'A' : 'N';

  return dim1 + dim2 + dim3;
}

// ─── Main ───────────────────────────────────────────────────────────────────

export interface RecomputeResult {
  channels_computed: number;
  duration_ms: number;
  errors: string[];
}

export async function recomputeAllChannelScores(supabase: SupabaseClient): Promise<RecomputeResult> {
  const start = Date.now();
  const errors: string[] = [];

  console.log('[compute-channel-scores] Starting full recomputation...');

  // ── 1. Fetch all source data ───────────────────────────────────────

  const [videos, stats, encounters] = await Promise.all([
    fetchAll<VideoRow>(supabase, 'uap_vids', 'video_id, channel_id, tier, content_type, duration, date, view_count, comments_count, likes', (q) =>
      q.in('tier', [1, 2]).not('channel_id', 'is', null),
    ),
    fetchAll<StatsRow>(supabase, 'uap_video_stats', 'video_id, intelligence_value, persons_count, programs_count'),
    fetchAll<EncounterRow>(supabase, 'uap_encounters', 'video_id, evidence_score, contact_depth_score, transformation_score'),
  ]);

  // Also fetch non-hidden channel IDs
  const { data: channelRows } = await supabase
    .from('uap_channels')
    .select('channel_id')
    .eq('hidden', false);
  const validChannelIds = new Set((channelRows ?? []).map((c: { channel_id: string }) => c.channel_id));

  console.log(`[compute-channel-scores] Fetched ${videos.length} videos, ${stats.length} stats, ${encounters.length} encounters`);

  // ── 2. Index data by video_id / channel_id ─────────────────────────

  const statsMap = new Map<string, StatsRow>();
  for (const s of stats) statsMap.set(s.video_id, s);

  // Group encounters by video_id
  const encountersByVideo = new Map<string, EncounterRow[]>();
  for (const e of encounters) {
    if (!encountersByVideo.has(e.video_id)) encountersByVideo.set(e.video_id, []);
    encountersByVideo.get(e.video_id)!.push(e);
  }

  // Group videos by channel_id (only non-hidden channels)
  const videosByChannel = new Map<string, VideoRow[]>();
  for (const v of videos) {
    if (!validChannelIds.has(v.channel_id)) continue;
    if (!videosByChannel.has(v.channel_id)) videosByChannel.set(v.channel_id, []);
    videosByChannel.get(v.channel_id)!.push(v);
  }

  // Count all distinct content types across archive (for Shannon normalization)
  const allContentTypes = new Set<string>();
  for (const v of videos) {
    if (v.content_type) allContentTypes.add(v.content_type);
  }
  const archiveTypeCount = allContentTypes.size;

  // ── 3. Per-channel computation ─────────────────────────────────────

  const channelScores: ChannelScoreRow[] = [];

  // Accumulate for archive-wide averages (needed for encounter_score/research_score)
  const allRawEncounters: number[] = [];
  const allRawResearch: number[] = [];
  const allIntelligenceValues: number[] = [];
  const allViewsPerVideo: number[] = [];
  const allEngagementRates: number[] = [];

  // First pass: compute per-channel raw values
  interface ChannelIntermediate {
    channelId: string;
    intelligenceValue: number | null;
    credibilityScore: number | null;
    encounterDepth: number | null;
    impactScore: number | null;
    rawEncounter: number | null;
    rawResearch: number | null;
    contentDist: Record<string, number>;
    avgDurationSecs: number | null;
    videoCount: number;
    totalViews: number;
    engagementRate: number | null;
    viewsPerVideo: number | null;
    monthsActive: number | null;
    firstVideoDate: string | null;
    postingCadence: string | null;
    volumeIntensity: number | null;
  }

  const intermediates: ChannelIntermediate[] = [];

  for (const entry of Array.from(videosByChannel.entries())) {
    const channelId = entry[0];
    const channelVideos = entry[1];
    const videoCount = channelVideos.length;
    if (videoCount === 0) continue;

    // ── Intelligence Value ────────────────────────────────────
    const intelValues: number[] = [];
    for (const v of channelVideos) {
      const s = statsMap.get(v.video_id);
      if (s?.intelligence_value != null) intelValues.push(Number(s.intelligence_value));
    }
    const avgIntel = intelValues.length > 0
      ? intelValues.reduce((a, b) => a + b, 0) / intelValues.length
      : null;
    // Normalize 0-30 → 0-100
    const intelligenceValue = avgIntel != null ? Math.round((avgIntel / 30) * 100 * 10) / 10 : null;

    // ── Credibility Score ─────────────────────────────────────
    // 40% source diversity + 40% evidence quality + 20% program depth
    const personsCounts: number[] = [];
    const programsCounts: number[] = [];
    for (const v of channelVideos) {
      const s = statsMap.get(v.video_id);
      if (s) {
        if (s.persons_count != null) personsCounts.push(Number(s.persons_count));
        if (s.programs_count != null) programsCounts.push(Number(s.programs_count));
      }
    }
    const avgPersons = personsCounts.length > 0
      ? personsCounts.reduce((a, b) => a + b, 0) / personsCounts.length : 0;
    const avgPrograms = programsCounts.length > 0
      ? programsCounts.reduce((a, b) => a + b, 0) / programsCounts.length : 0;

    // Evidence quality from encounters
    const channelEvidenceScores: number[] = [];
    for (const v of channelVideos) {
      const encs = encountersByVideo.get(v.video_id);
      if (encs) {
        for (const e of encs) {
          if (e.evidence_score != null) channelEvidenceScores.push(Number(e.evidence_score));
        }
      }
    }
    const avgEvidence = channelEvidenceScores.length > 0
      ? channelEvidenceScores.reduce((a, b) => a + b, 0) / channelEvidenceScores.length : null;

    // Composite credibility: source_div(40) + evidence(40) + program_depth(20)
    const sourceDiversity = Math.min(avgPersons / 10, 1) * 40;
    const evidenceQuality = avgEvidence != null ? ((avgEvidence - 7) / 21) * 40 : 0.5 * 40;
    const programDepth = Math.min(avgPrograms / 5, 1) * 20;
    const credibilityScore = Math.round((sourceDiversity + evidenceQuality + programDepth) * 10) / 10;

    // ── Encounter Depth ───────────────────────────────────────
    const contactDepthScores: number[] = [];
    const transformationScores: number[] = [];
    for (const v of channelVideos) {
      const encs = encountersByVideo.get(v.video_id);
      if (encs) {
        for (const e of encs) {
          if (e.contact_depth_score != null) contactDepthScores.push(Number(e.contact_depth_score));
          if (e.transformation_score != null) transformationScores.push(Number(e.transformation_score));
        }
      }
    }
    const avgContactDepth = contactDepthScores.length > 0
      ? contactDepthScores.reduce((a, b) => a + b, 0) / contactDepthScores.length : null;
    const avgTransformation = transformationScores.length > 0
      ? transformationScores.reduce((a, b) => a + b, 0) / transformationScores.length : null;
    // Normalize: contact_depth 0-32 → 0-100, transformation 0-60 → 0-100
    const encounterDepth = avgContactDepth != null ? Math.round((avgContactDepth / 32) * 100 * 10) / 10 : null;
    const impactScore = avgTransformation != null ? Math.round((avgTransformation / 60) * 100 * 10) / 10 : null;

    // ── Raw encounter/research for ratio computation ──────────
    const rawEncounter = encounterDepth != null && impactScore != null
      ? (encounterDepth + impactScore) / 2 : null;
    const rawResearch = intelligenceValue != null
      ? (intelligenceValue + credibilityScore) / 2 : null;

    if (rawEncounter != null) allRawEncounters.push(rawEncounter);
    if (rawResearch != null) allRawResearch.push(rawResearch);
    if (intelligenceValue != null) allIntelligenceValues.push(intelligenceValue);

    // ── Content Type Distribution ─────────────────────────────
    const contentDist: Record<string, number> = {};
    for (const v of channelVideos) {
      if (v.content_type) {
        contentDist[v.content_type] = (contentDist[v.content_type] || 0) + 1;
      }
    }

    // ── Duration ──────────────────────────────────────────────
    const durations: number[] = [];
    for (const v of channelVideos) {
      const secs = parseDurationToSeconds(v.duration);
      if (secs != null && secs > 0) durations.push(secs);
    }
    const avgDurationSecs = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

    // ── Engagement ────────────────────────────────────────────
    const totalViews = channelVideos.reduce((s, v) => s + (v.view_count ?? 0), 0);
    const vpv = videoCount > 0 ? totalViews / videoCount : null;
    if (vpv != null) allViewsPerVideo.push(vpv);

    const engagementRates: number[] = [];
    for (const v of channelVideos) {
      if (v.view_count && v.view_count > 0 && v.comments_count != null) {
        engagementRates.push(v.comments_count / v.view_count);
      }
    }
    const engagementRate = engagementRates.length > 0
      ? engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length : null;
    if (engagementRate != null) allEngagementRates.push(engagementRate);

    // ── Timeline ──────────────────────────────────────────────
    const dates = channelVideos
      .map(v => v.date ? new Date(v.date) : null)
      .filter((d): d is Date => d != null && !isNaN(d.getTime()));
    dates.sort((a, b) => a.getTime() - b.getTime());

    const firstVideoDate = dates.length > 0 ? dates[0].toISOString() : null;
    const lastDate = dates.length > 0 ? dates[dates.length - 1] : null;

    let monthsActive: number | null = null;
    let volumeIntensity: number | null = null;
    let postingCadence: string | null = null;

    if (firstVideoDate && lastDate) {
      const firstD = new Date(firstVideoDate);
      monthsActive = Math.max(1,
        (lastDate.getFullYear() - firstD.getFullYear()) * 12 +
        (lastDate.getMonth() - firstD.getMonth()) + 1
      );
      volumeIntensity = Math.round((videoCount / monthsActive) * 100) / 100;

      // Monthly post counts for cadence
      const monthlyCounts: Record<string, number> = {};
      for (const d of dates) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
      }
      postingCadence = computeCadence(Object.values(monthlyCounts));
    }

    intermediates.push({
      channelId,
      intelligenceValue,
      credibilityScore,
      encounterDepth,
      impactScore,
      rawEncounter,
      rawResearch,
      contentDist,
      avgDurationSecs,
      videoCount,
      totalViews,
      engagementRate,
      viewsPerVideo: vpv,
      monthsActive,
      firstVideoDate,
      postingCadence,
      volumeIntensity,
    });
  }

  // ── 4. Archive-wide averages ───────────────────────────────────────

  const avgRawEncounter = allRawEncounters.length > 0
    ? allRawEncounters.reduce((a, b) => a + b, 0) / allRawEncounters.length : 1;
  const avgRawResearch = allRawResearch.length > 0
    ? allRawResearch.reduce((a, b) => a + b, 0) / allRawResearch.length : 1;
  const avgArchiveVPV = allViewsPerVideo.length > 0
    ? allViewsPerVideo.reduce((a, b) => a + b, 0) / allViewsPerVideo.length : 1;
  const avgArchiveEngagement = allEngagementRates.length > 0
    ? allEngagementRates.reduce((a, b) => a + b, 0) / allEngagementRates.length : 1;

  // Median intelligence for personality code
  const sortedIntel = [...allIntelligenceValues].sort((a, b) => a - b);
  const medianIntel = sortedIntel.length > 0
    ? sortedIntel[Math.floor(sortedIntel.length / 2)] : 50;

  // ── 5. Second pass: compute final scores ───────────────────────────

  // Sort for rankings
  const byVideoCount = [...intermediates].sort((a, b) => b.videoCount - a.videoCount);
  const byTotalViews = [...intermediates].sort((a, b) => b.totalViews - a.totalViews);

  const archiveRankMap = new Map<string, number>();
  const viewsRankMap = new Map<string, number>();
  byVideoCount.forEach((c, i) => archiveRankMap.set(c.channelId, i + 1));
  byTotalViews.forEach((c, i) => viewsRankMap.set(c.channelId, i + 1));

  // Diversity: compute all, then rank
  const diversityScores: { channelId: string; diversity: number }[] = [];

  for (const ch of intermediates) {
    const diversity = shannonDiversity(ch.contentDist, archiveTypeCount);

    const encounterScore = ch.rawEncounter != null
      ? Math.round((ch.rawEncounter / Math.max(avgRawEncounter, 0.01)) * 100) / 100 : null;
    const researchScore = ch.rawResearch != null
      ? Math.round((ch.rawResearch / Math.max(avgRawResearch, 0.01)) * 100) / 100 : null;

    const authorityScore = [ch.intelligenceValue, ch.credibilityScore, ch.encounterDepth, ch.impactScore]
      .filter((v): v is number => v != null);
    const authority = authorityScore.length > 0
      ? Math.round((authorityScore.reduce((a, b) => a + b, 0) / authorityScore.length) * 10) / 10 : null;

    const [primary, secondary, tertiary] = classifyArchetypes(ch.contentDist);

    const personalityCode = computePersonalityCode(
      ch.contentDist,
      ch.avgDurationSecs,
      ch.intelligenceValue,
      medianIntel,
    );

    diversityScores.push({ channelId: ch.channelId, diversity });

    channelScores.push({
      channel_id: ch.channelId,
      intelligence_value: ch.intelligenceValue,
      credibility_score: ch.credibilityScore,
      encounter_depth: ch.encounterDepth,
      impact_score: ch.impactScore,
      authority_score: authority,
      letter_grade: letterGrade(authority),
      archetype_primary: primary,
      archetype_secondary: secondary,
      archetype_tertiary: tertiary,
      personality_code: personalityCode,
      archive_rank: archiveRankMap.get(ch.channelId) ?? 0,
      views_rank: viewsRankMap.get(ch.channelId) ?? 0,
      engagement_rate: ch.engagementRate != null
        ? Math.round(ch.engagementRate * 10000) / 10000 : null,
      volume_intensity: ch.volumeIntensity,
      views_per_video: ch.viewsPerVideo != null
        ? Math.round(ch.viewsPerVideo * 10) / 10 : null,
      engagement_vs_avg: ch.engagementRate != null && avgArchiveEngagement > 0
        ? Math.round((ch.engagementRate / avgArchiveEngagement) * 100) / 100 : null,
      views_per_video_vs_avg: ch.viewsPerVideo != null && avgArchiveVPV > 0
        ? Math.round((ch.viewsPerVideo / avgArchiveVPV) * 100) / 100 : null,
      diversity_index: Math.round(diversity * 1000) / 1000,
      diversity_rank: null, // computed after sorting
      content_type_distribution: ch.contentDist,
      avg_video_duration_seconds: ch.avgDurationSecs != null
        ? Math.round(ch.avgDurationSecs) : null,
      posting_cadence: ch.postingCadence,
      months_active: ch.monthsActive,
      first_video_date: ch.firstVideoDate,
      encounter_score: encounterScore,
      research_score: researchScore,
      computed_at: new Date().toISOString(),
    });
  }

  // Compute diversity ranks
  diversityScores.sort((a, b) => b.diversity - a.diversity);
  const diversityRankMap = new Map<string, number>();
  diversityScores.forEach((d, i) => diversityRankMap.set(d.channelId, i + 1));
  for (const score of channelScores) {
    score.diversity_rank = diversityRankMap.get(score.channel_id) ?? null;
  }

  // ── 6. Batch upsert ────────────────────────────────────────────────

  if (channelScores.length === 0) {
    return { channels_computed: 0, duration_ms: Date.now() - start, errors };
  }

  // Supabase upsert in batches of 50 to avoid payload limits
  const BATCH = 50;
  for (let i = 0; i < channelScores.length; i += BATCH) {
    const batch = channelScores.slice(i, i + BATCH);
    const { error } = await supabase
      .from('uap_channel_scores')
      .upsert(batch, { onConflict: 'channel_id' });

    if (error) {
      const msg = `Upsert batch ${i / BATCH + 1} failed: ${error.message}`;
      console.error(`[compute-channel-scores] ${msg}`);
      errors.push(msg);
    }
  }

  const duration_ms = Date.now() - start;
  console.log(`[compute-channel-scores] Completed: ${channelScores.length} channels in ${duration_ms}ms`);

  return {
    channels_computed: channelScores.length,
    duration_ms,
    errors,
  };
}
