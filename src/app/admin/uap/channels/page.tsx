"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Eye,
  EyeOff,
  RefreshCw,
  Loader2,
  Radio,
  BarChart3,
  ChevronDown,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChannelRow {
  channel_id: string;
  channel_name: string;
  track: string | null;
  avatar_url: string | null;
  subscriber_count: number | null;
  video_count: number;
  hidden: boolean;
  scanner_enabled: boolean;
  last_scanned_at: string | null;
  avg_evidence_score: number | null;
  tier1_count: number;
  tier2_count: number;
  tier3_count: number;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AdminChannelManagement() {
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_uap_channel_stats");
      if (rpcError) throw rpcError;

      // Also fetch hidden/scanner fields directly (RPC filters hidden=false)
      const { data: allChannels } = await supabase
        .from("uap_channels")
        .select("channel_id, hidden, scanner_enabled, last_scanned_at")
        .order("channel_id");

      const hiddenMap = new Map(
        (allChannels ?? []).map((c: { channel_id: string; hidden: boolean; scanner_enabled: boolean; last_scanned_at: string | null }) => [
          c.channel_id,
          { hidden: c.hidden, scanner_enabled: c.scanner_enabled, last_scanned_at: c.last_scanned_at },
        ])
      );

      // Merge RPC stats + admin fields
      const merged = (data ?? []).map((ch: ChannelRow) => ({
        ...ch,
        hidden: hiddenMap.get(ch.channel_id)?.hidden ?? false,
        scanner_enabled: hiddenMap.get(ch.channel_id)?.scanner_enabled ?? false,
        last_scanned_at: hiddenMap.get(ch.channel_id)?.last_scanned_at ?? null,
      }));

      setChannels(merged as ChannelRow[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load channels");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const toggleVisibility = async (channelId: string, currentHidden: boolean) => {
    setActionLoading(channelId);
    try {
      const { error } = await supabase
        .from("uap_channels")
        .update({ hidden: !currentHidden })
        .eq("channel_id", channelId);
      if (error) throw error;
      setChannels((prev) =>
        prev.map((ch) => (ch.channel_id === channelId ? { ...ch, hidden: !currentHidden } : ch))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle visibility");
    } finally {
      setActionLoading(null);
    }
  };

  const reclassifyChannel = async (channelId: string) => {
    setActionLoading(`reclassify-${channelId}`);
    try {
      const res = await fetch("/api/uap/classifier/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      if (!res.ok) throw new Error(`Reclassify failed: ${res.status}`);
      alert("Re-classification queued for this channel.");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to re-classify");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">UAP Channel Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {channels.length} channels · Toggle visibility, trigger re-classification
          </p>
        </div>
        <button
          onClick={fetchChannels}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-slate-100 dark:bg-white/10 rounded-lg hover:bg-slate-200 dark:hover:bg-white/15 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/10 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Channel</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Videos</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-center">T1</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-center">T2</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-center">T3</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Avg ESS</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Visible</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                  </td>
                </tr>
              ) : (
                channels.map((ch) => (
                  <tr
                    key={ch.channel_id}
                    className={`border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${ch.hidden ? "opacity-50" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {ch.channel_name?.charAt(0) || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
                            {ch.channel_name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{ch.channel_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-medium">{ch.video_count}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-green-600 font-medium">{ch.tier1_count}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500">{ch.tier2_count}</td>
                    <td className="px-4 py-3 text-center text-slate-400">{ch.tier3_count}</td>
                    <td className="px-4 py-3 text-center">
                      {ch.avg_evidence_score ? (
                        <span className="text-emerald-600 font-medium">{ch.avg_evidence_score}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleVisibility(ch.channel_id, ch.hidden)}
                        disabled={actionLoading === ch.channel_id}
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        title={ch.hidden ? "Hidden — click to show" : "Visible — click to hide"}
                      >
                        {actionLoading === ch.channel_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : ch.hidden ? (
                          <EyeOff className="w-4 h-4 text-red-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-green-500" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => reclassifyChannel(ch.channel_id)}
                        disabled={!!actionLoading}
                        className="text-[11px] px-2 py-1 rounded bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50"
                      >
                        Re-classify
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
