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
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/** Format a number for display: 1234 → "1,234", 1234567 → "1.2M" */
export function formatCount(n: number | null | undefined): string {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return n.toLocaleString('en-US');
}

// ─── UAP Stats ──────────────────────────────────────────────────────────────

const UAP_FALLBACK = { videos: 2000, channels: 60, encounters: 4800 };

export async function getUapStats() {
  try {
    const sb = getClient();
    const [vids, channels, encounters] = await Promise.all([
      sb.from('uap_vids').select('*', { count: 'exact', head: true }),
      sb.from('uap_channels').select('*', { count: 'exact', head: true }).eq('hidden', false),
      sb.from('uap_encounters').select('*', { count: 'exact', head: true }),
    ]);
    return {
      videos: vids.count ?? UAP_FALLBACK.videos,
      channels: channels.count ?? UAP_FALLBACK.channels,
      encounters: encounters.count ?? UAP_FALLBACK.encounters,
    };
  } catch {
    return UAP_FALLBACK;
  }
}

// ─── NDE Stats ──────────────────────────────────────────────────────────────

const NDE_FALLBACK = { videos: 5000, channels: 50, questions: 80 };

export async function getNdeStats() {
  try {
    const sb = getClient();
    const [vids, channels, questions] = await Promise.all([
      // Only count confirmed NDE accounts (isNde = 'clear_nde')
      sb.from('nde_vids').select('*', { count: 'exact', head: true }).eq('isNde', 'clear_nde'),
      sb.from('channels').select('*', { count: 'exact', head: true }).eq('hidden', false),
      sb.from('nde_questions').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ]);
    return {
      videos: vids.count ?? NDE_FALLBACK.videos,
      channels: channels.count ?? NDE_FALLBACK.channels,
      questions: questions.count ?? NDE_FALLBACK.questions,
    };
  } catch {
    return NDE_FALLBACK;
  }
}

// ─── Blog Stats ─────────────────────────────────────────────────────────────

export async function getBlogStats(domain: 'nde' | 'uap') {
  try {
    const sb = getClient();
    // Single `blog_posts` table with `domain` column — RLS already filters to published
    const { count } = await sb.from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .eq('domain', domain);
    return { posts: count ?? (domain === 'nde' ? 130 : 20) };
  } catch {
    return { posts: domain === 'nde' ? 130 : 20 };
  }
}
