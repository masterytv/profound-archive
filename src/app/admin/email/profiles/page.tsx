// src/app/admin/email/profiles/page.tsx
// Admin page to write and edit the long-form archetype profile reports
// that appear in each subscriber's first email above the video card.
// Saves via /api/email/template-save (same endpoint as templates, service role).
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ARCHETYPES } from "@/lib/quiz/archetypes";
import { Save, RefreshCw, Eye, FileText } from "lucide-react";

interface ProfileData {
  archetype: string;
  profile_report: string | null;
}

const ARCHETYPE_ENTRIES = Object.entries(ARCHETYPES) as [
  string,
  (typeof ARCHETYPES)[keyof typeof ARCHETYPES]
][];

// Seed text derived from fullDescription — a sensible starting point
const SEED_PROFILES: Record<string, string> = {
  griever: `You carry a grief that most people around you don't fully understand. You've found your way here because somewhere beneath the loss, there's a question you can't stop asking — and that question deserves a real answer.

These accounts were gathered for exactly you. Not because they'll replace what's gone, but because they offer something rare: testimony, from thousands of ordinary people, that love doesn't end at the boundary others call death.

Each story you receive has been selected from thousands of first-person accounts. They were chosen for emotional authenticity, the reality of the connection described, and what they say about what waits on the other side of loss.`,

  seeker: `You have a framework for meaning — built from years of reading, practice, or simply paying deep attention. You're not here because you doubt. You're here because these accounts confirm something you've long suspected: that consciousness is larger than the brain.

The archive scores each account on three validated research scales. You can read them for their emotional depth or for their evidential weight — both are real.

Each story you receive has been selected for its depth and transformative content: accounts where the experiencer came back genuinely changed, and where what they describe maps to the territory you already partially know.`,

  experiencer: `You carry knowledge that's hard to share. The experience itself was real — the question has always been whether anyone else would understand it. Coming here is an act of courage.

Every account in this archive is, in some sense, a message from someone who went where you went and came back changed. You are not alone, and you are not unusual. You are part of a documented phenomenon that spans every culture, every era, and every kind of person.

Each story we send you has been selected for its specific phenomenological detail — accounts where the experiencer describes elements that mirror what many others have seen, heard, and felt in that territory.`,

  skeptic: `You apply the same critical lens to NDEs that you apply to everything else — and that's exactly right. The archive scores each account on three validated research scales: the Greyson Scale, the NDE Veridical Perception protocol, and the Transformation Scale.

The data is there. The anomalies are real. Blind patients describing surgical instruments. Children describing relatives they never met. Veridical perceptions confirmed after the fact. The standard explanations don't hold.

Each account you receive has been selected for evidential strength — the highest-scoring cases for verifiable detail and research-grade documentation.`,

  curious: `Curiosity is an underrated reason to be here. You're open, you're looking, and you're not yet sure what you'll find. That's actually a good starting point — it means you'll let the accounts speak before you've decided what they mean.

The archive runs very deep: 5,000+ first-person accounts, each scored and analyzed, each a different doorway into the same territory.

Each story you receive has been chosen for immediate impact — accounts that are clear, credible, and hard to dismiss. Start with one that surprises you.`,

  reexp: `You've seen hundreds of these accounts. Maybe thousands. And you still come back. There's something in the territory that keeps drawing you — not just the stories themselves, but what they point toward.

You're fluent in a language most people don't speak. You notice the details others miss. The specific texture of the light. The way time collapses. The knowledge that arrives without words.

This archive was built, in part, for you. Each account you receive is one of the most detailed and immersive on record — the long ones, the ones where someone tries to describe the indescribable and spends an hour trying.`,

  crisis: `You came here in the dark. That took courage — or maybe just desperation, which is another kind of courage. Either way, you're here, and that matters.

What these accounts almost universally describe is this: at the boundary, there is no judgment. There is only love, and often the sense of being sent back — because something isn't finished yet. You are not finished yet.

Each account we send you carries a specific message: people who stood at the edge and came back to say that what's there is not what you fear. They came back for love. That's for you too. If you're in crisis right now, please call or text 988 (Suicide & Crisis Lifeline) anytime.`,
};

