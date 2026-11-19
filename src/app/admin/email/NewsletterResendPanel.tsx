"use client";

// Project Profound's newsletter on Resend (marketing plan steps 3–4). Tom, 2026-11-19: "NDE of the Week" sends
// itself every Monday at 9:00 am ET (/api/email/weekly-draft, run by .github/workflows/nde-of-the-week.yml). Here:
// copy the subscribers into its Resend segment, and make this week's email now as a DRAFT, to look at; a draft is
// never sent until Tom presses Send in Resend.

import { useState } from "react";

type Result = { ok: boolean; msg: string; url?: string } | null;

export function NewsletterResendPanel() {
  const [busy, setBusy] = useState<"sync" | "draft" | null>(null);
  const [result, setResult] = useState<Result>(null);

  async function run(kind: "sync" | "draft") {
    setBusy(kind);
    setResult(null);
    try {
      const res = await fetch(kind === "sync" ? "/api/email/newsletter-sync" : "/api/email/weekly-draft", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.error) setResult({ ok: false, msg: data.error });
      else if (kind === "sync")
        setResult({ ok: true, msg: `${data.total} subscribers: ${data.added} added, ${data.updated} already there, ${data.failed} failed.` });
      else if (data.status === "skipped")
        setResult({ ok: true, msg: `Today's email already exists in Resend (${data.broadcastStatus}).`, url: data.url });
      else if (data.status === "nothing this week") setResult({ ok: false, msg: "Nothing to put in it: no Short this week and no story." });
      else setResult({ ok: true, msg: `Draft made: "${data.subject}". Read it in Resend.`, url: data.url });
    } catch (e) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pt-8">
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">NDE of the Week (Resend)</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Goes out by itself every Monday at 9:00 am ET to everyone on a newsletter list. You get an email that morning
          with a link to cancel it in Resend before 9. &quot;Make this week&apos;s draft now&quot; only makes a draft to look at.
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
            {busy === "draft" ? "Making the draft…" : "Make this week's draft now"}
          </button>
        </div>
        {result && (
          <p className={`mt-3 text-sm ${result.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
            {result.msg}{" "}
            {result.url && (
              <a href={result.url} target="_blank" rel="noreferrer" className="underline">
                Open in Resend
              </a>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
