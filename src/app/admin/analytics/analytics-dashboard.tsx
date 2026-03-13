'use client';

import { useEffect, useState } from 'react';
import {
    LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Users, Eye, Clock, ExternalLink, RefreshCw } from 'lucide-react';
import type { AnalyticsData } from '@/app/api/admin/analytics/route';

// ── Looker Studio URL — update this once you've built the report ──
// Leave as '' to hide the button until you have the link.
const LOOKER_STUDIO_URL = '';

// ── Palette ───────────────────────────────────────────────────────────────────
const COLORS = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626', '#0891B2'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtSeconds(s: number): string {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
}
function fmtNum(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: {
    label: string; value: string;
    icon: React.ComponentType<{ className?: string }>; color: string;
}) {
    return (
        <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
    const [data, setData]         = useState<AnalyticsData | null>(null);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState<string | null>(null);
    const [days, setDays]         = useState(30);

    async function load(d: number) {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/analytics?days=${d}`);
            if (!res.ok) throw new Error(await res.text());
            setData(await res.json());
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(days); }, [days]);

    if (error) return (
        <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 p-6 text-red-700 dark:text-red-300 text-sm">
            <strong>Analytics error:</strong> {error}
            <br /><span className="text-xs opacity-70">Check that the service account has Viewer access in GA4 Property Access Management.</span>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100"
                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
                    Analytics
                </h1>
                <div className="flex items-center gap-2">
                    {/* Day range selector */}
                    <select
                        value={days}
                        onChange={e => setDays(Number(e.target.value))}
                        className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 text-sm px-3 py-1.5 dark:[color-scheme:dark]"
                    >
                        <option value={7}>Last 7 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 90 days</option>
                    </select>
                    {/* Refresh */}
                    <button
                        onClick={() => load(days)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    {/* Looker Studio link */}
                    {LOOKER_STUDIO_URL && (
                        <a href={LOOKER_STUDIO_URL} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 transition-colors">
                            Full Report <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    )}
                </div>
            </div>

            {loading && !data ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
                    ))}
                </div>
            ) : data ? (<>
                {/* ── Stat Cards ───────────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Sessions"    value={fmtNum(data.totals.sessions)}    icon={TrendingUp} color="bg-blue-600" />
                    <StatCard label="Page Views"  value={fmtNum(data.totals.pageViews)}   icon={Eye}        color="bg-violet-600" />
                    <StatCard label="Users"       value={fmtNum(data.totals.activeUsers)} icon={Users}      color="bg-emerald-600" />
                    <StatCard label="Avg. Session" value={fmtSeconds(data.totals.avgEngagementSeconds)} icon={Clock} color="bg-amber-500" />
                </div>

                {/* ── Daily Active Users Line Chart ────────────────────────── */}
                {data.dailyUsers.length > 1 && (
                    <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 p-5">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Daily Active Users</h2>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={data.dailyUsers}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" interval="preserveStartEnd" />
                                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" width={35} />
                                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }} />
                                <Line type="monotone" dataKey="users" stroke="#2563EB" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* ── Channel Groups + New vs Returning ───────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Traffic Sources bar chart */}
                    <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 p-5">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Traffic Sources</h2>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={data.channelGroups.slice(0, 6)} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                                <YAxis type="category" dataKey="channel" tick={{ fontSize: 10 }} stroke="#94a3b8" width={90} />
                                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }} />
                                <Bar dataKey="sessions" fill="#2563EB" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* New vs Returning donut */}
                    <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 p-5">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">New vs Returning</h2>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'New',       value: data.totals.newUsers },
                                        { name: 'Returning', value: data.totals.returningUsers },
                                    ]}
                                    cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                                    dataKey="value" paddingAngle={3}
                                >
                                    <Cell fill="#2563EB" />
                                    <Cell fill="#7C3AED" />
                                </Pie>
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ── Top Pages Table ──────────────────────────────────────── */}
                <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 p-5">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Top Pages</h2>
                    <div className="space-y-1">
                        {data.topPages.map((p, i) => (
                            <div key={p.page} className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-white/5 last:border-0">
                                <span className="w-5 text-xs text-slate-400 text-right shrink-0">{i + 1}</span>
                                <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate font-mono">{p.page}</span>
                                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{fmtNum(p.views)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Looker Studio CTA (if no URL set yet) ───────────────── */}
                {!LOOKER_STUDIO_URL && (
                    <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/20 p-5 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Deep-dive analytics available in Looker Studio.{' '}
                            <a href="https://lookerstudio.google.com" target="_blank" rel="noopener noreferrer"
                                className="text-blue-600 hover:underline inline-flex items-center gap-1">
                                Build your report <ExternalLink className="w-3 h-3" />
                            </a>
                            {' '}then paste the URL into <code className="text-xs bg-slate-100 dark:bg-white/10 px-1 py-0.5 rounded">LOOKER_STUDIO_URL</code> in the analytics dashboard component.
                        </p>
                    </div>
                )}
            </>) : null}
        </div>
    );
}
