'use client'

/**
 * MiniStackedBar — compact horizontal stacked bar for the channels list.
 * Renders a small proportional bar with optional tooltip showing segment breakdown.
 * Intentionally simplified (no legend) for dense list-view usage.
 */

const BAR_COLORS: Record<string, string> = {
    // Experience types
    nde: '#8B5CF6',
    obe: '#3B82F6',
    sde: '#EC4899',
    ste: '#10B981',
    adc: '#F59E0B',
    other: '#94A3B8',
    meditation: '#14B8A6',
    analysis_failed: '#E2E8F0',
    unclassified: '#CBD5E1',
    // Tone
    very_positive: '#8B5CF6',
    positive: '#3B82F6',
    mixed: '#F59E0B',
    neutral: '#94A3B8',
    very_negative: '#EF4444',
    unknown: '#E2E8F0',
}

const FALLBACK_COLORS = [
    '#8B5CF6', '#3B82F6', '#EC4899', '#F59E0B', '#10B981',
    '#6366F1', '#EF4444', '#14B8A6',
]

function formatLabel(str: string) {
    return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

interface MiniBarSegment {
    key: string
    value: number
}

interface MiniStackedBarProps {
    data: Record<string, number>
    height?: number   // px, default 6
    label?: string    // tooltip prefix label
}

export function MiniStackedBar({ data, height = 6, label }: MiniStackedBarProps) {
    const entries: MiniBarSegment[] = Object.entries(data)
        .filter(([k, v]) => v > 0 && k !== 'analysis_failed')
        .sort((a, b) => b[1] - a[1])
        .map(([key, value]) => ({ key, value }))

    const total = entries.reduce((s, e) => s + e.value, 0)
    if (total === 0) return null

    const tooltipText = label
        ? `${label}: ${entries.map(e => `${formatLabel(e.key)} (${e.value})`).join(', ')}`
        : entries.map(e => `${formatLabel(e.key)}: ${e.value}`).join(', ')

    let colorIdx = 0

    return (
        <div
            className="w-full rounded-full overflow-hidden flex bg-slate-100"
            style={{ height: `${height}px` }}
            title={tooltipText}
        >
            {entries.map(({ key, value }) => {
                const pct = (value / total) * 100
                if (pct < 0.5) return null
                const color = BAR_COLORS[key] ?? FALLBACK_COLORS[colorIdx++ % FALLBACK_COLORS.length]
                return (
                    <div
                        key={key}
                        className="h-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                )
            })}
        </div>
    )
}

/**
 * MiniIntensityBar — simple single-color progress bar for avg intensity.
 */
interface MiniIntensityBarProps {
    value: number | null   // 1-10
    max?: number
}

export function MiniIntensityBar({ value, max = 10 }: MiniIntensityBarProps) {
    if (value == null) return null
    const pct = Math.min(100, (value / max) * 100)
    return (
        <div
            className="w-full rounded-full overflow-hidden bg-slate-100"
            style={{ height: '6px' }}
            title={`Avg intensity: ${value}/${max}`}
        >
            <div
                className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-500 transition-all duration-700"
                style={{ width: `${pct}%` }}
            />
        </div>
    )
}
