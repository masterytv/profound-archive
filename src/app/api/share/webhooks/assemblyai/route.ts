import { NextResponse, after } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { completeTranscription } from '@/lib/share/stories';

export const maxDuration = 300;

function validSecret(provided: string | null): boolean {
    const expected = process.env.ASSEMBLYAI_WEBHOOK_SECRET;
    if (!expected || !provided) return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * AssemblyAI calls this when a transcript finishes. We answer at once and do
 * the work (fetch transcript, Gemini suggestions, email) after the response.
 */
export async function POST(req: Request) {
    if (!validSecret(req.headers.get('x-share-webhook-secret'))) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const body = (await req.json().catch(() => null)) as { transcript_id?: string; status?: string } | null;
    const id = body?.transcript_id;
    if (!id || !/^[\w-]{6,80}$/.test(id)) return NextResponse.json({ error: 'bad request' }, { status: 400 });

    after(async () => {
        try {
            await completeTranscription(id);
        } catch (err) {
            console.error('[share] transcription completion failed:', err instanceof Error ? err.message : err);
        }
    });
    return NextResponse.json({ ok: true });
}
