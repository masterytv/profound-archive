"use client";

import { Users, User, Star, Mic } from "lucide-react";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SpeakerRolodexData {
  /** Total experiencers featured across this channel's videos */
  experiencerCount: number;
  /** Total persons of interest discussed across this channel's videos */
  personCount: number;
  /** Experiencers exclusive to this channel (not on any other channel) */
  exclusiveGuestCount: number;
  /** Top speakers by prominence (persons of interest, sorted by total_mentions) */
  topSpeakers: {
    name: string;
    slug: string;
    type: "experiencer" | "person";
    mentions: number;
    href: string;
  }[];
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  value,
  label,
  accent,
}: {
  icon: typeof Users;
  value: number;
  label: string;
  accent: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/10">
      <Icon className={`w-4 h-4 ${accent}`} />
      <span className="text-xl font-black text-slate-900 dark:text-slate-50 tabular-nums">
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SpeakerRolodex({ data }: { data: SpeakerRolodexData }) {
  const { experiencerCount, personCount, exclusiveGuestCount, topSpeakers } = data;

  // Don't render if no guest data at all
  if (experiencerCount === 0 && personCount === 0) return null;

  return (
    <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Mic className="w-4 h-4 text-green-500" />
        <h3
          className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider"
          style={{
            fontFamily: "'Crimson Pro', Georgia, serif",
            letterSpacing: "0.05em",
          }}
        >
          Guest Network
        </h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Experiencers and persons of interest featured across this channel&apos;s videos.
      </p>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard
          icon={Users}
          value={experiencerCount}
          label="Experiencers"
          accent="text-blue-500"
        />
        <StatCard
          icon={User}
          value={personCount}
          label="Persons of Interest"
          accent="text-purple-500"
        />
        <StatCard
          icon={Star}
          value={exclusiveGuestCount}
          label="Exclusive Guests"
          accent="text-amber-500"
        />
      </div>

      {/* Top Speakers */}
      {topSpeakers.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
            Top Speakers
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {topSpeakers.map((speaker) => (
              <Link
                key={`${speaker.type}:${speaker.slug}`}
                href={speaker.href}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/40 dark:border-white/5 hover:border-green-300 dark:hover:border-green-700 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-all group"
              >
                {/* Avatar placeholder — initial letter */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 flex-shrink-0 group-hover:from-green-200 group-hover:to-green-300 dark:group-hover:from-green-800 dark:group-hover:to-green-700 transition-all">
                  {speaker.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
                    {speaker.name}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {speaker.type === "experiencer" ? "Experiencer" : "Person of Interest"}
                    {speaker.mentions > 0 && ` · ${speaker.mentions} mentions`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
