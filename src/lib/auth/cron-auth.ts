/**
 * Automation credential check (IMPROVEMENT_PLAN S-5).
 *
 * The CRON_SECRET is accepted ONLY from headers — `x-cron-secret: <secret>`
 * or `Authorization: Bearer <secret>` — never from the query string or the
 * request body, where it would land in access logs, shell history, and
 * Referer headers.
 */
import { timingSafeEqual } from 'crypto';

// Constant-time string compare (S-12) — avoids a timing oracle on the secret.
// The length check short-circuits, which leaks only the length, not content.
function safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
}

export function hasValidCronSecret(req: { headers: { get(name: string): string | null } }): boolean {
    const expected = process.env.CRON_SECRET;
    if (!expected) return false;

    const authHeader = req.headers.get('authorization');
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const provided = req.headers.get('x-cron-secret') ?? bearer;

    return provided !== null && safeCompare(provided, expected);
}
