'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    ListVideo, ChevronLeft, ChevronRight, ExternalLink,
    Youtube, RefreshCcw, Loader2, AlertTriangle, Clock, Filter
} from 'lucide-react';
import Link from 'next/link';

interface QueueItem {
    id: number;
    video_id: string;
    video_url: string;
    channel_id: string | null;
    channel_name: string;
    title: string | null;
    duration_seconds: number | null;
    created_at: string;
}

interface Pagination {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
}

/** Format seconds as m:ss or h:mm:ss */
function formatDuration(secs: number | null): { label: string; isShort: boolean } {
    if (secs === null) return { label: '—', isShort: false };
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const label = h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${m}:${String(s).padStart(2, '0')}`;
    return { label, isShort: secs <= 180 };
}

export default function PendingQueuePage() {
    const [items, setItems] = useState<QueueItem[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [shortsOnly, setShortsOnly] = useState(false);

    const fetchPage = useCallback(async (p: number, onlyShorts: boolean) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(p), per_page: '50' });
            if (onlyShorts) params.set('max_duration', '180');
            const res = await fetch(`/api/admin/scanner/pending?${params}`);
            const data = await res.json();
            setItems(data.items || []);
            setPagination(data.pagination || null);
        } catch (err) {
            console.error('Failed to load pending queue:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPage(page, shortsOnly);
    }, [fetchPage, page, shortsOnly]);

    const toggleShortsFilter = () => {
        setPage(1);
        setShortsOnly(prev => !prev);
    };

    const goTo = (p: number) => {
        if (pagination && p >= 1 && p <= pagination.total_pages) setPage(p);
    };

    const totalShorts = items.filter(i => i.duration_seconds !== null && i.duration_seconds <= 180).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-violet-50 rounded-xl">
                        <ListVideo className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'Crimson Pro, serif' }}>
                            Pending Queue
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {pagination ? `${pagination.total.toLocaleString()} videos awaiting processing` : 'Loading…'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Shorts-only filter toggle */}
                    <button
                        onClick={toggleShortsFilter}
                        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border transition-colors ${shortsOnly
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        title="Show only videos ≤ 3 minutes (potential Shorts)"
                    >
                        <Filter className="w-4 h-4" />
                        {shortsOnly ? 'Showing: ≤3 min only' : 'Show ≤3 min only'}
                    </button>

                    <button
                        onClick={() => fetchPage(page, shortsOnly)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Shorts-found banner */}
            {!shortsOnly && totalShorts > 0 && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="text-amber-700">
                        <strong>{totalShorts} video{totalShorts !== 1 ? 's' : ''}</strong> on this page are ≤ 3 min
                        — flagged in orange below.
                    </span>
                    <button onClick={toggleShortsFilter} className="ml-auto text-amber-600 underline underline-offset-2 hover:text-amber-800">
                        Show only ≤3 min
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="rounded-2xl border border-slate-200/60 bg-white overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                        <ListVideo className="w-8 h-8 mx-auto mb-3 opacity-40" />
                        <p className="text-lg">{shortsOnly ? 'No potential Shorts found' : 'Queue is empty'}</p>
                        <p className="text-sm mt-1">
                            {shortsOnly
                                ? 'The Shorts filter is working — no videos ≤ 3 min in queue'
                                : 'Run "Queue All Channels" to populate it'}
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Video</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Channel</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wide">
                                    <span className="flex items-center gap-1 justify-center">
                                        <Clock className="w-3 h-3" /> Duration
                                    </span>
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Queued</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item) => {
                                const { label: durationLabel, isShort } = formatDuration(item.duration_seconds);
                                return (
                                    <tr
                                        key={item.id}
                                        className={`transition-colors ${isShort ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-slate-50/50'}`}
                                    >
                                        {/* Video */}
                                        <td className="px-4 py-3 max-w-xs">
                                            <div className="space-y-0.5">
                                                <p className="text-slate-800 text-xs font-medium truncate max-w-[320px]">
                                                    {item.title || <span className="text-slate-400 italic">Title pending</span>}
                                                </p>
                                                <a
                                                    href={item.video_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-blue-500 hover:text-blue-700 font-mono text-xs"
                                                >
                                                    <Youtube className="w-3 h-3 flex-shrink-0" />
                                                    {item.video_id}
                                                    <ExternalLink className="w-2.5 h-2.5" />
                                                </a>
                                            </div>
                                        </td>

                                        {/* Channel */}
                                        <td className="px-4 py-3 text-xs text-slate-600 max-w-[140px] truncate">
                                            {item.channel_name}
                                        </td>

                                        {/* Duration */}
                                        <td className="px-4 py-3 text-center">
                                            {item.duration_seconds === null ? (
                                                <span className="text-xs text-slate-400">—</span>
                                            ) : (
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium ${isShort
                                                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                                        : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {isShort && <AlertTriangle className="w-3 h-3" />}
                                                    {durationLabel}
                                                </span>
                                            )}
                                        </td>

                                        {/* Queued at */}
                                        <td className="px-4 py-3 text-right text-xs text-slate-400">
                                            {new Date(item.created_at).toLocaleDateString('en-US', {
                                                month: 'short', day: 'numeric',
                                                hour: '2-digit', minute: '2-digit',
                                            })}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {pagination && pagination.total_pages > 1 && (
                <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>
                        Page {pagination.page} of {pagination.total_pages}
                        <span className="text-slate-400 ml-2">({pagination.total.toLocaleString()} total)</span>
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => goTo(page - 1)}
                            disabled={page === 1 || loading}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Prev
                        </button>

                        {/* Page number pills */}
                        {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                            const p = Math.max(1, Math.min(page - 2, pagination.total_pages - 4)) + i;
                            return (
                                <button
                                    key={p}
                                    onClick={() => goTo(p)}
                                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${p === page
                                            ? 'bg-violet-600 text-white'
                                            : 'hover:bg-slate-100 text-slate-600'
                                        }`}
                                >
                                    {p}
                                </button>
                            );
                        })}

                        <button
                            onClick={() => goTo(page + 1)}
                            disabled={page === pagination.total_pages || loading}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Footer note */}
            <p className="text-xs text-slate-400 text-center">
                Rows highlighted in amber have duration ≤ 3:00 (YouTube Shorts threshold).
                Videos with "—" duration were queued before the Shorts filter was added.{' '}
                <Link href="/admin/scanner" className="text-violet-500 hover:underline">← Back to Scanner</Link>
            </p>
        </div>
    );
}
