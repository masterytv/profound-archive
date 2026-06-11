/**
 * Admin API: API usage + cost summary for the cost dashboard.
 * Reads api_usage_log (service role) behind isAdminUser().
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminUser } from '@/lib/auth/admin-guard';
import { getBudgetStatus } from '@/lib/ai/budget';

export const dynamic = 'force-dynamic';

interface Row {
    created_date: string;
    provider: string;
    operation: string;
    model: string | null;
    cost_usd: number | string;
    total_tokens: number | null;
    status: string;
}

export interface UsageSummary {
    tableReady: boolean;
    rangeDays: number;
    totalCost: number;
    totalCalls: number;
    byDay: { day: string; cost: number; calls: number }[];
    byOperation: { operation: string; cost: number; calls: number }[];
    byProvider: { provider: string; cost: number; calls: number }[];
    byModel: { model: string; cost: number; calls: number }[];
    errorCalls: number;
    budget: Awaited<ReturnType<typeof getBudgetStatus>>;
}

export async function GET(req: Request) {
    if (!(await isAdminUser())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const rangeDays = Math.min(Math.max(parseInt(url.searchParams.get('days') ?? '30', 10), 1), 365);
    const since = new Date(Date.now() - rangeDays * 86400_000).toISOString();

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
    );

    const budget = await getBudgetStatus();

    const { data, error } = await supabase
        .from('api_usage_log')
        .select('created_date, provider, operation, model, cost_usd, total_tokens, status')
        .gte('created_at', since);

    // Table not present yet (pre-migration) → return an empty, well-formed summary.
    if (error) {
        const empty: UsageSummary = {
            tableReady: false, rangeDays, totalCost: 0, totalCalls: 0,
            byDay: [], byOperation: [], byProvider: [], byModel: [], errorCalls: 0, budget,
        };
        return NextResponse.json(empty);
    }

    const rows = (data ?? []) as Row[];
    const sumBy = (key: keyof Row) => {
        const m = new Map<string, { cost: number; calls: number }>();
        for (const r of rows) {
            const k = String(r[key] ?? 'unknown');
            const e = m.get(k) ?? { cost: 0, calls: 0 };
            e.cost += Number(r.cost_usd);
            e.calls += 1;
            m.set(k, e);
        }
        return [...m.entries()].map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.cost - a.cost);
    };

    const byDay = sumBy('created_date')
        .map((d) => ({ day: d.key, cost: round(d.cost), calls: d.calls }))
        .sort((a, b) => a.day.localeCompare(b.day));

    const summary: UsageSummary = {
        tableReady: true,
        rangeDays,
        totalCost: round(rows.reduce((a, r) => a + Number(r.cost_usd), 0)),
        totalCalls: rows.length,
        byDay,
        byOperation: sumBy('operation').map((d) => ({ operation: d.key, cost: round(d.cost), calls: d.calls })),
        byProvider: sumBy('provider').map((d) => ({ provider: d.key, cost: round(d.cost), calls: d.calls })),
        byModel: sumBy('model').map((d) => ({ model: d.key, cost: round(d.cost), calls: d.calls })),
        errorCalls: rows.filter((r) => r.status === 'error').length,
        budget,
    };
    return NextResponse.json(summary);
}

function round(n: number): number {
    return Math.round(n * 100) / 100;
}
