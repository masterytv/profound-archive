import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasValidCronSecret } from '@/lib/auth/cron-auth';
import { applyRemovalResult } from '@/lib/share/jobs';

const schema = z.object({ videoId: z.string().regex(/^[\w-]{6,20}$/), ok: z.boolean(), error: z.string().max(2000).nullable().optional() });

export async function POST(req: Request) {
    if (!hasValidCronSecret(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'bad request' }, { status: 400 });
    await applyRemovalResult(parsed.data.videoId, parsed.data.ok, parsed.data.error);
    return NextResponse.json({ ok: true });
}
