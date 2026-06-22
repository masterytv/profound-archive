'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    DollarSign, Gauge, AlertTriangle, RefreshCw, Power, PauseCircle, PlayCircle,
    Calendar, KeyRound, Server, Clock,
} from 'lucide-react';
import type { OperationsSummary, ProcessView, ServiceView } from '@/app/api/admin/operations/route';

function fmtUsd(n: number): string {
    return `$${n.toFixed(2)}`;
}
function fmtNum(n: number): string {
    return n.toLocaleString();
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

function QuotaBar({ svc }: { svc: ServiceView }) {
    if (svc.costModel === 'flat') {
        return (
            <span className="text-xs text-slate-400">
                {svc.flatMonthlyUsd ? `${fmtUsd(svc.flatMonthlyUsd)}/mo fixed` : 'fixed fee'}
            </span>
        );
    }
    if (svc.costModel === 'tokens' || svc.quotaLimit == null) {
        return <span className="text-xs text-slate-400 tabular-nums">{fmtUsd(svc.costMonth)} this month</span>;
    }
    const pct = svc.quotaPct ?? 0;
    const danger = pct >= 90, warn = pct >= 70;
    const bar = danger ? 'bg-red-500' : warn ? 'bg-amber-500' : 'bg-emerald-500';
    return (
        <div className="flex items-center gap-2 min-w-[180px]">
            <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs tabular-nums text-slate-500 dark:text-slate-300 whitespace-nowrap">
                {fmtNum(svc.usedThisPeriod)}/{fmtNum(svc.quotaLimit)} {svc.unit}/{svc.quotaPeriod}
            </span>
        </div>
    );
}

function ProcessCard({ proc, busy, onToggle }: {
    proc: ProcessView; busy: boolean;
    onToggle: (key: string, paused: boolean) => void;
}) {
    const canPause = proc.switchKey != null;
    return (
        <div className={`rounded-2xl border p-5 transition-colors ${
            proc.paused
                ? 'border-amber-300 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/5'
                : 'border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/5'
        }`}>
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{proc.label}</h3>
                        {proc.paused && (
                            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-500 text-white">Paused</span>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{proc.description}</p>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                        <Clock className="w-3.5 h-3.5" /> {proc.schedule}
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">{fmtUsd(proc.costMonth)}</p>
                    <p className="text-[11px] text-slate-400">this month</p>
                    <p className="text-xs text-slate-400 tabular-nums mt-0.5">{fmtUsd(proc.costToday)} today</p>
                </div>
            </div>

            {/* Services */}
            <div className="mt-4 space-y-2.5 border-t border-slate-200/60 dark:border-white/10 pt-3">
                {proc.services.map((svc) => (
                    <div key={svc.provider + svc.label} className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm text-slate-700 dark:text-slate-200">{svc.label}</span>
                            {svc.keyHint && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10" title={`${svc.provider} key`}>
                                    <KeyRound className="w-3 h-3" />{svc.keyHint}
                                </span>
                            )}
                        </div>
                        <QuotaBar svc={svc} />
                    </div>
                ))}
            </div>

            {canPause && (
                <div className="mt-4 flex justify-end">
                    <button
                        onClick={() => onToggle(proc.switchKey!, !proc.paused)}
                        disabled={busy}
                        className={`inline-flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-xl transition-colors disabled:opacity-50 ${
                            proc.paused
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                : 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200'
                        }`}
                    >
                        {proc.paused ? <><PlayCircle className="w-4 h-4" /> Resume</> : <><PauseCircle className="w-4 h-4" /> Pause</>}
                    </button>
                </div>
            )}
        </div>
    );
}

export default function OperationsDashboard() {
    const [data, setData] = useState<OperationsSummary | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [busyKey, setBusyKey] = useState<string | null>(null);

    const load = useCallback(async () => {
        const res = await fetch('/api/admin/operations');
        const j = (await res.json()) as OperationsSummary;
        setData(j);
    }, []);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/admin/operations')
            .then((r) => r.json())
            .then((j) => { if (!cancelled) setData(j); });
        return () => { cancelled = true; };
    }, []);

    async function toggle(key: string, paused: boolean) {
        setBusyKey(key);
        try {
            await fetch('/api/admin/operations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, paused }),
            });
            await load();
        } finally {
            setBusyKey(null);
        }
    }

    async function refresh() {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }

    if (!data) {
        return <div className="h-64 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />;
    }

    const master = data.switches.find((s) => s.key === 'master');
    const masterPaused = Boolean(master?.paused);
    const b = data.budget;
    const monthPct = Math.min(100, Math.round((b.monthSpend / b.monthlyCap) * 100));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Operations &amp; Cost Control</h1>
                    <p className="text-sm text-slate-400">Every paid process, what it spends, and a switch to pause it.</p>
                </div>
                <button onClick={refresh} className="rounded-xl border border-slate-200 dark:border-white/10 p-2" title="Refresh">
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {!data.tableReady && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 p-4 text-sm text-amber-800 dark:text-amber-300">
                    The cost-control tables aren&apos;t present yet. Run the migration
                    <code className="mx-1">supabase/migrations/20260622_ops_cost_control.sql</code>
                    to start recording usage and enable the pause switches.
                </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total this month" value={fmtUsd(data.grandTotalMonth)} icon={DollarSign} color="bg-amber-500" sub={`${fmtUsd(data.totalCostMonth)} metered + ${fmtUsd(data.flatMonthlyTotal)} fixed`} />
                <StatCard label="Spent today" value={fmtUsd(data.costToday)} icon={Calendar} color="bg-blue-500" />
                <StatCard label="Budget guard" value={`${monthPct}%`} icon={Gauge} color={monthPct >= 100 ? 'bg-red-500' : 'bg-violet-500'} sub={`${fmtUsd(b.monthSpend)} of ${fmtUsd(b.monthlyCap)} cap`} />
                <StatCard label="Auto-block" value={b.allowed ? 'OK' : 'BLOCKING'} icon={AlertTriangle} color={b.allowed ? 'bg-emerald-500' : 'bg-red-500'} sub={b.allowed ? `Today ${fmtUsd(b.daySpend)} / ${fmtUsd(b.dailyCap)}` : b.reason} />
            </div>

            {/* Master kill switch */}
            <div className={`rounded-2xl border p-5 flex items-center justify-between gap-4 ${
                masterPaused
                    ? 'border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10'
                    : 'border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/5'
            }`}>
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${masterPaused ? 'bg-red-500' : 'bg-slate-800 dark:bg-white/10'}`}>
                        <Power className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {masterPaused ? 'All paid processing is PAUSED' : 'Pause all paid processing'}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Stops ingestion, analysis, blog, images &amp; email at once. Chat, search &amp; the site stay online.
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => toggle('master', !masterPaused)}
                    disabled={busyKey === 'master'}
                    className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 ${
                        masterPaused
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                            : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                >
                    {masterPaused ? <><PlayCircle className="w-4 h-4" /> Resume all</> : <><PauseCircle className="w-4 h-4" /> Pause all</>}
                </button>
            </div>

            {masterPaused && (
                <p className="text-xs text-amber-600 dark:text-amber-400 -mt-3 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Master pause overrides the per-process switches below — everything is held until you resume.
                </p>
            )}

            {/* Process cards */}
            <div className="grid md:grid-cols-2 gap-4">
                {data.processes.map((proc) => (
                    <ProcessCard key={proc.key} proc={proc} busy={busyKey === proc.switchKey} onToggle={toggle} />
                ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
                <Server className="w-3.5 h-3.5" />
                Costs are estimates from logged API calls + the price tables in <code className="font-mono">src/lib/ai/pricing.ts</code>. Quotas &amp; fixed fees are declared in <code className="font-mono">src/lib/ops/registry.ts</code> — edit them to match real plans.
            </div>
        </div>
    );
}
