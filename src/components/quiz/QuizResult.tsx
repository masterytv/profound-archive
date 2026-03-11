"use client";

import { useState } from "react";
import Link from "next/link";
import { type Archetype, type Frequency } from "@/lib/quiz/archetypes";
import { Check, AlertCircle } from "lucide-react";

interface QuizResultProps {
  archetype: Archetype;
  onRestart: () => void;
}

const FREQUENCIES: { id: Frequency; label: string; sub: string }[] = [
  { id: "daily",   label: "Daily",           sub: "For the deeply immersed" },
  { id: "3day",    label: "Every 3 days",    sub: "A steady rhythm" },
  { id: "weekly",  label: "Weekly",          sub: "Thoughtful pace" },
  { id: "monthly", label: "Monthly",         sub: "Occasional wonder" },
];

export function QuizResult({ archetype, onRestart }: QuizResultProps) {
  const [email, setEmail]         = useState("");
  const [freq, setFreq]           = useState<Frequency>("weekly");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, archetype: archetype.id, frequency: freq }),
      });
      if (!res.ok) throw new Error("Something went wrong");
      setSubmitted(true);
    } catch {
      setError("Couldn't save your email — please try again.");
    } finally {
      setLoading(false);
    }
  }

  const accentMap: Record<string, string> = {
    blue:   "border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/40",
    purple: "border-purple-200 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/40",
    amber:  "border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/40",
    emerald:"border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40",
    sky:    "border-sky-200 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/40",
    rose:   "border-rose-200 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/40",
  };
  const badgeMap: Record<string, string> = {
    blue:   "text-blue-700 dark:text-blue-300",
    purple: "text-purple-700 dark:text-purple-300",
    amber:  "text-amber-700 dark:text-amber-300",
    emerald:"text-emerald-700 dark:text-emerald-300",
    sky:    "text-sky-700 dark:text-sky-300",
    rose:   "text-rose-700 dark:text-rose-300",
  };
  const accent = accentMap[archetype.color] ?? accentMap.blue;
  const badge  = badgeMap[archetype.color]  ?? badgeMap.blue;

  return (
    <div className="w-full max-w-2xl animate-quiz-slide space-y-6">

      {/* ─── Archetype reveal card ─── */}
      <div className={`rounded-2xl border px-7 py-8 ${accent}`}>
        {/* Icon + archetype label */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-4xl">{archetype.icon}</span>
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-0.5">
              You are
            </p>
            <h2
              className={`text-2xl font-bold ${badge}`}
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              {archetype.label}
            </h2>
          </div>
        </div>

        {/* Tagline */}
        <p
          className="text-xl text-foreground italic mb-4 leading-snug"
          style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
        >
          &ldquo;{archetype.tagline}&rdquo;
        </p>

        {/* Description */}
        <p className="text-[15px] text-muted-foreground leading-relaxed">
          {archetype.description}
        </p>

        {/* Crisis note */}
        {archetype.crisisNote && (
          <div className="mt-5 flex gap-2.5 rounded-xl bg-amber-100/70 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 px-4 py-3">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-300 leading-snug">
              {archetype.crisisNote}
            </p>
          </div>
        )}


      </div>

      {/* ─── "See all types" link ─── */}
      <div className="text-center">
        <Link
          href="/quiz/types"
          className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
        >
          See all 7 NDE types →
        </Link>
      </div>

      {/* ─── Email / subscription pitch ─── */}
      <div className="rounded-2xl border border-border bg-card px-7 py-7">
        <h3
          className="text-xl font-semibold text-foreground mb-1"
          style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
        >
          Get your full profile
        </h3>
        <p className="text-sm text-muted-foreground mb-5">
          A deeper look at {archetype.label} — plus one NDE video matched to you,
          delivered at a pace you choose. No noise. No newsletter. One story.
        </p>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Frequency selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFreq(f.id)}
                  className={`
                    rounded-xl border px-3 py-2.5 text-left transition-all
                    ${freq === f.id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-border hover:bg-muted/50"}
                  `}
                >
                  <p className="text-[13px] font-semibold">{f.label}</p>
                  <p className="text-[11px] mt-0.5 opacity-70">{f.sub}</p>
                </button>
              ))}
            </div>

            {/* Email input + submit */}
            <div className="flex gap-2 flex-col sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="
                  flex-1 rounded-xl border border-border bg-background px-4 py-3
                  text-[15px] text-foreground placeholder:text-muted-foreground
                  focus:outline-none focus:ring-2 focus:ring-primary
                  dark:[color-scheme:dark]
                "
              />
              <button
                type="submit"
                disabled={loading}
                className="
                  rounded-xl bg-primary text-white font-medium px-5 py-3
                  hover:opacity-90 active:scale-[0.98]
                  disabled:opacity-60 transition-all whitespace-nowrap
                "
              >
                {loading ? "Saving…" : "Send me stories →"}
              </button>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </form>
        ) : (
          <div className="flex items-center gap-3 py-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-[15px] font-medium text-foreground">You&apos;re in.</p>
              <p className="text-sm text-muted-foreground">
                Your first story is on its way — check your inbox.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Restart ─── */}
      <div className="text-center pb-8">
        <button
          onClick={onRestart}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ↩ Retake the quiz
        </button>
      </div>
    </div>
  );
}
