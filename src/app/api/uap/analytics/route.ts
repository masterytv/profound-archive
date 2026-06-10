/**
 * UAP Analytics API
 *
 * GET /api/uap/analytics — Returns cross-video analytics JSON.
 * Delegates to shared computeAnalytics() module (the public /uap/intelligence
 * page calls that module directly and does not go through this route).
 *
 * Auth: CRON_SECRET header only (S-7 — the old Referer branch was
 * client-spoofable and is not an access control).
 */

import { NextResponse } from 'next/server';
import { computeAnalytics } from '@/app/uap/intelligence/compute-analytics';
import { hasValidCronSecret } from '@/lib/auth/cron-auth';

export const revalidate = 86400; // ISR: revalidate once per day

export async function GET(request: Request) {
  if (!hasValidCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const analytics = await computeAnalytics();

    return NextResponse.json(analytics, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
      },
    });
  } catch (error: any) {
    console.error('[UAP Analytics] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
