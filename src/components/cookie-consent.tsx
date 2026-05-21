"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Shield, ChevronDown, X } from "lucide-react"

/* ─────────────────────────────────────────────────────────────────────────────
 * CookieConsent — GDPR/ePrivacy-compliant cookie consent banner.
 *
 * Requirements met:
 * 1. Prior blocking: Non-essential cookies don't load until consent given
 * 2. Equal prominence: Accept & Reject buttons same size/styling
 * 3. Granular control: Per-category toggles (Analytics, Marketing)
 * 4. No pre-ticked boxes: Defaults to OFF
 * 5. Easy withdrawal: "Cookie Settings" in footer reopens banner
 * 6. Consent logging: Stores timestamp + choices in localStorage
 *
 * This component emits a CustomEvent "cookie-consent-update" that the
 * root layout listens for to conditionally load GA4 and ConvertKit.
 * ───────────────────────────────────────────────────────────────────────────── */

export interface CookiePreferences {
  necessary: true // Always on, cannot be toggled
  analytics: boolean
  marketing: boolean
  consentedAt: string // ISO timestamp
  version: number // Bump when cookie policy changes to re-prompt
}

const CONSENT_KEY = "pp-cookie-consent"
const CONSENT_VERSION = 1

/** Read stored preferences (or null if not yet set) */
export function getStoredConsent(): CookiePreferences | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CookiePreferences
    // Re-prompt if consent version changed (e.g., new cookie category added)
    if (parsed.version !== CONSENT_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

/** Persist preferences and dispatch event for layout to react */
function saveConsent(prefs: CookiePreferences) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(prefs))
  window.dispatchEvent(new CustomEvent("cookie-consent-update", { detail: prefs }))
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    // Show banner only if no valid consent exists
    const stored = getStoredConsent()
    if (!stored) {
      // Small delay so the page renders first — feels less jarring
      const timer = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  // Listen for manual re-open (e.g., from footer "Cookie Settings" link)
  useEffect(() => {
    function handleReopen() {
      const stored = getStoredConsent()
      if (stored) {
        setAnalytics(stored.analytics)
        setMarketing(stored.marketing)
      }
      setShowDetails(true)
      setVisible(true)
    }
    window.addEventListener("open-cookie-settings", handleReopen)
    return () => window.removeEventListener("open-cookie-settings", handleReopen)
  }, [])

  const handleAcceptAll = useCallback(() => {
    const prefs: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      consentedAt: new Date().toISOString(),
      version: CONSENT_VERSION,
    }
    saveConsent(prefs)
    setVisible(false)
  }, [])

  const handleRejectAll = useCallback(() => {
    const prefs: CookiePreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      consentedAt: new Date().toISOString(),
      version: CONSENT_VERSION,
    }
    saveConsent(prefs)
    setVisible(false)
  }, [])

  const handleSaveSelection = useCallback(() => {
    const prefs: CookiePreferences = {
      necessary: true,
      analytics,
      marketing,
      consentedAt: new Date().toISOString(),
      version: CONSENT_VERSION,
    }
    saveConsent(prefs)
    setVisible(false)
  }, [analytics, marketing])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-end"
      role="dialog"
      aria-label="Cookie consent"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Banner */}
      <div className="relative w-full max-w-3xl mx-4 mb-4 sm:mb-6 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-6 pb-2">
          <div className="flex-shrink-0 mt-0.5 p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              This website uses cookies
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              We use cookies to analyze site usage and improve your experience.
              Necessary cookies are always active for core functionality (authentication, preferences).
              You can choose which optional cookies to allow below.{" "}
              <Link
                href="/privacy"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>

        {/* Category toggles (expandable) */}
        <div className="px-6 pb-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1.5 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showDetails ? "rotate-180" : ""}`}
            />
            {showDetails ? "Hide details" : "Show cookie categories"}
          </button>

          {showDetails && (
            <div className="space-y-3 pb-3 animate-in fade-in duration-200">
              {/* Necessary — always on */}
              <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      Necessary
                    </span>
                    <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 rounded">
                      Always active
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Authentication, theme preferences, and essential site functionality.
                    These cannot be disabled.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-11 h-6 bg-green-500 rounded-full relative cursor-not-allowed opacity-60">
                    <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow" />
                  </div>
                </div>
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    Analytics
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Google Analytics — helps us understand how visitors use the site so we can
                    improve content and navigation. No personal data is shared.
                  </p>
                </div>
                <button
                  onClick={() => setAnalytics(!analytics)}
                  className={`flex-shrink-0 w-11 h-6 rounded-full relative transition-colors ${
                    analytics ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-600"
                  }`}
                  role="switch"
                  aria-checked={analytics}
                  aria-label="Toggle analytics cookies"
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      analytics ? "translate-x-[22px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Marketing */}
              <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    Marketing
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Newsletter subscription forms and related tools. Used to show relevant
                    sign-up prompts. No advertising cookies.
                  </p>
                </div>
                <button
                  onClick={() => setMarketing(!marketing)}
                  className={`flex-shrink-0 w-11 h-6 rounded-full relative transition-colors ${
                    marketing ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-600"
                  }`}
                  role="switch"
                  aria-checked={marketing}
                  aria-label="Toggle marketing cookies"
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      marketing ? "translate-x-[22px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons — EQUAL PROMINENCE (GDPR requirement) */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 px-6 pb-6">
          <button
            onClick={handleRejectAll}
            className="flex-1 px-5 py-2.5 rounded-lg text-sm font-semibold border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            Reject all
          </button>
          {showDetails && (
            <button
              onClick={handleSaveSelection}
              className="flex-1 px-5 py-2.5 rounded-lg text-sm font-semibold border-2 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all"
            >
              Save selection
            </button>
          )}
          <button
            onClick={handleAcceptAll}
            className="flex-1 px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  )
}
