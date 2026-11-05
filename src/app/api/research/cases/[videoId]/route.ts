/**
 * GET /api/research/cases/{videoId}?include=journey,encounters,transcript — one case in full,
 * for Short Maker (read-only). The transcript is the line-level captions with start/end
 * seconds, so Short Maker can verify quotes and clip in/out points word for word.
 */
import { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { requireShortMakerKey } from '@/lib/research/shortmaker/auth';
import { buildCaseDetail, fetchCaseRows } from '@/lib/research/shortmaker/build-case';
import { badRequest, getReadClient, json, upstreamError } from '@/lib/research/shortmaker/http';
import { CaseParamsSchema, formatIssues, paramsObject, VIDEO_ID_RE } from '@/lib/research/shortmaker/params';
import { API_VERSION, type CaseResponse } from '@/lib/research/shortmaker/types';

export const dynamic = 'force-dynamic';

const RATE_LIMIT = { name: 'shortmaker-case', windowMs: 60_000, max: 60 };

export async function GET(req: NextRequest, { params }: { params: Promise<{ videoId: string }> }) {
    const denied = requireShortMakerKey(req);
    if (denied) return denied;
    const limited = checkRateLimit(req, RATE_LIMIT);
    if (limited) return limited;

    const { videoId } = await params;
    if (!VIDEO_ID_RE.test(videoId)) return badRequest('videoId must be an 11-character YouTube ID');
    const parsed = CaseParamsSchema.safeParse(paramsObject(req.nextUrl.searchParams));
    if (!parsed.success) return badRequest(formatIssues(parsed.error));

    const opts = {
        journey: parsed.data.include.includes('journey'),
        encounters: parsed.data.include.includes('encounters'),
        transcript: parsed.data.include.includes('transcript'),
    };

    try {
        const rows = (await fetchCaseRows(getReadClient(), [videoId], opts)).get(videoId);
        const notFound =
            !rows || rows.channel?.hidden || !rows.vid.isNde || !['clear_nde', 'possible_nde'].includes(rows.vid.isNde);
        if (notFound) return json({ error: 'Not found' }, 404);
        const body: CaseResponse = { api_version: API_VERSION, case: buildCaseDetail(rows, opts) };
        return json(body);
    } catch (err) {
        return upstreamError('research/cases/[videoId]', err);
    }
}
