'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Radar, Play, RotateCcw, CheckCircle2, XCircle, Clock,
    ToggleLeft, ToggleRight, Loader2, AlertTriangle, Search,
    TrendingUp, TrendingDown, BarChart3
} from 'lucide-react';

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

    const enabledCount = channels.filter(c => c.scanner_enabled).length;

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
                <div className="p-2.5 bg-blue-50 rounded-xl">
                    <Radar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'Crimson Pro, serif' }}>
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
                <StatCard
                    label="Total Skipped"
                    value={queueStats?.skipped || 0}
                    icon={<BarChart3 className="w-4 h-4 text-slate-400" />}
                    subtitle="no captions / not NDE"
                />
                <StatCard
                    label="Total Failed"
                    value={aggregateStats?.failed || 0}
                    icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
                />
            </div>

            {/* Actions */}
            <div className="rounded-2xl border border-slate-200/60 bg-white p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4" style={{ fontFamily: 'Crimson Pro, serif' }}>
                    Scanner Controls
                </h2>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={runAudit}
                        disabled={actionLoading === 'audit'}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
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
                        className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 text-sm font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
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
                        className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 text-sm font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>

                {/* Audit Result */}
                {auditResult && (
                    <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/60">
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
                    <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/60">
                        {tickResult.error ? (
                            <p className="text-red-600 text-sm">{tickResult.error}</p>
                        ) : (
                            <div className="text-sm space-y-1">
                                <p className="text-slate-700">
                                    Channel: <span className="font-medium">{tickResult.channel?.name || 'None'}</span>
                                </p>
                                <p className="text-slate-500">
                                    Discovered: {tickResult.discovered} • Processed: {tickResult.processed} • Duration: {tickResult.durationMs}ms
                                </p>
                                {tickResult.results?.map((r: any, i: number) => (
                                    <p key={i} className={`text-xs ${r.status === 'complete' ? 'text-emerald-600' : r.status === 'failed' ? 'text-red-600' : 'text-slate-500'}`}>
                                        {r.videoId}: {r.status} {r.isNde ? `(${r.isNde})` : ''} {r.error || ''}
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Channel Table */}
            <div className="rounded-2xl border border-slate-200/60 bg-white overflow-hidden">
                <div className="p-6 border-b border-slate-200/60">
                    <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Crimson Pro, serif' }}>
                        Channels ({channels.length})
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200/60">
                                <th className="px-6 py-3">Channel</th>
                                <th className="px-4 py-3">Scanner</th>
                                <th className="px-4 py-3 text-right">Subscribers</th>
                                <th className="px-4 py-3 text-right">Last Scanned</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {channels.map((channel) => (
                                <tr key={channel.channel_id} className="hover:bg-slate-50/50 transition-colors">
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
                                            <span className="text-sm font-medium text-slate-900">{channel.name}</span>
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
            </div>
        </div>
    );
}

function StatCard({ label, value, total, icon, subtitle }: {
    label: string;
    value: number;
    total?: number;
    icon: React.ReactNode;
    subtitle?: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200/60 bg-white p-4 hover:shadow-lg transition-all">
            <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-slate-50 rounded-lg">{icon}</div>
                <span className="text-xs text-slate-500">{label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
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
