import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rebuildAllVizCaches } from '@/lib/pipeline/rebuild-viz-caches';

export const maxDuration = 120;

/**
 * Weekly cron: rebuilds all viz_graph_cache entries from source data.
 * Should run AFTER recompute-channel-scores so scores are fresh.
 *
 * Auth: CRON_SECRET bearer token or JSON body secret
 */
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Also support header auth for manual testing
  }

  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  const bodySecret = body.secret as string | undefined;
  const headerAuth = request.headers.get('authorization');

  const authorized =
    (bodySecret === cronSecret) ||
    (headerAuth === `Bearer ${cronSecret}`);

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  try {
    const result = await rebuildAllVizCaches(supabase);

    return NextResponse.json({
      message: `Rebuilt viz caches in ${result.duration_ms}ms`,
      ...result,
    });
  } catch (err) {
    console.error('[rebuild-viz-caches] Fatal error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
