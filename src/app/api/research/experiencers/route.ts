/**
 * GET /api/research/experiencers?page=1&limit=100 — published experiencer profiles by total views
 * (the order of projectprofound.org/experiencer), each with their videos, for Short Maker's
 * Experiencers page (read-only).
 */
import { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { requireShortMakerKey } from '@/lib/research/shortmaker/auth';
import { listExperiencers } from '@/lib/research/shortmaker/experiencers';
import { badRequest, getReadClient, json, upstreamError } from '@/lib/research/shortmaker/http';
import { ExperiencersParamsSchema, formatIssues, paramsObject } from '@/lib/research/shortmaker/params';

export const dynamic = 'force-dynamic';

const RATE_LIMIT = { name: 'shortmaker-experiencers', windowMs: 60_000, max: 30 };

export async function GET(req: NextRequest) {
    const denied = requireShortMakerKey(req);
    if (denied) return denied;
    const limited = checkRateLimit(req, RATE_LIMIT);
    if (limited) return limited;

    const parsed = ExperiencersParamsSchema.safeParse(paramsObject(req.nextUrl.searchParams));
    if (!parsed.success) return badRequest(formatIssues(parsed.error));

    try {
        return json(await listExperiencers(getReadClient(), parsed.data));
    } catch (err) {
        return upstreamError('research/experiencers', err);
    }
}
