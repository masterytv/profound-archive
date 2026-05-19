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
    TrendingUp, BarChart3, Plus, Radio, ListVideo, KeyRound, Link2, Trash2, Info
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
    pending_count: number;
    video_count: number;
    processed_count: number;
    added_count: number;
}

interface Playlist {
    playlist_id: string;
    playlist_title: string;
    channel_id: string | null;
    channel_name: string | null;
    track: string;
    priority: number;
    scanner_enabled: boolean;
    last_scanned_at: string | null;
    video_count: number;
    pending_count: number;
    processed_count: number;
    added_count: number;
    channel_in_scanner: boolean;
}

interface KeywordMonitor {
    id: string;
    channel_id: string;
    channel_name: string;
    search_terms: string[];
    scanner_enabled: boolean;
    last_scanned_at: string | null;
    priority: number;
    videos_found: number;
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
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [keywordMonitors, setKeywordMonitors] = useState<KeywordMonitor[]>([]);
    const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
    const [aggregateStats, setAggregateStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [auditResult, setAuditResult] = useState<any>(null);
    const [tickResult, setTickResult] = useState<any>(null);
    const [addChannelInput, setAddChannelInput] = useState('');
    const [addChannelTrack, setAddChannelTrack] = useState('mixed');
    const [addChannelResult, setAddChannelResult] = useState<{ success?: boolean; error?: string; channel?: any } | null>(null);
    // Sprint 8: Playlist state
    const [addPlaylistInput, setAddPlaylistInput] = useState('');
    const [addPlaylistTrack, setAddPlaylistTrack] = useState('mixed');
    const [addPlaylistPriority, setAddPlaylistPriority] = useState(1);
    const [addPlaylistResult, setAddPlaylistResult] = useState<{ success?: boolean; error?: string; playlist?: any } | null>(null);
    const [playlistTickResult, setPlaylistTickResult] = useState<any>(null);
    // Sprint 8: Keyword monitor state
    const [addKwChannel, setAddKwChannel] = useState('');
    const [addKwTerms, setAddKwTerms] = useState('');
    const [addKwResult, setAddKwResult] = useState<{ success?: boolean; error?: string; note?: string } | null>(null);
    // Sprint 8: Single video state
    const [singleVideoUrl, setSingleVideoUrl] = useState('');
    const [singleVideoResult, setSingleVideoResult] = useState<{ success?: boolean; error?: string; videoId?: string } | null>(null);

    const API_URL = '/api/admin/uap-scanner';

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch(API_URL);
            const data = await res.json();
            setChannels(data.channels || []);
            setPlaylists(data.playlists || []);
            setKeywordMonitors(data.keywordMonitors || []);
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

    // ─── Sprint 8: Playlist handlers ─────────────────────────────────
    const addPlaylist = async () => {
        if (!addPlaylistInput.trim()) return;
        setActionLoading('add_playlist');
        setAddPlaylistResult(null);
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add_playlist', input: addPlaylistInput.trim(), track: addPlaylistTrack, priority: addPlaylistPriority }),
            });
            const data = await res.json();
            setAddPlaylistResult(data);
            if (data.success) { setAddPlaylistInput(''); fetchData(); }
        } catch (err: any) {
            setAddPlaylistResult({ error: err.message });
        } finally { setActionLoading(null); }
    };

    const togglePlaylist = async (playlistId: string, enabled: boolean) => {
        setActionLoading(playlistId);
        try {
            await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggle_playlist', playlistId, enabled }) });
            setPlaylists(prev => prev.map(p => p.playlist_id === playlistId ? { ...p, scanner_enabled: enabled } : p));
        } finally { setActionLoading(null); }
    };

    const discoverAllPlaylists = async () => {
        setActionLoading('discover_all_playlists');
        setPlaylistTickResult(null);
        try {
            const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'discover_all_playlists' }) });
            setPlaylistTickResult(await res.json());
            fetchData();
        } catch (err: any) {
            setPlaylistTickResult({ error: err.message });
        } finally { setActionLoading(null); }
    };

    const auditPlaylists = async () => {
        setActionLoading('audit_playlists');
        setPlaylistTickResult(null);
        try {
            const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'audit_playlists' }) });
            setPlaylistTickResult(await res.json());
        } catch (err: any) {
            setPlaylistTickResult({ error: err.message });
        } finally { setActionLoading(null); }
    };

    const runPlaylistTick = async () => {
        setActionLoading('run_playlist_tick');
        setPlaylistTickResult(null);
        try {
            const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'run_playlist_tick' }) });
            setPlaylistTickResult(await res.json());
            fetchData();
        } catch (err: any) {
            setPlaylistTickResult({ error: err.message });
        } finally { setActionLoading(null); }
    };

    const removePlaylist = async (playlistId: string) => {
        if (!confirm('Remove this playlist from the scanner?')) return;
        setActionLoading(playlistId);
        try {
            await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'remove_playlist', playlistId }) });
            fetchData();
        } finally { setActionLoading(null); }
    };

    // ─── Sprint 8: Keyword monitor handlers ──────────────────────────
    const addKeywordMonitor = async () => {
        if (!addKwChannel.trim() || !addKwTerms.trim()) return;
        setActionLoading('add_kw');
        setAddKwResult(null);
        try {
            const terms = addKwTerms.split(',').map(t => t.trim()).filter(Boolean);
            const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add_keyword_monitor', channelInput: addKwChannel.trim(), searchTerms: terms }) });
            const data = await res.json();
            setAddKwResult(data);
            if (data.success) { setAddKwChannel(''); setAddKwTerms(''); fetchData(); }
        } catch (err: any) {
            setAddKwResult({ error: err.message });
        } finally { setActionLoading(null); }
    };

    const toggleKeywordMonitor = async (monitorId: string, enabled: boolean) => {
        setActionLoading(monitorId);
        try {
            await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggle_keyword_monitor', monitorId, enabled }) });
            setKeywordMonitors(prev => prev.map(m => m.id === monitorId ? { ...m, scanner_enabled: enabled } : m));
        } finally { setActionLoading(null); }
    };

    const removeKeywordMonitor = async (monitorId: string) => {
        if (!confirm('Remove this keyword monitor?')) return;
        setActionLoading(monitorId);
        try {
            await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'remove_keyword_monitor', monitorId }) });
            fetchData();
        } finally { setActionLoading(null); }
    };

    // ─── Sprint 8: Single video handler ──────────────────────────────
    const addSingleVideo = async () => {
        if (!singleVideoUrl.trim()) return;
        setActionLoading('add_single_video');
        setSingleVideoResult(null);
        try {
            const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add_single_video', videoUrl: singleVideoUrl.trim() }) });
            const data = await res.json();
            setSingleVideoResult(data);
            if (data.success) { setSingleVideoUrl(''); fetchData(); }
        } catch (err: any) {
            setSingleVideoResult({ error: err.message });
        } finally { setActionLoading(null); }
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

            {/* ═══ Scanner-Enabled Channels ═══════════════════════════════ */}
            <div className="mt-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <Radio className="w-4 h-4 text-violet-500" />
                        Scanner-Enabled Channels ({enabledChannels.length})
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={runAudit} disabled={actionLoading === 'audit'}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 disabled:opacity-50 text-xs font-medium">
                            {actionLoading === 'audit' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                            Run Audit
                        </button>
                        <button onClick={discoverAll} disabled={actionLoading === 'discover_all'}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 disabled:opacity-50 text-xs font-medium">
                            {actionLoading === 'discover_all' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radar className="w-3.5 h-3.5" />}
                            Discover New Videos in Channels
                        </button>
                        <button onClick={runTick} disabled={actionLoading === 'tick'}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 text-xs font-medium">
                            {actionLoading === 'tick' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                            Run Single Tick
                        </button>
                    </div>
                </div>

                {/* Audit Result */}
                {auditResult && !auditResult.error && (
                    <div className="mb-4 p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
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
                    <div className="mb-4 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                        <pre className="text-xs text-muted-foreground overflow-auto max-h-32">{JSON.stringify(tickResult, null, 2)}</pre>
                    </div>
                )}

                {/* Add Channel Form */}
                <div className="mb-4 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add UAP Channel
                    </h3>
                    <div className="flex gap-3">
                        <input type="text" value={addChannelInput} onChange={(e) => setAddChannelInput(e.target.value)}
                            placeholder="YouTube URL, @handle, or channel ID"
                            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50" />
                        <select value={addChannelTrack} onChange={(e) => setAddChannelTrack(e.target.value)}
                            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground text-sm">
                            <option value="mixed">Mixed</option>
                            <option value="encounters">Encounters</option>
                            <option value="program">Program</option>
                        </select>
                        <button onClick={addChannel} disabled={actionLoading === 'add_channel' || !addChannelInput.trim()}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-50 text-sm font-medium">
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

                {/* Channels Table */}
                <div className="rounded-xl border border-white/10 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/[0.02]">
                                <th className="text-left p-3 text-muted-foreground font-medium">Channel</th>
                                <th className="text-left p-3 text-muted-foreground font-medium">Priority</th>
                                <th className="text-left p-3 text-muted-foreground font-medium">Available</th>
                                <th className="text-left p-3 text-muted-foreground font-medium">Pending</th>
                                <th className="text-left p-3 text-muted-foreground font-medium">Processed</th>
                                <th className="text-left p-3 text-muted-foreground font-medium">Added</th>
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
                                    <td className="p-3 text-muted-foreground">--</td>
                                    <td className="p-3 text-muted-foreground">
                                        {channel.video_count?.toLocaleString() || '—'}
                                    </td>
                                    <td className="p-3">
                                        {channel.pending_count > 0 ? (
                                            <span className="text-amber-500 font-medium">{channel.pending_count}</span>
                                        ) : (
                                            <span className="text-muted-foreground">0</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-muted-foreground">
                                        {channel.processed_count.toLocaleString()}
                                    </td>
                                    <td className="p-3 text-muted-foreground">
                                        {channel.added_count.toLocaleString()}
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
                                    <td colSpan={8} className="p-6 text-center text-muted-foreground">
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
                                    <th className="text-left p-3 text-muted-foreground font-medium">Priority</th>
                                    <th className="text-left p-3 text-muted-foreground font-medium">Available</th>
                                    <th className="text-left p-3 text-muted-foreground font-medium">Pending</th>
                                    <th className="text-left p-3 text-muted-foreground font-medium">Processed</th>
                                    <th className="text-left p-3 text-muted-foreground font-medium">Added</th>
                                    <th className="text-left p-3 text-muted-foreground font-medium">Last Scanned</th>
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
                                        <td className="p-3 text-muted-foreground">--</td>
                                        <td className="p-3 text-muted-foreground">
                                            {channel.video_count?.toLocaleString() || '—'}
                                        </td>
                                        <td className="p-3 text-muted-foreground">
                                            {channel.pending_count > 0 ? (
                                                <span className="text-amber-500 font-medium">{channel.pending_count}</span>
                                            ) : (
                                                <span>0</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-muted-foreground">
                                            {channel.processed_count.toLocaleString()}
                                        </td>
                                        <td className="p-3 text-muted-foreground">
                                            {channel.added_count.toLocaleString()}
                                        </td>
                                        <td className="p-3 text-muted-foreground text-xs">
                                            {channel.last_scanned_at
                                                ? new Date(channel.last_scanned_at).toLocaleString()
                                                : 'Never'}
                                        </td>
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

            {/* ═══ Sprint 8: Scanner-Enabled Playlists ═══════════════════════ */}
            <div className="mt-12 mb-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <ListVideo className="w-4 h-4 text-teal-500" />
                        Scanner-Enabled Playlists ({playlists.filter(p => p.scanner_enabled).length})
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={auditPlaylists} disabled={actionLoading === 'audit_playlists'}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 disabled:opacity-50 text-xs font-medium">
                            {actionLoading === 'audit_playlists' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                            Run Audit
                        </button>
                        <button onClick={discoverAllPlaylists} disabled={actionLoading === 'discover_all_playlists'}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 disabled:opacity-50 text-xs font-medium">
                            {actionLoading === 'discover_all_playlists' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radar className="w-3.5 h-3.5" />}
                            Discover New Videos in Playlists
                        </button>
                        <button onClick={runPlaylistTick} disabled={actionLoading === 'run_playlist_tick'}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 text-xs font-medium">
                            {actionLoading === 'run_playlist_tick' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                            Run Single Tick
                        </button>
                    </div>
                </div>

                {playlistTickResult && (
                    <div className="mb-4 p-3 rounded-xl border border-teal-500/20 bg-teal-500/5">
                        <pre className="text-xs text-muted-foreground overflow-auto max-h-32">{JSON.stringify(playlistTickResult, null, 2)}</pre>
                    </div>
                )}

                {/* Add Playlist Form */}
                <div className="mb-4 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add Playlist
                    </h3>
                    <div className="flex gap-3 flex-wrap">
                        <input type="text" value={addPlaylistInput} onChange={e => setAddPlaylistInput(e.target.value)}
                            placeholder="YouTube playlist URL or ID (PL...)" className="flex-1 min-w-[250px] px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-teal-500/50" />
                        <select value={addPlaylistTrack} onChange={e => setAddPlaylistTrack(e.target.value)}
                            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground text-sm">
                            <option value="mixed">Mixed</option>
                            <option value="encounters">Encounters</option>
                            <option value="program">Program</option>
                        </select>
                        <select value={addPlaylistPriority} onChange={e => setAddPlaylistPriority(Number(e.target.value))}
                            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground text-sm">
                            <option value={1}>Priority 1 (Highest)</option>
                            <option value={2}>Priority 2</option>
                            <option value={3}>Priority 3</option>
                            <option value={4}>Priority 4</option>
                            <option value={5}>Priority 5 (Default)</option>
                        </select>
                        <button onClick={addPlaylist} disabled={actionLoading === 'add_playlist' || !addPlaylistInput.trim()}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50 text-sm font-medium">
                            {actionLoading === 'add_playlist' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Add
                        </button>
                    </div>
                    {addPlaylistResult && (
                        <div className={`mt-3 p-3 rounded-lg text-sm ${addPlaylistResult.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {addPlaylistResult.success ? `✅ Added: ${addPlaylistResult.playlist?.playlist_title}` : `❌ ${addPlaylistResult.error}`}
                        </div>
                    )}
                </div>

                {/* Playlists Table */}
                <div className="rounded-xl border border-white/10 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/[0.02]">
                                <th className="text-left p-3 text-muted-foreground font-medium">Playlist</th>
                                <th className="text-left p-3 text-muted-foreground font-medium">Priority</th>
                                <th className="text-left p-3 text-muted-foreground font-medium">Available</th>
                                <th className="text-left p-3 text-muted-foreground font-medium">Pending</th>
                                <th className="text-left p-3 text-muted-foreground font-medium">Processed</th>
                                <th className="text-left p-3 text-muted-foreground font-medium">Added</th>
                                <th className="text-left p-3 text-muted-foreground font-medium">Last Scanned</th>
                                <th className="text-left p-3 text-muted-foreground font-medium">Scanner</th>
                                <th className="text-left p-3 text-muted-foreground font-medium"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {playlists.map(pl => (
                                <tr key={pl.playlist_id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                    <td className="p-3">
                                        <div className="text-foreground font-medium">{pl.playlist_title}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-muted-foreground text-xs">{pl.channel_name || '—'}</span>
                                            {pl.channel_in_scanner && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400" title="This channel is also in the channel scanner">
                                                    <CheckCircle2 className="w-3 h-3" /> In Scanner
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-3 text-muted-foreground">{pl.priority}</td>
                                    <td className="p-3 text-muted-foreground">{pl.video_count?.toLocaleString() || '—'}</td>
                                    <td className="p-3">
                                        {pl.pending_count > 0 ? <span className="text-amber-500 font-medium">{pl.pending_count}</span> : <span className="text-muted-foreground">0</span>}
                                    </td>
                                    <td className="p-3 text-muted-foreground">
                                        {pl.processed_count.toLocaleString()}
                                    </td>
                                    <td className="p-3 text-muted-foreground">
                                        {pl.added_count.toLocaleString()}
                                    </td>
                                    <td className="p-3 text-muted-foreground text-xs">{pl.last_scanned_at ? new Date(pl.last_scanned_at).toLocaleString() : 'Never'}</td>
                                    <td className="p-3">
                                        <button onClick={() => togglePlaylist(pl.playlist_id, !pl.scanner_enabled)} disabled={actionLoading === pl.playlist_id}>
                                            {actionLoading === pl.playlist_id ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                                : pl.scanner_enabled ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
                                        </button>
                                    </td>
                                    <td className="p-3">
                                        <button onClick={() => removePlaylist(pl.playlist_id)} disabled={actionLoading === pl.playlist_id}
                                            className="text-red-400/50 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                            {playlists.length === 0 && (
                                <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No playlists added yet. Add a YouTube playlist above.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ═══ Sprint 8: Keyword-Monitored Channels ═══════════════════════ */}
            <div className="mt-12 mb-4">
                <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-orange-500" />
                    Keyword-Monitored Channels ({keywordMonitors.length})
                </h2>

                {/* Disabled explanation banner */}
                <div className="mb-4 p-4 rounded-xl border border-orange-500/20 bg-orange-500/5">
                    <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm text-orange-300 font-medium mb-1">Keyword monitoring is disabled by default</p>
                            <p className="text-xs text-muted-foreground">This feature uses YouTube&apos;s Search API which costs 100 quota units per call (vs 1 unit for playlist scanning). Enable only when channel and playlist scans are no longer adding new videos daily and you have API quota to spare.</p>
                        </div>
                    </div>
                </div>

                {/* Add Keyword Monitor Form */}
                <div className="mb-4 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add Keyword Monitor
                    </h3>
                    <div className="flex gap-3 flex-wrap">
                        <input type="text" value={addKwChannel} onChange={e => setAddKwChannel(e.target.value)}
                            placeholder="YouTube @handle, URL, or channel ID" className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/50" />
                        <input type="text" value={addKwTerms} onChange={e => setAddKwTerms(e.target.value)}
                            placeholder="Search terms (comma separated)" className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/50" />
                        <button onClick={addKeywordMonitor} disabled={actionLoading === 'add_kw' || !addKwChannel.trim() || !addKwTerms.trim()}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/80 text-white hover:bg-orange-500 disabled:opacity-50 text-sm font-medium">
                            {actionLoading === 'add_kw' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Add (Disabled)
                        </button>
                    </div>
                    {addKwResult && (
                        <div className={`mt-3 p-3 rounded-lg text-sm ${addKwResult.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {addKwResult.success ? `✅ Added (disabled). ${addKwResult.note || ''}` : `❌ ${addKwResult.error}`}
                        </div>
                    )}
                </div>

                {/* Keyword Monitors Table */}
                {keywordMonitors.length > 0 && (
                    <div className="rounded-xl border border-white/10 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/[0.02]">
                                    <th className="text-left p-3 text-muted-foreground font-medium">Channel</th>
                                    <th className="text-left p-3 text-muted-foreground font-medium">Search Terms</th>
                                    <th className="text-left p-3 text-muted-foreground font-medium">Found</th>
                                    <th className="text-left p-3 text-muted-foreground font-medium">Last Scanned</th>
                                    <th className="text-left p-3 text-muted-foreground font-medium">Scanner</th>
                                    <th className="text-left p-3 text-muted-foreground font-medium"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {keywordMonitors.map(km => (
                                    <tr key={km.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                        <td className="p-3 text-foreground">{km.channel_name}</td>
                                        <td className="p-3">
                                            <div className="flex flex-wrap gap-1">
                                                {km.search_terms.map((term, i) => (
                                                    <span key={i} className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-xs">{term}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-3 text-muted-foreground">{km.videos_found}</td>
                                        <td className="p-3 text-muted-foreground text-xs">{km.last_scanned_at ? new Date(km.last_scanned_at).toLocaleString() : 'Never'}</td>
                                        <td className="p-3">
                                            <button onClick={() => toggleKeywordMonitor(km.id, !km.scanner_enabled)} disabled={actionLoading === km.id}>
                                                {actionLoading === km.id ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                                    : km.scanner_enabled ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
                                            </button>
                                        </td>
                                        <td className="p-3">
                                            <button onClick={() => removeKeywordMonitor(km.id)} disabled={actionLoading === km.id}
                                                className="text-red-400/50 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ═══ Sprint 8: Submit Single Video ══════════════════════════════ */}
            <div className="mt-12 mb-4 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-cyan-500" /> Submit Single Video
                </h3>
                <p className="text-xs text-muted-foreground mb-3">Add a single video from any channel. Processes with highest priority.</p>
                <div className="flex gap-3">
                    <input type="text" value={singleVideoUrl} onChange={e => setSingleVideoUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..." className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50" />
                    <button onClick={addSingleVideo} disabled={actionLoading === 'add_single_video' || !singleVideoUrl.trim()}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 disabled:opacity-50 text-sm font-medium">
                        {actionLoading === 'add_single_video' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Queue
                    </button>
                </div>
                {singleVideoResult && (
                    <div className={`mt-3 p-3 rounded-lg text-sm ${singleVideoResult.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {singleVideoResult.success ? `✅ Queued: ${singleVideoResult.videoId}` : `❌ ${singleVideoResult.error}`}
                    </div>
                )}
            </div>
        </div>
    );
}
