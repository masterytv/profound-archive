import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { recomputeAllChannelScores } from '@/lib/pipeline/compute-channel-scores';

export const maxDuration = 120;

/**
 * Weekly cron: recomputes all channel scores from source data.
 * Called by pg_cron every Sunday at 5:30 UTC, or manually.
 *
 * Auth: CRON_SECRET in JSON body (matching existing trigger pattern)
 */
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Also support header auth for manual testing
  }

  const cronSecret = process.env.CRON_SECRET;
  const bodySecret = body.secret as string | undefined;
  const headerAuth = request.headers.get('authorization');

  const authorized =
    (cronSecret && bodySecret === cronSecret) ||
    (cronSecret && headerAuth === `Bearer ${cronSecret}`);

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  try {
    const result = await recomputeAllChannelScores(supabase);

    return NextResponse.json({
      message: `Recomputed ${result.channels_computed} channel scores in ${result.duration_ms}ms`,
      ...result,
    });
  } catch (err) {
    console.error('[recompute-channel-scores] Fatal error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
