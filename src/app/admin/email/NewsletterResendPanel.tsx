"use client";

// The newsletters on Resend (marketing plan steps 3–4; Tom 2026-11-19: one weekly email per site): copy the
// subscribers into each newsletter's Resend segment, and make this week's drafts now instead of waiting for Thursday.
// Neither sends anything to subscribers: each draft waits in Resend for Tom's Send.

import { useState } from "react";

type Result = { ok: boolean; msg: string; links?: { label: string; url: string }[] } | null;
const NAMES: Record<string, string> = { pp: "NDE of the Week (Project Profound)", swc: "Soul Wisdom Video of the Week" };
type Outcome = { status: string; url?: string; subject?: string; error?: string; total?: number; added?: number; updated?: number; failed?: number };

export function NewsletterResendPanel() {
  const [busy, setBusy] = useState<"sync" | "draft" | null>(null);
  const [result, setResult] = useState<Result>(null);

  async function run(kind: "sync" | "draft") {
    setBusy(kind);
    setResult(null);
    try {
      const res = await fetch(kind === "sync" ? "/api/email/newsletter-sync" : "/api/email/weekly-draft", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.error) {
        setResult({ ok: false, msg: data.error });
        return;
      }
      const parts = (["pp", "swc"] as const).map((n) => [n, data[n]] as [string, Outcome | string | undefined]).filter(([, r]) => r);
      const line = ([n, r]: [string, Outcome | string | undefined]) => {
        if (typeof r === "string") return `${NAMES[n]}: ${r}.`;
        if (!r) return "";
        if (kind === "sync") return `${NAMES[n]}: ${r.total} subscribers, ${r.added} added, ${r.updated} already there, ${r.failed} failed.`;
        if (r.status === "made") return `${NAMES[n]}: draft made, "${r.subject}".`;
        if (r.status === "skipped") return `${NAMES[n]}: today's draft already exists.`;
        return `${NAMES[n]}: ${r.error ?? r.status}.`;
      };
      setResult({
        ok: res.ok,
        msg: parts.map(line).join(" ") + (kind === "draft" ? " Read each draft in Resend and press Send." : ""),
        links: parts.flatMap(([n, r]) => (typeof r === "object" && r?.url ? [{ label: `Open ${n === "pp" ? "NDE of the Week" : "Video of the Week"}`, url: r.url }] : [])),
      });
    } catch (e) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pt-8">
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Newsletter on Resend</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Two weekly emails, each a Resend broadcast: &quot;NDE of the Week&quot; to Project Profound sign-ups and &quot;Soul Wisdom
          Video of the Week&quot; to Soul Wisdom sign-ups. Drafts are made every Thursday morning; nothing is sent until you
          press Send in Resend.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => run("sync")}
            disabled={busy !== null}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy === "sync" ? "Copying…" : "Copy subscribers to Resend"}
          </button>
          <button
            onClick={() => run("draft")}
            disabled={busy !== null}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
          >
            {busy === "draft" ? "Making the drafts…" : "Make this week's drafts now"}
          </button>
        </div>
        {result && (
          <p className={`mt-3 text-sm ${result.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
            {result.msg}{" "}
            {result.links?.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="mr-3 underline">
                {l.label}
              </a>
            ))}
          </p>
        )}
      </div>
    </section>
  );
}
