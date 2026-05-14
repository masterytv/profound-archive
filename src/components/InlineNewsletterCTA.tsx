"use client";

// InlineNewsletterCTA — a compact, inline email capture for embedding in pages.
// Domain-aware: adapts copy and colors for NDE or UAP context.

import { useState } from "react";
import { Mail, Check, Loader2 } from "lucide-react";
import type { NewsletterDomain } from "@/components/NewsletterModal";

interface Props {
  domain?: NewsletterDomain;
  className?: string;
}

const DOMAIN_CONFIG: Record<NewsletterDomain, {
  heading: string;
  description: string;
  archetype: string;
  accent: string;
  accentBg: string;
  buttonBg: string;
}> = {
  nde: {
    heading: "Stay Connected",
    description: "Get occasional updates on NDE research, new features, and insights from the archive.",
    archetype: "newsletter_nde",
    accent: "text-blue-400",
    accentBg: "bg-blue-500/10 border-blue-500/20",
    buttonBg: "bg-blue-600 hover:bg-blue-700",
  },
  uap: {
    heading: "UAP Intelligence Updates",
    description: "Get notified about new analysis, high-credibility encounters, government disclosures, and research insights.",
    archetype: "newsletter_uap",
    accent: "text-teal-400",
    accentBg: "bg-teal-500/10 border-teal-500/20",
    buttonBg: "bg-teal-600 hover:bg-teal-700",
  },
};

export function InlineNewsletterCTA({ domain = "nde", className = "" }: Props) {
  const config = DOMAIN_CONFIG[domain];
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
        body: JSON.stringify({ email, archetype: config.archetype, frequency: "weekly" }),
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

  if (done) {
    return (
      <div className={`rounded-2xl border p-8 text-center ${config.accentBg} ${className}`}>
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
          <Check className="w-5 h-5 text-emerald-400" />
        </div>
        <p className="text-sm font-medium text-foreground">You&apos;re subscribed!</p>
        <p className="text-xs text-muted-foreground mt-1">Check your inbox for a welcome email.</p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-8 ${config.accentBg} ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Mail className={`w-4 h-4 ${config.accent}`} />
        <h3 className="text-sm font-semibold text-foreground">{config.heading}</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        {config.description}
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="flex-1 min-w-[180px] px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-sm dark:[color-scheme:dark]"
        />
        <button
          type="submit"
          disabled={loading}
          className={`px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition flex items-center gap-1.5 ${config.buttonBg}`}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          {loading ? "…" : "Subscribe"}
        </button>
      </form>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      <p className="text-[11px] text-muted-foreground mt-3">
        No spam, ever. Unsubscribe any time.
      </p>
    </div>
  );
}
