// src/lib/email/matcher.ts
// Picks the best unwatched video for a given archetype subscriber.
// Sorting: archetype-specific filters first, then Most Popular (viewCount DESC).

import { SupabaseClient } from "@supabase/supabase-js";
import type { ArchetypeId } from "@/lib/quiz/archetypes";

export interface MatchedVideo {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string | null;
  viewCount: number | null;
  aiSummary: string | null;
  pullQuote: string | null;
}

type ArchetypeFilter = {
  toneIn?: string[];
  toneNotIn?: string[];
  triggerIn?: string[];
  triggerNotIn?: string[];
  minGreyson?: number;
  minTransformation?: number;
  minVeridical?: number;
  minIntensity?: number;
  experienceType?: string;
};

// Per-archetype SQL filter profiles
// Primary sort: archetype-specific metric DESC
// Secondary sort: Most Popular (viewCount DESC) — per user request
const ARCHETYPE_FILTERS: Record<ArchetypeId, ArchetypeFilter> = {
  griever: {
    toneIn: ["very_positive", "positive"],
    toneNotIn: ["very_negative", "negative"],
    triggerNotIn: ["suicide_attempt"],
    minTransformation: 25,
  },
  seeker: {
    toneIn: ["very_positive", "positive"],
    minTransformation: 30,
    minIntensity: 7,
  },
  experiencer: {
    experienceType: "nde",
    minGreyson: 22,
  },
  skeptic: {
    minVeridical: 8,
  },
  curious: {
    toneIn: ["very_positive", "positive"],
    minIntensity: 7,
  },
  reexp: {
    minGreyson: 25,
    minTransformation: 30,
  },
  crisis: {
    toneIn: ["very_positive", "positive"],
    toneNotIn: ["very_negative"],
    triggerNotIn: [],
  },
};

// Primary ORDER BY per archetype (secondary is always v.viewCount DESC)
const ARCHETYPE_ORDER: Record<ArchetypeId, string> = {
  griever:      "a.transformation_score DESC, v.\"viewCount\" DESC",
  seeker:       "a.transformation_score DESC, v.\"viewCount\" DESC",
  experiencer:  "a.total_greyson_score DESC, v.\"viewCount\" DESC",
  skeptic:      "v.rvnde_total_score DESC, v.\"viewCount\" DESC",
  curious:      "v.\"viewCount\" DESC, a.intensity_rating DESC",
  reexp:        "a.total_greyson_score DESC, a.transformation_score DESC, v.\"viewCount\" DESC",
  crisis:       "a.transformation_score DESC, v.\"viewCount\" DESC",
};

export async function pickVideoForArchetype(
  archetypeId: ArchetypeId,
  leadId: string,
  supabase: SupabaseClient
): Promise<MatchedVideo | null> {
  const filters   = ARCHETYPE_FILTERS[archetypeId];
  const orderBy   = ARCHETYPE_ORDER[archetypeId];

  // Build WHERE conditions
  const conditions: string[] = [
    `v."isNde" = 'clear_nde'`,
    `a.video_id IS NOT NULL`,
  ];

  if (filters.toneIn?.length)      conditions.push(`a.overall_tone IN (${filters.toneIn.map(t => `'${t}'`).join(",")})`);
  if (filters.toneNotIn?.length)   conditions.push(`(a.overall_tone IS NULL OR a.overall_tone NOT IN (${filters.toneNotIn.map(t => `'${t}'`).join(",")}))`);
  if (filters.triggerIn?.length)   conditions.push(`a.trigger_category IN (${filters.triggerIn.map(t => `'${t}'`).join(",")})`);
  if (filters.triggerNotIn?.length) conditions.push(`(a.trigger_category IS NULL OR a.trigger_category NOT IN (${filters.triggerNotIn.map(t => `'${t}'`).join(",")}))`);
  if (filters.minGreyson)          conditions.push(`a.total_greyson_score >= ${filters.minGreyson}`);
  if (filters.minTransformation)   conditions.push(`a.transformation_score >= ${filters.minTransformation}`);
  if (filters.minVeridical)        conditions.push(`v.rvnde_total_score >= ${filters.minVeridical}`);
  if (filters.minIntensity)        conditions.push(`a.intensity_rating >= ${filters.minIntensity}`);
  if (filters.experienceType)      conditions.push(`a.experience_type = '${filters.experienceType}'`);

  // Exclude videos already sent to this lead
  conditions.push(`v."videoId" NOT IN (
    SELECT es.video_id FROM email_sends es WHERE es.lead_id = '${leadId}'
  )`);

  const whereClause = conditions.join(" AND ");

  const { data, error } = await supabase.rpc("exec_sql_unsafe_internal", {}).
    // We use a raw query via supabase.from select — but since we need a join,
    // we'll call via the service route's postgres connection
    // This function is called server-side only with service_role key
    // so we use the full SQL approach.
    // NOTE: Supabase JS SDK doesn't support raw JOINs natively.
    // We use a workaround via the REST /rpc endpoint or build an RPC.
    // For now, we return null and defer to the RPC in apply_migration below.
    then(() => ({ data: null, error: null }));

  void data; void error;
  return null; // Replaced by RPC call in pickVideoForArchetypeViaRpc
}

// Production implementation — calls the DB-side RPC
export async function pickVideoForArchetypeViaRpc(
  archetypeId: ArchetypeId,
  leadId: string,
  supabase: SupabaseClient
): Promise<MatchedVideo | null> {
  const { data, error } = await supabase.rpc("pick_video_for_archetype", {
    p_archetype: archetypeId,
    p_lead_id:   leadId,
  });

  if (error) {
    console.error("[matcher] RPC error:", error.message);
    return null;
  }

  return data?.[0] ?? null;
}
