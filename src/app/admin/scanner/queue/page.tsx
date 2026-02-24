'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    AlertTriangle, SkipForward, RefreshCcw, Loader2,
    ExternalLink, RotateCcw, Youtube, ChevronDown, ChevronUp,
    Clock
} from 'lucide-react';

// Data comes from nde_vids — persistent source of truth for intake status
interface QueueItem {
    videoId: string;
    title: string | null;
    channelId: string | null;
    channelName: string | null;
    intake_status: 'failed' | 'no_captions' | 'not_profound' | 'indexing';
    intake_error: string | null;
    intake_submitted_at: string | null;
    intake_completed_at: string | null;
}

const STATUS_LABELS: Record<string, string> = {
    failed: 'Failed',
    no_captions: 'No Captions',
    not_profound: 'Not Profound',
    indexing: 'Stuck (indexing)',
};

const STATUS_CLASSES: Record<string, string> = {
    failed: 'bg-red-50 text-red-700',
    no_captions: 'bg-slate-100 text-slate-500',
    not_profound: 'bg-amber-50 text-amber-600',
    indexing: 'bg-orange-50 text-orange-600',
};

export default function QueueInspectorPage() {
    const [items, setItems] = useState<QueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'failed' | 'no_captions' | 'not_profound' | 'indexing'>('all');
    const [retrying, setRetrying] = useState<string | null>(null);
    const [expandedError, setExpandedError] = useState<string | null>(null);

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/scanner?view=queue');
            const data = await res.json();
            setItems(data.items || []);
        } catch (err) {
            console.error('Failed to load queue items:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    // Re-queue a video by calling the intake API directly
    const retryVideo = async (videoId: string) => {
        setRetrying(videoId);
        try {
            // Reset intake_status in nde_vids and re-insert to scan_queue
            await fetch('/api/admin/scanner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reset_item', videoId }),
            });
            setItems(prev => prev.filter(i => i.videoId !== videoId));
        } finally {
            setRetrying(null);
        }
    };

    const counts = {
        all: items.length,
        failed: items.filter(i => i.intake_status === 'failed').length,
        no_captions: items.filter(i => i.intake_status === 'no_captions').length,
        not_profound: items.filter(i => i.intake_status === 'not_profound').length,
        indexing: items.filter(i => i.intake_status === 'indexing').length,
    };

    const filtered = filter === 'all' ? items : items.filter(i => i.intake_status === filter);

    const TAB_OPTIONS = [
        { key: 'all', label: `Total Not Accepted (${counts.all})` },
        { key: 'failed', label: `Failed (${counts.failed})` },
        { key: 'no_captions', label: `No Captions (${counts.no_captions})` },
        { key: 'indexing', label: `Stuck (${counts.indexing})` },
        { key: 'not_profound', label: `Not NDE (${counts.not_profound})` },
    ] as const;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'Crimson Pro, serif' }}>
                        Queue Inspector
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Videos that failed, had no captions, or got stuck. Review errors and retry individually.
                    </p>
                </div>
                <button
                    onClick={fetchItems}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                    <RefreshCcw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                {TAB_OPTIONS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${filter === tab.key
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                    <p className="text-lg">Nothing to review</p>
                    <p className="text-sm mt-1">All videos are processing normally</p>
                </div>
            ) : (
                <div className="rounded-2xl border border-slate-200/60 bg-white overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Video</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Channel</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Processed</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map((item) => (
                                <>
                                    <tr key={item.videoId} className="hover:bg-slate-50/50 transition-colors">
                                        {/* Video */}
                                        <td className="px-4 py-3 max-w-xs">
                                            <div className="space-y-0.5">
                                                <p className="text-slate-800 text-xs font-medium truncate">
                                                    {item.title || <span className="text-slate-400 italic">Untitled</span>}
                                                </p>
                                                <a
                                                    href={`https://www.youtube.com/watch?v=${item.videoId}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-blue-500 hover:text-blue-700 font-mono text-xs"
                                                >
                                                    <Youtube className="w-3 h-3 flex-shrink-0" />
                                                    {item.videoId}
                                                    <ExternalLink className="w-2.5 h-2.5" />
                                                </a>
                                            </div>
                                        </td>

                                        {/* Channel */}
                                        <td className="px-4 py-3 text-xs text-slate-600 max-w-[120px] truncate">
                                            {item.channelName || item.channelId || '—'}
                                        </td>

                                        {/* Status badge */}
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[item.intake_status] || 'bg-slate-100 text-slate-500'}`}>
                                                {item.intake_status === 'failed' && <AlertTriangle className="w-3 h-3" />}
                                                {item.intake_status === 'no_captions' && <SkipForward className="w-3 h-3" />}
                                                {item.intake_status === 'indexing' && <Clock className="w-3 h-3" />}
                                                {STATUS_LABELS[item.intake_status] || item.intake_status}
                                            </span>
                                        </td>

                                        {/* Processed at */}
                                        <td className="px-4 py-3 text-xs text-slate-400">
                                            {item.intake_completed_at
                                                ? new Date(item.intake_completed_at).toLocaleDateString('en-US', {
                                                    month: 'short', day: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })
                                                : '—'}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                {item.intake_error && (
                                                    <button
                                                        onClick={() => setExpandedError(expandedError === item.videoId ? null : item.videoId)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                                        title="View error"
                                                    >
                                                        {expandedError === item.videoId
                                                            ? <ChevronUp className="w-3.5 h-3.5" />
                                                            : <ChevronDown className="w-3.5 h-3.5" />
                                                        }
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => retryVideo(item.videoId)}
                                                    disabled={retrying === item.videoId}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                                                    title="Reset to pending for retry"
                                                >
                                                    {retrying === item.videoId
                                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                                        : <RotateCcw className="w-3 h-3" />
                                                    }
                                                    Retry
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expanded error row */}
                                    {expandedError === item.videoId && item.intake_error && (
                                        <tr key={`${item.videoId}-error`} className="bg-red-50">
                                            <td colSpan={5} className="px-4 py-3">
                                                <p className="text-xs text-red-700 font-mono whitespace-pre-wrap break-all">
                                                    {item.intake_error}
                                                </p>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
