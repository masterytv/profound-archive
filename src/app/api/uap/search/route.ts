import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { wrapAiClient } from "@/lib/ai/usage-tracker";
import { checkRateLimit } from "@/lib/rate-limit";

// Per-IP throttle (S-1): semantic searches bill OpenAI embeddings.
const RATE_LIMIT = { name: "uap-search", windowMs: 60_000, max: 30 };

// ─── Config ─────────────────────────────────────────────────────────────────

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OpenAI API Key");
  return wrapAiClient(new OpenAI({ apiKey }), { provider: "openai", operation: "uap-search" });
}

// ─── POST /api/uap/search ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  try {
    const {
      searchTerm,
      filters = {},
      sortBy,
      page = 1,
      type = "keyword",
      similarity = 0.5,
    } = await req.json();

    const perPage = 12;
    console.log(`[UAP Search] (${type}): "${searchTerm}" page ${page}`);

    if (type === "semantic") {
      return await handleSemanticSearch(searchTerm, filters, page, perPage, similarity, sortBy);
    }
    return await handleKeywordSearch(searchTerm, filters, sortBy, page, perPage);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[UAP Search] Error:", message);
    return NextResponse.json({ message: "Search failed", error: message }, { status: 500 });
  }
}

// ─── Keyword Search ─────────────────────────────────────────────────────────

async function handleKeywordSearch(
  searchTerm: string,
  filters: Record<string, unknown>,
  sortBy: string | undefined,
  page: number,
  perPage: number,
) {
  const supabase = getSupabaseClient();

  // Parse sort
  let sortColumn = searchTerm && searchTerm !== "*" ? "relevance" : "viewCount";
  let sortDirection = "DESC";
  if (sortBy) {
    const [col, dir] = sortBy.split(":");
    sortColumn = col === "_text_match" || col === "text_match" ? "relevance" : col;
    if (dir) sortDirection = dir.toUpperCase();
  }

  // Process UAP-specific filters
  const filterTier = filters?.tier ? Number(filters.tier) : null;
  const filterTrack = filters?.track as string | null ?? null;
  const filterChannelName = Array.isArray(filters?.channelName) && filters.channelName.length > 0 ? filters.channelName : null;
  const filterHynekType = Array.isArray(filters?.hynekType) && filters.hynekType.length > 0 ? filters.hynekType : null;
  const filterContentType = (filters?.contentType as string) ?? null;
  // Phenomenology filters
  const filterExperienceType = (filters?.experienceType as string) ?? null;
  const filterEntityType = (filters?.entityType as string) ?? null;
  const filterEvidenceType = (filters?.evidenceType as string) ?? null;
  const filterRecurrence = (filters?.recurrence as string) ?? null;

  const offset = (page - 1) * perPage;

  const { data, error } = await supabase.rpc("keyword_search_uap_videos", {
    search_query: searchTerm || "*",
    sort_column: sortColumn,
    sort_direction: sortDirection,
    page_limit: perPage,
    page_offset: offset,
    filter_tier: filterTier,
    filter_track: filterTrack,
    filter_channel_name: filterChannelName,
    filter_hynek_type: filterHynekType,
    filter_content_type: filterContentType,
    filter_experience_type: filterExperienceType,
    filter_entity_type: filterEntityType,
    filter_evidence_type: filterEvidenceType,
    filter_recurrence: filterRecurrence,
  });

  if (error) {
    console.error("[UAP Search] Keyword RPC error:", error);
    throw error;
  }

  // Defense-in-depth: strip any Tier 3 that somehow made it through
  const safe = (data ?? []).filter((r: Record<string, unknown>) => r.tier !== 3);

  const totalCount = safe.length > 0 ? Number(safe[0].total_count) : 0;

  const hits = safe.map((item: Record<string, unknown>) => ({
    document: {
      id: `${item.video_id}-${item.id}`,
      videoId: item.video_id,
      title: item.title,
      content: item.content,
      channelName: item.channel_name,
      viewCount: item.view_count,
      date: item.date ? new Date(item.date as string).getTime() / 1000 : 0,
      thumbnailUrl: item.thumbnail_url,
      url: item.url,
      startTime: item.start_time,
      summary: item.analysis_uap_summary,
      tier: item.tier,
      track: item.track,
    },
    highlights: [],
  }));

  const facetCounts = await fetchFacets(supabase);

  return NextResponse.json({ found: totalCount, hits, facet_counts: facetCounts, page });
}

