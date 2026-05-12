"use client";

/**
 * UAP Admin Classifier Review Page
 *
 * Copy-Modify from: src/app/admin/uap/page.tsx (admin pattern)
 * Reference: SPRINT.md Story 2.5.1
 *
 * Interactive table of all classified UAP videos with:
 * - Filter by tier (1/2/3), track, intake_status
 * - Inline edit: click to override tier/track with confirmation
 * - Paginated table with search
 */

import { useState, useEffect, useCallback } from "react";
import {
  Radio,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────

interface ClassifiedVideo {
  video_id: string;
  title: string;
  tier: number | null;
  track: string | null;
  content_type: string | null;
  intake_status: string | null;
  classified_at: string | null;
  classifier_model: string | null;
}

interface Filters {
  tier: number | null;
  track: string | null;
  intake_status: string | null;
  search: string;
}

const PAGE_SIZE = 25;

// ─── Component ───────────────────────────────────────────────────────────

export default function AdminClassifierReview() {
  const [videos, setVideos] = useState<ClassifiedVideo[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    tier: null,
    track: null,
    intake_status: null,
    search: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    tier: number;
    track: string;
  }>({ tier: 1, track: "encounter" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch Videos ──────────────────────────────────────────────────────

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (filters.tier !== null) params.set("tier", String(filters.tier));
      if (filters.track) params.set("track", filters.track);
      if (filters.intake_status)
        params.set("intake_status", filters.intake_status);
      if (filters.search) params.set("search", filters.search);

      const res = await fetch(`/api/admin/uap-classifier?${params}`);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      const data = await res.json();
      setVideos(data.videos);
      setTotalCount(data.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch videos");
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // ─── Override Handler ──────────────────────────────────────────────────

  const handleOverride = async (videoId: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/uap-classifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "override",
          video_id: videoId,
          tier: editValues.tier,
          track: editValues.track,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed: ${res.status}`);
      }
      setEditingId(null);
      await fetchVideos(); // Refresh table
    } catch (err) {
      setError(err instanceof Error ? err.message : "Override failed");
    } finally {
      setSaving(false);
    }
  };

  // ─── Filter Helpers ────────────────────────────────────────────────────

  const updateFilter = (key: keyof Filters, value: unknown) => {
    setPage(0);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setPage(0);
    setFilters({ tier: null, track: null, intake_status: null, search: "" });
  };

  const hasActiveFilters =
    filters.tier !== null ||
    filters.track !== null ||
    filters.intake_status !== null ||
    filters.search !== "";

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ─── Tier Badge ────────────────────────────────────────────────────────

  const tierBadge = (tier: number | null) => {
    const styles: Record<number, string> = {
      1: "bg-violet-500/10 text-violet-400",
      2: "bg-indigo-500/10 text-indigo-400",
      3: "bg-slate-500/10 text-slate-400",
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          styles[tier ?? 0] ?? "bg-slate-500/10 text-slate-400"
        }`}
      >
        {tier ? `Tier ${tier}` : "—"}
      </span>
    );
  };

  const statusBadge = (status: string | null) => {
    const styles: Record<string, string> = {
      complete: "bg-emerald-500/10 text-emerald-400",
      pending: "bg-amber-500/10 text-amber-400",
      out_of_scope: "bg-red-500/10 text-red-400",
      no_captions: "bg-slate-500/10 text-slate-400",
      drm_protected: "bg-amber-500/10 text-amber-400",
      is_short: "bg-slate-500/10 text-slate-400",
      failed: "bg-red-500/10 text-red-400",
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          styles[status ?? ""] ?? "bg-slate-500/10 text-slate-400"
        }`}
      >
        {status?.replace(/_/g, " ") || "—"}
      </span>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
          <Radio className="w-4.5 h-4.5 text-violet-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Classifier Review
          </h1>
          <p className="text-sm text-muted-foreground">
            Review and override video classifications
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto hover:text-red-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title or video ID..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:[color-scheme:dark]"
          />
        </div>

        {/* Tier Filter */}
        <select
          value={filters.tier ?? ""}
          onChange={(e) =>
            updateFilter(
              "tier",
              e.target.value ? Number(e.target.value) : null
            )
          }
          className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] text-sm text-foreground dark:[color-scheme:dark]"
        >
          <option value="">All Tiers</option>
          <option value="1">Tier 1 (Encounters)</option>
          <option value="2">Tier 2 (Program)</option>
          <option value="3">Tier 3 (Excluded)</option>
        </select>

        {/* Track Filter */}
        <select
          value={filters.track ?? ""}
          onChange={(e) =>
            updateFilter("track", e.target.value || null)
          }
          className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] text-sm text-foreground dark:[color-scheme:dark]"
        >
          <option value="">All Tracks</option>
          <option value="encounter">Encounter</option>
          <option value="program">Program</option>
        </select>

        {/* Status Filter */}
        <select
          value={filters.intake_status ?? ""}
          onChange={(e) =>
            updateFilter("intake_status", e.target.value || null)
          }
          className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] text-sm text-foreground dark:[color-scheme:dark]"
        >
          <option value="">All Statuses</option>
          <option value="complete">Complete</option>
          <option value="pending">Pending</option>
          <option value="out_of_scope">Out of Scope</option>
          <option value="no_captions">No Captions</option>
          <option value="drm_protected">DRM Protected</option>
          <option value="is_short">Short</option>
          <option value="failed">Failed</option>
        </select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 rounded-lg text-sm text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 transition-colors flex items-center gap-1.5"
          >
            <Filter className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground mb-4">
        {loading ? (
          "Loading..."
        ) : (
          <>
            Showing {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, totalCount)} of{" "}
            {totalCount.toLocaleString()} videos
          </>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/10 overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="text-left p-3 text-muted-foreground font-medium">
                  Title
                </th>
                <th className="text-left p-3 text-muted-foreground font-medium w-24">
                  Tier
                </th>
                <th className="text-left p-3 text-muted-foreground font-medium w-28">
                  Track
                </th>
                <th className="text-left p-3 text-muted-foreground font-medium w-32">
                  Type
                </th>
                <th className="text-left p-3 text-muted-foreground font-medium w-28">
                  Status
                </th>
                <th className="text-left p-3 text-muted-foreground font-medium w-28">
                  Classified
                </th>
                <th className="text-center p-3 text-muted-foreground font-medium w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {videos.map((video) => (
                <tr
                  key={video.video_id}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="p-3 text-foreground max-w-xs">
                    <a
                      href={`https://youtube.com/watch?v=${video.video_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-violet-400 transition-colors line-clamp-1"
                      title={video.title}
                    >
                      {video.title || video.video_id}
                    </a>
                  </td>

                  {/* Tier — inline editable */}
                  <td className="p-3">
                    {editingId === video.video_id ? (
                      <select
                        value={editValues.tier}
                        onChange={(e) =>
                          setEditValues((prev) => ({
                            ...prev,
                            tier: Number(e.target.value),
                          }))
                        }
                        className="px-2 py-1 rounded border border-violet-500/30 bg-violet-500/10 text-xs text-foreground dark:[color-scheme:dark]"
                      >
                        <option value={1}>Tier 1</option>
                        <option value={2}>Tier 2</option>
                        <option value={3}>Tier 3</option>
                      </select>
                    ) : (
                      tierBadge(video.tier)
                    )}
                  </td>

                  {/* Track — inline editable */}
                  <td className="p-3">
                    {editingId === video.video_id ? (
                      <select
                        value={editValues.track}
                        onChange={(e) =>
                          setEditValues((prev) => ({
                            ...prev,
                            track: e.target.value,
                          }))
                        }
                        className="px-2 py-1 rounded border border-violet-500/30 bg-violet-500/10 text-xs text-foreground dark:[color-scheme:dark]"
                      >
                        <option value="encounter">encounter</option>
                        <option value="program">program</option>
                      </select>
                    ) : (
                      <span className="text-muted-foreground capitalize">
                        {video.track || "—"}
                      </span>
                    )}
                  </td>

                  <td className="p-3 text-muted-foreground text-xs">
                    {video.content_type?.replace(/_/g, " ") || "—"}
                  </td>

                  <td className="p-3">
                    {statusBadge(video.intake_status)}
                  </td>

                  <td className="p-3 text-muted-foreground text-xs">
                    {video.classified_at
                      ? new Date(video.classified_at).toLocaleDateString()
                      : "—"}
                  </td>

                  {/* Actions */}
                  <td className="p-3 text-center">
                    {editingId === video.video_id ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOverride(video.video_id)}
                          disabled={saving}
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                          title="Confirm override"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(video.video_id);
                          setEditValues({
                            tier: video.tier ?? 1,
                            track: video.track ?? "encounter",
                          });
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
                        title="Edit classification"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {!loading && videos.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-muted-foreground"
                  >
                    No videos match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
