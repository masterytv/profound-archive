"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { ARCHETYPES } from "@/lib/quiz/archetypes";
import { Save, Send, RefreshCw, Eye, FileText } from "lucide-react";

interface Template {
  archetype: string;
  subject: string;
  intro_text: string | null;
  cta_text: string;
  cta_href: string | null;
  from_name: string;
  profile_report: string | null;
}

const ARCHETYPE_ENTRIES = Object.entries(ARCHETYPES) as [string, typeof ARCHETYPES[keyof typeof ARCHETYPES]][];

// Seed profiles — default profile report text per destination
const SEED_PROFILES: Record<string, string> = {
  griever: `You may have come looking for something the world rarely offers: honest, documented accounts that the person you lost didn't simply stop. You're not grasping at comfort. You're seeking something real. We'll email you NDE videos where people reconnect with the ones they love.

These accounts were gathered for exactly you. Not because they'll replace what's gone, but because they offer something rare: testimony, from thousands of ordinary people, that love continues past the boundary others call death.

Each story you receive has been selected for emotional authenticity — accounts where the connection described feels unmistakably real, and where what the experiencer saw on the other side speaks directly to what you're carrying.`,

  seeker: `You likely approach NDEs not as proof you need, but as spiritual data from a territory you already partially know. You're building a coherent picture of consciousness and the afterlife. Each account adds another coordinate to a map you'll spend your life drawing.

The archive confirms something you've long suspected: that consciousness is larger than the brain, and that the accounts of those who've touched the edge of death are among the most trustworthy data we have.

Each story you receive has been selected for depth and transformative content — accounts where the experiencer came back genuinely changed and describes that change in language that maps to the territory you already know.`,

  experiencer: `You likely had an experience and you want to connect in some way to others who have also. You may have wondered if you were alone in it. You weren't. These 5,000+ accounts are a mirror for what you saw, felt, or know deeply to be true.

Every account in this archive is, in some sense, a message from someone who went where you went and came back changed. You are not alone, and you are not unusual. You are part of a documented phenomenon that spans every culture, every era, and every kind of person.

We'll send you videos from first-person experiencers that you can relate to — accounts where the phenomenological detail mirrors what many others have seen, heard, and felt in that territory.`,

  skeptic: `You may be drawn to NDEs because the data is genuinely anomalous. People perceive events they couldn't have seen, but were later verified to be true. Academics call this Veridical Perception. Blind patients describing surgical instruments. Children describing relatives they never met.

The standard explanations don't hold — and you're fascinated by exploring these kinds of NDEs. The archive scores each account on three validated research scales: the Greyson Scale, the NDE Veridical Perception protocol, and the Transformation Scale.

We'll send you videos with high levels of veridical perception — the evidence that there is something beyond the physical world. The data is there. The anomalies are real.`,

  curious: `You probably didn't arrive with a specific wound or mission. Something caught your attention and refused to let go. That instinct was correct. The archive runs very deep: 5,000+ first-person accounts, each scored and analyzed, each a different doorway into the same territory.

Curiosity is an underrated reason to be here. You're open, you're looking, and you're not yet sure what you'll find. That's actually a good starting point — it means you'll let the accounts speak before you've decided what they mean.

We'll show you NDE videos that pique your curiosity and sense of exploration. Start with one that surprises you.`,
};

// Extra templates not tied to an NDE archetype
const EXTRA_TEMPLATES = [
  { id: "newsletter_nde_welcome", icon: "✦", label: "NDE Welcome", note: "Sent when someone subscribes to the NDE Newsletter." },
  { id: "newsletter_uap_welcome", icon: "◎", label: "UAP Welcome", note: "Sent when someone subscribes to the UAP Newsletter." },
];

