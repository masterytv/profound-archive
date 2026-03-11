"use client";

// Smart subscription management page.
// Reached via /unsubscribe?token=xxx (from email link) or directly.
// Loads all subscriptions for the email associated with the token,
// lets the user toggle each list on/off, and saves changes.

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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

// Suspense wrapper required by Next.js for useSearchParams
export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}>
      <UnsubscribeContent />
    </Suspense>
  );
}

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const emailParam  = searchParams.get("email") ?? undefined;
  const tokenParam  = searchParams.get("token") ?? undefined;

  const [activeEmail, setActiveEmail] = useState<string | null>(emailParam ?? null);
  const [inputEmail, setInputEmail]   = useState(""); // for the fallback form
  const [subs, setSubs]   = useState<Sub[]>([]);
  const [loading, setLoading]   = useState(!!(emailParam || tokenParam));
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [local, setLocal]     = useState<Record<string, { active: boolean; frequency: string }>>({});

  // Load subscriptions when email or token is present
  useEffect(() => {
    const param = emailParam
      ? `email=${encodeURIComponent(emailParam)}`
      : tokenParam
      ? `token=${encodeURIComponent(tokenParam)}`
      : null;
    if (!param) return;

    fetch(`/api/email/manage-subs?${param}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setLookupError(d.error); return; }
        setActiveEmail(d.email);
        setSubs(d.subs);
        const init: typeof local = {};
        d.subs.forEach((s: Sub) => {
          init[s.archetype] = { active: s.is_active, frequency: s.frequency };
        });
        setLocal(init);
      })
      .catch(() => setLookupError("Could not load subscriptions."))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Email lookup via the input form
  async function handleEmailLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!inputEmail) return;
    setLoading(true);
    setLookupError(null);
    try {
      const res = await fetch(`/api/email/manage-subs?email=${encodeURIComponent(inputEmail)}`);
      const d = await res.json();
      if (d.error || !res.ok) { setLookupError("No subscriptions found for that email."); return; }
      setActiveEmail(d.email);
      setSubs(d.subs);
      const init: typeof local = {};
      d.subs.forEach((s: Sub) => { init[s.archetype] = { active: s.is_active, frequency: s.frequency }; });
      setLocal(init);
    } catch { setLookupError("Could not load subscriptions."); }
    finally { setLoading(false); }
  }

  async function handleSave() {
    if (!activeEmail) return;
    setSaving(true);
    const updates = Object.entries(local).map(([archetype, { active, frequency }]) => ({
      archetype, active, frequency,
    }));
    await fetch("/api/email/manage-subs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: activeEmail, updates }),
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

  // ── Error / loading states ──────────────────────────────────────────────────
  if (loading) {
    return (
      <Shell>
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        <p className="sub">Loading your subscriptions…</p>
      </Shell>
    );
  }

  // No email resolved yet — show email input form
  if (!activeEmail) {
    return (
      <Shell>
        <div className="text-5xl">✦</div>
        <h1 className="heading">Manage subscriptions</h1>
        <p className="sub">Enter your email address to see and manage your lists.</p>
        <form onSubmit={handleEmailLookup} className="w-full space-y-3 text-left">
          <input
            type="email" required value={inputEmail}
            onChange={e => setInputEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          {lookupError && <p className="text-sm text-red-500">{lookupError}</p>}
          <button type="submit" className="w-full rounded-xl bg-slate-900 text-white py-2.5 text-sm font-medium hover:opacity-90">
            Find my subscriptions →
          </button>
        </form>
        <Link href="/" className="text-xs text-slate-400 hover:text-slate-600">← Back to Project Profound</Link>
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
          <p className="text-slate-500 text-sm">{activeEmail}</p>
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
