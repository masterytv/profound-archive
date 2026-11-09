import type { Email } from './emails';

/**
 * Send one email through PP's Resend client. Imported lazily because
 * src/lib/email/resend.ts throws at import time when RESEND_API_KEY is unset.
 * Returns the Resend message id, or null if sending failed.
 */
export async function sendEmail(email: Email, opts: { track?: boolean } = {}): Promise<string | null> {
    try {
        const { resend } = await import('@/lib/email/resend');
        const res = await resend.emails.send({
            from: email.from,
            to: email.to,
            replyTo: email.replyTo,
            subject: email.subject,
            html: email.html,
            text: email.text,
            ...(opts.track ? { tags: [{ name: 'feature', value: 'share-intro' }] } : {}),
        });
        if (res.error) {
            console.error('[share] email failed:', res.error.message);
            return null;
        }
        return res.data?.id ?? null;
    } catch (err) {
        console.error('[share] email failed:', err instanceof Error ? err.message : err);
        return null;
    }
}
