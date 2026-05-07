"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  RefreshCw,
  RotateCcw,
  SkipForward,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface QueueItem {
  id: number;
  video_id: string;
  video_url: string;
  channel_id: string;
  title: string | null;
  status: string;
  created_at: string;
  processed_at: string | null;
  intake_result: string | null;
  error: string | null;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function UapScannerQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const supabase = createClient();

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("uap_scan_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data } = await query;
      setItems((data ?? []) as QueueItem[]);
    } finally {
      setLoading(false);
    }
  }, [supabase, filter]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const retryItem = async (id: number) => {
    setActionLoading(id);
    try {
      await supabase
        .from("uap_scan_queue")
        .update({ status: "pending", error: null, processed_at: null })
        .eq("id", id);
      fetchQueue();
    } finally {
      setActionLoading(null);
    }
  };

  const skipItem = async (id: number) => {
    setActionLoading(id);
    try {
      await supabase
        .from("uap_scan_queue")
        .update({ status: "skipped" })
        .eq("id", id);
      fetchQueue();
    } finally {
      setActionLoading(null);
    }
  };

  // Group counts
  const statusCounts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  const statusColor: Record<string, string> = {
    pending: "text-amber-500",
    processing: "text-blue-500",
    complete: "text-emerald-500",
    failed: "text-red-500",
    skipped: "text-slate-400",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Scanner Queue</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            View, retry, and skip items in the UAP scan queue
          </p>
        </div>
        <button
          onClick={fetchQueue}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-slate-100 dark:bg-white/10 rounded-lg hover:bg-slate-200 dark:hover:bg-white/15 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["all", "pending", "processing", "complete", "failed", "skipped"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              filter === status
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700"
                : "bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== "all" && statusCounts[status] ? ` (${statusCounts[status]})` : ""}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/10">
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-left">Video</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-center">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-left">Result</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-left">Error</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-center">Age</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No items in queue
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 max-w-[250px]">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate text-xs">
                        {item.title || item.video_id}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">{item.video_id}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium ${statusColor[item.status] || "text-slate-500"}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[120px] truncate">
                      {item.intake_result || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-red-400 max-w-[200px] truncate" title={item.error ?? ""}>
                      {item.error || "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-400">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.status === "failed" && (
                        <div className="flex items-center gap-1 justify-center">
                          <button
                            onClick={() => retryItem(item.id)}
                            disabled={actionLoading === item.id}
                            className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors"
                            title="Retry"
                          >
                            {actionLoading === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RotateCcw className="w-4 h-4 text-green-500" />
                            )}
                          </button>
                          <button
                            onClick={() => skipItem(item.id)}
                            disabled={actionLoading === item.id}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                            title="Skip"
                          >
                            <SkipForward className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                      )}
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
