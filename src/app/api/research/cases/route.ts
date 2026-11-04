/**
 * GET /api/research/cases — case search for Short Maker (read-only).
 * Auth: Authorization: Bearer <SHORTMAKER_API_KEY>. Contract: src/lib/research/shortmaker/types.ts.
 */
import { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { requireShortMakerKey } from '@/lib/research/shortmaker/auth';
import { badRequest, getReadClient, json, upstreamError } from '@/lib/research/shortmaker/http';
import { formatIssues, paramsObject, SearchParamsSchema } from '@/lib/research/shortmaker/params';
import { searchCases } from '@/lib/research/shortmaker/search';
import { API_VERSION, type SearchResponse } from '@/lib/research/shortmaker/types';

export const dynamic = 'force-dynamic';

const RATE_LIMIT = { name: 'shortmaker-cases', windowMs: 60_000, max: 30 };

export async function GET(req: NextRequest) {
    const denied = requireShortMakerKey(req);
    if (denied) return denied;
    const limited = checkRateLimit(req, RATE_LIMIT);
    if (limited) return limited;

    const parsed = SearchParamsSchema.safeParse(paramsObject(req.nextUrl.searchParams));
    if (!parsed.success) return badRequest(formatIssues(parsed.error));

    try {
        const cases = await searchCases(getReadClient(), parsed.data);
        const body: SearchResponse = { api_version: API_VERSION, query: { ...parsed.data }, cases };
        return json(body);
    } catch (err) {
        return upstreamError('research/cases', err);
    }
}
