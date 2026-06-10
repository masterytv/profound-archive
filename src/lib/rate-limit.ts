import { NextRequest, NextResponse } from 'next/server';

// ── Shared in-memory rate limiter (IMPROVEMENT_PLAN S-1/S-3/S-11) ───────────
// Generalized from the original limiter in api/questions/custom/route.ts.
// In-memory is sufficient while App Hosting runs a single instance; counters
// reset on cold start and are per-instance under autoscaling, so anything
// that must bound spend globally needs the shared-store limit (S-13) instead.

type Bucket = { count: number; resetAt: number };

export interface RateLimitOptions {
    /** Unique name per route so independent endpoints don't share counters. */
    name: string;
    windowMs: number;
    /** Max requests allowed per key within the window. */
    max: number;
}

const stores = new Map<string, Map<string, Bucket>>();

// Sweep expired buckets lazily (no timers — they leak in tests and are
// unreliable on serverless instances that may be frozen between requests).
const SWEEP_THRESHOLD = 5_000;

function sweep(store: Map<string, Bucket>, now: number) {
    for (const [key, bucket] of store) {
        if (now > bucket.resetAt) store.delete(key);
    }
}

export function isRateLimited({ name, windowMs, max }: RateLimitOptions, key: string): boolean {
    let store = stores.get(name);
    if (!store) {
        store = new Map();
        stores.set(name, store);
    }

    const now = Date.now();
    if (store.size > SWEEP_THRESHOLD) sweep(store, now);

    const bucket = store.get(key);
    if (!bucket || now > bucket.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return false;
    }

    bucket.count++;
    return bucket.count > max;
}

/** Works with both NextRequest.headers and next/headers' ReadonlyHeaders (server actions). */
export function getClientIpFromHeaders(headers: { get(name: string): string | null }): string {
    return (
        headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        headers.get('x-real-ip') ||
        'unknown'
    );
}

export function getClientIp(req: NextRequest): string {
    return getClientIpFromHeaders(req.headers);
}

/** Generic 429 response shared by all limiter checks. */
export function rateLimitResponse(windowMs: number): NextResponse {
    return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(windowMs / 1000)) } }
    );
}

/**
 * Convenience guard for route handlers: returns a generic 429 response when
 * the caller's IP is over the limit, or null to let the request proceed.
 */
export function checkRateLimit(req: NextRequest, options: RateLimitOptions): NextResponse | null {
    if (!isRateLimited(options, getClientIp(req))) return null;
    return rateLimitResponse(options.windowMs);
}

/** Test-only: clear counters so test files are order-independent. */
export function resetRateLimit(name?: string) {
    if (name) stores.delete(name);
    else stores.clear();
}
