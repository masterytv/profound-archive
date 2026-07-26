export interface GeoInfo {
  country: string
  requiresConsent: boolean
}

let cached: Promise<GeoInfo> | null = null

/**
 * Fetch the visitor's consent region once per page load; the promise is
 * shared by every consumer (consent banner + script gating) so the network
 * request happens at most once. On failure the cache resets so a later call
 * can retry.
 *
 * Callers must treat a rejected promise as "consent required" — the safe
 * default when we can't tell where the visitor is.
 */
export function fetchGeo(): Promise<GeoInfo> {
  if (!cached) {
    cached = fetch('/api/geo')
      .then((res) => {
        if (!res.ok) throw new Error(`geo lookup failed: ${res.status}`)
        return res.json() as Promise<GeoInfo>
      })
      .catch((err) => {
        cached = null
        throw err
      })
  }
  return cached
}
