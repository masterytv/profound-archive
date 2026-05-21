"use client"

import { useState, useEffect } from "react"
import Script from "next/script"
import { getStoredConsent, type CookiePreferences } from "@/components/cookie-consent"

/* ─────────────────────────────────────────────────────────────────────────────
 * ConsentGatedScripts
 *
 * Listens for cookie consent and conditionally loads:
 * - Google Analytics 4 (analytics consent)
 * - ConvertKit (marketing consent)
 *
 * Scripts are NOT loaded until explicit user consent is given.
 * This is a GDPR hard requirement — "prior blocking".
 * ───────────────────────────────────────────────────────────────────────────── */

const GA_MEASUREMENT_ID = "G-FLY0JWVM4X"
const CONVERTKIT_ID = "893453eeff"

export default function ConsentGatedScripts() {
  const [consent, setConsent] = useState<CookiePreferences | null>(null)

  useEffect(() => {
    // Check on mount
    setConsent(getStoredConsent())

    // Listen for consent changes (from CookieConsent component)
    function handleUpdate(e: Event) {
      const detail = (e as CustomEvent).detail as CookiePreferences
      setConsent(detail)
    }
    window.addEventListener("cookie-consent-update", handleUpdate)
    return () => window.removeEventListener("cookie-consent-update", handleUpdate)
  }, [])

  return (
    <>
      {/* ── Google Analytics 4 ── only if analytics consent given */}
      {consent?.analytics && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              send_page_view: true,
              anonymize_ip: true
            });
          `}</Script>
        </>
      )}

      {/* ── ConvertKit ── only if marketing consent given */}
      {consent?.marketing && (
        <Script
          strategy="lazyOnload"
          data-uid={CONVERTKIT_ID}
          src={`https://project-profound.kit.com/${CONVERTKIT_ID}/index.js`}
        />
      )}
    </>
  )
}
