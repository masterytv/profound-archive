import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

import {
  BarChart3,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
} from "lucide-react";

// LEARNINGS.md: All admin routes MUST use isAdminUser() guard.
// This page is protected by the admin layout.tsx auth check.

async function getUapPipelineStats() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const [
    { count: totalVideos },
    { count: classifiedCount },
    { count: pendingCount },
    { count: outOfScopeCount },
    { count: tier1Count },
    { count: tier2Count },
    { count: tier3Count },
    { count: channelCount },
    { data: recentClassifications },
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
      .select("video_id, title, tier, track, content_type, classified_at")
      .not("classified_at", "is", null)
      .order("classified_at", { ascending: false })
      .limit(10),
  ]);

  return {
    totalVideos: totalVideos || 0,
    classifiedCount: classifiedCount || 0,
    pendingCount: pendingCount || 0,
    outOfScopeCount: outOfScopeCount || 0,
    tier1Count: tier1Count || 0,
    tier2Count: tier2Count || 0,
    tier3Count: tier3Count || 0,
    channelCount: channelCount || 0,
    recentClassifications: recentClassifications || [],
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
