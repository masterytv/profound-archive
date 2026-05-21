"use client";

import { useState } from "react";
import { Code, Check, Copy } from "lucide-react";

// ─── Component ──────────────────────────────────────────────────────────────

export function BadgeEmbed({
  channelId,
  channelName,
}: {
  channelId: string;
  channelName: string;
}) {
  const [copied, setCopied] = useState<"markdown" | "html" | null>(null);

  // Always use production URL for embed snippets — channel owners copy these
  // into YouTube descriptions and READMEs, so they must point to the real site.
  const baseUrl = "https://projectprofound.org";

  const badgeUrl = `${baseUrl}/api/badge/channel/${channelId}`;
  const channelUrl = `${baseUrl}/uap/channels/${channelId}`;

  const markdownSnippet = `[![${channelName} on Project Profound](${badgeUrl})](${channelUrl})`;
  const htmlSnippet = `<a href="${channelUrl}"><img src="${badgeUrl}" alt="${channelName} on Project Profound" /></a>`;

  async function copyToClipboard(text: string, type: "markdown" | "html") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  return (
    <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Code className="w-4 h-4 text-green-500" />
        <h3
          className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider"
          style={{
            fontFamily: "'Crimson Pro', Georgia, serif",
            letterSpacing: "0.05em",
          }}
        >
          Embed This Badge
        </h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Add this badge to a YouTube description, website, or README to link back
        to this channel&apos;s analytics.
      </p>

      {/* Badge preview */}
      <div className="bg-slate-100 dark:bg-white/[0.03] rounded-xl p-4 mb-4 flex items-center justify-center border border-slate-200/40 dark:border-white/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/badge/channel/${channelId}`}
          alt={`${channelName} badge`}
          className="h-[22px]"
        />
      </div>

      {/* Copy snippets */}
      <div className="space-y-2">
        {/* Markdown */}
        <div className="flex items-center gap-2">
          <code className="flex-1 text-[10px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200/40 dark:border-white/5 rounded-lg px-3 py-2 text-slate-600 dark:text-slate-400 font-mono truncate select-all">
            {markdownSnippet}
          </code>
          <button
            onClick={() => copyToClipboard(markdownSnippet, "markdown")}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors flex-shrink-0"
            title="Copy Markdown"
          >
            {copied === "markdown" ? (
              <Check className="w-3 h-3" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            MD
          </button>
        </div>

        {/* HTML */}
        <div className="flex items-center gap-2">
          <code className="flex-1 text-[10px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200/40 dark:border-white/5 rounded-lg px-3 py-2 text-slate-600 dark:text-slate-400 font-mono truncate select-all">
            {htmlSnippet}
          </code>
          <button
            onClick={() => copyToClipboard(htmlSnippet, "html")}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors flex-shrink-0"
            title="Copy HTML"
          >
            {copied === "html" ? (
              <Check className="w-3 h-3" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            HTML
          </button>
        </div>
      </div>
    </div>
  );
}
