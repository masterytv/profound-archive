"use client";

// Smart subscription management page.
// Shows ALL available lists (archetypes + newsletter) so users can subscribe or unsubscribe.
// Reached via /unsubscribe?email=xxx (from email links) or accessed directly.

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ARCHETYPES } from "@/lib/quiz/archetypes";
import { Loader2 } from "lucide-react";

// ── Full list of available lists ─────────────────────────────────────────────
const ALL_LISTS = [
  {
    id: "newsletter_nde",
    icon: "✦",
    label: "NDE Research Newsletter",
    desc: "Updates on near-death experience research, new features, and insights from 5,000+ accounts.",
    type: "newsletter" as const,
  },
  {
    id: "newsletter_uap",
    icon: "🛸",
    label: "UAP Intelligence Newsletter",
    desc: "Updates on UAP encounter research, high-credibility sightings, government programs, and contact reports.",
    type: "newsletter" as const,
  },
  ...Object.entries(ARCHETYPES).map(([id, a]) => ({
    id,
    icon: a.icon,
    label: a.destinationLabel,
    desc: a.tagline,
    type: "archetype" as const,
  })),
];

const FREQ_OPTIONS = [
  { id: "daily",   label: "Daily" },
  { id: "3day",    label: "Every 3 days" },
  { id: "weekly",  label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

interface ListState {
  active: boolean;
  frequency: string;
}

// Suspense wrapper required by Next.js for useSearchParams
export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") ?? undefined;
  const tokenParam = searchParams.get("token") ?? undefined;

  const [activeEmail, setActiveEmail] = useState<string | null>(emailParam ?? null);
  const [inputEmail, setInputEmail]   = useState("");
  const [loading, setLoading]         = useState(!!(emailParam || tokenParam));
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);

  // Local state for all lists, keyed by id
  const [local, setLocal] = useState<Record<string, ListState>>(() =>
    Object.fromEntries(ALL_LISTS.map(l => [l.id, { active: false, frequency: "weekly" }]))
  );

  // Load subscriptions from API, merge into local state
  function mergeSubscriptions(subs: { archetype: string; is_active: boolean; frequency: string }[]) {
    setLocal(prev => {
      const next = { ...prev };
      subs.forEach(s => {
        next[s.archetype] = { active: s.is_active, frequency: s.frequency };
      });
      return next;
    });
  }

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
        mergeSubscriptions(d.subs ?? []);
      })
      .catch(() => setLookupError("Could not load subscriptions."))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleEmailLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!inputEmail) return;
    setLoading(true);
    setLookupError(null);
    try {
      const res = await fetch(`/api/email/manage-subs?email=${encodeURIComponent(inputEmail)}`);
      const d = await res.json();
      // Even if no subscriptions yet, we still let them manage (empty state is fine)
      setActiveEmail(inputEmail);
      mergeSubscriptions(d.subs ?? []);
    } catch { setLookupError("Could not load subscriptions."); }
    finally { setLoading(false); }
  }

  async function handleSave() {
    if (!activeEmail) return;
    setSaving(true);
    const updates = ALL_LISTS.map(l => ({
      archetype: l.id,
      active: local[l.id]?.active ?? false,
      frequency: local[l.id]?.frequency ?? "weekly",
    }));
    await fetch("/api/email/manage-subs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: activeEmail, updates }),
    });
    setSaving(false);
    setSaved(true);
  }

  function toggle(id: string) {
    setLocal(prev => ({ ...prev, [id]: { ...prev[id], active: !prev[id].active } }));
    setSaved(false);
  }

  function setFreq(id: string, frequency: string) {
    setLocal(prev => ({ ...prev, [id]: { ...prev[id], frequency } }));
    setSaved(false);
  }

  // Master toggle — all on if every list is active, else turn all on; if all on, turn all off
  const allActive = ALL_LISTS.every(l => local[l.id]?.active);
  function toggleAll() {
    const next = !allActive;
    setLocal(prev =>
      Object.fromEntries(Object.keys(prev).map(id => [id, { ...prev[id], active: next }]))
    );
    setSaved(false);
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Shell>
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </Shell>
    );
  }

  // ── No email — show input form ─────────────────────────────────────────────
  if (!activeEmail) {
    return (
      <Shell>
        <div className="text-5xl">✦</div>
        <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
          Manage subscriptions
        </h1>
        <p className="text-sm text-muted-foreground">Enter your email address to manage your lists.</p>
        <form onSubmit={handleEmailLookup} className="w-full space-y-3 text-left">
          <input
            type="email" required value={inputEmail}
            onChange={e => setInputEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary dark:[color-scheme:dark]"
          />
          {lookupError && <p className="text-sm text-destructive">{lookupError}</p>}
          <button type="submit" className="w-full rounded-xl bg-primary text-white py-2.5 text-sm font-medium hover:opacity-90 transition-opacity">
            Continue →
          </button>
        </form>
        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back to Project Profound</Link>
      </Shell>
    );
  }

  // ── Main subscription management UI ────────────────────────────────────────
  const activeCount = ALL_LISTS.filter(l => local[l.id]?.active).length;

  return (
    <div className="min-h-screen bg-background px-4 pt-16 pb-28">
      <div className="max-w-xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-4xl">✦</div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
            Your subscriptions
          </h1>
          <p className="text-muted-foreground text-sm">{activeEmail}</p>
          <p className="text-muted-foreground text-xs">
            Toggle any list. Turn on new ones to subscribe. {activeCount > 0 && `${activeCount} active.`}
          </p>
        </div>

        {/* Master toggle — Subscribe to / Unsubscribe from all */}
        <div
          className={`rounded-2xl border p-5 transition-all ${
            allActive ? "border-border bg-card" : "border-border/50 bg-muted/30"
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-foreground">
                {allActive ? "Subscribed to all" : "Subscribe / Unsubscribe from all"}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {allActive ? "Toggle off to unsubscribe from every list." : "Toggle on to subscribe to every list at once."}
              </div>
            </div>
            <button
              onClick={toggleAll}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                allActive ? "bg-emerald-500" : "bg-muted-foreground/30"
              }`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                allActive ? "translate-x-5 left-1" : "left-1"
              }`} />
            </button>
          </div>
        </div>

        {/* General Newsletter — top */}
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">Newsletters</p>
          {ALL_LISTS.filter(l => l.type === "newsletter").map(list => {
            const state = local[list.id] ?? { active: false, frequency: "weekly" };
            return (
              <div
                key={list.id}
                className={`rounded-2xl border p-5 transition-all ${
                  state.active
                    ? "border-border bg-card"
                    : "border-border/50 bg-muted/30 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{list.icon}</span>
                    <div>
                      <div className="font-semibold text-foreground text-[15px]">{list.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{list.desc}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggle(list.id)}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                      state.active ? "bg-emerald-500" : "bg-muted-foreground/30"
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      state.active ? "translate-x-5 left-1" : "left-1"
                    }`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* NDE-Type lists */}
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">NDE Compass Lists</p>
          <div className="space-y-3">
            {ALL_LISTS.filter(l => l.type === "archetype").map(list => {
              const state = local[list.id] ?? { active: false, frequency: "weekly" };
              return (
                <div
                  key={list.id}
                  className={`rounded-2xl border p-5 transition-all ${
                    state.active
                      ? "border-border bg-card"
                      : "border-border/50 bg-muted/30 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{list.icon}</span>
                      <div>
                        <div className="font-semibold text-foreground text-[15px]">{list.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{list.desc}</div>
                      </div>
                    </div>
                    {/* Toggle */}
                    <button
                      onClick={() => toggle(list.id)}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                        state.active ? "bg-emerald-500" : "bg-muted-foreground/30"
                      }`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        state.active ? "translate-x-5 left-1" : "left-1"
                      }`} />
                    </button>
                  </div>

                  {/* Frequency selector — only if active */}
                  {state.active && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {FREQ_OPTIONS.map(f => (
                        <button
                          key={f.id}
                          onClick={() => setFreq(list.id, f.id)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            state.frequency === f.id
                              ? "bg-foreground text-background"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Save */}
        <div className="sticky bottom-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl bg-foreground text-background font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save preferences"}
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground pb-4">
          Want to try a different NDE story type?{" "}
          <Link href="/compass/types" className="text-primary hover:underline">Browse all types →</Link>
        </p>
      </div>
    </div>
  );
}

// ── Shell — centered layout for loading/entry states ─────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-5 text-center bg-background">
      <div className="max-w-sm w-full space-y-4">{children}</div>
    </div>
  );
}
