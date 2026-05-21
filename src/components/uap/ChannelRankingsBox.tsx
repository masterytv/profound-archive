import {
  Trophy,
  Eye,
  MessageCircle,
  Zap,
  BarChart3,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChannelRankingsData {
  archive_rank: number | null;
  views_rank: number | null;
  engagement_vs_avg: number | null;
  volume_intensity: number | null;
  views_per_video: number | null;
  views_per_video_vs_avg: number | null;
  posting_cadence: string | null;
  total_channels: number;
}

interface ChannelRankingsBoxProps {
  data: ChannelRankingsData;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getRankBadge(rank: number | null, totalChannels: number) {
  if (rank == null) return null;

  if (rank <= 5) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
        <Trophy className="w-3 h-3" /> Top 5
      </span>
    );
  }
  if (rank <= 10) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
        <Trophy className="w-3 h-3" /> Top 10
      </span>
    );
  }
  if (rank <= 25) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
        Top 25
      </span>
    );
  }

  return (
    <span className="text-[10px] text-slate-400 dark:text-slate-500">
      #{rank} of {totalChannels}
    </span>
  );
}

function formatCadence(cadence: string | null): string {
  if (!cadence) return "Unknown";
  return cadence.charAt(0).toUpperCase() + cadence.slice(1);
}

function formatRatio(ratio: number | null): string {
  if (ratio == null) return "N/A";
  return `${ratio.toFixed(1)}×`;
}

function formatViewsPerVideo(vpv: number | null): string {
  if (vpv == null) return "N/A";
  const n = Number(vpv);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ChannelRankingsBox({ data }: ChannelRankingsBoxProps) {
  const metrics = [
    {
      icon: Trophy,
      label: "Archive Rank",
      value: data.archive_rank ? `#${data.archive_rank}` : "N/A",
      badge: getRankBadge(data.archive_rank, data.total_channels),
      sublabel: "By number of videos in archive",
    },
    {
      icon: Eye,
      label: "Views Rank",
      value: data.views_rank ? `#${data.views_rank}` : "N/A",
      badge: getRankBadge(data.views_rank, data.total_channels),
      sublabel: "By total view count",
    },
    {
      icon: MessageCircle,
      label: "Engagement",
      value: formatRatio(data.engagement_vs_avg),
      badge: null,
      sublabel: data.engagement_vs_avg != null
        ? `${Number(data.engagement_vs_avg) >= 1 ? "Above" : "Below"} archive average`
        : "Comments-to-views ratio vs archive",
    },
    {
      icon: Zap,
      label: "Publishing Pace",
      value: formatCadence(data.posting_cadence),
      badge: data.volume_intensity != null ? (
        <span className="text-[10px] text-slate-400 dark:text-slate-500">
          {Number(data.volume_intensity).toFixed(1)} videos/month
        </span>
      ) : null,
      sublabel: "How frequently this channel publishes",
    },
    {
      icon: BarChart3,
      label: "Views per Video",
      value: formatViewsPerVideo(data.views_per_video),
      badge: data.views_per_video_vs_avg != null ? (
        <span className={`text-[10px] font-medium ${Number(data.views_per_video_vs_avg) >= 1 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
          {formatRatio(data.views_per_video_vs_avg)} vs avg
        </span>
      ) : null,
      sublabel: "Average views per archived video",
    },
  ];

  return (
    <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm p-5">
      <h3
        className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4"
        style={{ fontFamily: "'Crimson Pro', Georgia, serif", letterSpacing: "0.05em" }}
      >
        Archive Rankings
      </h3>
      <div className="space-y-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-white/5"
          >
            <m.icon className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {m.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {m.value}
                  </span>
                  {m.badge}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {m.sublabel}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3 leading-relaxed">
        Rankings are based on UFO/UAP-related videos in the Profound Archive, not the channel&apos;s full YouTube catalog. Many channels cover topics beyond UFO/UAP, so only relevant content is included.
      </p>
    </div>
  );
}
