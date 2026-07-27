import { NextResponse } from 'next/server'
import { CONSENT_REQUIRED_REGIONS } from '@/lib/consent/regions'

/**
 * Returns the visitor's country and whether their region requires prior
 * consent for analytics identifiers (EEA + UK).
 *
 * The country comes from Cloudflare's CF-IPCountry edge header — the site is
 * proxied through Cloudflare in production, so no IP geolocation happens in
 * our code and no IP address is stored anywhere.
 *
 * Only the consent BANNER depends on this endpoint. The consent *state* for
 * GA is enforced independently by Google Consent Mode's regional defaults
 * (see consent-gated-scripts.tsx), so a failure here can never cause
 * unlawful measurement — at worst an unnecessary banner is shown.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const country =
    request.headers.get('cf-ipcountry') ?? // Cloudflare (production path)
    request.headers.get('x-vercel-ip-country') ?? // other CDNs, just in case
    ''

  // Unknown (""), unclassified ("XX"), or Tor ("T1") → err on the side of
  // asking. Local dev has no edge headers, so the banner shows there too —
  // handy for testing it.
  const requiresConsent =
    country === '' ||
    country === 'XX' ||
    country === 'T1' ||
    (CONSENT_REQUIRED_REGIONS as readonly string[]).includes(country)

  return NextResponse.json({ country, requiresConsent })
}
