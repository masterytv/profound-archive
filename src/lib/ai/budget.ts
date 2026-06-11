/**
 * Budget guardrail (admin cost protection).
 *
 * A pre-flight check that sums recent estimated spend from api_usage_log and
 * refuses a new expensive operation when over the configured ceiling — so a
 * runaway batch produces a clean, early error instead of a hard provider 403
 * mid-run.
 *
 * FAILS OPEN: if the budget can't be read (table missing pre-migration, DB
 * error), the operation is allowed. The guard reduces risk; it must never be a
 * single point of failure that blocks all generation.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Ceilings (USD). Override via env; defaults are conservative monthly caps.
const MONTHLY_CAP = Number(process.env.AI_BUDGET_MONTHLY_USD ?? 50);
const DAILY_CAP = Number(process.env.AI_BUDGET_DAILY_USD ?? 20);

let cached: SupabaseClient | null = null;
function serviceClient(): SupabaseClient | null {
    if (cached) return cached;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    cached = createClient(url, key);
    return cached;
}

export interface BudgetStatus {
    allowed: boolean;
    daySpend: number;
    monthSpend: number;
    dailyCap: number;
    monthlyCap: number;
    reason?: string;
}

async function sumSince(supabase: SupabaseClient, sinceIso: string): Promise<number | null> {
    const { data, error } = await supabase
        .from('api_usage_log')
        .select('cost_usd')
        .gte('created_at', sinceIso);
    if (error) return null;
    return (data ?? []).reduce((acc, r: { cost_usd: number | string }) => acc + Number(r.cost_usd), 0);
}

/** Returns the current spend status against the caps. Fails open. */
export async function getBudgetStatus(): Promise<BudgetStatus> {
    const base: BudgetStatus = {
        allowed: true,
        daySpend: 0,
        monthSpend: 0,
        dailyCap: DAILY_CAP,
        monthlyCap: MONTHLY_CAP,
    };

    const supabase = serviceClient();
    if (!supabase) return base;

    const now = new Date();
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

    let daySpend: number | null;
    let monthSpend: number | null;
    try {
        [daySpend, monthSpend] = await Promise.all([
            sumSince(supabase, dayStart),
            sumSince(supabase, monthStart),
        ]);
    } catch {
        // Any unexpected failure (e.g. table missing) → fail open.
        return base;
    }

    // Fail open on read error (null) — table missing or transient.
    if (daySpend === null || monthSpend === null) return base;

    if (monthSpend >= MONTHLY_CAP) {
        return { ...base, daySpend, monthSpend, allowed: false, reason: `Monthly AI budget reached ($${monthSpend.toFixed(2)} / $${MONTHLY_CAP})` };
    }
    if (daySpend >= DAILY_CAP) {
        return { ...base, daySpend, monthSpend, allowed: false, reason: `Daily AI budget reached ($${daySpend.toFixed(2)} / $${DAILY_CAP})` };
    }
    return { ...base, daySpend, monthSpend };
}

/**
 * Throw a clean error if over budget. Call at the entry point of an expensive
 * generation operation (before the first paid model call).
 */
export async function assertWithinBudget(operation: string): Promise<void> {
    const status = await getBudgetStatus();
    if (!status.allowed) {
        throw new Error(`Budget guard: ${operation} blocked — ${status.reason}. Raise AI_BUDGET_* env caps or wait for the window to reset.`);
    }
}