// ─── Semantic Search ────────────────────────────────────────────────────────

async function handleSemanticSearch(
  searchTerm: string,
  filters: Record<string, unknown>,
  page: number,
  perPage: number,
  similarityThreshold: number,
  sortBy: string | undefined,
) {
  const supabase = getSupabaseClient();
  const openai = getOpenAIClient();

  // Generate embedding
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: searchTerm,
    encoding_format: "float",
  });
  const embedding = embeddingResponse.data[0].embedding;

  let sortColumn = "similarity";
  let sortDirection = "DESC";
  if (sortBy) {
    const [col, dir] = sortBy.split(":");
    sortColumn = col === "_text_match" || col === "text_match" ? "similarity" : col;
    if (dir) sortDirection = dir.toUpperCase();
  }

  const filterTier = filters?.tier ? Number(filters.tier) : null;
  const filterTrack = filters?.track as string | null ?? null;
  const filterContentType = (filters?.contentType as string) ?? null;
  // Phenomenology filters
  const filterExperienceType = (filters?.experienceType as string) ?? null;
  const filterEntityType = (filters?.entityType as string) ?? null;
  const filterEvidenceType = (filters?.evidenceType as string) ?? null;
  const filterRecurrence = (filters?.recurrence as string) ?? null;

  const offset = (page - 1) * perPage;

  const { data, error } = await supabase.rpc("search_uap_punctuated_embeddings", {
    query_embedding: embedding,
    similarity_threshold: similarityThreshold,
    sort_column: sortColumn,
    sort_direction: sortDirection,
    page_limit: perPage,
    page_offset: offset,
    filter_tier: filterTier,
    filter_track: filterTrack,
    filter_content_type: filterContentType,
    filter_experience_type: filterExperienceType,
    filter_entity_type: filterEntityType,
    filter_evidence_type: filterEvidenceType,
    filter_recurrence: filterRecurrence,
  });

  if (error) {
    console.error("[UAP Search] Semantic RPC error:", error);
    throw error;
  }

  // Defense-in-depth
  const safe = (data ?? []).filter((r: Record<string, unknown>) => r.tier !== 3);

  const hits = safe.map((item: Record<string, unknown>) => ({
    document: {
      id: item.video_id,
      videoId: item.video_id,
      title: item.title,
      content: item.content,
      channelName: item.channel_name,
      viewCount: item.view_count,
      date: item.date ? new Date(item.date as string).getTime() / 1000 : 0,
      thumbnailUrl: item.thumbnail_url,
      url: item.url,
      startTime: item.start_time,
      summary: item.analysis_uap_summary,
      tier: item.tier,
      track: item.track,
      similarity: item.similarity,
    },
    highlights: [],
  }));

  const facetCounts = await fetchFacets(supabase);

  return NextResponse.json({ found: hits.length, hits, facet_counts: facetCounts, page });
}

// ─── Facets ─────────────────────────────────────────────────────────────────

async function fetchFacets(supabase: ReturnType<typeof getSupabaseClient>) {
  try {
    const { data, error } = await supabase.rpc("uap_search_facets");
    if (error) {
      console.error("[UAP Search] Facet RPC error:", error);
      return {};
    }
    return data ?? {};
  } catch (err) {
    console.error("[UAP Search] Facet error:", err);
    return {};
  }
}
