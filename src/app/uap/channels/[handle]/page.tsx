import { createClient as createAnonClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  ChevronRight,
  Play,
  ExternalLink,
  Calendar,
  Eye,
  Users,
} from "lucide-react";

// ─── Build Client (SSG-safe) ────────────────────────────────────────────────

function buildClient() {
  return createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ handle: string }>;
}

interface ChannelRow {
  channel_id: string;
  channel_name: string;
  description: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  custom_url: string | null;
  subscriber_count: number | null;
  total_view_count: number | null;
  video_count: number | null;
}

interface VideoRow {
  video_id: string;
  title: string;
  thumbnail_url: string | null;
  date: string | null;
  view_count: number | null;
  tier: number;
  track: string | null;
  content_type: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCount(n: number | null): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDate(d: string | null): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function videoRoute(video: VideoRow): string {
  return `/uap/video/${video.video_id}`;
}

// ─── Data Fetching ──────────────────────────────────────────────────────────

async function getChannel(channelId: string) {
  const supabase = buildClient();

  const { data: channel } = await supabase
    .from("uap_channels")
    .select("channel_id, channel_name, description, avatar_url, banner_url, custom_url, subscriber_count, total_view_count, video_count")
    .eq("channel_id", channelId)
    .eq("hidden", false)
    .single();

  if (!channel) return null;

  // Fetch videos for this channel (Tier 1 + 2 only, sorted by date descending)
  const { data: videos } = await supabase
    .from("uap_vids")
    .select("video_id, title, thumbnail_url, date, view_count, tier, track, content_type")
    .eq("channel_id", channelId)
    .in("tier", [1, 2])
    .order("date", { ascending: false })
    .limit(60);

  return { channel: channel as ChannelRow, videos: (videos ?? []) as VideoRow[] };
}

// ─── Metadata ───────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const result = await getChannel(handle);
  if (!result) return { title: "Channel Not Found | Project Profound" };

  const { channel } = result;
  const title = `${channel.channel_name} — UAP Channel | Project Profound`;
  const description = channel.description?.slice(0, 160) ??
    `Browse ${channel.channel_name}'s UAP content on Project Profound.`;

  return {
    title,
    description,
    openGraph: {
      title: channel.channel_name,
      description,
      images: channel.avatar_url ? [channel.avatar_url] : undefined,
    },
  };
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default async function UapChannelDetailPage({ params }: PageProps) {
  const { handle } = await params;
  const result = await getChannel(handle);
  if (!result) notFound();

  const { channel, videos } = result;
  const tier1Videos = videos.filter((v) => v.tier === 1);
  const tier2Videos = videos.filter((v) => v.tier === 2);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* JSON-LD: Organization structured data for channel pages */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: channel.channel_name,
            description: channel.description?.slice(0, 300) ?? `UAP research channel: ${channel.channel_name}`,
            ...(channel.avatar_url && { logo: channel.avatar_url }),
            ...(channel.custom_url && { url: `https://youtube.com/${channel.custom_url}` }),
            isPartOf: {
              "@type": "WebSite",
              name: "Project Profound",
              url: "https://projectprofound.org",
            },
          }),
        }}
      />
      {/* Breadcrumb */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-6xl">
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 py-3">
            <Link href="/uap" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">UAP</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/uap/channels" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Channels</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-xs">{channel.channel_name}</span>
          </nav>
        </div>
      </div>

      {/* Channel Header */}
      <div className="container mx-auto px-4 max-w-6xl py-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
          {channel.avatar_url ? (
            <Image
              src={channel.avatar_url}
              alt={channel.channel_name}
              width={88}
              height={88}
              className="rounded-full flex-shrink-0 border-4 border-white dark:border-slate-800 shadow-md"
            />
          ) : (
            <div className="w-[88px] h-[88px] rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-3xl flex-shrink-0 shadow-md">
              {channel.channel_name?.charAt(0) || "?"}
            </div>
          )}
          <div className="text-center sm:text-left">
            <h1
              className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 leading-tight mb-2"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              {channel.channel_name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mb-3 justify-center sm:justify-start">
              {channel.subscriber_count && (
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> {formatCount(channel.subscriber_count)} subscribers
                </span>
              )}
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> {formatCount(channel.total_view_count)} views
              </span>
              <span>{videos.length} videos in archive</span>
            </div>
            {channel.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl line-clamp-3">
                {channel.description}
              </p>
            )}
            {channel.custom_url && (
              <a
                href={`https://youtube.com/${channel.custom_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400 hover:underline font-medium mt-3"
              >
                <ExternalLink className="w-3.5 h-3.5" /> View on YouTube
              </a>
            )}
          </div>
        </div>

        {/* Tier 1: Encounters */}
        {tier1Videos.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
              Encounters ({tier1Videos.length})
            </h2>
            <VideoGrid videos={tier1Videos} />
          </section>
        )}

        {/* Tier 2: Programs */}
        {tier2Videos.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
              Research & Disclosure ({tier2Videos.length})
            </h2>
            <VideoGrid videos={tier2Videos} />
          </section>
        )}

        {videos.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-400 dark:text-slate-500">No videos in the archive for this channel yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Video Grid ─────────────────────────────────────────────────────────────

function VideoGrid({ videos }: { videos: VideoRow[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {videos.map((video) => (
        <Link
          key={video.video_id}
          href={videoRoute(video)}
          className="group bg-white dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/10 overflow-hidden hover:shadow-md hover:border-green-300/60 dark:hover:border-green-600/30 transition-all"
        >
          <div className="relative w-full aspect-video bg-slate-100 dark:bg-slate-800">
            {video.thumbnail_url ? (
              <Image
                src={video.thumbnail_url}
                alt={video.title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="w-6 h-6 text-slate-400" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="white" />
            </div>
            {/* Tier badge overlay */}
            <div className="absolute top-1.5 left-1.5">
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                video.tier === 1
                  ? "bg-green-600/90 text-white"
                  : "bg-slate-800/80 text-slate-200"
              }`}>
                {video.tier === 1 ? "Encounter" : "Research"}
              </span>
            </div>
          </div>
          <div className="p-3">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-50 line-clamp-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors leading-snug">
              {video.title}
            </p>
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              {video.date && (
                <span className="flex items-center gap-0.5">
                  <Calendar className="w-3 h-3" /> {formatDate(video.date)}
                </span>
              )}
              {video.view_count && (
                <span>{formatCount(video.view_count)} views</span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
