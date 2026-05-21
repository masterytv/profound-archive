"use client";

// NewsletterModal — inline email capture for the "Newsletter" nav button.
// Domain-aware: shows NDE or UAP-specific copy and subscribes to the correct list.

import { useState } from "react";
import { X, Mail, Check, Loader2 } from "lucide-react";

export type NewsletterDomain = "nde" | "uap";

interface Props {
  onClose: () => void;
  domain?: NewsletterDomain;
}

const DOMAIN_CONFIG: Record<NewsletterDomain, {
  title: string;
  description: string;
  successMessage: string;
  archetype: string;
  crossDomain: { label: string; archetype: string; description: string } | null;
}> = {
  nde: {
    title: "NDE Newsletter",
    description: "Occasional updates on research, new features, and insights from 5,000+ near-death experience accounts.",
    successMessage: "We'll send you occasional updates on Project Profound — research, new features, and insights from the NDE archive.",
    archetype: "newsletter_nde",
    crossDomain: {
      label: "Also subscribe to UAP Intelligence",
      archetype: "newsletter_uap",
      description: "Receive updates on UAP encounter research, government disclosures, and contact reports.",
    },
  },
  uap: {
    title: "UFO/UAP Intelligence Newsletter",
    description: "Updates on UAP encounter research, high-credibility sightings, government programs, and contact reports from our growing archive.",
    successMessage: "You'll receive updates on new UAP analysis, high-credibility sightings, and research insights.",
    archetype: "newsletter_uap",
    crossDomain: {
      label: "Also subscribe to NDE Research",
      archetype: "newsletter_nde",
      description: "Receive updates on near-death experience research, new features, and archive insights.",
    },
  },
};

export function NewsletterModal({ onClose, domain = "nde" }: Props) {
  const config = DOMAIN_CONFIG[domain];
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crossOptIn, setCrossOptIn] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Subscribe to primary list
      const res = await fetch("/api/quiz-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, archetype: config.archetype, frequency: "weekly" }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Subscribe failed");
      }

      // Subscribe to cross-domain list if opted in
      if (crossOptIn && config.crossDomain) {
        await fetch("/api/quiz-lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, archetype: config.crossDomain.archetype, frequency: "weekly" }),
        }).catch(() => {}); // Non-fatal — primary subscription succeeded
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
                {config.successMessage}
              </p>
              {crossOptIn && config.crossDomain && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  ✓ Also subscribed to {config.crossDomain.label.replace("Also subscribe to ", "")}
                </p>
              )}
              <button
                onClick={onClose}
                className="w-full py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-sm font-medium hover:opacity-90 transition"
              >
                Close
              </button>
            </>
          ) : (
            <>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
                domain === "uap"
                  ? "bg-teal-50 dark:bg-teal-500/20"
                  : "bg-blue-50 dark:bg-blue-500/20"
              }`}>
                <Mail className={`w-6 h-6 ${
                  domain === "uap"
                    ? "text-teal-600 dark:text-teal-300"
                    : "text-blue-600 dark:text-blue-300"
                }`} />
              </div>
              <h2
                className="text-2xl font-bold text-slate-900 dark:text-slate-100"
                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
              >
                {config.title}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {config.description}
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

                {/* Cross-subscribe checkbox */}
                {config.crossDomain && (
                  <label className="flex items-start gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={crossOptIn}
                      onChange={e => setCrossOptIn(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-white/20 text-blue-600 focus:ring-blue-500/40"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400 leading-snug group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                      {config.crossDomain.label}
                      <span className="block text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {config.crossDomain.description}
                      </span>
                    </span>
                  </label>
                )}

                {error && <p className="text-xs text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition flex items-center justify-center gap-2 ${
                    domain === "uap"
                      ? "bg-teal-600 hover:bg-teal-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
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
