import { NextResponse } from 'next/server';
import { hasValidCronSecret } from '@/lib/auth/cron-auth';
import { buildQueue } from '@/lib/share/jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** GET: the daily job's work list (narrations, YouTube uploads, removals). CRON_SECRET only. */
export async function GET(req: Request) {
    if (!hasValidCronSecret(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const url = new URL(req.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 10) || 10, 1), 25);
    return NextResponse.json(await buildQueue(limit));
}
