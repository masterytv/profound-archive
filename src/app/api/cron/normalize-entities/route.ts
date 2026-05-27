import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeEntities } from '@/lib/pipeline/normalize-entities';

export const maxDuration = 120;

/**
 * Weekly cron: normalizes (deduplicates) canonical entity records.
 * Called by pg_cron every Sunday at 5:00 UTC, or manually.
 *
 * Auth: CRON_SECRET in JSON body
 * Body: { secret: string, dryRun?: boolean }
 *   - dryRun=true (default): reports merge candidates without executing
 *   - dryRun=false: actually merges duplicates
 */
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Support header auth for manual testing
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

  // Default to dryRun=true for safety — pg_cron trigger sets dryRun=false
  const dryRun = body.dryRun !== false;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  try {
    const result = await normalizeEntities(supabase, dryRun);

    return NextResponse.json({
      message: dryRun
        ? `DRY RUN: Found ${result.merge_candidates} merge candidates across ${result.tables_processed.length} tables`
        : `Merged ${result.merges_executed} entity groups in ${result.duration_ms}ms`,
      dryRun,
      ...result,
    });
  } catch (err) {
    console.error('[normalize-entities] Fatal error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
