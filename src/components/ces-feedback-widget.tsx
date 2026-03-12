"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { X, CheckCircle2 } from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────────

type Phase = "idle" | "scale" | "followup" | "thankyou"

// ── Constants ─────────────────────────────────────────────────────────────────

const MOBILE_DELAY_MS = 2 * 60 * 1000 // 2 minutes
const THANKYOU_DURATION_MS = 3000
const SUBMIT_COOLDOWN_DAYS = 30
const DISMISS_COOLDOWN_DAYS = 7
const LS_LAST_SHOWN = "ces_last_shown"
const LS_DISMISSED = "ces_dismissed"

// Paths where the widget must never appear (even in test mode)
const EXCLUDED_PREFIXES = ["/admin", "/api"]

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysAgo(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000
}

function isSuppressed(): boolean {
  try {
    const lastShown = localStorage.getItem(LS_LAST_SHOWN)
    if (lastShown && parseInt(lastShown, 10) > daysAgo(SUBMIT_COOLDOWN_DAYS)) return true

    const dismissed = localStorage.getItem(LS_DISMISSED)
    if (dismissed && parseInt(dismissed, 10) > daysAgo(DISMISS_COOLDOWN_DAYS)) return true
  } catch {
    // localStorage blocked (SSR / private mode edge case)
  }
  return false
}

function markShown(): void {
  try {
    localStorage.setItem(LS_LAST_SHOWN, String(Date.now()))
  } catch {}
}

function markDismissed(): void {
  try {
    localStorage.setItem(LS_DISMISSED, String(Date.now()))
  } catch {}
}

// ── Score Button ──────────────────────────────────────────────────────────────

function ScoreButton({
  value,
  selected,
  onClick,
}: {
  value: number
  selected: boolean
  onClick: (v: number) => void
}) {
  return (
    <button
      onClick={() => onClick(value)}
      aria-label={`Score ${value}`}
      className={`
        w-9 h-9 rounded-full text-sm font-semibold
        transition-all duration-150 border focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
        ${selected
          ? "bg-[#2563EB] text-white border-[#2563EB] scale-110 shadow-md"
          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-[#2563EB] hover:text-[#2563EB] dark:hover:text-blue-400"
        }
      `}
    >
      {value}
    </button>
  )
}

// ── Main Widget ───────────────────────────────────────────────────────────────

