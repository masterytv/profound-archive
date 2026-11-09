import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasValidCronSecret } from '@/lib/auth/cron-auth';
import { applyResult } from '@/lib/share/jobs';

const schema = z.object({
    storyId: z.string().uuid(),
    narrationPath: z.string().max(300).nullable().optional(),
    youtubeVideoId: z.string().regex(/^[\w-]{6,20}$/).nullable().optional(),
    youtubeStatus: z.enum(['uploaded', 'failed', 'skipped', 'pending']).optional(),
    error: z.string().max(2000).nullable().optional(),
});

/** POST: the daily job reports one story's narration / upload result. CRON_SECRET only. */
export async function POST(req: Request) {
    if (!hasValidCronSecret(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'bad request' }, { status: 400 });
    try {
        await applyResult(parsed.data);
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 400 });
    }
}
