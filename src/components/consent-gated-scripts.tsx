"use client"

import { useEffect } from "react"
import Script from "next/script"
import {
  CONSENT_KEY,
  CONSENT_VERSION,
  type CookiePreferences,
} from "@/components/cookie-consent"
import { CONSENT_REQUIRED_REGIONS } from "@/lib/consent/regions"

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
 * The ConvertKit (Kit) script that used to load here under "marketing"
 * consent was removed on 2026-11-18: the newsletter stays on Resend
 * (marketing plan, Tom), so no marketing script loads at all.
 * ───────────────────────────────────────────────────────────────────────────── */

const GA_MEASUREMENT_ID = "G-FLY0JWVM4X"

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export default function ConsentGatedScripts() {
  useEffect(() => {
    // Listen for consent changes (from CookieConsent component)
    function handleUpdate(e: Event) {
      const detail = (e as CustomEvent).detail as CookiePreferences
      // Forward the choice to Consent Mode immediately — this flips GA between
      // full measurement (cookies) and anonymous cookieless pings.
      window.gtag?.("consent", "update", {
        analytics_storage: detail.analytics ? "granted" : "denied",
      })
    }
    window.addEventListener("cookie-consent-update", handleUpdate)
    return () => window.removeEventListener("cookie-consent-update", handleUpdate)
  }, [])

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

    </>
  )
}
