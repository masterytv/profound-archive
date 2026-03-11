"use client";

// NewsletterModal — inline email capture for the "Newsletter" nav button.
// Subscribes the user to archetype: 'newsletter' in quiz_leads.

import { useState } from "react";
import { X, Mail, Check, Loader2 } from "lucide-react";

interface Props {
  onClose: () => void;
}

export function NewsletterModal({ onClose }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, archetype: "newsletter", frequency: "weekly" }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Subscribe failed");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl p-8 text-center space-y-5">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {done ? (
            <>
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/20 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-emerald-600" />
              </div>
              <h2
                className="text-2xl font-bold text-slate-900 dark:text-slate-100"
                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
              >
                You&apos;re in.
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                We&apos;ll send you occasional updates on Project Profound — research, new features, and insights from the archive.
              </p>
              <button
                onClick={onClose}
                className="w-full py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-sm font-medium hover:opacity-90 transition"
              >
                Close
              </button>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6 text-blue-600 dark:text-blue-300" />
              </div>
              <h2
                className="text-2xl font-bold text-slate-900 dark:text-slate-100"
                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
              >
                Project Profound Newsletter
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Occasional updates on research, new features, and insights from 5,000+ NDE accounts.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3 text-left">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm dark:[color-scheme:dark]"
                />
                {error && <p className="text-xs text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? "Subscribing…" : "Subscribe →"}
                </button>
              </form>

              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                No spam. Unsubscribe any time from any email we send.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
