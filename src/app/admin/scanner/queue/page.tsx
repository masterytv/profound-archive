'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    AlertTriangle, SkipForward, RefreshCcw, Loader2,
    ExternalLink, RotateCcw, Youtube, ChevronDown, ChevronUp
} from 'lucide-react';

interface QueueItem {
    id: number;
    video_id: string;
    video_url: string;
    channel_id: string;
    status: 'failed' | 'skipped';
    intake_result: string | null;
    error: string | null;
    processed_at: string | null;
    created_at: string;
    channels: { name: string; avatar_url: string | null } | null;
}

export default function QueueInspectorPage() {
    const [items, setItems] = useState<QueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'failed' | 'skipped'>('all');
    const [resetting, setResetting] = useState<number | null>(null);
    const [expandedError, setExpandedError] = useState<number | null>(null);

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

    const resetItem = async (id: number) => {
        setResetting(id);
        try {
            await fetch('/api/admin/scanner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reset_item', queueId: id }),
            });
            // Remove from list immediately
            setItems(prev => prev.filter(i => i.id !== id));
        } finally {
            setResetting(null);
        }
    };

    const resetAllSkipped = async () => {
        setResetting(-1);
        try {
            await fetch('/api/admin/scanner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reset_all_skipped' }),
            });
            setItems(prev => prev.filter(i => i.status !== 'skipped'));
        } finally {
            setResetting(null);
        }
    };

    const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);
    const failedCount = items.filter(i => i.status === 'failed').length;
    const skippedCount = items.filter(i => i.status === 'skipped').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'Crimson Pro, serif' }}>
                        Queue Inspector
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Review failed and skipped videos. Retry individual items or reset all skipped in bulk.
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

            {/* Filter Tabs + Bulk Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                    {(['all', 'failed', 'skipped'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${filter === tab
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {tab === 'all' ? `All (${items.length})` :
                                tab === 'failed' ? `Failed (${failedCount})` :
                                    `Skipped (${skippedCount})`}
                        </button>
                    ))}
                </div>

                {skippedCount > 0 && (
                    <button
                        onClick={resetAllSkipped}
                        disabled={resetting === -1}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors disabled:opacity-50"
                    >
                        {resetting === -1 ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RotateCcw className="w-4 h-4" />
                        )}
                        Reset All Skipped ({skippedCount})
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                    <p className="text-lg">No {filter === 'all' ? '' : filter} items in queue</p>
                    <p className="text-sm mt-1">All videos have been processed or are pending retry</p>
                </div>
            ) : (
                <div className="rounded-2xl border border-slate-200/60 bg-white overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Video</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Channel</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Result</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Processed</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map((item) => (
                                <>
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        {/* Video */}
                                        <td className="px-4 py-3">
                                            <a
                                                href={item.video_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-mono text-xs"
                                            >
                                                <Youtube className="w-3.5 h-3.5 flex-shrink-0" />
                                                {item.video_id}
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </td>

                                        {/* Channel */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {item.channels?.avatar_url && (
                                                    <img
                                                        src={item.channels.avatar_url}
                                                        alt=""
                                                        className="w-5 h-5 rounded-full flex-shrink-0"
                                                    />
                                                )}
                                                <span className="text-slate-700 text-xs truncate max-w-[120px]">
                                                    {item.channels?.name || item.channel_id}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Status badge */}
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${item.status === 'failed'
                                                    ? 'bg-red-50 text-red-700'
                                                    : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                {item.status === 'failed'
                                                    ? <AlertTriangle className="w-3 h-3" />
                                                    : <SkipForward className="w-3 h-3" />
                                                }
                                                {item.status}
                                            </span>
                                        </td>

                                        {/* Intake result */}
                                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                                            {item.intake_result || '—'}
                                        </td>

                                        {/* Processed at */}
                                        <td className="px-4 py-3 text-xs text-slate-400">
                                            {item.processed_at
                                                ? new Date(item.processed_at).toLocaleDateString('en-US', {
                                                    month: 'short', day: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })
                                                : '—'}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                {item.error && (
                                                    <button
                                                        onClick={() => setExpandedError(expandedError === item.id ? null : item.id)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                                        title="View error"
                                                    >
                                                        {expandedError === item.id
                                                            ? <ChevronUp className="w-3.5 h-3.5" />
                                                            : <ChevronDown className="w-3.5 h-3.5" />
                                                        }
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => resetItem(item.id)}
                                                    disabled={resetting === item.id}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                                                    title="Reset to pending for retry"
                                                >
                                                    {resetting === item.id
                                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                                        : <RotateCcw className="w-3 h-3" />
                                                    }
                                                    Retry
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expanded error row */}
                                    {expandedError === item.id && item.error && (
                                        <tr key={`${item.id}-error`} className="bg-red-50">
                                            <td colSpan={6} className="px-4 py-3">
                                                <p className="text-xs text-red-700 font-mono whitespace-pre-wrap break-all">
                                                    {item.error}
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
