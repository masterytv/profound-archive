import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

import {
  BarChart3,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Users,
  ExternalLink,
  Activity,
  Zap,
  AlertCircle,
  Timer,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { RetryAllFailedButton } from "./retry-failed-button";

// LEARNINGS.md: All admin routes MUST use isAdminUser() guard.
// This page is protected by the admin layout.tsx auth check.

async function getUapPipelineStats() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 24-hour window for "today" metrics
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalVideos },
    { count: classifiedCount },
    { count: pendingCount },
    { count: outOfScopeCount },
    { count: tier1Count },
    { count: tier2Count },
    { count: tier3Count },
    { count: channelCount },
    { count: multiEncounterCount },
    { count: analyzedToday },
    { count: errorsLast24h },
    { count: queuePending },
    { count: queueProcessing },
    { count: drmProtectedCount },
    { data: recentClassifications },
    { data: multiEncounterVideos },
    { data: recentFailures },
  ] = await Promise.all([
    supabase.from("uap_vids").select("*", { count: "exact", head: true }),
    supabase
      .from("uap_vids")
      .select("*", { count: "exact", head: true })
      .not("classified_at", "is", null),
    supabase
      .from("uap_vids")
      .select("*", { count: "exact", head: true })
      .eq("intake_status", "pending"),
    supabase
      .from("uap_vids")
      .select("*", { count: "exact", head: true })
      .eq("intake_status", "out_of_scope"),
    supabase
      .from("uap_vids")
      .select("*", { count: "exact", head: true })
      .eq("tier", 1),
    supabase
      .from("uap_vids")
      .select("*", { count: "exact", head: true })
      .eq("tier", 2),
    supabase
      .from("uap_vids")
      .select("*", { count: "exact", head: true })
      .eq("tier", 3),
    supabase
      .from("uap_channels")
      .select("*", { count: "exact", head: true })
      .eq("hidden", false),
    supabase
      .from("uap_vids")
      .select("*", { count: "exact", head: true })
      .eq("multi_encounter", true),
    // Analyzed today: videos that completed analysis in the last 24h
    supabase
      .from("uap_analysis")
      .select("*", { count: "exact", head: true })
      .gte("analyzed_at", twentyFourHoursAgo),
    // Errors last 24h: videos that failed intake in the last 24h
    supabase
      .from("uap_vids")
      .select("*", { count: "exact", head: true })
      .eq("intake_status", "failed")
      .gte("intake_completed_at", twentyFourHoursAgo),
    // Queue depth: pending items in uap_scan_queue
    supabase
      .from("uap_scan_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    // Queue processing: actively processing
    supabase
      .from("uap_scan_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "processing"),
    // DRM protected count
    supabase
      .from("uap_vids")
      .select("*", { count: "exact", head: true })
      .eq("intake_status", "drm_protected"),
    supabase
      .from("uap_vids")
      .select("video_id, title, tier, track, content_type, classified_at")
      .not("classified_at", "is", null)
      .order("classified_at", { ascending: false })
      .limit(10),
    supabase
      .from("uap_vids")
      .select("video_id, title, tier, content_type, encounter_count, experiencer_name")
      .eq("multi_encounter", true)
      .order("encounter_count", { ascending: false }),
    // Recent failures with intake_error
    supabase
      .from("uap_vids")
      .select("video_id, title, channel_name, intake_status, intake_error, intake_completed_at")
      .in("intake_status", ["failed", "no_captions", "drm_protected"])
      .order("intake_completed_at", { ascending: false })
      .limit(15),
  ]);

  // ETA: ~2 minutes per video (rough estimate from pipeline benchmarks)
  const avgProcessTimeMinutes = 2;
  const queueDepth = (queuePending || 0) + (queueProcessing || 0);
  const etaMinutes = queueDepth * avgProcessTimeMinutes;
  const etaHours = Math.floor(etaMinutes / 60);
  const etaMins = etaMinutes % 60;
  const etaDisplay = queueDepth === 0
    ? "Idle"
    : etaHours > 0
      ? `~${etaHours}h ${etaMins}m`
      : `~${etaMins}m`;

  return {
    totalVideos: totalVideos || 0,
    classifiedCount: classifiedCount || 0,
    pendingCount: pendingCount || 0,
    outOfScopeCount: outOfScopeCount || 0,
    tier1Count: tier1Count || 0,
    tier2Count: tier2Count || 0,
    tier3Count: tier3Count || 0,
    channelCount: channelCount || 0,
    multiEncounterCount: multiEncounterCount || 0,
    recentClassifications: recentClassifications || [],
    multiEncounterVideos: multiEncounterVideos || [],
    // New monitoring fields
    analyzedToday: analyzedToday || 0,
    errorsLast24h: errorsLast24h || 0,
    queueDepth,
    queueProcessing: queueProcessing || 0,
    etaDisplay,
    drmProtectedCount: drmProtectedCount || 0,
    recentFailures: recentFailures || [],
  };
}

export default async function AdminUapDashboard() {
  const stats = await getUapPipelineStats();

  const statCards = [
    {
      label: "Total Videos",
      value: stats.totalVideos,
      icon: Radio,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    {
      label: "Classified",
      value: stats.classifiedCount,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Pending",
      value: stats.pendingCount,
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Out of Scope",
      value: stats.outOfScopeCount,
      icon: XCircle,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
  ];

  const tierCards = [
    {
      label: "Tier 1 (Encounters)",
      value: stats.tier1Count,
      color: "text-violet-400",
      description: "First-person contact accounts",
    },
    {
      label: "Tier 2 (Program)",
      value: stats.tier2Count,
      color: "text-indigo-400",
      description: "Disclosure & research",
    },
    {
      label: "Tier 3 (Excluded)",
      value: stats.tier3Count,
      color: "text-slate-400",
      description: "Out of scope content",
    },
  ];

  // Pipeline health cards
  const healthCards = [
    {
      label: "Analyzed (24h)",
      value: stats.analyzedToday,
      icon: Zap,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      status: stats.analyzedToday > 0 ? "active" : "idle",
    },
    {
      label: "Errors (24h)",
      value: stats.errorsLast24h,
      icon: AlertCircle,
      color: stats.errorsLast24h > 0 ? "text-red-400" : "text-emerald-400",
      bg: stats.errorsLast24h > 0 ? "bg-red-500/10" : "bg-emerald-500/10",
      status: stats.errorsLast24h > 0 ? "error" : "healthy",
    },
    {
      label: "Queue Depth",
      value: stats.queueDepth,
      icon: Timer,
      color: stats.queueDepth > 10 ? "text-amber-400" : "text-slate-400",
      bg: stats.queueDepth > 10 ? "bg-amber-500/10" : "bg-slate-500/10",
      subtitle: stats.queueProcessing > 0 ? `${stats.queueProcessing} active` : undefined,
    },
    {
      label: "ETA",
      value: stats.etaDisplay,
      icon: Activity,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      isText: true,
    },
  ];

  // Status color map for failure badges
  const statusColors: Record<string, string> = {
    failed: "bg-red-500/10 text-red-400",
    no_captions: "bg-amber-500/10 text-amber-400",
    drm_protected: "bg-orange-500/10 text-orange-400",
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
          <Radio className="w-4.5 h-4.5 text-violet-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">UAP Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Pipeline status and classification overview
          </p>
        </div>
      </div>

      {/* Pipeline Health — NEW */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Pipeline Health
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {healthCards.map((card) => (
            <div
              key={card.label}
              className="p-4 rounded-xl border border-white/10 bg-white/[0.02]"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}
                >
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
                {"status" in card && (
                  <span
                    className={`ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      card.status === "active"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : card.status === "error"
                        ? "bg-red-500/10 text-red-400"
                        : card.status === "healthy"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-slate-500/10 text-slate-400"
                    }`}
                  >
                    {card.status}
                  </span>
                )}
              </div>
              {"isText" in card && card.isText ? (
                <div className="text-lg font-bold text-foreground">
                  {card.value}
                </div>
              ) : (
                <div className="text-2xl font-bold text-foreground">
                  {typeof card.value === "number"
                    ? card.value.toLocaleString()
                    : card.value}
                </div>
              )}
              <div className="text-xs text-muted-foreground">{card.label}</div>
              {"subtitle" in card && card.subtitle && (
                <div className="text-[10px] text-blue-400 mt-0.5">
                  {card.subtitle}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="p-4 rounded-xl border border-white/10 bg-white/[0.02]"
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}
              >
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {card.value.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Tier Breakdown */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">
          Tier Breakdown
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {tierCards.map((card) => (
            <div
              key={card.label}
              className="p-4 rounded-xl border border-white/10 bg-white/[0.02]"
            >
              <div className={`text-2xl font-bold ${card.color}`}>
                {card.value.toLocaleString()}
              </div>
              <div className="text-sm font-medium text-foreground">
                {card.label}
              </div>
              <div className="text-xs text-muted-foreground">
                {card.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Failures — NEW */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Recent Failures ({stats.recentFailures.length})
            </h2>
            {stats.drmProtectedCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-medium">
                {stats.drmProtectedCount} DRM
              </span>
            )}
          </div>
          <RetryAllFailedButton />
        </div>
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="text-left p-3 text-muted-foreground font-medium">Title</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Channel</th>
                <th className="text-center p-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Error</th>
                <th className="text-left p-3 text-muted-foreground font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentFailures.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      No recent failures. Pipeline is healthy.
                    </div>
                  </td>
                </tr>
              ) : (
                stats.recentFailures.map((video: any) => (
                  <tr
                    key={video.video_id}
                    className="border-b border-white/5 hover:bg-white/[0.02]"
                  >
                    <td className="p-3 max-w-[200px]">
                      <Link
                        href={`/uap/video/${video.video_id}`}
                        className="text-foreground hover:text-violet-400 transition-colors text-xs truncate block"
                      >
                        {video.title || video.video_id}
                      </Link>
                      <span className="text-[10px] text-muted-foreground/50 font-mono">
                        {video.video_id}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground truncate max-w-[120px]">
                      {video.channel_name || "—"}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          statusColors[video.intake_status] || "bg-slate-500/10 text-slate-400"
                        }`}
                      >
                        {video.intake_status?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-red-400/80 max-w-[200px] truncate" title={video.intake_error ?? ""}>
                      {video.intake_error || "—"}
                    </td>
                    <td className="p-3 text-[10px] text-muted-foreground whitespace-nowrap">
                      {video.intake_completed_at
                        ? new Date(video.intake_completed_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Encounter Videos — Frontier Re-Analysis Queue */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Multi-Encounter Videos ({stats.multiEncounterCount})
          </h2>
          <span className="text-xs text-muted-foreground">— Candidates for frontier model re-analysis</span>
        </div>
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="text-left p-3 text-muted-foreground font-medium">Title</th>
                <th className="text-center p-3 text-muted-foreground font-medium w-24">Encounters</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Tier</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Experiencers</th>
                <th className="text-center p-3 text-muted-foreground font-medium w-16">View</th>
              </tr>
            </thead>
            <tbody>
              {stats.multiEncounterVideos.map((video: any) => (
                <tr
                  key={video.video_id}
                  className="border-b border-white/5 hover:bg-white/[0.02]"
                >
                  <td className="p-3 text-foreground max-w-xs truncate">
                    {video.title || video.video_id}
                  </td>
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/10 text-amber-400 font-bold text-sm">
                      {video.encounter_count}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        video.tier === 1
                          ? "bg-violet-500/10 text-violet-400"
                          : video.tier === 2
                          ? "bg-indigo-500/10 text-indigo-400"
                          : "bg-slate-500/10 text-slate-400"
                      }`}
                    >
                      Tier {video.tier}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs max-w-xs truncate">
                    {video.experiencer_name || "—"}
                  </td>
                  <td className="p-3 text-center">
                    <Link
                      href={`/uap/video/${video.video_id}`}
                      className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
              {stats.multiEncounterVideos.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    No multi-encounter videos detected yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">
          Recent Classifications
        </h2>
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="text-left p-3 text-muted-foreground font-medium">
                  Title
                </th>
                <th className="text-left p-3 text-muted-foreground font-medium">
                  Tier
                </th>
                <th className="text-left p-3 text-muted-foreground font-medium">
                  Track
                </th>
                <th className="text-left p-3 text-muted-foreground font-medium">
                  Type
                </th>
                <th className="text-left p-3 text-muted-foreground font-medium">
                  Classified
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.recentClassifications.map((video) => (
                <tr
                  key={video.video_id}
                  className="border-b border-white/5 hover:bg-white/[0.02]"
                >
                  <td className="p-3 text-foreground max-w-xs truncate">
                    {video.title || video.video_id}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        video.tier === 1
                          ? "bg-violet-500/10 text-violet-400"
                          : video.tier === 2
                          ? "bg-indigo-500/10 text-indigo-400"
                          : "bg-slate-500/10 text-slate-400"
                      }`}
                    >
                      Tier {video.tier}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground capitalize">
                    {video.track || "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {video.content_type?.replace(/_/g, " ") || "—"}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {video.classified_at
                      ? new Date(video.classified_at).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
              {stats.recentClassifications.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center text-muted-foreground"
                  >
                    No classifications yet. Run the batch classifier to get
                    started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
