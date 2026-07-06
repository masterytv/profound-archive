/**
 * Pause kill-switches (admin cost control).
 *
 * A DB-backed on/off switch per process group, read by every paid background
 * job. Because the state lives in Postgres (service_switches), a pause is
 * honored no matter who triggers the work — the Oracle crontab, pg_cron, or a
 * manual admin "run now" all see the same value.
 *
 * Caching: switch state is read constantly inside tick loops, so we keep a
 * short in-memory TTL cache (a few seconds) plus a "last known good" fallback.
 *
 * FAIL-OPEN: if the table can't be read (missing pre-migration, transient DB
 * error) and we have no cached value, the work is ALLOWED. The switch reduces
 * spend; it must never become a single point of failure that wedges every
 * pipeline shut. A toggle the admin actually sets is cached and honored even
 * across a later read error.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Process groups that can be paused. `master` pauses all of them at once. */
export type SwitchKey =
    | 'master'
    | 'video_ingestion'
    | 'video_analysis'
    | 'blog_generation'
    | 'image_generation'
    | 'email'
    | 'uap_tier2_intake';

export interface SwitchRow {
    key: SwitchKey;
    paused: boolean;
    label: string | null;
    note: string | null;
    updated_at: string | null;
    updated_by: string | null;
}

const CACHE_TTL_MS = 5_000;
let cacheAt = 0;
let cacheVal: Record<string, SwitchRow> | null = null; // last known good

let client: SupabaseClient | null = null;
function serviceClient(): SupabaseClient | null {
    if (client) return client;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    client = createClient(url, key);
    return client;
}

/** Read all switch rows (cached). Returns last-known-good on read failure. */
async function loadSwitches(force = false): Promise<Record<string, SwitchRow> | null> {
    const now = Date.now();
    if (!force && cacheVal && now - cacheAt < CACHE_TTL_MS) return cacheVal;

    const supabase = serviceClient();
    if (!supabase) return cacheVal; // no creds → keep whatever we had (likely null → fail open)

    try {
        const { data, error } = await supabase
            .from('service_switches')
            .select('key, paused, label, note, updated_at, updated_by');
        if (error) return cacheVal; // table missing / transient → last known good
        const map: Record<string, SwitchRow> = {};
        for (const r of (data ?? []) as SwitchRow[]) map[r.key] = r;
        cacheVal = map;
        cacheAt = now;
        return map;
    } catch {
        return cacheVal;
    }
}

/**
 * Is this process group currently paused? True if its own switch is paused OR
 * the master switch is on. Fails open (returns false) when state is unknown.
 */
export async function isPaused(key: Exclude<SwitchKey, 'master'>): Promise<boolean> {
    const map = await loadSwitches();
    if (!map) return false; // unknown → allow
    return Boolean(map.master?.paused) || Boolean(map[key]?.paused);
}

/** Full switch state for the admin dashboard (forces a fresh read). */
export async function getAllSwitches(): Promise<SwitchRow[]> {
    const map = await loadSwitches(true);
    return map ? Object.values(map) : [];
}

/**
 * Toggle a switch (admin only — caller must have verified isAdminUser first).
 * Uses the service-role client to write past RLS. Busts the cache so the next
 * pipeline read sees the new value immediately.
 */
export async function setSwitch(
    key: SwitchKey,
    paused: boolean,
    updatedBy: string,
    note?: string | null,
): Promise<{ ok: boolean; error?: string }> {
    const supabase = serviceClient();
    if (!supabase) return { ok: false, error: 'No service-role credentials configured.' };
    const { error } = await supabase
        .from('service_switches')
        .update({ paused, updated_by: updatedBy, note: note ?? null, updated_at: new Date().toISOString() })
        .eq('key', key);
    if (error) return { ok: false, error: error.message };
    cacheAt = 0; // bust cache
    return { ok: true };
}
