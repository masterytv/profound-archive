import { createClient as createAnonClient } from "@supabase/supabase-js";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import type { ChannelScorePoint } from "@/components/uap/ChannelUniverseMap";
import { InteractiveUniverseSection } from "@/components/uap/InteractiveUniverseSection";

export const revalidate = 86400; // ISR: once per day

export const metadata: Metadata = {
  title: "Channel Universe Map — UAP Archive | Project Profound",
  description:
    "Interactive visualization mapping all UAP channels by Intelligence Value and Speaker Credibility. See where every channel sits in the research landscape.",
};

function buildClient() {
  return createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

async function getAllChannelScores(): Promise<ChannelScorePoint[]> {
  const supabase = buildClient();

  const { data: scores } = await supabase
    .from("uap_channel_scores")
    .select(
      "channel_id, intelligence_value, credibility_score, letter_grade, archetype_primary, personality_code",
    );

  if (!scores) return [];

  const channelIds = scores.map((d: { channel_id: string }) => d.channel_id);
  const { data: channels } = await supabase
    .from("uap_channels")
    .select("channel_id, channel_name, subscriber_count, avatar_url")
    .in("channel_id", channelIds)
    .eq("hidden", false);

  const channelMap: Record<
    string,
    { channel_name: string; subscriber_count: number | null; avatar_url: string | null }
  > = {};
  for (const ch of channels ?? []) {
    channelMap[ch.channel_id] = ch;
  }

  return scores
    .filter((d: { channel_id: string }) => channelMap[d.channel_id])
    .map((d: Record<string, unknown>) => ({
      ...d,
      channel_name: channelMap[d.channel_id as string]?.channel_name ?? "Unknown",
      subscriber_count: channelMap[d.channel_id as string]?.subscriber_count ?? null,
      avatar_url: channelMap[d.channel_id as string]?.avatar_url ?? null,
    })) as ChannelScorePoint[];
}

export default async function ChannelUniversePage() {
  const channels = await getAllChannelScores();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Breadcrumb */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-6xl">
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 py-3">
            <Link
              href="/uap"
              className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
            >
              UAP
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link
              href="/uap/channels"
              className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
            >
              Channels
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              Universe Map
            </span>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 max-w-6xl py-8">
        <div className="mb-8">
          <h1
            className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 mb-3"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            Channel Universe Map
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
            Every UAP channel in our archive, mapped on two dimensions. The X-axis measures{" "}
            <strong>Speaker/Source Credibility</strong> (sourcing diversity, evidence quality,
            program depth). The Y-axis measures{" "}
            <strong>Intelligence Value</strong> (analytical depth, claims density, investigative
            rigor). Color indicates the channel&apos;s focus area.
          </p>
        </div>

        <InteractiveUniverseSection channels={channels} />

        {/* Stats */}
        <div className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
          {channels.length} channels mapped. Scores computed from{" "}
          <Link
            href="/uap/channels/methodology"
            className="text-green-600 dark:text-green-400 hover:underline"
          >
            our AI analysis pipeline
          </Link>
          . Updated daily.
        </div>
      </div>
    </div>
  );
}
