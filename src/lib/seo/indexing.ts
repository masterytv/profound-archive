/**
 * Search-engine indexing control.
 *
 * NOINDEX_SITE is set to "true" only in apphosting.staging.yaml so the
 * staging site is never indexed. Production (apphosting.yaml) does not set
 * it. Consumed by src/app/robots.ts, src/app/layout.tsx, and (as an inline
 * env check, since next.config can't import from src/) next.config.ts.
 */
export function shouldNoindex(): boolean {
    return process.env.NOINDEX_SITE === 'true';
}
