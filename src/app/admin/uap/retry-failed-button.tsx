"use client";

import { useState } from "react";
import { RotateCcw, Loader2 } from "lucide-react";

/**
 * Retry All Failed — Bulk re-queues all failed intake videos.
 * Calls POST /api/admin/uap-scanner with action: 'retry_all_failed'.
 */
export function RetryAllFailedButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ count: number } | null>(null);

  async function handleRetry() {
    if (loading) return;
    if (!confirm("Re-queue all failed videos for re-processing? This will reset their intake_status and add them back to the scan queue.")) {
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/uap-scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry_all_failed" }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ count: data.count || 0 });
        // Refresh the page after a short delay to show updated stats
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err) {
      console.error("Failed to retry:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleRetry}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <RotateCcw className="w-3.5 h-3.5" />
      )}
      {result ? `Re-queued ${result.count}` : "Retry All Failed"}
    </button>
  );
}
