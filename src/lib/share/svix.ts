import { createHmac, timingSafeEqual } from 'crypto';

/** Verify a Svix-signed webhook (Resend uses Svix). Rejects payloads older than 5 minutes. */
export function verifySvix(secret: string, headers: Headers, payload: string, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
    const id = headers.get('svix-id');
    const timestamp = headers.get('svix-timestamp');
    const signatures = headers.get('svix-signature');
    if (!id || !timestamp || !signatures) return false;
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > 300) return false;
    const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
    const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${payload}`).digest();
    return signatures.split(' ').some((part) => {
        const [version, sig] = part.split(',');
        if (version !== 'v1' || !sig) return false;
        const given = Buffer.from(sig, 'base64');
        return given.length === expected.length && timingSafeEqual(given, expected);
    });
}

