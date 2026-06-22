/**
 * Route-level pause gate (admin cost control).
 *
 * Thin helper for the secret-gated automation routes (scanner / cron / email).
 * Call at the top of a handler: if the process group is paused, it returns a
 * ready-made 200 "skipped" response; otherwise null and the handler proceeds.
 *
 * 200 (not 4xx/5xx) on purpose — a pause is a deliberate, healthy state, not an
 * error. The Oracle crontab and pg_cron callers see success and move on without
 * retry storms or alert noise.
 */
import { NextResponse } from 'next/server';
import { isPaused, type SwitchKey } from './switches';

/**
 * @returns a "paused" NextResponse if the group is paused, else null.
 */
export async function pauseGate(key: Exclude<SwitchKey, 'master'>): Promise<NextResponse | null> {
    if (await isPaused(key)) {
        return NextResponse.json(
            { skipped: true, paused: key, message: `Process group "${key}" is paused via admin cost control.` },
            { status: 200 },
        );
    }
    return null;
}
