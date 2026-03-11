"use client";

// Smart subscription management page.
// Reached via /unsubscribe?token=xxx (from email link) or directly.
// Loads all subscriptions for the email associated with the token,
// lets the user toggle each list on/off, and saves changes.

import { useState, useEffect } from "react";
import Link from "next/link";
import { ARCHETYPES } from "@/lib/quiz/archetypes";
import { Check, Loader2 } from "lucide-react";

interface Sub {
  id: string;
  archetype: string;
  frequency: string;
  is_active: boolean;
  unsubscribe_token: string;
}

const FREQ_LABELS: Record<string, string> = {
  daily: "Daily", "3day": "Every 3 days", weekly: "Weekly", monthly: "Monthly",
};

const ARCHETYPE_META: Record<string, { label: string; icon: string; desc: string }> = {
  ...Object.fromEntries(
    Object.entries(ARCHETYPES).map(([id, a]) => [id, { label: a.label, icon: a.icon, desc: a.tagline }])
  ),
  newsletter: {
    label: "Newsletter",
    icon: "✉️",
    desc: "Occasional updates about Project Profound — research, new features, and insights.",
  },
};

export default function UnsubscribePage({
  searchParams,
}: {
  searchParams: { token?: string; error?: string };
}) {
  const token = searchParams.token;
  const hasError = !!searchParams.error;

  const [subs, setSubs] = useState<Sub[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!token);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notFound, setNotFound] = useState(false);
  // Local active/freq state keyed by archetype
  const [local, setLocal] = useState<Record<string, { active: boolean; frequency: string }>>({});

  useEffect(() => {
    if (!token) return;
    fetch(`/api/email/manage-subs?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setNotFound(true); return; }
        setEmail(d.email);
        setSubs(d.subs);
        const init: typeof local = {};
        d.subs.forEach((s: Sub) => {
          init[s.archetype] = { active: s.is_active, frequency: s.frequency };
        });
        setLocal(init);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    const updates = Object.entries(local).map(([archetype, { active, frequency }]) => ({
      archetype, active, frequency,
    }));
    await fetch("/api/email/manage-subs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, updates }),
    });
    setSaving(false);
    setSaved(true);
  }

  function toggle(archetype: string) {
    setLocal(prev => ({
      ...prev,
      [archetype]: { ...prev[archetype], active: !prev[archetype]?.active },
    }));
    setSaved(false);
  }

  function setFreq(archetype: string, frequency: string) {
    setLocal(prev => ({
      ...prev,
      [archetype]: { ...prev[archetype], frequency },
    }));
    setSaved(false);
  }

  // ── Error / loading states ─────────────────────────────────────────────────
  if (hasError) {
    return (
      <Shell>
        <div className="text-5xl">⚠</div>
        <h1 className="heading">Link has expired.</h1>
        <p className="sub">
          Email us at{" "}
          <a href="mailto:hello@projectprofound.org" className="text-blue-600 hover:underline">
            hello@projectprofound.org
          </a>{" "}
          and we&apos;ll sort it out.
        </p>
      </Shell>
    );
  }

  if (!token) {
    return (
      <Shell>
        <div className="text-5xl">✦</div>
        <h1 className="heading">Manage subscriptions</h1>
        <p className="sub">Click the unsubscribe link in any email we&apos;ve sent you to manage your lists.</p>
        <Link href="/" className="text-sm text-blue-600 hover:underline">← Back to Project Profound</Link>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        <p className="sub">Loading your subscriptions…</p>
      </Shell>
    );
  }

  if (notFound) {
    return (
      <Shell>
        <div className="text-5xl">⚠</div>
        <h1 className="heading">Token not found.</h1>
        <p className="sub">This link may have already been used or has expired.</p>
      </Shell>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 pt-16 pb-24" style={{ background: "#FDFAF6" }}>
      <div className="max-w-xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-4xl">✦</div>
          <h1
            className="text-3xl font-bold text-slate-900"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            Your subscriptions
          </h1>
          <p className="text-slate-500 text-sm">{email}</p>
          <p className="text-slate-500 text-sm">
            Toggle any list below. Changes take effect immediately.
          </p>
        </div>

        {/* List cards */}
        <div className="space-y-3">
          {subs.map(sub => {
            const state = local[sub.archetype] ?? { active: sub.is_active, frequency: sub.frequency };
            const meta = ARCHETYPE_META[sub.archetype] ?? { label: sub.archetype, icon: "✦", desc: "" };
            return (
              <div
                key={sub.archetype}
                className={`rounded-2xl border p-5 transition-all ${
                  state.active
                    ? "border-slate-200 bg-white"
                    : "border-slate-100 bg-slate-50 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{meta.icon}</span>
                    <div>
                      <div className="font-semibold text-slate-900">{meta.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{meta.desc}</div>
                    </div>
                  </div>
                  {/* Toggle */}
                  <button
                    onClick={() => toggle(sub.archetype)}
                    className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-1 ${
                      state.active ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                    aria-label={state.active ? "Unsubscribe" : "Resubscribe"}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow mx-0.5 transition-transform ${
                        state.active ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Frequency picker (only for archetype video lists, not newsletter) */}
                {state.active && sub.archetype !== "newsletter" && (
                  <div className="mt-4 flex gap-2 flex-wrap">
                    {Object.entries(FREQ_LABELS).map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => setFreq(sub.archetype, id)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                          state.frequency === id
                            ? "border-slate-800 bg-slate-800 text-white"
                            : "border-slate-200 text-slate-500 hover:border-slate-400"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className="w-full py-3 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
          ) : saved ? (
            <><Check className="w-4 h-4" /> Saved</>
          ) : (
            "Save preferences"
          )}
        </button>

        {/* Subscribe to another type */}
        <p className="text-center text-sm text-slate-400">
          Want to try a different NDE story type?{" "}
          <Link href="/quiz/types" className="text-blue-600 hover:underline">
            Browse all types →
          </Link>
        </p>

        <div className="text-center">
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
            ← Back to Project Profound
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Shell (centered layout for loading/error states) ────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-4 text-center" style={{ background: "#FDFAF6" }}>
      <div className="max-w-md w-full space-y-4">{children}</div>
      <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">← Back</Link>
    </div>
  );
}
