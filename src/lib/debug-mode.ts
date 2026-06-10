/**
 * Debug auth bypass (IMPROVEMENT_PLAN S-4).
 *
 * IS_DEBUG_MODE lets local development hit batch/intake routes without a
 * credential. It must NEVER open anything in production: the bypass requires
 * BOTH a non-production build AND the env var explicitly set to the string
 * 'true' — a stray IS_DEBUG_MODE="false" (or any other value) in prod config
 * no longer disables auth.
 */
export function isDebugBypass(): boolean {
    return process.env.NODE_ENV !== 'production' && process.env.IS_DEBUG_MODE === 'true';
}
