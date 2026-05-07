import { createClient as createAnonClient } from "@supabase/supabase-js";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Users, TrendingUp, Radio } from "lucide-react";

export const metadata: Metadata = {
  title: "UAP Channels | Project Profound",
  description:
    "Browse YouTube channels covering UFO encounters, UAP disclosure, and consciousness research — analyzed by Project Profound.",
};

function buildClient() {
  return createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

interface ChannelStat {
  channel_id: string;
  channel_name: string;
  track: string | null;
  avatar_url: string | null;
  video_count: number;
  avg_evidence_score: number | null;
  avg_contact_depth: number | null;
  avg_transformation_score: number | null;
  tier1_count: number;
  tier2_count: number;
}

export default async function UapChannelsPage() {
  const supabase = buildClient();
  const { data: channels, error } = await supabase.rpc("get_uap_channel_stats");

  const stats = (channels ?? []) as ChannelStat[];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm">
        <div className="container mx-auto px-4 max-w-6xl py-6">
          <nav className="text-sm text-slate-400 dark:text-slate-500 mb-4">
            <Link href="/uap" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">UAP</Link>
            <span className="mx-1.5">›</span>
            <span className="text-slate-600 dark:text-slate-300">Channels</span>
          </nav>
          <h1
            className="text-3xl font-bold text-slate-900 dark:text-slate-50"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            UAP Channels
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-lg">
            YouTube channels covering UFO encounters, government disclosure, and consciousness research.
          </p>
          <div className="flex items-center gap-4 mt-4 text-sm text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1.5">
              <Radio className="w-4 h-4" /> {stats.length} channels
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" /> {stats.reduce((sum, c) => sum + c.video_count, 0).toLocaleString()} videos
            </span>
          </div>
        </div>
      </div>

      {/* Channel Grid */}
      <div className="container mx-auto px-4 max-w-6xl py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((ch) => (
            <Link
              key={ch.channel_id}
              href={`/uap/channels/${ch.channel_id}`}
              className="group bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 p-5 hover:shadow-lg hover:border-green-300 dark:hover:border-green-700 transition-all"
            >
              {/* Avatar + Name */}
              <div className="flex items-center gap-3 mb-3">
                {ch.avatar_url ? (
                  <Image
                    src={ch.avatar_url}
                    alt={ch.channel_name}
                    width={44}
                    height={44}
                    className="rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {ch.channel_name?.charAt(0) || "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                    {ch.channel_name}
                  </h2>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {ch.video_count} {ch.video_count === 1 ? "video" : "videos"}
                  </p>
                </div>
              </div>

              {/* Tier breakdown */}
              <div className="flex items-center gap-2 mb-3">
                {ch.tier1_count > 0 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                    {ch.tier1_count} encounters
                  </span>
                )}
                {ch.tier2_count > 0 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                    {ch.tier2_count} programs
                  </span>
                )}
              </div>

              {/* Average scores (if available) */}
              {ch.avg_evidence_score && (
                <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    <span>Avg ESS: {ch.avg_evidence_score}</span>
                  </div>
                  {ch.avg_contact_depth && (
                    <span>CDS: {ch.avg_contact_depth}</span>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>

        {stats.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-400 dark:text-slate-500">No channels found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
