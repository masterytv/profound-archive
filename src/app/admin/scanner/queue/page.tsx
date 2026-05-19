"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  RefreshCw,
  RotateCcw,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
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

interface QueueResponse {
  items: QueueItem[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    byResult: Record<string, number>;
    byError: Record<string, number>;
  };
  statusCounts: Record<string, number>;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_TABS = ["all", "pending", "processing", "complete", "failed", "skipped"] as const;

const statusColor: Record<string, string> = {
  pending: "text-amber-500",
  processing: "text-blue-500",
  complete: "text-emerald-500",
  failed: "text-red-500",
  skipped: "text-slate-400",
};

/** Map raw error strings to clean display labels */
function normalizeError(error: string | null): string {
  if (!error) return "";
  const e = error.toLowerCase();
  if (e.includes("statement timeout")) return "Statement Timeout";
  if (e.includes("not found on youtube")) return "Video Not Found";
  if (e.includes("503")) return "Server Error (503)";
  if (e.includes("502")) return "Server Error (502)";
  if (e.includes("region")) return "Region Restricted";
  if (e.includes("timed out") || e.includes("timeout")) return "Timeout";
  if (e.includes("transcript unavailable")) return "Transcript Unavailable";
  if (e.includes("no_captions")) return "No Captions";
  return error.slice(0, 50);
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function NdeScannerQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [facets, setFacets] = useState<QueueResponse["facets"]>({ byResult: {}, byError: {} });
  const [subFilter, setSubFilter] = useState<string | null>(null);
  const [errorFilter, setErrorFilter] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        view: "queue",
        filter,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (subFilter) params.set("subFilter", subFilter);
      if (errorFilter) params.set("errorFilter", errorFilter);

      const res = await fetch(`/api/admin/scanner?${params}`);
      const data: QueueResponse = await res.json();
      setItems(data.items || []);
      setTotal(data.total ?? 0);
      setStatusCounts(data.statusCounts || {});
      setFacets(data.facets || { byResult: {}, byError: {} });
    } catch (err) {
      console.error("Failed to load NDE scan queue:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, page, pageSize, subFilter, errorFilter]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const changeFilter = (newFilter: string) => {
    setFilter(newFilter);
    setPage(1);
    setSubFilter(null);
    setErrorFilter(null);
  };

  const changeSubFilter = (key: string | null) => {
    setSubFilter(prev => prev === key ? null : key);
    setErrorFilter(null);
    setPage(1);
  };

  const changeErrorFilter = (key: string | null) => {
    setErrorFilter(prev => prev === key ? null : key);
    setSubFilter(null);
    setPage(1);
  };

  const retryItem = async (id: number) => {
    setActionLoading(id);
    try {
      const item = items.find(i => i.id === id);
      if (item) {
        await fetch("/api/admin/scanner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reset_item", videoId: item.video_id }),
        });
      }
      fetchQueue();
    } finally {
      setActionLoading(null);
    }
  };

  const skipItem = async (id: number) => {
    setActionLoading(id);
    try {
      await fetch("/api/admin/scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "skip_item", id }),
      });
      fetchQueue();
    } finally {
      setActionLoading(null);
    }
  };

  const batchRetryFiltered = async () => {
    const filterDesc = subFilter || errorFilter || filter;
    if (!confirm(`Retry ${total} items matching "${filterDesc}"? They will be re-queued as pending.`)) return;
    setBatchLoading(true);
    try {
      await fetch("/api/admin/scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch_retry_filtered",
          status: filter,
          intakeResult: subFilter || undefined,
          errorPattern: errorFilter || undefined,
        }),
      });
      setSubFilter(null);
      setErrorFilter(null);
      setPage(1);
      fetchQueue();
    } finally {
      setBatchLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showSubFilters = filter === "failed" || filter === "skipped";
  const canBatchRetry = showSubFilters && (subFilter || errorFilter) && total > 0;

  // Build facet chips
  const facetChips: { label: string; count: number; type: "result" | "error"; key: string }[] = [];
  if (showSubFilters) {
    for (const [key, count] of Object.entries(facets.byResult)) {
      if (key === "__none__") continue;
      const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      facetChips.push({ label, count, type: "result", key });
    }
    for (const [key, count] of Object.entries(facets.byError)) {
      facetChips.push({ label: key, count, type: "error", key });
    }
    facetChips.sort((a, b) => b.count - a.count);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">NDE Scanner Queue</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {total.toLocaleString()} items {filter !== "all" ? `(${filter})` : ""} &middot; Page {page} of {totalPages}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="px-2 py-1.5 text-xs rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 dark:[color-scheme:dark]"
          >
            <option value={25}>25/page</option>
            <option value={50}>50/page</option>
            <option value={100}>100/page</option>
          </select>
          <button
            onClick={fetchQueue}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-slate-100 dark:bg-white/10 rounded-lg hover:bg-slate-200 dark:hover:bg-white/15 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Status tab filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_TABS.map((status) => {
          const count = status === "all"
            ? Object.values(statusCounts).reduce((a, b) => a + b, 0)
            : statusCounts[status] || 0;
          return (
            <button
              key={status}
              onClick={() => changeFilter(status)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                filter === status
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700"
                  : "bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {` (${count.toLocaleString()})`}
            </button>
          );
        })}
      </div>

      {/* Sub-filter chips (for failed/skipped) */}
      {showSubFilters && facetChips.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Filter by reason:</span>
            {(subFilter || errorFilter) && (
              <button
                onClick={() => { setSubFilter(null); setErrorFilter(null); setPage(1); }}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {facetChips.map((chip) => {
              const isActive =
                (chip.type === "result" && subFilter === chip.key) ||
                (chip.type === "error" && errorFilter === chip.key);
              return (
                <button
                  key={`${chip.type}-${chip.key}`}
                  onClick={() =>
                    chip.type === "result"
                      ? changeSubFilter(chip.key)
                      : changeErrorFilter(chip.key)
                  }
                  className={`px-2.5 py-1 text-[11px] rounded-full font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700"
                      : "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
                  }`}
                >
                  {chip.label} ({chip.count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Batch retry button */}
      {canBatchRetry && (
        <div className="mb-4">
          <button
            onClick={batchRetryFiltered}
            disabled={batchLoading}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50"
          >
            {batchLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            Retry All {total.toLocaleString()} Matching
          </button>
        </div>
      )}

      {/* Table */}
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
                    No items match current filters
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
                      {item.intake_result?.replace(/_/g, " ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-red-400 max-w-[200px] truncate" title={item.error ?? ""}>
                      {normalizeError(item.error) || "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-400">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(item.status === "failed" || item.status === "skipped") && (
                        <div className="flex items-center gap-1 justify-center">
                          <button
                            onClick={() => retryItem(item.id)}
                            disabled={actionLoading === item.id}
                            className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors"
                            title="Retry — re-queue for processing"
                          >
                            {actionLoading === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RotateCcw className="w-4 h-4 text-green-500" />
                            )}
                          </button>
                          {item.status === "failed" && (
                            <button
                              onClick={() => skipItem(item.id)}
                              disabled={actionLoading === item.id}
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                              title="Skip"
                            >
                              <SkipForward className="w-4 h-4 text-slate-400" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-white/10">
            <p className="text-xs text-slate-500">
              Showing {((page - 1) * pageSize + 1).toLocaleString()}–{Math.min(page * pageSize, total).toLocaleString()} of {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2 py-1 text-xs rounded bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-white/10"
              >
                First
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-white/10"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {(() => {
                const pages: number[] = [];
                const start = Math.max(1, page - 2);
                const end = Math.min(totalPages, page + 2);
                for (let i = start; i <= end; i++) pages.push(i);
                return pages.map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                      p === page
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"
                        : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10"
                    }`}
                  >
                    {p}
                  </button>
                ));
              })()}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-white/10"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-2 py-1 text-xs rounded bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-white/10"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
