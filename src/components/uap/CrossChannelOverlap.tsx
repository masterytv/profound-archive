"use client";

import { GitBranch, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { CrossChannelOverlapResult } from "@/lib/data/uap-entity-links";

// ─── Component ──────────────────────────────────────────────────────────────

export function CrossChannelOverlap({
  data,
}: {
  data: CrossChannelOverlapResult[];
}) {
  // Don't render if no overlap found
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <GitBranch className="w-4 h-4 text-violet-500" />
        <h3
          className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider"
          style={{
            fontFamily: "'Crimson Pro', Georgia, serif",
            letterSpacing: "0.05em",
          }}
        >
          Cross-Channel Guest Overlap
        </h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Other channels that share the most experiencers and persons of interest with
        this channel. Based on top 20 guests by prominence.
      </p>

      <div className="space-y-2">
        {data.map((channel) => (
          <Link
            key={channel.channelId}
            href={channel.href}
            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/40 dark:border-white/5 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-all group"
          >
            {/* Channel avatar */}
            {channel.avatarUrl ? (
              <Image
                src={channel.avatarUrl}
                alt={channel.channelName}
                width={36}
                height={36}
                className="rounded-full flex-shrink-0 border-2 border-white dark:border-slate-700"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {channel.channelName.charAt(0)}
              </div>
            )}

            {/* Channel info */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">
                {channel.channelName}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400">
                  {channel.sharedGuestCount} shared{" "}
                  {channel.sharedGuestCount === 1 ? "guest" : "guests"}
                </span>
                {channel.sharedGuests.length > 0 && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    including{" "}
                    {channel.sharedGuests
                      .slice(0, 3)
                      .map((g) => g.name)
                      .join(", ")}
                    {channel.sharedGuests.length > 3 &&
                      ` +${channel.sharedGuests.length - 3} more`}
                  </span>
                )}
              </div>
            </div>

            {/* Arrow */}
            <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0 group-hover:text-violet-500 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
