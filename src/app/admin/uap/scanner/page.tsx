'use client';

/**
 * UAP Scanner Admin Page
 * 
 * Copy-Modify from /admin/scanner (NDE).
 * Provides: channel list, scanner toggle, queue stats, audit, tick controls, add channel form.
 *
 * Key differences from NDE:
 * - Uses /api/admin/uap-scanner API
 * - Channel schema uses channel_name instead of name
 * - Shows UAP-specific tier stats instead of NDE rate
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Radar, Play, RotateCcw, CheckCircle2, XCircle, Clock,
    ToggleLeft, ToggleRight, Loader2, AlertTriangle, Search,
    TrendingUp, BarChart3, Plus, Radio
} from 'lucide-react';

interface Channel {
    channel_id: string;
    channel_name: string;
    avatar_url: string | null;
    custom_url: string | null;
    subscriber_count: number;
    scanner_enabled: boolean;
    last_scanned_at: string | null;
    uploads_playlist_id: string | null;
    track: string;
}

interface QueueStats {
    pending: number;
    processing: number;
    complete: number;
    failed: number;
    skipped: number;
    total: number;
}

export default function UapScannerAdminPage() {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
    const [aggregateStats, setAggregateStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [auditResult, setAuditResult] = useState<any>(null);
    const [tickResult, setTickResult] = useState<any>(null);
    const [addChannelInput, setAddChannelInput] = useState('');
    const [addChannelTrack, setAddChannelTrack] = useState('mixed');
    const [addChannelResult, setAddChannelResult] = useState<{ success?: boolean; error?: string; channel?: any } | null>(null);

    const API_URL = '/api/admin/uap-scanner';

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch(API_URL);
            const data = await res.json();
            setChannels(data.channels || []);
            setQueueStats(data.queueStats || null);
            setAggregateStats(data.aggregateStats || null);
        } catch (err) {
            console.error('Failed to fetch UAP scanner data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const toggleChannel = async (channelId: string, enabled: boolean) => {
        setActionLoading(channelId);
        try {
            await fetch(API_URL, {
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
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'run_audit' }),
            });
            setAuditResult(await res.json());
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
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'run_tick', videosPerTick: 1 }),
            });
            setTickResult(await res.json());
            fetchData();
        } catch (err: any) {
            setTickResult({ error: err.message });
        } finally {
            setActionLoading(null);
        }
    };

    const discoverAll = async () => {
        setActionLoading('discover_all');
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'discover_all' }),
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

    const addChannel = async () => {
        if (!addChannelInput.trim()) return;
        setActionLoading('add_channel');
        setAddChannelResult(null);
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add_channel', input: addChannelInput.trim(), enableScanner: true, track: addChannelTrack }),
            });
            const data = await res.json();
            setAddChannelResult(data);
            if (data.success) {
                setAddChannelInput('');
                fetchData();
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
                <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            </div>
        );
    }

    const enabledChannels = channels.filter(c => c.scanner_enabled);
    const disabledChannels = channels.filter(c => !c.scanner_enabled);

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <Radar className="w-4.5 h-4.5 text-violet-500" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-foreground">UAP Scanner</h1>
                    <p className="text-sm text-muted-foreground">Channel discovery and automated intake for UAP videos</p>
                </div>
            </div>

            {/* Queue Stats */}
            {queueStats && (
                <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                    {[
                        { label: 'Pending', value: queueStats.pending, color: 'text-amber-500' },
                        { label: 'Processing', value: queueStats.processing, color: 'text-blue-500' },
                        { label: 'Complete', value: queueStats.complete, color: 'text-emerald-500' },
                        { label: 'Failed', value: queueStats.failed, color: 'text-red-500' },
                        { label: 'Skipped', value: queueStats.skipped, color: 'text-slate-400' },
                        { label: 'Total', value: queueStats.total, color: 'text-foreground' },
                    ].map(s => (
                        <div key={s.label} className="p-3 rounded-xl border border-white/10 bg-white/[0.02] text-center">
                            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                            <div className="text-xs text-muted-foreground">{s.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Aggregate Stats */}
            {aggregateStats && (
                <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center">
                        <div className="text-xl font-bold text-emerald-500">{aggregateStats.accepted}</div>
                        <div className="text-xs text-muted-foreground">Accepted</div>
                    </div>
                    <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center">
                        <div className="text-xl font-bold text-amber-500">{aggregateStats.rejected}</div>
                        <div className="text-xs text-muted-foreground">Out of Scope</div>
                    </div>
                    <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-center">
                        <div className="text-xl font-bold text-red-500">{aggregateStats.failed}</div>
                        <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-8">
                <button
                    onClick={runAudit}
                    disabled={actionLoading === 'audit'}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 disabled:opacity-50 text-sm font-medium"
                >
                    {actionLoading === 'audit' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Run Audit
                </button>
                <button
                    onClick={discoverAll}
                    disabled={actionLoading === 'discover_all'}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 disabled:opacity-50 text-sm font-medium"
                >
                    {actionLoading === 'discover_all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
                    Discover All
                </button>
                <button
                    onClick={runTick}
                    disabled={actionLoading === 'tick'}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 text-sm font-medium"
                >
                    {actionLoading === 'tick' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Run Single Tick
                </button>
            </div>

            {/* Audit Result */}
            {auditResult && !auditResult.error && (
                <div className="mb-8 p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
                    <h3 className="text-sm font-semibold text-indigo-400 mb-3">Audit Result</h3>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="text-center">
                            <div className="text-lg font-bold text-foreground">{auditResult.totals?.channels}</div>
                            <div className="text-xs text-muted-foreground">Channels Scanned</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-emerald-500">{auditResult.totals?.newToImport}</div>
                            <div className="text-xs text-muted-foreground">New to Import</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-amber-500">{auditResult.estimate?.totalEstimatedCost}</div>
                            <div className="text-xs text-muted-foreground">Est. Cost</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tick Result */}
            {tickResult && (
                <div className="mb-8 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                    <h3 className="text-sm font-semibold text-emerald-400 mb-2">Tick Result</h3>
                    <pre className="text-xs text-muted-foreground overflow-auto max-h-40">
                        {JSON.stringify(tickResult, null, 2)}
                    </pre>
                </div>
            )}

            {/* Add Channel Form */}
            <div className="mb-8 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add UAP Channel
                </h3>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={addChannelInput}
                        onChange={(e) => setAddChannelInput(e.target.value)}
                        placeholder="YouTube URL, @handle, or channel ID"
                        className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50"
                    />
                    <select
                        value={addChannelTrack}
                        onChange={(e) => setAddChannelTrack(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground text-sm"
                    >
                        <option value="mixed">Mixed</option>
                        <option value="encounters">Encounters</option>
                        <option value="program">Program</option>
                    </select>
                    <button
                        onClick={addChannel}
                        disabled={actionLoading === 'add_channel' || !addChannelInput.trim()}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-50 text-sm font-medium"
                    >
                        {actionLoading === 'add_channel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Add
                    </button>
                </div>
                {addChannelResult && (
                    <div className={`mt-3 p-3 rounded-lg text-sm ${addChannelResult.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {addChannelResult.success
                            ? `✅ Added: ${addChannelResult.channel?.channel_name}`
                            : `❌ ${addChannelResult.error}`}
                    </div>
                )}
            </div>

            {/* Channel List */}
            <div className="mb-4">
                <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">
                    Scanner-Enabled Channels ({enabledChannels.length})
                </h2>
                <div className="rounded-xl border border-white/10 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/[0.02]">
                                <th className="text-left p-3 text-muted-foreground font-medium">Channel</th>
                                <th className="text-left p-3 text-muted-foreground font-medium">Track</th>
                                <th className="text-left p-3 text-muted-foreground font-medium">Subscribers</th>
                                <th className="text-left p-3 text-muted-foreground font-medium">Last Scanned</th>
                                <th className="text-left p-3 text-muted-foreground font-medium">Scanner</th>
                            </tr>
                        </thead>
                        <tbody>
                            {enabledChannels.map(channel => (
                                <tr key={channel.channel_id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            {channel.avatar_url && (
                                                <img src={channel.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                                            )}
                                            <div>
                                                <div className="text-foreground font-medium">{channel.channel_name}</div>
                                                <div className="text-xs text-muted-foreground">{channel.custom_url}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                            channel.track === 'encounters' ? 'bg-violet-500/10 text-violet-400' :
                                            channel.track === 'program' ? 'bg-indigo-500/10 text-indigo-400' :
                                            'bg-slate-500/10 text-slate-400'
                                        }`}>
                                            {channel.track}
                                        </span>
                                    </td>
                                    <td className="p-3 text-muted-foreground">
                                        {channel.subscriber_count?.toLocaleString() || '—'}
                                    </td>
                                    <td className="p-3 text-muted-foreground text-xs">
                                        {channel.last_scanned_at
                                            ? new Date(channel.last_scanned_at).toLocaleString()
                                            : 'Never'}
                                    </td>
                                    <td className="p-3">
                                        <button
                                            onClick={() => toggleChannel(channel.channel_id, !channel.scanner_enabled)}
                                            disabled={actionLoading === channel.channel_id}
                                            className="text-xs"
                                        >
                                            {actionLoading === channel.channel_id
                                                ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                                : channel.scanner_enabled
                                                    ? <ToggleRight className="w-6 h-6 text-emerald-500" />
                                                    : <ToggleLeft className="w-6 h-6 text-slate-400" />
                                            }
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {enabledChannels.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                                        No channels enabled. Add a channel above to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Disabled Channels */}
            {disabledChannels.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
                        Disabled Channels ({disabledChannels.length})
                    </h2>
                    <div className="rounded-xl border border-white/10 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/[0.02]">
                                    <th className="text-left p-3 text-muted-foreground font-medium">Channel</th>
                                    <th className="text-left p-3 text-muted-foreground font-medium">Track</th>
                                    <th className="text-left p-3 text-muted-foreground font-medium">Scanner</th>
                                </tr>
                            </thead>
                            <tbody>
                                {disabledChannels.map(channel => (
                                    <tr key={channel.channel_id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                        <td className="p-3">
                                            <div className="flex items-center gap-3">
                                                {channel.avatar_url && (
                                                    <img src={channel.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                                                )}
                                                <span className="text-muted-foreground">{channel.channel_name}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-muted-foreground text-xs capitalize">{channel.track}</td>
                                        <td className="p-3">
                                            <button
                                                onClick={() => toggleChannel(channel.channel_id, true)}
                                                disabled={actionLoading === channel.channel_id}
                                            >
                                                {actionLoading === channel.channel_id
                                                    ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                                    : <ToggleLeft className="w-6 h-6 text-slate-400 hover:text-emerald-500" />
                                                }
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
