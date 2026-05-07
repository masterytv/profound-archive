"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  RefreshCw,
  RotateCcw,
  Eye,
  AlertTriangle,
  XCircle,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PendingVideo {
  video_id: string;
  title: string;
  channel_name: string | null;
  intake_status: string;
  tier: number;
  date: string | null;
  error_message: string | null;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function UapScannerPendingPage() {
  const [videos, setVideos] = useState<PendingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("failed");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/uap-scanner?view=queue');
      const data = await res.json();
      let items = data.items || [];

      // Apply client-side filter to match the selected tab
      if (filter === "no_captions") {
        items = items.filter((v: any) => v.intake_status === "no_captions");
      } else if (filter === "error") {
        items = items.filter((v: any) => ["failed", "error"].includes(v.intake_status));
      } else if (filter === "out_of_scope") {
        items = items.filter((v: any) => v.intake_status === "out_of_scope");
      }
      // "failed" tab = all failed statuses (default from API)

      setVideos(items.map((v: any) => ({
        video_id: v.video_id,
        title: v.title,
        channel_name: v.channel_name,
        intake_status: v.intake_status,
        tier: v.tier,
        date: v.classified_at || null,
        error_message: v.intake_error || null,
      })));
    } catch (err) {
      console.error('Failed to load pending videos:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const requeueVideo = async (videoId: string) => {
    setActionLoading(videoId);
    try {
      await fetch('/api/admin/uap-scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_item', videoId }),
      });
      fetchPending();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Pending / Failed Intake</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Videos that failed intake or have no captions — {videos.length} found
          </p>
        </div>
        <button
          onClick={fetchPending}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-slate-100 dark:bg-white/10 rounded-lg hover:bg-slate-200 dark:hover:bg-white/15 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: "failed", label: "All Failed" },
          { key: "no_captions", label: "No Captions" },
          { key: "error", label: "Errors Only" },
          { key: "out_of_scope", label: "Out of Scope" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              filter === key
                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700"
                : "bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/10">
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-left">Video</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-left">Channel</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-center">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-center">Tier</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-left">Error</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                  </td>
                </tr>
              ) : videos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No matching videos
                  </td>
                </tr>
              ) : (
                videos.map((v) => (
                  <tr key={v.video_id} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 max-w-[250px]">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate text-xs">
                        {v.title}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">{v.video_id}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 truncate max-w-[120px]">
                      {v.channel_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium ${
                        v.intake_status === "no_captions" ? "text-amber-500" :
                        v.intake_status === "out_of_scope" ? "text-slate-400" :
                        "text-red-500"
                      }`}>
                        {v.intake_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-500">{v.tier}</td>
                    <td className="px-4 py-3 text-xs text-red-400 max-w-[200px] truncate" title={v.error_message ?? ""}>
                      {v.error_message || "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => requeueVideo(v.video_id)}
                        disabled={actionLoading === v.video_id}
                        className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors"
                        title="Re-queue for intake"
                      >
                        {actionLoading === v.video_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4 text-green-500" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
