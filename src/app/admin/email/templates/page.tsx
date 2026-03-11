"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ARCHETYPES } from "@/lib/quiz/archetypes";
import { Save, Send, RefreshCw, Eye } from "lucide-react";

interface Template {
  archetype: string;
  subject: string;
  intro_text: string | null;
  cta_text: string;
  from_name: string;
}

const ARCHETYPE_ENTRIES = Object.entries(ARCHETYPES) as [string, typeof ARCHETYPES[keyof typeof ARCHETYPES]][];

// Extra templates not tied to an NDE archetype
const EXTRA_TEMPLATES = [
  { id: "newsletter_welcome", icon: "✉️", label: "Newsletter Welcome", note: "Sent immediately when someone subscribes to the Newsletter." },
];

export default function EmailTemplatesPage() {
  const supabase = createClient();
  const [selected, setSelected] = useState(ARCHETYPE_ENTRIES[0][0]);
  const [templates, setTemplates] = useState<Record<string, Template>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [previewKey, setPreviewKey] = useState(0); // bump to refresh iframe

  useEffect(() => {
    supabase
      .from("email_templates")
      .select("*")
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, Template> = {};
        data.forEach((t: Template) => { map[t.archetype] = t; });
        setTemplates(map);
      });
  }, [supabase]);

  const current = templates[selected] ?? {
    archetype: selected,
    subject: `A near-death story for you`,
    intro_text: "",
    cta_text: "Watch this story →",
    from_name: "Project Profound",
  };

  function update(field: keyof Template, value: string) {
    setTemplates(t => ({ ...t, [selected]: { ...current, [field]: value } }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await supabase
      .from("email_templates")
      .upsert({ ...current, archetype: selected, updated_at: new Date().toISOString() });
    setSaving(false);
    setSaved(true);
    setPreviewKey(k => k + 1); // refresh preview
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
        ? { ok: true, msg: `Sent! Video: ${data.video}` }
        : { ok: false, msg: data.error ?? "Send failed" });
    } catch (e) {
      setTestResult({ ok: false, msg: String(e) });
    } finally {
      setTesting(false);
    }
  }

  const previewUrl = `/api/email/preview?archetype=${selected}&t=${previewKey}`;
  const archData = ARCHETYPES[selected as keyof typeof ARCHETYPES];

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            Email Templates
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Edit the copy sent to each archetype. Changes take effect on the next send.
          </p>
        </div>
      </div>

      <div className="flex gap-6 min-h-[700px]">
        {/* ── Archetype Sidebar ── */}
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
              <span className="leading-tight">{a.label.replace("The ", "")}</span>
            </button>
          ))}

          {/* Divider */}
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
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{archData?.icon}</span>
                <span className="font-semibold text-foreground text-sm">{archData?.label}</span>
              </div>

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
                  Appears in italics above the video title. Personalises the message for this archetype.
                </p>
              </div>

              {/* CTA */}
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

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
              </button>
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
                {testing ? "Sending…" : `Send as ${archData?.label ?? selected}`}
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
              <span className="text-sm text-muted-foreground">Live preview</span>
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
