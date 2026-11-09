import { NextResponse } from 'next/server';
import { hasValidCronSecret } from '@/lib/auth/cron-auth';
import { runMaintenance } from '@/lib/share/jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Daily: expire unanswered intros, purge removed stories (30 days) and staging test data (7 days). */
export async function POST(req: Request) {
    if (!hasValidCronSecret(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    return NextResponse.json(await runMaintenance());
}