export default function EmailProfilesPage() {
  const supabase = createClient();
  const [selected, setSelected] = useState(ARCHETYPE_ENTRIES[0][0]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  const loadProfiles = useCallback(async () => {
    const { data } = await supabase
      .from("email_templates")
      .select("archetype, profile_report");
    if (!data) return;
    const map: Record<string, string> = {};
    (data as ProfileData[]).forEach((r) => {
      if (r.profile_report) map[r.archetype] = r.profile_report;
    });
    setProfiles(map);
  }, [supabase]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const currentText = profiles[selected] ?? SEED_PROFILES[selected] ?? "";

  function update(value: string) {
    setProfiles((p) => ({ ...p, [selected]: value }));
    setSaved(false);
    setSaveError(null);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const res = await fetch("/api/email/template-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archetype: selected, profile_report: currentText }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSaveError(json.error ?? "Save failed");
      } else {
        setSaved(true);
        setPreviewKey((k) => k + 1);
      }
    } catch (e) {
      setSaveError(String(e));
    } finally {
      setSaving(false);
    }
  }

  function handleRestoreDefault() {
    const seed = SEED_PROFILES[selected];
    if (seed) {
      update(seed);
    }
  }

  const archData = ARCHETYPES[selected as keyof typeof ARCHETYPES];
  const previewUrl = `/api/email/preview?archetype=${selected}&t=${previewKey}`;

  const charCount = currentText.length;
  const paraCount = currentText.split(/\n\n+/).filter((p) => p.trim().length > 0).length;

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            Archetype Profile Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Write the 2–4 paragraph profile for each archetype. Appears in each
            subscriber&apos;s <strong>first email</strong>, above the video.
          </p>
        </div>
      </div>

      <div className="flex gap-6 min-h-[700px]">
        {/* ── Archetype Sidebar ── */}
        <div className="w-52 shrink-0 space-y-1">
          {ARCHETYPE_ENTRIES.map(([id, a]) => {
            const hasContent = !!profiles[id];
            return (
              <button
                key={id}
                onClick={() => {
                  setSelected(id);
                  setSaved(false);
                  setSaveError(null);
                }}
                className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  selected === id
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span className="text-base">{a.icon}</span>
                <span className="flex-1 leading-tight">{a.label.replace("The ", "")}</span>
                {hasContent && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Has saved profile" />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Main Panel ── */}
        <div className="flex-1 flex gap-5 min-w-0">

          {/* Edit form */}
          <div className="w-80 shrink-0 space-y-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{archData?.icon}</span>
                <div>
                  <div className="font-semibold text-foreground text-sm">
                    {archData?.label}
                  </div>
                  <div className="text-[11px] text-muted-foreground italic">
                    {archData?.tagline}
                  </div>
                </div>
              </div>

              {/* Profile report textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3 h-3" />
                    Profile Report
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    {paraCount}p · {charCount}c
                  </span>
                </div>
                <textarea
                  value={currentText}
                  onChange={(e) => update(e.target.value)}
                  rows={16}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                  placeholder={`Write 2–4 paragraphs directly for ${archData?.label ?? "this reader"}.\n\nSeparate paragraphs with a blank line.\n\nSpeak to them personally — what they came here for, what this archive offers them, what kind of stories they'll receive.`}
                />
                <p className="text-[11px] text-muted-foreground">
                  Separate paragraphs with a blank line. Rendered above the video in the first email.
                </p>
              </div>

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={saving || !currentText.trim()}
                className="w-full px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? "Saving…" : saved ? "Saved ✓" : "Save profile"}
              </button>
              {saveError && (
                <p className="text-xs text-destructive">{saveError}</p>
              )}

              {/* Restore default */}
              <button
                onClick={handleRestoreDefault}
                className="w-full px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm hover:bg-muted transition-colors"
              >
                Restore default text
              </button>
            </div>

            {/* Tips card */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Writing Tips
              </h3>
              <ul className="text-[12px] text-muted-foreground space-y-1.5">
                <li>• P1: Acknowledge their reason for being here</li>
                <li>• P2: What this archive offers specifically for them</li>
                <li>• P3: What kind of stories they can expect to receive</li>
                <li>• Speak in second person — &quot;You carry…&quot;, &quot;You came…&quot;</li>
                <li>• No em dashes. No marketing tone. Be human.</li>
              </ul>
            </div>
          </div>

          {/* Preview iframe */}
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Live preview — shows <strong>saved</strong> profile (save first to update)
              </span>
              <button
                onClick={() => setPreviewKey((k) => k + 1)}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
            <iframe
              key={previewKey + selected}
              src={previewUrl}
              className="flex-1 w-full rounded-xl border border-border bg-white"
              style={{ minHeight: "700px" }}
              title="Email preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
