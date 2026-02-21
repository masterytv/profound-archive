"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import {
    Heart,
    Zap,
    Minus,
    AlertTriangle,
    Activity,
    Flame,
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// --- Types (same as ExperienceBadges) ---

export type ExperienceType = "nde" | "obe" | "sde" | "adc" | "ste" | "dream" | "meditation" | "other";
export type TriggerCategory =
    | "medical_crisis" | "accident" | "surgery" | "illness" | "cardiac_arrest"
    | "near_drowning" | "childbirth" | "combat" | "suicide_attempt" | "overdose"
    | "allergic_reaction" | "spontaneous" | "other" | "unknown";
export type OverallTone = "very_positive" | "positive" | "neutral" | "negative" | "very_negative" | "mixed";

// --- Config ---

const TYPE_CONFIG: Record<ExperienceType, { label: string; color: string; bg: string; border: string; hover: string }> = {
    nde: { label: "NDE", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", hover: "hover:bg-blue-100" },
    obe: { label: "OBE", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200", hover: "hover:bg-violet-100" },
    sde: { label: "SDE", color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200", hover: "hover:bg-indigo-100" },
    adc: { label: "ADC", color: "text-cyan-700", bg: "bg-cyan-50", border: "border-cyan-200", hover: "hover:bg-cyan-100" },
    ste: { label: "STE", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200", hover: "hover:bg-purple-100" },
    dream: { label: "Dream", color: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200", hover: "hover:bg-slate-100" },
    meditation: { label: "Meditation", color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200", hover: "hover:bg-teal-100" },
    other: { label: "Other", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200", hover: "hover:bg-slate-100" },
};

const TONE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; hover: string; icon: typeof Heart }> = {
    very_positive: { label: "Very Positive", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", hover: "hover:bg-emerald-100", icon: Heart },
    positive: { label: "Positive", color: "text-green-700", bg: "bg-green-50", border: "border-green-200", hover: "hover:bg-green-100", icon: Heart },
    neutral: { label: "Neutral", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200", hover: "hover:bg-slate-100", icon: Minus },
    negative: { label: "Negative", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", hover: "hover:bg-amber-100", icon: AlertTriangle },
    very_negative: { label: "Distressing", color: "text-red-700", bg: "bg-red-50", border: "border-red-200", hover: "hover:bg-red-100", icon: AlertTriangle },
    mixed: { label: "Mixed", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", hover: "hover:bg-amber-100", icon: Activity },
};

const TRIGGER_LABELS: Record<TriggerCategory, string> = {
    medical_crisis: "Medical Crisis",
    accident: "Accident",
    surgery: "Surgery",
    illness: "Illness",
    cardiac_arrest: "Cardiac Arrest",
    near_drowning: "Near Drowning",
    childbirth: "Childbirth",
    combat: "Combat",
    suicide_attempt: "Suicide Attempt",
    overdose: "Overdose",
    allergic_reaction: "Allergic Reaction",
    spontaneous: "Spontaneous",
    other: "Other",
    unknown: "Unknown",
};

// --- Component ---

interface InteractiveBadgesProps {
    experienceType?: ExperienceType | string | null;
    triggerCategory?: TriggerCategory | string | null;
    tone?: OverallTone | string | null;
    intensityRating?: number | null;
    size?: "sm" | "default";
    className?: string;
    /** When true, renders badges without a wrapping div (for use inside a shared flex container) */
    inline?: boolean;
}

/**
 * Interactive version of ExperienceBadges — each badge is a clickable link
 * that navigates to a filtered search showing similar experiences.
 */
export function InteractiveBadges({
    experienceType,
    triggerCategory,
    tone,
    intensityRating,
    size = "default",
    className,
    inline = false,
}: InteractiveBadgesProps) {
    if (!experienceType && !triggerCategory && !tone && !intensityRating) return null;

    const isSmall = size === "sm";
    const pillBase = cn(
        "inline-flex items-center gap-1 rounded-full border font-medium transition-colors duration-200 cursor-pointer",
        isSmall ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
    );
    const iconSize = isSmall ? "w-2.5 h-2.5" : "w-3 h-3";

    const typeConf = experienceType ? TYPE_CONFIG[experienceType as ExperienceType] : null;
    const toneConf = tone ? TONE_CONFIG[tone as string] : null;
    const ToneIcon = toneConf?.icon;
    const triggerLabel = triggerCategory && triggerCategory !== "unknown"
        ? TRIGGER_LABELS[triggerCategory as TriggerCategory] || triggerCategory
        : null;

    // Intensity label
    const intensityLabel = intensityRating
        ? intensityRating >= 8 ? "Profound" : intensityRating >= 6 ? "Deep" : intensityRating >= 4 ? "Moderate" : "Mild"
        : null;
    const intensityColor = intensityRating
        ? intensityRating >= 8
            ? { color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", hover: "hover:bg-orange-100" }
            : intensityRating >= 6
                ? { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", hover: "hover:bg-amber-100" }
                : { color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200", hover: "hover:bg-slate-100" }
        : null;

    // Build search URL with a pre-applied filter
    const buildSearchUrl = (facet: string, value: string) =>
        `/search3?q=*&type=keyword&filter=${encodeURIComponent(JSON.stringify({ [facet]: [value] }))}`;

    const badges = (
        <TooltipProvider delayDuration={200}>
            <>
                {/* Experience Type */}
                {typeConf && typeof experienceType === 'string' && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Link
                                href={buildSearchUrl("experienceType", experienceType)}
                                className={cn(pillBase, typeConf.color, typeConf.bg, typeConf.border, typeConf.hover)}
                            >
                                {typeConf.label}
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                            <p className="font-medium">Find more {typeConf.label} experiences</p>
                        </TooltipContent>
                    </Tooltip>
                )}

                {/* Trigger */}
                {triggerLabel && typeof triggerCategory === 'string' && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Link
                                href={buildSearchUrl("triggerCategory", triggerCategory)}
                                className={cn(pillBase, "text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100")}
                            >
                                <Zap className={iconSize} />
                                {triggerLabel}
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                            <p className="font-medium">Filter by "{triggerLabel}" experiences</p>
                        </TooltipContent>
                    </Tooltip>
                )}

                {/* Tone */}
                {toneConf && ToneIcon && typeof tone === 'string' && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Link
                                href={buildSearchUrl("overallTone", tone)}
                                className={cn(pillBase, toneConf.color, toneConf.bg, toneConf.border, toneConf.hover)}
                            >
                                <ToneIcon className={iconSize} />
                                {toneConf.label}
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                            <p className="font-medium">Filter by {toneConf.label.toLowerCase()} experiences</p>
                        </TooltipContent>
                    </Tooltip>
                )}

                {/* Intensity */}
                {intensityLabel && intensityColor && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Link
                                href={buildSearchUrl("intensityBucket", intensityLabel)}
                                className={cn(pillBase, intensityColor.color, intensityColor.bg, intensityColor.border, intensityColor.hover)}
                            >
                                <Flame className={iconSize} />
                                {intensityLabel}
                                {!isSmall && intensityRating && (
                                    <span className="opacity-60 ml-0.5">{intensityRating}/10</span>
                                )}
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                            <p className="font-medium">Filter by {intensityLabel.toLowerCase()} intensity experiences</p>
                        </TooltipContent>
                    </Tooltip>
                )}
            </>
        </TooltipProvider>
    );

    if (inline) return badges;

    return (
        <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
            {badges}
        </div>
    );
}
