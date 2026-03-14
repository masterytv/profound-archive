import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GA4 Analytics API — zero-dependency version.
 *
 * Replaces @google-analytics/data SDK (not installed) with direct
 * GA4 Data API v1 REST calls authenticated via a short-lived JWT.
 * Same response shape as before — all callers unaffected.
 */

const PROPERTY_ID = process.env.GA_PROPERTY_ID!;
const GA_API_BASE = `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}`;

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
        sessions:             number;
        pageViews:            number;
        activeUsers:          number;
        newUsers:             number;
        returningUsers:       number;
        avgEngagementSeconds: number;
    };
    dailyUsers:    { date: string; users: number }[];
    topPages:      { page: string; views: number }[];
    channelGroups: { channel: string; sessions: number }[];
    aiReferrals:   { source: string; sessions: number }[];
}

// ── JWT helpers (Service Account auth without any SDK) ────────────────────────

function base64url(input: ArrayBuffer): string {
    return Buffer.from(input).toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getAccessToken(): Promise<string> {
    const email      = process.env.GA_CLIENT_EMAIL!;
    const rawKey     = process.env.GA_PRIVATE_KEY?.replace(/\\n/g, '\n') ?? '';
    const scope      = 'https://www.googleapis.com/auth/analytics.readonly';
    const now        = Math.floor(Date.now() / 1000);

    // Build JWT header + claim
    const header  = base64url(Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
    const payload = base64url(Buffer.from(JSON.stringify({
        iss: email, scope, aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600, iat: now,
    })));
    const message = `${header}.${payload}`;

    // Import the RSA private key
    const pemBody = rawKey
        .replace('-----BEGIN PRIVATE KEY-----', '')
        .replace('-----END PRIVATE KEY-----', '')
        .replace(/\s+/g, '');
    const keyBytes  = Buffer.from(pemBody, 'base64');
    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8', keyBytes,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false, ['sign']
    );

    // Sign
    const sig = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        Buffer.from(message)
    );
    const jwt = `${message}.${base64url(sig)}`;

    // Exchange JWT for access token
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion:  jwt,
        }),
    });
    if (!res.ok) throw new Error(`OAuth token error ${res.status}: ${await res.text()}`);
    const { access_token } = await res.json() as { access_token: string };
    return access_token;
}

// ── GA4 REST helper ───────────────────────────────────────────────────────────

async function runReport(token: string, body: object): Promise<{ rows?: GARow[] }> {
    const res = await fetch(`${GA_API_BASE}:runReport`, {
        method:  'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type':  'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`GA4 API error ${res.status}: ${await res.text()}`);
    return res.json() as Promise<{ rows?: GARow[] }>;
}

interface GARow {
    dimensionValues?: { value?: string }[];
    metricValues?:    { value?: string }[];
}

function metric(value: string | null | undefined): number {
    return parseFloat(value ?? '0') || 0;
}

// ── GET /api/admin/analytics?days=30 ─────────────────────────────────────────
export async function GET(request: Request) {
    if (!await isAdmin()) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days      = Math.min(parseInt(searchParams.get('days') ?? '30'), 365);
    const dateRange = { startDate: `${days}daysAgo`, endDate: 'today' };

    try {
        const token = await getAccessToken();

        const [totalsRes, dailyRes, pagesRes, channelsRes] = await Promise.all([
            // 1. Summary totals
            runReport(token, {
                dateRanges: [dateRange],
                metrics: [
                    { name: 'sessions' },
                    { name: 'screenPageViews' },
                    { name: 'activeUsers' },
                    { name: 'newUsers' },
                    { name: 'averageSessionDuration' },
                ],
            }),

            // 2. Daily active users
            runReport(token, {
                dateRanges: [dateRange],
                dimensions: [{ name: 'date' }],
                metrics:    [{ name: 'activeUsers' }],
                orderBys:   [{ dimension: { dimensionName: 'date' }, desc: false }],
            }),

            // 3. Top pages by views
            runReport(token, {
                dateRanges: [dateRange],
                dimensions: [{ name: 'pagePath' }],
                metrics:    [{ name: 'screenPageViews' }],
                orderBys:   [{ metric: { metricName: 'screenPageViews' }, desc: true }],
                limit: 10,
            }),

            // 4. Sessions by channel group
            runReport(token, {
                dateRanges: [dateRange],
                dimensions: [{ name: 'sessionDefaultChannelGroup' }],
                metrics:    [{ name: 'sessions' }],
                orderBys:   [{ metric: { metricName: 'sessions' }, desc: true }],
            }),
        ]);

        const totalsRow      = totalsRes.rows?.[0]?.metricValues ?? [];
        const sessions       = metric(totalsRow[0]?.value);
        const pageViews      = metric(totalsRow[1]?.value);
        const activeUsers    = metric(totalsRow[2]?.value);
        const newUsers       = metric(totalsRow[3]?.value);
        const avgEngagement  = metric(totalsRow[4]?.value);

        const dailyUsers = (dailyRes.rows ?? []).map((row) => ({
            date:  formatDate(row.dimensionValues?.[0]?.value ?? ''),
            users: metric(row.metricValues?.[0]?.value),
        }));

        const topPages = (pagesRes.rows ?? []).map((row) => ({
            page:  row.dimensionValues?.[0]?.value ?? '/',
            views: metric(row.metricValues?.[0]?.value),
        }));

        const channelGroups = (channelsRes.rows ?? []).map((row) => ({
            channel:  row.dimensionValues?.[0]?.value ?? 'Other',
            sessions: metric(row.metricValues?.[0]?.value),
        }));

        const data: AnalyticsData = {
            totals: {
                sessions,
                pageViews,
                activeUsers,
                newUsers,
                returningUsers:       Math.max(0, activeUsers - newUsers),
                avgEngagementSeconds: Math.round(avgEngagement),
            },
            dailyUsers,
            topPages,
            channelGroups,
            aiReferrals: [],
        };

        return NextResponse.json(data, {
            headers: { 'Cache-Control': 'private, max-age=300' },
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
