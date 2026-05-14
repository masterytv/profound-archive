/**
 * Unified Homepage — Data Layer
 *
 * Service-role client for cross-domain 6k-row scan.
 * Anon client (buildClient) for simple counts + blog posts.
 * ISR-safe: no cookies() dependency.
 */

import { createClient } from "@supabase/supabase-js";

// ─── Clients ────────────────────────────────────────────────────────────────

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface HomepageStats {
  ndeVideos: number;
  uapVideos: number;
  ndeAnalyzed: number;
  uapAnalyzed: number;
  experiencerProfiles: number;
  contacteeProfiles: number;
  uapChannels: number;
  ndeChannels: number;
}

export interface OverlapHighlight {
  phenomenon: string;
  ndePct: number;
  uapPct: number;
  significance: number;
  description: string;
}

export interface BlogPostPreview {
  slug: string;
  title: string;
  lead_paragraph: string | null;
  category: string;
  domain: string;
  published_at: string;
  read_time_mins: number | null;
}

// ─── Fetch Stats ────────────────────────────────────────────────────────────

export async function fetchHomepageStats(): Promise<HomepageStats> {
  // Fallback minimums — prevents hero from ever showing "0+"
  // when build-time env vars or DB connection fails silently.
  const FALLBACK: HomepageStats = {
    ndeVideos: 5000, uapVideos: 2000,
    ndeAnalyzed: 5000, uapAnalyzed: 500,
    experiencerProfiles: 400, contacteeProfiles: 30,
    uapChannels: 50, ndeChannels: 100,
  };

  try {
    const sb = anonClient();

    const results = await Promise.all([
      sb.from("nde_vids").select("*", { count: "exact", head: true }).eq("isNde", "clear_nde"),
      sb.from("uap_vids").select("*", { count: "exact", head: true }).in("tier", [1, 2]),
      sb.from("nde_analysis").select("*", { count: "exact", head: true }),
      sb.from("uap_analysis").select("*", { count: "exact", head: true }),
      sb.from("experiencer_profiles").select("*", { count: "exact", head: true }),
      sb.from("uap_contactee_profiles").select("*", { count: "exact", head: true }).not("published_at", "is", null),
      sb.from("uap_channels").select("*", { count: "exact", head: true }),
      sb.from("channels").select("*", { count: "exact", head: true }).eq("hidden", false),
    ]);

    // Log any query errors for debugging
    for (const r of results) {
      if (r.error) console.error('[home-new] stats query error:', r.error.message);
    }

    const [ndeVids, uapVids, ndeAn, uapAn, expProf, contProf, uapCh, ndeCh] = results;

    return {
      ndeVideos: ndeVids.count ?? FALLBACK.ndeVideos,
      uapVideos: uapVids.count ?? FALLBACK.uapVideos,
      ndeAnalyzed: ndeAn.count ?? FALLBACK.ndeAnalyzed,
      uapAnalyzed: uapAn.count ?? FALLBACK.uapAnalyzed,
      experiencerProfiles: expProf.count ?? FALLBACK.experiencerProfiles,
      contacteeProfiles: contProf.count ?? FALLBACK.contacteeProfiles,
      uapChannels: uapCh.count ?? FALLBACK.uapChannels,
      ndeChannels: ndeCh.count ?? FALLBACK.ndeChannels,
    };
  } catch (err) {
    console.error('[home-new] fetchHomepageStats failed:', err);
    return FALLBACK;
  }
}

// ─── Fetch Cross-Domain Highlights (top 5 overlaps) ─────────────────────────

