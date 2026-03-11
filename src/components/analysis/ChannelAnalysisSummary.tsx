"use client";

import { BarChart3, Zap, Heart, AlertTriangle } from "lucide-react";

export interface ChannelNderfStats {
    total_analyzed: number;
    experience_types: Record<string, number>;
    avg_intensity: number | null;
    tone_distribution: Record<string, number>;
    trigger_distribution: Record<string, number>;
}

interface ChannelAnalysisSummaryProps {
    stats: ChannelNderfStats | null;
}

// Color palette for chart segments
const BAR_COLORS = [
    "#8B5CF6", // violet
    "#3B82F6", // blue
    "#EC4899", // pink
    "#F59E0B", // amber
    "#10B981", // emerald
    "#6366F1", // indigo
    "#EF4444", // red
    "#14B8A6", // teal
];

// Format label — capitalize and prettify
const formatLabel = (str: string) =>
    str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Stacked horizontal bar chart with inline legend.
 * Takes { label: string, value: number, color: string }[] data.
 */
function StackedBar({
    data,
}: {
    data: { label: string; value: number; color: string }[];
}) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) return null;

    return (
        <div className="space-y-2">
            {/* Stacked bar */}
            <div className="h-5 rounded-full overflow-hidden flex bg-slate-100 dark:bg-white/10">
                {data.map((d, i) => {
                    const pct = (d.value / total) * 100;
                    if (pct < 1) return null; // skip tiny slices
                    return (
                        <div
                            key={i}
                            className="h-full transition-all duration-500 relative group first:rounded-l-full last:rounded-r-full"
                            style={{ width: `${pct}%`, backgroundColor: d.color }}
                            title={`${formatLabel(d.label)}: ${d.value} (${Math.round(pct)}%)`}
                        >
                            {/* Show percentage on hover for wider segments */}
                            {pct > 15 && (
                                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/90">
                                    {Math.round(pct)}%
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1">
                {data.map((d, i) => (
                    <div key={i} className="flex items-center gap-1">
                        <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: d.color }}
                        />
                        <span className="text-[10px] text-slate-600 dark:text-slate-400">
                            {formatLabel(d.label)} ({d.value})
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * ChannelAnalysisSummary — aggregated NDERF stats for a channel.
 * Shows experience type, tone, and trigger distributions as stacked bar charts,
 * plus average intensity as a progress bar.
 *
 * Data is fetched server-side and passed as props to avoid client-side AbortError
 * issues with React strict mode and singleton Supabase client.
 */
export function ChannelAnalysisSummary({ stats }: ChannelAnalysisSummaryProps) {
    // Don't render if no data
    if (!stats || stats.total_analyzed === 0) return null;

    const makeChartData = (dist: Record<string, number>) =>
        Object.entries(dist)
            .filter(([, v]) => v > 0)
            .sort(([, a], [, b]) => b - a)
            .map(([label, value], i) => ({
                label,
                value,
                color: BAR_COLORS[i % BAR_COLORS.length],
            }));

    return (
        <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm dark:shadow-none overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                <h2
                    className="text-lg font-bold text-slate-900 dark:text-slate-100"
                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                >
                    Experience Analysis Overview
                </h2>
                <span className="ml-auto text-[10px] font-medium bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                    {stats.total_analyzed} analyzed
                </span>
            </div>

            <div className="px-6 py-5">
                <div className="space-y-6">
                    {/* Experience Types */}
                    <div>
                        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Heart className="w-3.5 h-3.5" />
                            Experience Types
                        </h3>
                        <StackedBar data={makeChartData(stats.experience_types)} />
                    </div>

                    {/* Tone Distribution */}
                    <div>
                        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5" />
                            Emotional Tone
                        </h3>
                        <StackedBar data={makeChartData(stats.tone_distribution)} />
                    </div>

                    {/* Trigger Distribution */}
                    <div>
                        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Trigger Types
                        </h3>
                        <StackedBar data={makeChartData(stats.trigger_distribution)} />
                    </div>
                </div>

                {/* Average intensity bar */}
                {stats.avg_intensity && (
                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/10">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Avg. Intensity
                            </span>
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {stats.avg_intensity}/10
                            </span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-500 transition-all duration-700"
                                style={{ width: `${(Number(stats.avg_intensity) / 10) * 100}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
