/**
 * Automation credential check (IMPROVEMENT_PLAN S-5).
 *
 * The CRON_SECRET is accepted ONLY from headers — `x-cron-secret: <secret>`
 * or `Authorization: Bearer <secret>` — never from the query string or the
 * request body, where it would land in access logs, shell history, and
 * Referer headers.
 */
export function hasValidCronSecret(req: { headers: { get(name: string): string | null } }): boolean {
    const expected = process.env.CRON_SECRET;
    if (!expected) return false;

    const authHeader = req.headers.get('authorization');
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const provided = req.headers.get('x-cron-secret') ?? bearer;

    return provided === expected;
}
