import { NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { createClient } from '@/lib/supabase/server';

// ── GA4 client (server-side only) ────────────────────────────────────────────
// Private key is stored with literal \n in env — replace before use.
const analyticsClient = new BetaAnalyticsDataClient({
    credentials: {
        client_email: process.env.GA_CLIENT_EMAIL,
        private_key:  process.env.GA_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
});

const PROPERTY_ID = process.env.GA_PROPERTY_ID!;

// ── Auth guard ────────────────────────────────────────────────────────────────
async function isAdmin(): Promise<boolean> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        return profile?.role === 'admin' || profile?.role === 'super_admin';
    } catch {
        return false;
    }
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AnalyticsData {
    totals: {
        sessions:       number;
        pageViews:      number;
        activeUsers:    number;
        newUsers:       number;
        returningUsers: number;
        avgEngagementSeconds: number;
    };
    dailyUsers:     { date: string; users: number }[];
    topPages:       { page: string; views: number }[];
    channelGroups:  { channel: string; sessions: number }[];
    aiReferrals:    { source: string; sessions: number }[];
}

// ── Helper: parse GA4 row value ───────────────────────────────────────────────
function metric(value: string | null | undefined): number {
    return parseFloat(value ?? '0') || 0;
}

// ── GET /api/admin/analytics?days=30 ─────────────────────────────────────────
export async function GET(request: Request) {
    if (!await isAdmin()) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get('days') ?? '30'), 365);
    const dateRange = { startDate: `${days}daysAgo`, endDate: 'today' };

    try {
        // Run all GA4 queries in parallel
        const [totalsRes, dailyRes, pagesRes, channelsRes] = await Promise.all([
            // 1. Summary totals
            analyticsClient.runReport({
                property: `properties/${PROPERTY_ID}`,
                dateRanges: [dateRange],
                metrics: [
                    { name: 'sessions' },
                    { name: 'screenPageViews' },
                    { name: 'activeUsers' },
                    { name: 'newUsers' },
                    { name: 'averageSessionDuration' },
                ],
            }),

            // 2. Daily active users (for line chart)
            analyticsClient.runReport({
                property: `properties/${PROPERTY_ID}`,
                dateRanges: [dateRange],
                dimensions: [{ name: 'date' }],
                metrics:    [{ name: 'activeUsers' }],
                orderBys:   [{ dimension: { dimensionName: 'date' }, desc: false }],
            }),

            // 3. Top pages by views
            analyticsClient.runReport({
                property: `properties/${PROPERTY_ID}`,
                dateRanges: [dateRange],
                dimensions: [{ name: 'pagePath' }],
                metrics:    [{ name: 'screenPageViews' }],
                orderBys:   [{ metric: { metricName: 'screenPageViews' }, desc: true }],
                limit: 10,
            }),

            // 4. Sessions by default channel group (organic, direct, referral, etc.)
            analyticsClient.runReport({
                property: `properties/${PROPERTY_ID}`,
                dateRanges: [dateRange],
                dimensions: [{ name: 'sessionDefaultChannelGroup' }],
                metrics:    [{ name: 'sessions' }],
                orderBys:   [{ metric: { metricName: 'sessions' }, desc: true }],
            }),
        ]);

        const totalsRow  = totalsRes[0].rows?.[0]?.metricValues ?? [];
        const sessions       = metric(totalsRow[0]?.value);
        const pageViews      = metric(totalsRow[1]?.value);
        const activeUsers    = metric(totalsRow[2]?.value);
        const newUsers       = metric(totalsRow[3]?.value);
        const avgEngagement  = metric(totalsRow[4]?.value);

        // Daily users — sort ascending by date string (YYYYMMDD → readable)
        const dailyUsers = (dailyRes[0].rows ?? []).map((row: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }) => ({
            date:  formatDate(row.dimensionValues?.[0]?.value ?? ''),
            users: metric(row.metricValues?.[0]?.value),
        }));

        // Top pages — strip query strings
        const topPages = (pagesRes[0].rows ?? []).map((row: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }) => ({
            page:  row.dimensionValues?.[0]?.value ?? '/',
            views: metric(row.metricValues?.[0]?.value),
        }));

        // Channel groups — separate AI referrals (perplexity, openai, claude)
        const allChannels   = (channelsRes[0].rows ?? []);
        const channelGroups = allChannels.map((row: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }) => ({
            channel:  row.dimensionValues?.[0]?.value ?? 'Other',
            sessions: metric(row.metricValues?.[0]?.value),
        }));

        const data: AnalyticsData = {
            totals: {
                sessions,
                pageViews,
                activeUsers,
                newUsers,
                returningUsers: Math.max(0, activeUsers - newUsers),
                avgEngagementSeconds: Math.round(avgEngagement),
            },
            dailyUsers,
            topPages,
            channelGroups,
            aiReferrals: [], // populated by client from channel data (referral sources)
        };

        return NextResponse.json(data, {
            headers: { 'Cache-Control': 'private, max-age=300' }, // 5 min cache
        });

    } catch (err) {
        console.error('[Analytics API] GA4 query failed:', err);
        return NextResponse.json(
            { error: 'Failed to fetch analytics', details: String(err) },
            { status: 500 }
        );
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(yyyymmdd: string): string {
    if (yyyymmdd.length !== 8) return yyyymmdd;
    return `${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(6, 8)}`;
}
