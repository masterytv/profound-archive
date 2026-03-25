"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { usePathname } from "next/navigation"
import { X, MessageSquarePlus, Send, CheckCircle2 } from "lucide-react"

// ── Constants ─────────────────────────────────────────────────────────────────

const LS_KEY = "pp_welcome_seen"
const LS_FEEDBACK_COOLDOWN = "pp_feedback_last"
const FEEDBACK_COOLDOWN_HOURS = 1
const MORPH_DURATION_MS = 650
const THANKYOU_DURATION_MS = 3000

// Paths where the welcome modal should never appear
const EXCLUDED_PREFIXES = ["/admin", "/api", "/experience"]

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase =
  | "welcome"     // Full modal visible
  | "morphing"    // Animating modal → button
  | "button"      // Persistent feedback pill
  | "form"        // Feedback form open
  | "submitting"  // Form being sent
  | "thankyou"    // Thank you message
  | "hidden"      // Nothing shown (already seen, on excluded path, etc.)

// ── Component ─────────────────────────────────────────────────────────────────

export default function WelcomeFeedback() {
  const pathname = usePathname()
  const [phase, setPhase] = useState<Phase>("hidden")
  const [feedback, setFeedback] = useState("")
  const [btnReady, setBtnReady] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sessionIdRef = useRef(
    typeof crypto !== "undefined" ? crypto.randomUUID() : ""
  )

  // ── Mount: decide whether to show the welcome modal ─────────────────────
  useEffect(() => {
    // Never show on excluded paths
    if (EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) {
      setPhase("hidden")
      return
    }

    try {
      const seen = localStorage.getItem(LS_KEY)
      if (seen) {
        // Already welcomed — go straight to the persistent button
        setPhase("button")
        setBtnReady(true)
      } else {
        // First visit — show the welcome modal
        setPhase("welcome")
      }
    } catch {
      // localStorage blocked — show button directly (safe fallback)
      setPhase("button")
      setBtnReady(true)
    }
  }, [pathname])

  // ── Focus textarea when form opens ──────────────────────────────────────
  useEffect(() => {
    if (phase === "form") {
      setTimeout(() => textareaRef.current?.focus(), 150)
    }
  }, [phase])

  // ── Dismiss the welcome modal (triggers morph animation) ────────────────
  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(LS_KEY, String(Date.now()))
    } catch {}

    setPhase("morphing")

    // After morph animation completes, reveal the button
    setTimeout(() => {
      setPhase("button")
      // Short delay before showing button entrance animation
      requestAnimationFrame(() => setBtnReady(true))
    }, MORPH_DURATION_MS)
  }, [])

  // ── Open / close the feedback form ──────────────────────────────────────
  const handleOpenForm = useCallback(() => {
    // Check cooldown
    try {
      const last = localStorage.getItem(LS_FEEDBACK_COOLDOWN)
      if (last) {
        const elapsed = Date.now() - parseInt(last, 10)
        if (elapsed < FEEDBACK_COOLDOWN_HOURS * 60 * 60 * 1000) {
          // Still in cooldown — show thank you instead
          setPhase("thankyou")
          setTimeout(() => setPhase("button"), THANKYOU_DURATION_MS)
          return
        }
      }
    } catch {}

    setPhase("form")
    setFeedback("")
  }, [])

  const handleCloseForm = useCallback(() => {
    setPhase("button")
    setFeedback("")
  }, [])

  // ── Submit feedback ─────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!feedback.trim()) return

    setPhase("submitting")

    try {
      // POST the score (we use score=0 as a sentinel for open-ended feedback)
      await fetch("/api/ces-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: 0,
          path: pathname,
          session_id: sessionIdRef.current,
          source: "welcome_button",
        }),
      })

      // PATCH the reason text
      await fetch("/api/ces-feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          reason: feedback.trim().slice(0, 500),
        }),
      })

      // Mark cooldown
      try {
        localStorage.setItem(LS_FEEDBACK_COOLDOWN, String(Date.now()))
      } catch {}

      // Generate a new session ID for the next submission
      sessionIdRef.current = crypto.randomUUID()
    } catch (err) {
      console.error("[WelcomeFeedback] Submit error:", err)
    }

    setPhase("thankyou")
    setFeedback("")
    setTimeout(() => setPhase("button"), THANKYOU_DURATION_MS)
  }, [feedback, pathname])

  // ── Render nothing on excluded paths or hidden ──────────────────────────
  if (phase === "hidden") return null

  return (
    <>
      {/* ── Welcome Modal ──────────────────────────────────────────────── */}
      {phase === "welcome" && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Welcome to Project Profound"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-welcome-backdrop"
            onClick={handleDismiss}
          />

          {/* Modal card */}
          <div
            className="
              relative z-10 w-[90vw] max-w-md
              bg-card border border-border rounded-2xl shadow-2xl
              p-8 text-center
              animate-welcome-modal
            "
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* Decorative sparkle */}
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <MessageSquarePlus className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>

            <h2
              className="text-2xl font-bold text-foreground mb-3"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              Welcome to{" "}
              <span className="text-blue-600" style={{ fontStyle: "italic" }}>
                Project Profound
              </span>
            </h2>

            <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-xs mx-auto">
              We&apos;re new and your feedback is very important to us. You can
              click the{" "}
              <span className="font-semibold text-foreground">
                Feedback button
              </span>{" "}
              at any time to share your thoughts.
            </p>

            <button
              onClick={handleDismiss}
              className="
                inline-flex items-center gap-2 px-6 py-2.5
                rounded-full bg-blue-600 text-white text-sm font-semibold
                hover:bg-blue-700 transition-colors
                shadow-lg shadow-blue-600/20
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2
                cursor-pointer
              "
            >
              Got it — let me explore
              <X className="w-4 h-4 opacity-70" />
            </button>
          </div>
        </div>
      )}

      {/* ── Morphing state (modal shrinking away) ──────────────────────── */}
      {phase === "morphing" && (
        <div className="fixed inset-0 z-[10000] pointer-events-none">
          {/* Fading backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            style={{ animation: "welcome-backdrop-in 0.6s ease-out reverse forwards" }}
          />
          {/* Morphing card */}
          <div
            className="
              w-[90vw] max-w-md
              bg-blue-600 rounded-2xl shadow-2xl
              animate-welcome-morph
            "
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              // CSS custom properties tell the keyframes where the button lives
              "--btn-x": "calc(100vw - 3rem)",
              "--btn-y": "calc(100vh - 6.5rem)",
            } as React.CSSProperties}
          />
        </div>
      )}

      {/* ── Persistent Feedback Button ─────────────────────────────────── */}
      {(phase === "button" || phase === "form" || phase === "submitting" || phase === "thankyou") && (
        <>
          {/* The pill button — visible when form is closed */}
          {phase === "button" && (
            <button
              onClick={handleOpenForm}
              className={`
                fixed bottom-20 right-6 z-[9997]
                inline-flex items-center gap-2
                px-4 py-2.5 rounded-full
                bg-blue-600 text-white text-sm font-semibold
                shadow-lg shadow-blue-600/25
                hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30
                transition-all duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2
                cursor-pointer
                ${btnReady ? "animate-welcome-btn-entrance animate-welcome-btn-pulse" : "opacity-0"}
              `}
              aria-label="Give feedback"
            >
              <MessageSquarePlus className="w-4 h-4" />
              Feedback
            </button>
          )}

          {/* ── Feedback Form Panel ──────────────────────────────────────── */}
          {(phase === "form" || phase === "submitting") && (
            <div
              className="
                fixed bottom-20 right-6 z-[9997]
                w-80 max-w-[calc(100vw-2rem)]
                bg-card border border-border rounded-2xl shadow-2xl
                overflow-hidden
                animate-ces-slide-up
              "
              role="dialog"
              aria-modal="true"
              aria-label="Feedback form"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-snug">
                      Share your feedback
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      What&apos;s working? What isn&apos;t? Ideas?
                    </p>
                  </div>
                  <button
                    onClick={handleCloseForm}
                    className="
                      flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center
                      text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700
                      transition-colors cursor-pointer
                    "
                    aria-label="Close feedback form"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <textarea
                  ref={textareaRef}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder="Tell us what you think…"
                  disabled={phase === "submitting"}
                  className="
                    w-full resize-none rounded-xl border border-border bg-background
                    px-3 py-2.5 text-sm text-foreground
                    placeholder:text-muted-foreground
                    focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900
                    disabled:opacity-50
                    transition-all
                  "
                />

                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-muted-foreground">
                    {feedback.length}/500
                  </span>
                  <button
                    onClick={handleSubmit}
                    disabled={phase === "submitting" || !feedback.trim()}
                    className="
                      inline-flex items-center gap-1.5
                      text-xs font-semibold px-4 py-1.5 rounded-full
                      bg-blue-600 text-white hover:bg-blue-700
                      disabled:opacity-40 disabled:cursor-not-allowed
                      transition-all duration-150
                      cursor-pointer
                    "
                  >
                    <Send className="w-3 h-3" />
                    {phase === "submitting" ? "Sending…" : "Send"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Thank You ────────────────────────────────────────────────── */}
          {phase === "thankyou" && (
            <div
              className="
                fixed bottom-20 right-6 z-[9997]
                inline-flex items-center gap-2.5
                px-5 py-3 rounded-full
                bg-card border border-border shadow-xl
                animate-ces-slide-up
              "
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <p className="text-sm font-medium text-foreground">
                Thank you for your feedback!
              </p>
            </div>
          )}
        </>
      )}
    </>
  )
}