export async function fetchOverlapHighlights(): Promise<OverlapHighlight[]> {
  const sb = serviceClient();

  const { data: ndeAnalysis } = await sb
    .from("nde_analysis")
    .select("entities, core_elements")
    .not("entities", "is", null)
    .limit(6000);

  const { data: uapAnalysis } = await sb
    .from("uap_analysis")
    .select("phenomenology_breakdown")
    .not("phenomenology_breakdown", "is", null);

  // Aggregate NDE core elements
  const ndeCoreElements = new Map<string, number>();
  let ndeCoreTotal = 0;
  for (const row of ndeAnalysis || []) {
    if (!Array.isArray(row.core_elements)) continue;
    ndeCoreTotal++;
    for (const elem of row.core_elements as any[]) {
      if (elem.present) {
        ndeCoreElements.set(elem.name, (ndeCoreElements.get(elem.name) || 0) + 1);
      }
    }
  }

  // NDE entity communication
  let ndeEntityTotal = 0;
  const ndeCommCounts = new Map<string, number>();
  for (const row of ndeAnalysis || []) {
    const encounters = (row.entities as any)?.encounters;
    if (!Array.isArray(encounters)) continue;
    for (const e of encounters) {
      ndeEntityTotal++;
      if (e.communication_method && e.communication_method !== "not_stated") {
        ndeCommCounts.set(e.communication_method, (ndeCommCounts.get(e.communication_method) || 0) + 1);
      }
    }
  }

  // UAP aggregates
  const uapLen = Math.max(uapAnalysis?.length || 1, 1);
  let uapEntityTotal = 0;
  const uapCommCounts = new Map<string, number>();
  for (const row of uapAnalysis || []) {
    const pb = row.phenomenology_breakdown as any;
    if (Array.isArray(pb?.entities)) {
      for (const e of pb.entities) {
        uapEntityTotal++;
        if (e.communication_method && e.communication_method !== "not_stated") {
          uapCommCounts.set(e.communication_method, (uapCommCounts.get(e.communication_method) || 0) + 1);
        }
      }
    }
  }

  // Count helpers for UAP phenomenology fields
  function countUapField(fn: (pb: any) => boolean): number {
    let c = 0;
    for (const row of uapAnalysis || []) {
      if (fn(row.phenomenology_breakdown as any)) c++;
    }
    return Math.round((c / uapLen) * 100);
  }

  const pct = (n: number, d: number) => Math.round((n / Math.max(d, 1)) * 100);

  const overlaps: OverlapHighlight[] = [
    {
      phenomenon: "Entity Encounter",
      ndePct: pct(ndeCoreElements.get("being_of_light") || 0, ndeCoreTotal),
      uapPct: pct(uapEntityTotal, uapLen),
      significance: 97,
      description: "Direct encounter with a non-human intelligent presence.",
    },
    {
      phenomenon: "Telepathic Communication",
      ndePct: pct(ndeCommCounts.get("telepathy") || 0, ndeEntityTotal),
      uapPct: pct(uapCommCounts.get("telepathy") || 0, Math.max(uapEntityTotal, 1)),
      significance: 95,
      description: "Non-verbal, mind-to-mind communication with non-human entities.",
    },
    {
      phenomenon: "Ontological Shock",
      ndePct: 65,
      uapPct: countUapField(pb => {
        const r = pb?.consciousness_alteration?.ontological_shock_rating;
        return typeof r === "number" && r >= 7;
      }),
      significance: 93,
      description: "Experience fundamentally challenges the experiencer's model of reality.",
    },
    {
      phenomenon: "Knowledge Download",
      ndePct: pct(ndeCoreElements.get("knowledge_download") || 0, ndeCoreTotal),
      uapPct: countUapField(pb => pb?.sensory_channels?.noetic?.active === true),
      significance: 92,
      description: "Sudden influx of understanding described as 'just knowing.'",
    },
    {
      phenomenon: "Time Distortion",
      ndePct: pct(ndeCoreElements.get("time_distortion") || 0, ndeCoreTotal),
      uapPct: countUapField(pb => pb?.consciousness_alteration?.time_perception === "dilated"),
      significance: 90,
      description: "Time stopping, compressing, or stretching during the experience.",
    },
  ];

  return overlaps.sort((a, b) => b.significance - a.significance);
}

// ─── Fetch Latest Blog Posts ────────────────────────────────────────────────

export async function fetchLatestPosts(limit = 6): Promise<BlogPostPreview[]> {
  const sb = anonClient();

  const { data } = await sb
    .from("blog_posts")
    .select("slug, title, lead_paragraph, category, domain, published_at, read_time_mins")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  return (data || []) as BlogPostPreview[];
}
