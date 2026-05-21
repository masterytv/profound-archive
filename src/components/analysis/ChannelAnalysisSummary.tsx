"use client";

import { useState } from "react";
import { BarChart3, Zap, Heart, AlertTriangle, ChevronDown, Brain, TrendingUp } from "lucide-react";

export interface ChannelNderfStats {
    total_analyzed: number;
    experience_types: Record<string, number>;
    avg_intensity: number | null;
    tone_distribution: Record<string, number>;
    trigger_distribution: Record<string, number>;
}

export interface ChannelScoreSummary {
    avg_greyson_score: number | null;
    avg_transformation_score: number | null;
    avg_veridical_score: number | null;
}

interface ChannelAnalysisSummaryProps {
    stats: ChannelNderfStats | null;
    scores?: ChannelScoreSummary | null;
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

// Max possible values for percentage conversion
const GREYSON_MAX = 32;
const TRANSFORMATION_MAX = 50;
const VERIDICAL_MAX = 28;

function ScoreCard({ 
    label, 
    value, 
    maxValue, 
    icon: Icon, 
    color, 
    bgColor 
}: {
    label: string;
    value: number | null;
    maxValue: number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
}) {
    if (value == null) return null;
    const pct = Math.round((value / maxValue) * 100);

    return (
        <div className="flex flex-col items-center gap-2 flex-1 min-w-[100px]">
            <div className={`w-9 h-9 rounded-xl ${bgColor} flex items-center justify-center`}>
                <Icon className={`w-4.5 h-4.5 ${color}`} />
            </div>
            <div className="text-center">
                <p className={`text-2xl font-bold tabular-nums ${color}`}>
                    {pct}%
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium leading-tight mt-0.5">
                    {label}
                </p>
            </div>
            {/* Thin progress bar */}
            <div className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700`}
                    style={{ 
                        width: `${pct}%`, 
                        background: `linear-gradient(90deg, ${color.includes('violet') ? '#8B5CF6' : color.includes('blue') ? '#3B82F6' : '#10B981'}, ${color.includes('violet') ? '#A78BFA' : color.includes('blue') ? '#60A5FA' : '#34D399'})` 
                    }}
                />
            </div>
        </div>
    );
}

/**
 * ChannelAnalysisSummary — aggregated NDERF stats for a channel.
 * Shows score summary (Depth/Life Impact/Evidence) prominently,
 * with experience type, tone, and trigger distributions in a collapsible section.
 *
 * Data is fetched server-side and passed as props to avoid client-side AbortError
 * issues with React strict mode and singleton Supabase client.
 */
export function ChannelAnalysisSummary({ stats, scores }: ChannelAnalysisSummaryProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Don't render if no data at all
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

    const hasScores = scores && (
        scores.avg_greyson_score != null ||
        scores.avg_transformation_score != null ||
        scores.avg_veridical_score != null
    );

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
                {/* ── Score Summary (always visible) ── */}
                {hasScores && (
                    <div className="flex items-center justify-center gap-6 sm:gap-10 py-2 mb-4">
                        <ScoreCard
                            label="Depth"
                            value={scores!.avg_greyson_score}
                            maxValue={GREYSON_MAX}
                            icon={Brain}
                            color="text-violet-600"
                            bgColor="bg-violet-50 dark:bg-violet-900/30"
                        />
                        <ScoreCard
                            label="Life Impact"
                            value={scores!.avg_transformation_score}
                            maxValue={TRANSFORMATION_MAX}
                            icon={Heart}
                            color="text-blue-600"
                            bgColor="bg-blue-50 dark:bg-blue-900/30"
                        />
                        <ScoreCard
                            label="Evidence"
                            value={scores!.avg_veridical_score}
                            maxValue={VERIDICAL_MAX}
                            icon={TrendingUp}
                            color="text-emerald-600"
                            bgColor="bg-emerald-50 dark:bg-emerald-900/30"
                        />
                    </div>
                )}

                {/* Average intensity bar (always visible) */}
                {stats.avg_intensity && (
                    <div className={hasScores ? "pt-4 border-t border-slate-100 dark:border-white/10" : ""}>
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

                {/* ── Collapsible Detailed Analysis ── */}
                <div className="mt-4">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-2 w-full text-left py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
                    >
                        <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                        />
                        Detailed Breakdown
                        <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500 ml-1">
                            (types, tone, triggers)
                        </span>
                    </button>

                    {isExpanded && (
                        <div className="space-y-6 pt-3 animate-in slide-in-from-top-2 duration-200">
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
                    )}
                </div>
            </div>
        </div>
    );
}
