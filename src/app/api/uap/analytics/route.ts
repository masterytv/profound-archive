/**
 * UAP Analytics API
 *
 * GET /api/uap/analytics — Returns cross-video analytics JSON.
 * Delegates to shared computeAnalytics() module.
 *
 * Auth: requires internal referer or CRON_SECRET.
 */

import { NextResponse } from 'next/server';
import { computeAnalytics } from '@/app/uap/intelligence/compute-analytics';

export const revalidate = 86400; // ISR: revalidate once per day

export async function GET(request: Request) {
  // Auth check — only allow server-side or authorized access
  const authHeader = request.headers.get('authorization');
  const referer = request.headers.get('referer') || '';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const cronSecret = process.env.CRON_SECRET;

  const isInternalFetch = referer.startsWith(siteUrl) || referer.startsWith('http://localhost');
  const hasValidSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isInternalFetch && !hasValidSecret) {
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
