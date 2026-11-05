/**
 * GET /api/research/counts?element=…|entity_type=…|phrase=… — archive counts for Short Maker
 * (read-only), each with its method, total, source line and caveat so the number can be
 * shown on screen and reproduced later.
 */
import { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { requireShortMakerKey } from '@/lib/research/shortmaker/auth';
import { countArchive } from '@/lib/research/shortmaker/counts';
import { badRequest, getReadClient, json, upstreamError } from '@/lib/research/shortmaker/http';
import { CountsParamsSchema, formatIssues, paramsObject } from '@/lib/research/shortmaker/params';

export const dynamic = 'force-dynamic';

// Each uncached count pages through thousands of IDs, so this is tighter than search.
const RATE_LIMIT = { name: 'shortmaker-counts', windowMs: 60_000, max: 10 };

export async function GET(req: NextRequest) {
    const denied = requireShortMakerKey(req);
    if (denied) return denied;
    const limited = checkRateLimit(req, RATE_LIMIT);
    if (limited) return limited;

    const parsed = CountsParamsSchema.safeParse(paramsObject(req.nextUrl.searchParams));
    if (!parsed.success) return badRequest(formatIssues(parsed.error));

    try {
        return json(await countArchive(getReadClient(), parsed.data));
    } catch (err) {
        return upstreamError('research/counts', err);
    }
}
