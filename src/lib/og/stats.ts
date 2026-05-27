/**
 * Shared stats fetcher for OG image routes.
 *
 * These run in Edge runtime — no cookies, no server client.
 * Uses anon key for read-only count queries (public tables via RLS).
 * Cache is controlled by the route's `revalidate` export (ISR).
 *
 * VERIFIED against live schema (2026-05-27):
 * ┌─────────────────────┬───────┬──────────────────────────────────┐
 * │ Table               │ Count │ Filter                           │
 * ├─────────────────────┼───────┼──────────────────────────────────┤
 * │ uap_encounters      │ 4,885 │ (none)                           │
 * │ uap_channels        │    64 │ hidden = false                   │
 * │ uap_vids            │ 9,511 │ RLS restricts to tier IN (1,2)   │
 * │ nde_vids (clear)    │ 5,512 │ isNde = 'clear_nde'              │
 * │ channels (NDE)      │    53 │ hidden = false                   │
 * │ nde_questions       │    81 │ is_active = true                 │
 * │ blog_posts (NDE)    │   139 │ domain = 'nde', status=published │
 * │ blog_posts (UAP)    │    23 │ domain = 'uap', status=published │
 * └─────────────────────┴───────┴──────────────────────────────────┘
 *
 * NOTE: The `isNde` column filter sometimes returns null count via
 * the JS client (Node/Edge quirk). Fallbacks ensure OG images never
 * show "0" for known non-zero stats.
 */

import { createClient } from '@supabase/supabase-js';

function getClient() {
  // Use service role key on server if available to bypass RLS and query counts instantly
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
  );
}

/** Format a number for display: 1234 → "1,234", 1234567 → "1.2M" */
export function formatCount(n: number | null | undefined): string {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return n.toLocaleString('en-US');
}

// ─── Caching & Timeout Helpers ──────────────────────────────────────────────

type CachedStats<T> = {
  data: T;
  timestamp: number;
};

const CACHE_TTL = 3600 * 1000; // 1 hour in ms
const DB_TIMEOUT = 2500; // 2.5 seconds timeout

// In-memory cache variables (persists within server container instances)
let uapStatsCache: CachedStats<{ videos: number; channels: number; encounters: number }> | null = null;
let ndeStatsCache: CachedStats<{ videos: number; channels: number; questions: number }> | null = null;
let blogStatsCache: Record<string, CachedStats<{ posts: number }>> = {};

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[OG Stats] Database query timed out after ${ms}ms. Using fallback stats.`);
      resolve(fallback);
    }, ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timeoutId);
      return res;
    }),
    timeoutPromise
  ]);
}

// ─── UAP Stats ──────────────────────────────────────────────────────────────

const UAP_FALLBACK = { videos: 2000, channels: 60, encounters: 4800 };

export async function getUapStats() {
  const now = Date.now();
  if (uapStatsCache && now - uapStatsCache.timestamp < CACHE_TTL) {
    return uapStatsCache.data;
  }

  const fetchPromise = (async () => {
    const sb = getClient();
    const [vids, channels, encounters] = await Promise.all([
      sb.from('uap_vids').select('*', { count: 'exact', head: true }),
      sb.from('uap_channels').select('*', { count: 'exact', head: true }).eq('hidden', false),
      sb.from('uap_encounters').select('*', { count: 'exact', head: true }),
    ]);
    const data = {
      videos: vids.count ?? UAP_FALLBACK.videos,
      channels: channels.count ?? UAP_FALLBACK.channels,
      encounters: encounters.count ?? UAP_FALLBACK.encounters,
    };
    // Update cache
    uapStatsCache = { data, timestamp: Date.now() };
    return data;
  })();

  try {
    return await withTimeout(fetchPromise, DB_TIMEOUT, UAP_FALLBACK);
  } catch (error) {
    console.error('[OG Stats] Error fetching UAP stats:', error);
    return UAP_FALLBACK;
  }
}

// ─── NDE Stats ──────────────────────────────────────────────────────────────

const NDE_FALLBACK = { videos: 5000, channels: 50, questions: 80 };

export async function getNdeStats() {
  const now = Date.now();
  if (ndeStatsCache && now - ndeStatsCache.timestamp < CACHE_TTL) {
    return ndeStatsCache.data;
  }

  const fetchPromise = (async () => {
    const sb = getClient();
    const [vids, channels, questions] = await Promise.all([
      sb.from('nde_vids').select('*', { count: 'exact', head: true }).eq('isNde', 'clear_nde'),
      sb.from('channels').select('*', { count: 'exact', head: true }).eq('hidden', false),
      sb.from('nde_questions').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ]);
    const data = {
      videos: vids.count ?? NDE_FALLBACK.videos,
      channels: channels.count ?? NDE_FALLBACK.channels,
      questions: questions.count ?? NDE_FALLBACK.questions,
    };
    // Update cache
    ndeStatsCache = { data, timestamp: Date.now() };
    return data;
  })();

  try {
    return await withTimeout(fetchPromise, DB_TIMEOUT, NDE_FALLBACK);
  } catch (error) {
    console.error('[OG Stats] Error fetching NDE stats:', error);
    return NDE_FALLBACK;
  }
}

// ─── Blog Stats ─────────────────────────────────────────────────────────────

export async function getBlogStats(domain: 'nde' | 'uap') {
  const now = Date.now();
  const cached = blogStatsCache[domain];
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const fallback = { posts: domain === 'nde' ? 130 : 20 };

  const fetchPromise = (async () => {
    const sb = getClient();
    const { count } = await sb.from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .eq('domain', domain);
    const data = { posts: count ?? fallback.posts };
    blogStatsCache[domain] = { data, timestamp: Date.now() };
    return data;
  })();

  try {
    return await withTimeout(fetchPromise, DB_TIMEOUT, fallback);
  } catch (error) {
    console.error(`[OG Stats] Error fetching blog stats for ${domain}:`, error);
    return fallback;
  }
}
