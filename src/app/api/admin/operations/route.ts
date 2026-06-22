/**
 * Admin API: Operations & Cost Control.
 *
 * GET  — process/service registry joined with live spend + quota usage from
 *        api_usage_log, the budget status, and the current pause-switch state.
 * POST — toggle a pause switch ({ key, paused, note }).
 *
 * Both are gated by isAdminUser(). Reads/writes use the service-role client
 * (api_usage_log and service_switches are RLS-locked to service role).
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminUser, getCurrentAdminEmail } from '@/lib/auth/admin-guard';
import { getBudgetStatus } from '@/lib/ai/budget';
import { getAllSwitches, setSwitch, type SwitchKey } from '@/lib/ops/switches';
import { PROCESS_REGISTRY, maskKey } from '@/lib/ops/registry';

export const dynamic = 'force-dynamic';

interface UsageRow {
    created_at: string;
    provider: string;
    operation: string;
    cost_usd: number | string;
    quantity: number | string | null;
    status: string;
}

export interface ServiceView {
    provider: string;
    label: string;
    keyHint: string | null;       // masked tail, e.g. "…_6d4k1"; null if unset
    costModel: string;
    unit?: string;
    quotaLimit?: number;
    quotaPeriod?: string;
    usedThisPeriod: number;        // quantity consumed in the quota window
    quotaPct: number | null;       // null when no limit declared
    costMonth: number;             // estimated USD this calendar month
    flatMonthlyUsd?: number;
    pricingNote?: string;
}

export interface ProcessView {
    key: string;
    label: string;
    description: string;
    switchKey: SwitchKey | null;
    paused: boolean;
    schedule: string;
    costToday: number;
    costMonth: number;
    services: ServiceView[];
}

export interface OperationsSummary {
    tableReady: boolean;
    generatedAt: string;
    totalCostMonth: number;        // metered (token + quota) this month
    flatMonthlyTotal: number;      // fixed infra estimate
    grandTotalMonth: number;       // metered + flat
    costToday: number;
    budget: Awaited<ReturnType<typeof getBudgetStatus>>;
    processes: ProcessView[];
    switches: { key: string; paused: boolean; label: string | null; note: string | null; updated_at: string | null; updated_by: string | null }[];
}

function startOfUtcDay(): number {
    const n = new Date();
    return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
}
function startOfUtcMonth(): number {
    const n = new Date();
    return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1);
}

export async function GET() {
    if (!(await isAdminUser())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!,
    );

    const budget = await getBudgetStatus();
    const switchRows = await getAllSwitches();
    const switchMap = new Map(switchRows.map((s) => [s.key, s]));

    // One read covers the whole month; day totals are derived in JS.
    const monthStartIso = new Date(startOfUtcMonth()).toISOString();
    const dayStart = startOfUtcDay();

    const { data, error } = await supabase
        .from('api_usage_log')
        .select('created_at, provider, operation, cost_usd, quantity, status')
        .gte('created_at', monthStartIso);

    const rows = (error ? [] : (data ?? [])) as UsageRow[];
    const tableReady = !error;

    // Pre-aggregate by provider and by operation for the month + today.
    const provMonthQty = new Map<string, number>();
    const provDayQty = new Map<string, number>();
    const provMonthCost = new Map<string, number>();
    const opMonthCost = new Map<string, number>();
    const opDayCost = new Map<string, number>();

    for (const r of rows) {
        const t = Date.parse(r.created_at);
        const cost = Number(r.cost_usd) || 0;
        const qty = Number(r.quantity) || 0;
        provMonthQty.set(r.provider, (provMonthQty.get(r.provider) ?? 0) + qty);
        provMonthCost.set(r.provider, (provMonthCost.get(r.provider) ?? 0) + cost);
        opMonthCost.set(r.operation, (opMonthCost.get(r.operation) ?? 0) + cost);
        if (t >= dayStart) {
            provDayQty.set(r.provider, (provDayQty.get(r.provider) ?? 0) + qty);
            opDayCost.set(r.operation, (opDayCost.get(r.operation) ?? 0) + cost);
        }
    }

    const sumByPrefix = (m: Map<string, number>, prefixes: string[]): number => {
        let total = 0;
        for (const [op, v] of m) {
            if (prefixes.some((p) => op.startsWith(p))) total += v;
        }
        return total;
    };

    let flatMonthlyTotal = 0;
    const processes: ProcessView[] = PROCESS_REGISTRY.map((proc) => {
        const services: ServiceView[] = proc.services.map((svc) => {
            const usedThisPeriod = svc.quotaPeriod === 'day'
                ? (provDayQty.get(svc.provider) ?? 0)
                : (provMonthQty.get(svc.provider) ?? 0);
            const quotaPct = svc.quotaLimit ? Math.min(100, Math.round((usedThisPeriod / svc.quotaLimit) * 100)) : null;
            if (svc.flatMonthlyUsd) flatMonthlyTotal += svc.flatMonthlyUsd;
            return {
                provider: svc.provider,
                label: svc.label,
                keyHint: maskKey(svc.envVar),
                costModel: svc.costModel,
                unit: svc.unit,
                quotaLimit: svc.quotaLimit,
                quotaPeriod: svc.quotaPeriod,
                usedThisPeriod,
                quotaPct,
                costMonth: round(provMonthCost.get(svc.provider) ?? 0),
                flatMonthlyUsd: svc.flatMonthlyUsd,
                pricingNote: svc.pricingNote,
            };
        });
        return {
            key: proc.key,
            label: proc.label,
            description: proc.description,
            switchKey: proc.switchKey,
            paused: proc.switchKey ? Boolean(switchMap.get(proc.switchKey)?.paused) : false,
            schedule: proc.schedule,
            costToday: round(sumByPrefix(opDayCost, proc.operationPrefixes)),
            costMonth: round(sumByPrefix(opMonthCost, proc.operationPrefixes)),
            services,
        };
    });

    const totalCostMonth = round([...provMonthCost.values()].reduce((a, b) => a + b, 0));
    const costToday = round([...opDayCost.values()].reduce((a, b) => a + b, 0));

    const summary: OperationsSummary = {
        tableReady,
        generatedAt: new Date().toISOString(),
        totalCostMonth,
        flatMonthlyTotal: round(flatMonthlyTotal),
        grandTotalMonth: round(totalCostMonth + flatMonthlyTotal),
        costToday,
        budget,
        processes,
        switches: switchRows,
    };
    return NextResponse.json(summary);
}

export async function POST(req: Request) {
    if (!(await isAdminUser())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json().catch(() => null) as { key?: SwitchKey; paused?: boolean; note?: string } | null;
    if (!body?.key || typeof body.paused !== 'boolean') {
        return NextResponse.json({ error: 'Expected { key, paused, note? }' }, { status: 400 });
    }
    const email = (await getCurrentAdminEmail()) ?? 'admin';
    const result = await setSwitch(body.key, body.paused, email, body.note ?? null);
    if (!result.ok) {
        return NextResponse.json({ error: result.error ?? 'Toggle failed' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
}

function round(n: number): number {
    return Math.round(n * 100) / 100;
}
