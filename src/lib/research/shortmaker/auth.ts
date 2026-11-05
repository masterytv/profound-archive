/**
 * Shared-secret check for the Short Maker research API.
 *
 * The key is accepted only as `Authorization: Bearer <key>` (never in the query string,
 * where it would land in logs). With SHORTMAKER_API_KEY unset the API is closed.
 */
import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

function safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
}

export function hasValidShortMakerKey(req: { headers: { get(name: string): string | null } }): boolean {
    const expected = process.env.SHORTMAKER_API_KEY;
    if (!expected) return false;
    const header = req.headers.get('authorization');
    const provided = header?.startsWith('Bearer ') ? header.slice(7) : null;
    return provided !== null && safeCompare(provided, expected);
}

/** 401 response, or null when the request carries the right key. */
export function requireShortMakerKey(req: { headers: { get(name: string): string | null } }): NextResponse | null {
    if (hasValidShortMakerKey(req)) return null;
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
}
