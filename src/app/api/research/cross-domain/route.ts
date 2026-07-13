/**
 * Cross-Domain Phenomenology API
 *
 * Aggregates and compares phenomenological data across NDE and UAP domains.
 * Returns structured comparison data for entity types, consciousness states,
 * communication methods, emotional arcs, and physical effects.
 *
 * Serves the shared viz_graph_cache entry when warm (refreshed weekly by the
 * rebuild-viz-caches cron and on page renders); otherwise recomputes over the
 * full corpus via src/lib/research/cross-domain-data.ts and re-warms it.
 *
 * GET /api/research/cross-domain
 * Response is cached for 1 hour via Next.js ISR.
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
  computeCrossDomainResult,
  readCrossDomainCache,
  writeCrossDomainCache,
} from '@/lib/research/cross-domain-data';

export const revalidate = 3600;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );
}

export async function GET() {
  const supabase = getSupabase();

  const cached = await readCrossDomainCache(supabase);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  }

  const result = await computeCrossDomainResult(supabase);

  // A failed or empty compute must be a 503, not a 200 full of zeros that
  // downstream consumers (and CDN caches) would treat as real data.
  if (!result) {
    return NextResponse.json(
      { error: 'Cross-domain data temporarily unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  await writeCrossDomainCache(supabase, result);

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
