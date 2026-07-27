"use client"

import { useState, useEffect } from "react"
import Script from "next/script"
import {
  getStoredConsent,
  CONSENT_KEY,
  CONSENT_VERSION,
  type CookiePreferences,
} from "@/components/cookie-consent"
import { CONSENT_REQUIRED_REGIONS } from "@/lib/consent/regions"
import { fetchGeo } from "@/lib/consent/geo"

/* ─────────────────────────────────────────────────────────────────────────────
 * ConsentGatedScripts — Google Consent Mode v2 with geo-scoped defaults.
 *
 * WHY this replaced global prior-blocking (2026-07): prior blocking withheld
 * GA from ~80% of visitors who never legally needed a consent wall (US/CA/AU),
 * leaving human readership massively undercounted. GDPR requires consent for
 * storing IDENTIFIERS on a device — not for counting a visit.
 *
 * How it works now:
 * - gtag.js loads for EVERYONE. What varies is the CONSENT STATE, not whether
 *   the script runs.
 * - Outside EEA/UK: analytics_storage granted by default → full measurement.
 *   Opt-out stays available via the footer "Cookie Settings" link, and a
 *   Global Privacy Control signal is honored as an opt-out.
 * - Inside EEA/UK (Google matches the region itself — no IP handling here):
 *   denied until the banner is accepted. Until then GA sends only anonymous,
 *   cookieless pings (no ID stored on the device) and models the gap.
 * - A previously saved banner choice is applied synchronously from
 *   localStorage BEFORE the first hit fires — no React timing races.
 *
 * ConvertKit (marketing) is not gtag-managed, so it uses /api/geo directly:
 * explicit consent wins; otherwise it defaults on only outside the
 * consent-required regions, and never against a GPC signal.
 * ───────────────────────────────────────────────────────────────────────────── */

const GA_MEASUREMENT_ID = "G-FLY0JWVM4X"
const CONVERTKIT_ID = "893453eeff"

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

/** Global Privacy Control — a browser-level opt-out signal we honor. */
function hasGpcSignal(): boolean {
  if (typeof navigator === "undefined") return false
  return (
    (navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl === true
  )
}

export default function ConsentGatedScripts() {
  const [consent, setConsent] = useState<CookiePreferences | null>(null)
  const [requiresConsent, setRequiresConsent] = useState<boolean | null>(null)

  useEffect(() => {
    // Check on mount
    setConsent(getStoredConsent())

    // Where is this visitor? Only ConvertKit gating depends on this — GA's
    // regional behavior is enforced by Consent Mode itself.
    fetchGeo()
      .then((geo) => setRequiresConsent(geo.requiresConsent))
      .catch(() => setRequiresConsent(true)) // unknown → safest assumption

    // Listen for consent changes (from CookieConsent component)
    function handleUpdate(e: Event) {
      const detail = (e as CustomEvent).detail as CookiePreferences
      setConsent(detail)
      // Forward the choice to Consent Mode immediately — this flips GA between
      // full measurement (cookies) and anonymous cookieless pings.
      window.gtag?.("consent", "update", {
        analytics_storage: detail.analytics ? "granted" : "denied",
      })
    }
    window.addEventListener("cookie-consent-update", handleUpdate)
    return () => window.removeEventListener("cookie-consent-update", handleUpdate)
  }, [])

  // ConvertKit: explicit choice wins; no choice → default on only outside
  // consent-required regions, and never against a GPC opt-out.
  const loadConvertKit =
    consent !== null
      ? consent.marketing
      : requiresConsent === false && !hasGpcSignal()

  return (
    <>
      {/* ── Google Analytics 4 ── always loads, under Consent Mode v2 */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-consent-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        window.gtag = gtag;

        // Global default: measurement on (everywhere NOT matched below).
        gtag('consent', 'default', {
          analytics_storage: 'granted',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied'
        });

        // EEA + UK: prior consent required — denied until the banner says
        // otherwise. Google matches the visitor's region itself.
        gtag('consent', 'default', {
          analytics_storage: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          wait_for_update: 500,
          region: ${JSON.stringify([...CONSENT_REQUIRED_REGIONS])}
        });

        // Apply a previously saved banner choice (or a GPC opt-out) BEFORE
        // the first hit, synchronously from localStorage.
        try {
          var raw = localStorage.getItem('${CONSENT_KEY}');
          if (raw) {
            var saved = JSON.parse(raw);
            if (saved && saved.version === ${CONSENT_VERSION}) {
              gtag('consent', 'update', {
                analytics_storage: saved.analytics ? 'granted' : 'denied'
              });
            }
          } else if (navigator.globalPrivacyControl === true) {
            gtag('consent', 'update', { analytics_storage: 'denied' });
          }
        } catch (e) { /* corrupt storage — regional defaults apply */ }

        gtag('js', new Date());
        gtag('config', '${GA_MEASUREMENT_ID}', {
          send_page_view: true,
          anonymize_ip: true
        });
      `}</Script>

      {/* ── ConvertKit ── consent, or default-on outside EEA/UK */}
      {loadConvertKit && (
        <Script
          strategy="lazyOnload"
          data-uid={CONVERTKIT_ID}
          src={`https://project-profound.kit.com/${CONVERTKIT_ID}/index.js`}
        />
      )}
    </>
  )
}
