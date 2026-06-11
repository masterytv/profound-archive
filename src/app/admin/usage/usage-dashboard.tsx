'use client';

import { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { DollarSign, Activity, AlertTriangle, Gauge, RefreshCw } from 'lucide-react';
import type { UsageSummary } from '@/app/api/admin/usage/route';

const COLORS = ['#D97706', '#2563EB', '#7C3AED', '#059669', '#DC2626', '#0891B2', '#DB2777'];

function fmtUsd(n: number): string {
    return `$${n.toFixed(2)}`;
}

function StatCard({ label, value, icon: Icon, color, sub }: {
    label: string; value: string; sub?: string;
    icon: React.ComponentType<{ className?: string }>; color: string;
}) {
    return (
        <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 p-5">
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
    );
}

function BreakdownTable({ title, rows, labelKey }: {
    title: string;
    rows: { cost: number; calls: number; [k: string]: string | number }[];
    labelKey: string;
}) {
    const max = Math.max(...rows.map((r) => r.cost), 0.0001);
    return (
        <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 p-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">{title}</h3>
            {rows.length === 0 ? (
                <p className="text-sm text-slate-400">No data yet.</p>
            ) : (
                <div className="space-y-2.5">
                    {rows.map((r, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                            <div className="w-40 truncate text-slate-600 dark:text-slate-300" title={String(r[labelKey])}>
                                {String(r[labelKey])}
                            </div>
                            <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${(r.cost / max) * 100}%`, background: COLORS[i % COLORS.length] }} />
                            </div>
                            <div className="w-20 text-right font-medium tabular-nums text-slate-900 dark:text-slate-100">{fmtUsd(r.cost)}</div>
                            <div className="w-16 text-right text-xs text-slate-400 tabular-nums">{r.calls} calls</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

async function fetchUsage(range: number): Promise<UsageSummary> {
    const res = await fetch(`/api/admin/usage?days=${range}`);
    return res.json();
}

export default function UsageDashboard() {
    const [data, setData] = useState<UsageSummary | null>(null);
    const [days, setDays] = useState(30);
    const [refreshing, setRefreshing] = useState(false);

    // Effect path never sets state synchronously — only after the fetch resolves.
    useEffect(() => {
        let cancelled = false;
        fetchUsage(days).then((j) => { if (!cancelled) setData(j); });
        return () => { cancelled = true; };
    }, [days]);

    async function refresh() {
        setRefreshing(true);
        const j = await fetchUsage(days);
        setData(j);
        setRefreshing(false);
    }

    if (!data) {
        return <div className="h-64 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />;
    }

    const b = data.budget;
    const monthPct = Math.min(100, Math.round((b.monthSpend / b.monthlyCap) * 100));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">API Usage &amp; Cost</h1>
                    <p className="text-sm text-slate-400">Per-operation spend across AI providers · last {data.rangeDays} days</p>
                </div>
                <div className="flex items-center gap-2">
                    <select value={days} onChange={(e) => setDays(Number(e.target.value))}
                        className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm">
                        <option value={7}>7 days</option>
                        <option value={30}>30 days</option>
                        <option value={90}>90 days</option>
                    </select>
                    <button onClick={refresh} className="rounded-xl border border-slate-200 dark:border-white/10 p-2" title="Refresh">
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {!data.tableReady && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 p-4 text-sm text-amber-800 dark:text-amber-300">
                    The <code>api_usage_log</code> table isn&apos;t present yet. Run the migration
                    <code className="mx-1">supabase/migrations/20260611_api_usage_log.sql</code>
                    to start recording usage. The budget guard is currently failing open (generation allowed).
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Spend (range)" value={fmtUsd(data.totalCost)} icon={DollarSign} color="bg-amber-500" />
                <StatCard label="Calls" value={data.totalCalls.toLocaleString()} icon={Activity} color="bg-blue-500" sub={`${data.errorCalls} errors`} />
                <StatCard label="This month" value={fmtUsd(b.monthSpend)} icon={Gauge} color={monthPct >= 100 ? 'bg-red-500' : 'bg-violet-500'} sub={`${monthPct}% of ${fmtUsd(b.monthlyCap)} cap`} />
                <StatCard label="Budget guard" value={b.allowed ? 'OK' : 'BLOCKING'} icon={AlertTriangle} color={b.allowed ? 'bg-emerald-500' : 'bg-red-500'} sub={b.allowed ? `Today ${fmtUsd(b.daySpend)} / ${fmtUsd(b.dailyCap)}` : b.reason} />
            </div>

            <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 p-5">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Daily spend</h3>
                <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={data.byDay}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v}`} />
                        <Tooltip formatter={(v: number) => fmtUsd(v)} />
                        <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                            {data.byDay.map((_, i) => <Cell key={i} fill="#D97706" />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <BreakdownTable title="By operation (feature)" rows={data.byOperation} labelKey="operation" />
                <BreakdownTable title="By model" rows={data.byModel} labelKey="model" />
            </div>
            <BreakdownTable title="By provider" rows={data.byProvider} labelKey="provider" />
        </div>
    );
}
