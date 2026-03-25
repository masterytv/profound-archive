'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Radar, Play, RotateCcw, CheckCircle2, XCircle, Clock,
    ToggleLeft, ToggleRight, Loader2, AlertTriangle, Search,
    TrendingUp, TrendingDown, BarChart3, Plus
} from 'lucide-react';
import Link from 'next/link';

interface Channel {
    channel_id: string;
    name: string;
    avatar_url: string | null;
    custom_url: string | null;
    subscriber_count: number;
    scanner_enabled: boolean;
    last_scanned_at: string | null;
    uploads_playlist_id: string | null;
    clear_nde_count?: number;
    total_videos?: number;
    nde_rate?: number;
}

interface QueueStats {
    pending: number;
    processing: number;
    complete: number;
    failed: number;
    skipped: number;
    total: number;
}

interface AggregateStats {
    discovered: number;
    processed: number;
    accepted: number;
    rejected: number;
    failed: number;
}

export default function ScannerAdminPage() {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
    const [aggregateStats, setAggregateStats] = useState<AggregateStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [auditResult, setAuditResult] = useState<any>(null);
    const [tickResult, setTickResult] = useState<any>(null);
    const [discoverAllResult, setDiscoverAllResult] = useState<any>(null);
    const [addChannelInput, setAddChannelInput] = useState('');
    const [addChannelResult, setAddChannelResult] = useState<{ success?: boolean; error?: string; channel?: any } | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/scanner');
            const data = await res.json();
            setChannels(data.channels || []);
            setQueueStats(data.queueStats || null);
            setAggregateStats(data.aggregateStats || null);
        } catch (err) {
            console.error('Failed to fetch scanner data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const toggleChannel = async (channelId: string, enabled: boolean) => {
        setActionLoading(channelId);
        try {
            await fetch('/api/admin/scanner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggle_channel', channelId, enabled }),
            });
            setChannels(prev =>
                prev.map(c => c.channel_id === channelId ? { ...c, scanner_enabled: enabled } : c)
            );
        } finally {
            setActionLoading(null);
        }
    };

    const runAudit = async () => {
        setActionLoading('audit');
        setAuditResult(null);
        try {
            const res = await fetch('/api/admin/scanner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'run_audit' }),
            });
            const data = await res.json();
            setAuditResult(data);
        } catch (err: any) {
            setAuditResult({ error: err.message });
        } finally {
            setActionLoading(null);
        }
    };

    const runTick = async () => {
        setActionLoading('tick');
        setTickResult(null);
        try {
            const res = await fetch('/api/admin/scanner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'run_tick', videosPerTick: 1 }),
            });
            const data = await res.json();
            setTickResult(data);
            fetchData();
        } catch (err: any) {
            setTickResult({ error: err.message });
        } finally {
            setActionLoading(null);
        }
    };

    const discoverAll = async () => {
        setActionLoading('discover_all');
        setDiscoverAllResult(null);
        try {
            const res = await fetch('/api/admin/scanner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'discover_all' }),
            });
            const data = await res.json();
            setDiscoverAllResult(data);
            fetchData(); // Refresh queue count
        } catch (err: any) {
            setDiscoverAllResult({ error: err.message });
        } finally {
            setActionLoading(null);
        }
    };

    const enabledCount = channels.filter(c => c.scanner_enabled).length;

    const addChannel = async () => {
        if (!addChannelInput.trim()) return;
        setActionLoading('add_channel');
        setAddChannelResult(null);
        try {
            const res = await fetch('/api/admin/scanner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add_channel', input: addChannelInput.trim(), enableScanner: true }),
            });
            const data = await res.json();
            if (!res.ok) {
                setAddChannelResult({ error: data.error || 'Failed to add channel' });
            } else {
                setAddChannelResult({ success: true, channel: data.channel });
                setAddChannelInput('');
                fetchData(); // Refresh channel list
            }
        } catch (err: any) {
            setAddChannelResult({ error: err.message });
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                    <Radar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100" style={{ fontFamily: 'Crimson Pro, serif' }}>
                        Channel Scanner
                    </h1>
                    <p className="text-sm text-slate-500">
                        Discover and import new NDE videos from YouTube channels
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard
                    label="Channels Enabled"
                    value={enabledCount}
                    total={channels.length}
                    icon={<Radar className="w-4 h-4 text-blue-600" />}
                />
                <StatCard
                    label="Queue Pending"
                    value={queueStats?.pending || 0}
                    icon={<Clock className="w-4 h-4 text-amber-600" />}
                />
                <StatCard
                    label="Total Accepted"
                    value={aggregateStats?.accepted || 0}
                    icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
                />
                <Link href="/admin/scanner/queue" className="block cursor-pointer">
                    <StatCard
                        label="Total Not Accepted"
                        value={(aggregateStats?.rejected || 0) + (aggregateStats?.failed || 0)}
                        icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
                        className="hover:border-red-200 hover:bg-red-50/50"
                        subtitle="Click to view details"
                    />
                </Link>
            </div>

            {/* Actions */}
            <div className="rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/5 p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4" style={{ fontFamily: 'Crimson Pro, serif' }}>
                    Scanner Controls
                </h2>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={discoverAll}
                        disabled={!!actionLoading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        title="Scan all enabled channels and queue their videos at once — run this first to fill the pool before processing"
                    >
                        {actionLoading === 'discover_all' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Search className="w-4 h-4" />
                        )}
                        Queue All Channels
                    </button>
                    <button
                        onClick={runAudit}
                        disabled={actionLoading === 'audit'}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                        title="Read-only scan — shows how many new videos exist per channel and estimates cost. Does not queue anything."
                    >
                        {actionLoading === 'audit' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Search className="w-4 h-4" />
                        )}
                        Run Discovery Audit
                    </button>
                    <button
                        onClick={runTick}
                        disabled={actionLoading === 'tick'}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/20 transition-colors disabled:opacity-50"
                    >
                        {actionLoading === 'tick' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Play className="w-4 h-4" />
                        )}
                        Run Single Tick (1 video)
                    </button>
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/20 transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>

                {/* Audit Result */}
                {auditResult && (
                    <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
                        {auditResult.error ? (
                            <p className="text-red-600 text-sm">{auditResult.error}</p>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-4 text-sm">
                                    <span className="font-medium text-slate-700">
                                        New videos found: <span className="text-blue-600 font-bold">{auditResult.totals?.newToImport}</span>
                                    </span>
                                    <span className="text-slate-500">
                                        Est. cost: <span className="font-medium">{auditResult.estimate?.totalEstimatedCost}</span>
                                    </span>
                                    <span className="text-slate-500">
                                        Days to complete: <span className="font-medium">{auditResult.estimate?.daysToComplete}</span>
                                    </span>
                                </div>
                                {auditResult.results && (
                                    <div className="max-h-60 overflow-y-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="text-left text-slate-500 border-b border-slate-200">
                                                    <th className="pb-2 pr-4">Channel</th>
                                                    <th className="pb-2 pr-4 text-right">Fetched</th>
                                                    <th className="pb-2 pr-4 text-right">In DB</th>
                                                    <th className="pb-2 text-right">New</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {auditResult.results.map((r: any) => (
                                                    <tr key={r.channelId} className="border-b border-slate-100">
                                                        <td className="py-1.5 pr-4 text-slate-700">{r.channelName}</td>
                                                        <td className="py-1.5 pr-4 text-right text-slate-500">{r.totalFetched}</td>
                                                        <td className="py-1.5 pr-4 text-right text-slate-500">{r.alreadyInDb}</td>
                                                        <td className="py-1.5 text-right font-medium text-blue-600">{r.newToImport}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Tick Result */}
                {tickResult && (
                    <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
                        {tickResult.error ? (
                            <p className="text-red-600 text-sm">{tickResult.error}</p>
                        ) : (
                            <div className="text-sm space-y-1">
                                <p className="text-slate-700">
                                    <span className="text-slate-400">Scanned:</span>{' '}
                                    <span className="font-medium">{tickResult.channel?.name || 'None'}</span>
                                    <span className="text-slate-400 ml-2 text-xs">(discovery only)</span>
                                </p>
                                <p className="text-slate-500">
                                    Discovered: {tickResult.discovered} • Processed: {tickResult.processed} • Duration: {tickResult.durationMs}ms
                                </p>
                                {tickResult.results?.map((r: any, i: number) => (
                                    <p key={i} className={`text-xs font-mono ${r.status === 'complete' ? 'text-emerald-600' : r.status === 'failed' ? 'text-red-600' : 'text-slate-500'}`}>
                                        {r.videoId}: {r.status} {r.isNde ? `(${r.isNde})` : ''} {r.error || ''}
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Channel Table */}
            <div className="rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
                <div className="p-6 border-b border-slate-200/60 dark:border-white/10">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100" style={{ fontFamily: 'Crimson Pro, serif' }}>
                        Channels ({channels.length})
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200/60 dark:border-white/10">
                                <th className="px-6 py-3">Channel</th>
                                <th className="px-4 py-3">Scanner</th>
                                <th className="px-4 py-3 text-right">Subscribers</th>
                                <th className="px-4 py-3 text-right">Last Scanned</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                            {channels.map((channel) => (
                                <tr key={channel.channel_id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-3">
                                            {channel.avatar_url ? (
                                                <img
                                                    src={channel.avatar_url}
                                                    alt={channel.name}
                                                    className="w-8 h-8 rounded-full"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                    <Radar className="w-4 h-4 text-slate-400" />
                                                </div>
                                            )}
                                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{channel.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => toggleChannel(channel.channel_id, !channel.scanner_enabled)}
                                            disabled={actionLoading === channel.channel_id}
                                            className="flex items-center gap-1.5"
                                        >
                                            {actionLoading === channel.channel_id ? (
                                                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                                            ) : channel.scanner_enabled ? (
                                                <ToggleRight className="w-6 h-6 text-blue-600" />
                                            ) : (
                                                <ToggleLeft className="w-6 h-6 text-slate-300" />
                                            )}
                                            <span className={`text-xs ${channel.scanner_enabled ? 'text-blue-600' : 'text-slate-400'}`}>
                                                {channel.scanner_enabled ? 'On' : 'Off'}
                                            </span>
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm text-slate-600">
                                        {channel.subscriber_count ? `${(channel.subscriber_count / 1000).toFixed(1)}K` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs text-slate-400">
                                        {channel.last_scanned_at
                                            ? new Date(channel.last_scanned_at).toLocaleDateString()
                                            : 'Never'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Add Channel Form */}
                <div className="p-6 border-t border-slate-200/60 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Add New Channel
                    </h3>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={addChannelInput}
                            onChange={(e) => setAddChannelInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addChannel()}
                            placeholder="Paste a YouTube channel URL, @handle, or channel ID"
                            disabled={actionLoading === 'add_channel'}
                            className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent disabled:opacity-50 transition-all"
                        />
                        <button
                            onClick={addChannel}
                            disabled={!addChannelInput.trim() || actionLoading === 'add_channel'}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {actionLoading === 'add_channel' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4" />
                            )}
                            {actionLoading === 'add_channel' ? 'Resolving...' : 'Add Channel'}
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        Examples: <code className="text-slate-500">@NearDeathExp</code>, <code className="text-slate-500">https://youtube.com/@ChannelName</code>, <code className="text-slate-500">UC...</code>
                    </p>

                    {/* Add Channel Result */}
                    {addChannelResult && (
                        <div className={`mt-3 p-3 rounded-xl text-sm border ${
                            addChannelResult.success
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30 text-emerald-700 dark:text-emerald-400'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400'
                        }`}>
                            {addChannelResult.success ? (
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                    <span>
                                        Added <strong>{addChannelResult.channel?.name}</strong> with scanner enabled.
                                        {addChannelResult.channel?.subscriber_count && (
                                            <span className="text-emerald-600 dark:text-emerald-500 ml-1">
                                                ({(addChannelResult.channel.subscriber_count / 1000).toFixed(1)}K subscribers)
                                            </span>
                                        )}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <XCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{addChannelResult.error}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, total, icon, subtitle, className }: {
    label: string;
    value: number;
    total?: number;
    icon: React.ReactNode;
    subtitle?: string;
    className?: string;
}) {
    return (
        <div className={`rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/5 p-4 hover:shadow-lg transition-all ${className || ''}`}>
            <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-slate-50 dark:bg-white/10 rounded-lg">{icon}</div>
                <span className="text-xs text-slate-500">{label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {value}
                {total !== undefined && (
                    <span className="text-sm font-normal text-slate-400"> / {total}</span>
                )}
            </p>
            {subtitle && (
                <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            )}
        </div>
    );
}
