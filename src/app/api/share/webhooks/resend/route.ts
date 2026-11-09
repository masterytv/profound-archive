import { NextResponse } from 'next/server';
import { shareAdmin } from '@/lib/share/db';
import { verifySvix } from '@/lib/share/svix';

/**
 * Resend webhook (Svix-signed). Records when an introduction email is opened.
 * Configure in Resend: endpoint /api/share/webhooks/resend, event
 * "email.opened", and store the signing secret as RESEND_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) return NextResponse.json({ error: 'not configured' }, { status: 503 });
    const payload = await req.text();
    if (!verifySvix(secret, req.headers, payload)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const event = JSON.parse(payload) as { type?: string; data?: { email_id?: string } };
    if (event.type === 'email.opened' && event.data?.email_id) {
        await shareAdmin()
            .from('share_intro_requests')
            .update({ opened_at: new Date().toISOString() })
            .eq('resend_message_id', event.data.email_id)
            .is('opened_at', null);
    }
    return NextResponse.json({ ok: true });
}