export default function CesFeedbackWidget() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [phase, setPhase] = useState<Phase>("idle")
  const [score, setScore] = useState<number | null>(null)
  const [reason, setReason] = useState("")
  const [sessionId] = useState(() => crypto.randomUUID())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mobileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Test mode: ?ces_test=1 in URL or env var
  const isTestMode =
    searchParams.get("ces_test") === "1" ||
    process.env.NEXT_PUBLIC_CES_TEST === "true"

  // Never show on excluded paths (even in test mode)
  const isExcluded = EXCLUDED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  )

  // Whether we're on a mobile viewport (hydration-safe)
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // Track suppression in state so it's hydration-safe and the tab
  // is hidden (not just click-blocked) when already submitted/dismissed.
  // Refreshed whenever phase returns to idle (e.g. after thank-you).
  const [suppressed, setSuppressed] = useState(false)
  useEffect(() => {
    setSuppressed(isSuppressed())
  }, [phase])

  // ── Open the widget ───────────────────────────────────────────────────────

  const openWidget = useCallback(() => {
    if (phase !== "idle") return
    setPhase("scale")
    markShown()
  }, [phase])

  // Mobile: auto-open after 2 min
  useEffect(() => {
    if (!isMobile || isExcluded) return
    if (!isTestMode && isSuppressed()) return

    const delay = isTestMode ? 300 : MOBILE_DELAY_MS
    mobileTimerRef.current = setTimeout(openWidget, delay)
    return () => {
      if (mobileTimerRef.current) clearTimeout(mobileTimerRef.current)
    }
  }, [isMobile, isExcluded, isTestMode, openWidget])

  // Focus textarea when reaching followup step
  useEffect(() => {
    if (phase === "followup") {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [phase])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleTabClick = () => {
    if (phase === "idle") {
      openWidget()
    } else {
      // Toggle close
      handleDismiss()
    }
  }

  const handleScoreSelect = async (value: number) => {
    setScore(value)
    setPhase("followup")

    // Immediately save score to DB — data preserved even if they exit early
    try {
      await fetch("/api/ces-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: value,
          path: pathname,
          session_id: sessionId,
        }),
      })
    } catch (err) {
      console.error("[CES] Failed to save score:", err)
    }
  }

  const handleSubmit = async (skipReason = false) => {
    setIsSubmitting(true)
    try {
      await fetch("/api/ces-feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          reason: skipReason ? null : reason.trim() || null,
        }),
      })
    } catch (err) {
      console.error("[CES] Failed to save reason:", err)
    } finally {
      setIsSubmitting(false)
      setPhase("thankyou")
      setTimeout(() => setPhase("idle"), THANKYOU_DURATION_MS)
    }
  }

  const handleDismiss = () => {
    markDismissed()
    setPhase("idle")
    setScore(null)
    setReason("")
  }

  // ── Don't render at all if excluded path
  if (isExcluded) return null

  // ── For desktop/tablet: tab is always visible; panel renders over it
  // ── For mobile: nothing renders until triggered

  // Desktop tab: only visible when not suppressed (or in test mode), not on mobile,
  // and not already open. Hiding rather than just click-blocking avoids ghost-click UX.
  const showTab = !isMobile && (isTestMode || !suppressed)
  const showPanel = phase !== "idle"

  const panelClasses = `
    bg-card border border-border shadow-2xl rounded-2xl overflow-hidden
    transition-all duration-300 ease-out
    ${isMobile
      ? "fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-sm z-[9998]"
      : "fixed bottom-6 left-6 w-80 z-[9998]"
    }
    animate-ces-slide-up
  `

  return (
    <>
      {/* ── Desktop/Tablet: Persistent Feedback Tab ─────────────────────── */}
      {showTab && phase === "idle" && (
        <button
          onClick={handleTabClick}
          className="
            fixed left-0 top-1/2 -translate-y-1/2 z-[9998]
            bg-[#2563EB] text-white text-xs font-semibold tracking-wide
            px-2 py-4 rounded-r-xl
            shadow-lg shadow-blue-600/20
            hover:bg-[#1d4ed8] hover:shadow-xl hover:shadow-blue-600/25
            transition-all duration-200
            flex items-center justify-center
            cursor-pointer
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2
          "
          aria-label="Open feedback form"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          Feedback
        </button>
      )}

      {/* ── Panel (all devices when open) ───────────────────────────────── */}
      {showPanel && (
        <div className={panelClasses} role="dialog" aria-modal="true" aria-label="Feedback survey">

          {/* Test mode badge */}
          {isTestMode && (
            <div className="bg-orange-500 text-white text-[10px] font-bold px-3 py-1 text-center tracking-wider">
              TEST MODE — data is saved to DB
            </div>
          )}

          {/* ── State: Scale ─────────────────────────────────────────────── */}
          {phase === "scale" && (
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <p className="text-sm font-semibold text-foreground leading-snug pr-6">
                  How easy was it to get what you came for today?
                </p>
                <button
                  onClick={handleDismiss}
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center
                             text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700
                             transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 mb-2">
                {[1, 2, 3, 4, 5, 6, 7].map((v) => (
                  <ScoreButton
                    key={v}
                    value={v}
                    selected={score === v}
                    onClick={handleScoreSelect}
                  />
                ))}
              </div>

              <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-0.5">
                <span>Very Difficult</span>
                <span>Very Easy</span>
              </div>
            </div>
          )}

          {/* ── State: Follow-up ─────────────────────────────────────────── */}
          {phase === "followup" && (
            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full
                                 bg-[#2563EB] text-white text-xs font-bold flex-shrink-0">
                  {score}
                </span>
                <p className="text-sm font-semibold text-foreground">
                  What is the primary reason for your score?
                </p>
              </div>
              <p className="text-xs text-muted-foreground mb-3 pl-8">Optional</p>

              <textarea
                ref={textareaRef}
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, 500))}
                rows={3}
                placeholder="Tell us what made it easy or difficult…"
                className="
                  w-full resize-none rounded-xl border border-border bg-background
                  px-3 py-2.5 text-sm text-foreground
                  placeholder:text-muted-foreground
                  focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900
                  transition-all
                "
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">{reason.length}/500</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSubmit(true)}
                    disabled={isSubmitting}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 disabled:opacity-40"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => handleSubmit(false)}
                    disabled={isSubmitting}
                    className="
                      text-xs font-semibold px-4 py-1.5 rounded-full
                      bg-[#2563EB] text-white hover:bg-[#1d4ed8]
                      disabled:opacity-40 disabled:cursor-not-allowed
                      transition-all duration-150
                    "
                  >
                    {isSubmitting ? "Sending…" : "Send"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── State: Thank you ─────────────────────────────────────────── */}
          {phase === "thankyou" && (
            <div className="p-5 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <p className="text-sm font-medium text-foreground">
                Thank you — your feedback helps us improve every day.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  )
}
