"use client"

import { useState, useCallback } from "react"
import { ThumbsUp, ThumbsDown, Send, CheckCircle2 } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = "idle" | "comment" | "submitting" | "done"

interface MicroFeedbackProps {
  /** Feature being rated, e.g. 'video_analysis', 'search_results' */
  feature: string
  /** Context identifier, e.g. videoId, search query, blog slug */
  contextId: string
  /** Custom prompt text */
  prompt?: string
  /** Compact mode for embedding inside cards */
  compact?: boolean
}

// ── localStorage dedup ────────────────────────────────────────────────────────

function storageKey(feature: string, contextId: string): string {
  return `pp_mf_${feature}_${contextId}`
}

function alreadyRated(feature: string, contextId: string): boolean {
  try {
    return localStorage.getItem(storageKey(feature, contextId)) !== null
  } catch {
    return false
  }
}

function markRated(feature: string, contextId: string): void {
  try {
    localStorage.setItem(storageKey(feature, contextId), String(Date.now()))
  } catch {}
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MicroFeedback({
  feature,
  contextId,
  prompt = "Was this helpful?",
  compact = false,
}: MicroFeedbackProps) {
  const [phase, setPhase] = useState<Phase>(() =>
    alreadyRated(feature, contextId) ? "done" : "idle"
  )
  const [sentiment, setSentiment] = useState<"up" | "down" | null>(null)
  const [comment, setComment] = useState("")
  const [sessionId] = useState(() =>
    typeof crypto !== "undefined" ? crypto.randomUUID() : ""
  )

  // ── Handle vote ─────────────────────────────────────────────────────────
  const handleVote = useCallback(
    async (vote: "up" | "down") => {
      setSentiment(vote)
      setPhase("comment")

      // Immediately save the vote (score: 7=up, 1=down)
      try {
        await fetch("/api/ces-feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            score: vote === "up" ? 7 : 1,
            path: typeof window !== "undefined" ? window.location.pathname : null,
            session_id: sessionId,
            source: "micro_feedback",
            feature,
            context_id: contextId,
          }),
        })
      } catch (err) {
        console.error("[MicroFeedback] Vote save failed:", err)
      }
    },
    [sessionId, feature, contextId]
  )

  // ── Handle comment submit ───────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (skip = false) => {
      setPhase("submitting")

      try {
        await fetch("/api/ces-feedback", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            reason: skip ? null : comment.trim().slice(0, 500) || null,
          }),
        })
      } catch (err) {
        console.error("[MicroFeedback] Comment save failed:", err)
      }

      markRated(feature, contextId)
      setPhase("done")
    },
    [sessionId, comment, feature, contextId]
  )

  // ── Already rated — show quiet thank you ────────────────────────────────
  if (phase === "done") {
    return (
      <div className={`flex items-center gap-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 ${
        compact ? "py-2 px-3" : "py-3 px-4 max-w-md"
      }`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
        <p className={`text-emerald-700 dark:text-emerald-400 ${compact ? "text-xs" : "text-sm"}`}>
          Thanks for your feedback!
        </p>
      </div>
    )
  }

  return (
    <div className={compact ? "" : "max-w-md"}>
      {/* ── Idle: thumbs up / down ──────────────────────────────────────── */}
      {phase === "idle" && (
        <div className={`flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 ${
          compact ? "py-2 px-3" : "py-3 px-4"
        }`}>
          <p className={`flex-1 text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>{prompt}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleVote("up")}
              className={`
                ${compact ? "w-7 h-7" : "w-8 h-8"} rounded-lg flex items-center justify-center
                text-slate-400 dark:text-slate-500
                hover:bg-emerald-50 dark:hover:bg-emerald-900/30
                hover:text-emerald-600 dark:hover:text-emerald-400
                transition-all duration-150
                focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400
                cursor-pointer
              `}
              aria-label="Yes, helpful"
            >
              <ThumbsUp className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
            </button>
            <button
              onClick={() => handleVote("down")}
              className={`
                ${compact ? "w-7 h-7" : "w-8 h-8"} rounded-lg flex items-center justify-center
                text-slate-400 dark:text-slate-500
                hover:bg-red-50 dark:hover:bg-red-900/30
                hover:text-red-500 dark:hover:text-red-400
                transition-all duration-150
                focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400
                cursor-pointer
              `}
              aria-label="No, not helpful"
            >
              <ThumbsDown className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
            </button>
          </div>
        </div>
      )}

      {/* ── Comment follow-up ───────────────────────────────────────────── */}
      {(phase === "comment" || phase === "submitting") && (
        <div className="py-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 animate-ces-slide-up">
          <div className="flex items-center gap-2 mb-2">
            {sentiment === "up" ? (
              <ThumbsUp className="w-4 h-4 text-emerald-500" />
            ) : (
              <ThumbsDown className="w-4 h-4 text-red-500" />
            )}
            <p className="text-sm font-medium text-foreground">
              {sentiment === "up" ? "Glad it helped!" : "Sorry about that."}{" "}
              <span className="text-muted-foreground font-normal">
                Want to tell us more?
              </span>
            </p>
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            rows={2}
            placeholder={
              sentiment === "up"
                ? "What did you find most useful?"
                : "What were you looking for?"
            }
            disabled={phase === "submitting"}
            className="
              w-full resize-none rounded-lg border border-border bg-background
              px-3 py-2 text-sm text-foreground
              placeholder:text-muted-foreground
              focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900
              disabled:opacity-50
              transition-all
            "
          />

          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-muted-foreground">
              {comment.length}/500
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleSubmit(true)}
                disabled={phase === "submitting"}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 disabled:opacity-40 cursor-pointer"
              >
                Skip
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={phase === "submitting" || !comment.trim()}
                className="
                  inline-flex items-center gap-1.5
                  text-xs font-semibold px-3 py-1.5 rounded-full
                  bg-blue-600 text-white hover:bg-blue-700
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all duration-150
                  cursor-pointer
                "
              >
                <Send className="w-3 h-3" />
                {phase === "submitting" ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