export default function EmailTemplatesPage() {
  // Memoize supabase client to prevent re-creation on every render
  // (which would invalidate useCallback/useEffect dependencies and cause data races)
  const supabase = useMemo(() => createClient(), []);
  const [selected, setSelected] = useState(ARCHETYPE_ENTRIES[0][0]);
  const [templates, setTemplates] = useState<Record<string, Template>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  // Use direct REST fetch instead of Supabase client to avoid GoTrue auth
  // _acquireLock AbortErrors during initialization (especially in incognito).
  // email_templates has public read RLS so the anon key is sufficient.
  const loadTemplates = useCallback(async () => {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) {
        console.error("[email-templates] missing Supabase env vars");
        return;
      }
      const res = await fetch(`${url}/rest/v1/email_templates?select=*`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
      });
      if (!res.ok) {
        console.error("[email-templates] fetch failed:", res.status);
        return;
      }
      const data: Template[] = await res.json();
      if (!data || data.length === 0) return;
      const map: Record<string, Template> = {};
      data.forEach((t) => { map[t.archetype] = t; });
      setTemplates(map);
      setLoaded(true);
    } catch (err) {
      console.error("[email-templates] fetch exception:", err);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const current: Template = templates[selected] ?? {
    archetype: selected,
    subject: `A near-death story for you`,
    intro_text: "",
    cta_text: "Watch this story →",
    cta_href: "",
    from_name: "Project Profound",
    profile_report: null,
  };

  function update(field: keyof Template, value: string) {
    setTemplates(t => ({ ...t, [selected]: { ...current, [field]: value } }));
    setSaved(false);
  }

  async function handleSave() {
    if (!loaded) {
      setSaveError("Still loading — please wait.");
      return;
    }
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    const res = await fetch("/api/email/template-save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...current, archetype: selected }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setSaveError(json.error ?? "Save failed");
    } else {
      setSaved(true);
      setPreviewKey(k => k + 1);
    }
  }

  async function handleTestSend() {
    if (!testEmail) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, archetype: selected, frequency: "weekly" }),
      });
      const data = await res.json();
      setTestResult(res.ok
        ? { ok: true, msg: data.type?.includes("welcome") ? "Sent! Welcome email delivered." : `Sent! Video: ${data.video}` }
        : { ok: false, msg: data.error ?? "Send failed" });
    } catch (e) {
      setTestResult({ ok: false, msg: String(e) });
    } finally {
      setTesting(false);
    }
  }

  const previewUrl = `/api/email/preview?archetype=${selected}&t=${previewKey}`;
  const archData = ARCHETYPES[selected as keyof typeof ARCHETYPES];
  const isNDEArchetype = !!archData;
  const profileText = current.profile_report ?? "";
  const wordCount = profileText.trim().split(/\s+/).filter(Boolean).length;
  const paraCount = profileText.split(/\n\n+/).filter(s => s.trim()).length;

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
        >
          Email Templates
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edit the copy sent to each destination. Changes take effect on the next send.
        </p>
      </div>

      <div className="flex gap-6 min-h-[700px]">
        {/* ── Sidebar ── */}
        <div className="w-52 shrink-0 space-y-1">
          {ARCHETYPE_ENTRIES.map(([id, a]) => (
            <button
              key={id}
              onClick={() => { setSelected(id); setSaved(false); setTestResult(null); }}
              className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                selected === id
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="text-base">{a.icon}</span>
              <span className="leading-tight">{a.destinationLabel}</span>
            </button>
          ))}

          <div className="border-t border-border my-2" />
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 pb-1">Welcome Emails</p>
          {EXTRA_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => { setSelected(t.id); setSaved(false); setTestResult(null); }}
              className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                selected === t.id
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="text-base">{t.icon}</span>
              <span className="leading-tight">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── Main Panel ── */}
        <div className="flex-1 flex gap-5 min-w-0">

          {/* Edit form */}
          <div className="w-80 shrink-0 space-y-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{archData?.icon ?? "✦"}</span>
                <div>
                  <div className="font-semibold text-foreground text-sm">
                    {archData?.destinationLabel ?? EXTRA_TEMPLATES.find(t => t.id === selected)?.label ?? selected}
                  </div>
                  {archData && (
                    <div className="text-[11px] text-muted-foreground italic">{archData.tagline}</div>
                  )}
                </div>
              </div>

              {/* Profile Report — NDE archetypes only */}
              {isNDEArchetype && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3 h-3" />
                      Profile Report
                      <span className="normal-case font-normal text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                        first email only
                      </span>
                    </label>
                    {profileText && (
                      <span className="text-[10px] text-muted-foreground">{paraCount}p · {wordCount}w</span>
                    )}
                  </div>
                  <textarea
                    value={profileText}
                    onChange={e => update("profile_report", e.target.value)}
                    rows={8}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                    placeholder="Write 2–4 paragraphs introducing this subscriber to their destination. Shown above the video in the first email only."
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground">
                      Separate paragraphs with a blank line.
                    </p>
                    <button
                      type="button"
                      onClick={() => update("profile_report", SEED_PROFILES[selected] ?? "")}
                      className="text-[11px] text-primary hover:underline"
                    >
                      Restore default
                    </button>
                  </div>
                </div>
              )}

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Subject line
                </label>
                <input
                  value={current.subject}
                  onChange={e => update("subject", e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Email subject line"
                />
              </div>

              {/* From name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  From name
                </label>
                <input
                  value={current.from_name}
                  onChange={e => update("from_name", e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Project Profound"
                />
              </div>

              {/* Intro text */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Intro paragraph
                </label>
                <textarea
                  value={current.intro_text ?? ""}
                  onChange={e => update("intro_text", e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Optional text shown above the video title…"
                />
                <p className="text-[11px] text-muted-foreground">
                  Appears in italics above the video title. In every email sent to this destination.
                </p>
              </div>

              {/* CTA text */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Button text
                </label>
                <input
                  value={current.cta_text}
                  onChange={e => update("cta_text", e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Watch this story →"
                />
              </div>

              {/* CTA href — only for newsletter_welcome */}
              {selected.startsWith("newsletter_") && selected.endsWith("_welcome") && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Button link URL
                  </label>
                  <input
                    value={current.cta_href ?? ""}
                    onChange={e => update("cta_href", e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="https://projectprofound.org/compass"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Where the button takes the reader. Defaults to the homepage.
                  </p>
                </div>
              )}

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={saving || !loaded}
                className="w-full px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {!loaded ? "Loading…" : saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
              </button>
              {saveError && (
                <p className="text-xs text-destructive">{saveError}</p>
              )}
            </div>

            {/* Test send */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" /> Test this template
              </h3>
              <input
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleTestSend}
                disabled={testing || !testEmail}
                className="w-full px-4 py-2 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/5 disabled:opacity-50"
              >
                {testing ? "Sending…" : `Send as ${archData?.destinationLabel ?? selected}`}
              </button>
              {testResult && (
                <p className={`text-xs ${testResult.ok ? "text-emerald-600" : "text-destructive"}`}>
                  {testResult.msg}
                </p>
              )}
            </div>
          </div>

          {/* Preview iframe */}
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Live preview — shows <strong>saved</strong> profile (save first to update)</span>
              <button
                onClick={() => setPreviewKey(k => k + 1)}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
            <iframe
              key={previewKey + selected}
              src={previewUrl}
              className="flex-1 w-full rounded-xl border border-border bg-white"
              style={{ minHeight: "640px" }}
              title="Email preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
