"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { Brain, Heart, ClipboardCheck } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// --- Greyson classification from score ---
function getGreysonClassification(score: number): { label: string; filter: string } {
    if (score >= 21) return { label: "Deep NDE", filter: "Deep NDE" };
    if (score >= 13) return { label: "Moderate NDE", filter: "Moderate NDE" };
    if (score >= 7) return { label: "Mild NDE", filter: "Mild NDE" };
    return { label: "Not an NDE", filter: "Not NDE" };
}

function getGreysonColor(score: number) {
    if (score >= 21) return { text: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", hover: "hover:bg-blue-100", dark: "dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30 dark:hover:bg-blue-500/30" };
    if (score >= 13) return { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", hover: "hover:bg-amber-100", dark: "dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 dark:hover:bg-amber-500/30" };
    if (score >= 7) return { text: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200", hover: "hover:bg-slate-100", dark: "dark:bg-white/10 dark:text-slate-300 dark:border-white/20 dark:hover:bg-white/15" };
    return { text: "text-red-600", bg: "bg-red-50", border: "border-red-200", hover: "hover:bg-red-100", dark: "dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30 dark:hover:bg-red-500/30" };
}

// --- Transformation classification from score ---
function getTransformationClassification(score: number): { label: string; filter: string } {
    if (score >= 40) return { label: "Comprehensive Profound", filter: "Comprehensive Profound Transformation" };
    if (score >= 30) return { label: "Major", filter: "Major Transformation" };
    if (score >= 20) return { label: "Significant", filter: "Significant Transformation" };
    if (score >= 10) return { label: "Moderate", filter: "Moderate Transformation" };
    return { label: "Minimal", filter: "Minimal Transformation" };
}

function getTransformationColor(score: number) {
    if (score >= 40) return { text: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", hover: "hover:bg-rose-100", dark: "dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 dark:hover:bg-rose-500/30" };
    if (score >= 30) return { text: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200", hover: "hover:bg-rose-100", dark: "dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 dark:hover:bg-rose-500/30" };
    if (score >= 20) return { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", hover: "hover:bg-amber-100", dark: "dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 dark:hover:bg-amber-500/30" };
    return { text: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200", hover: "hover:bg-slate-100", dark: "dark:bg-white/10 dark:text-slate-300 dark:border-white/20 dark:hover:bg-white/15" };
}

// --- Veridical Perception color by level ---
function getVeridicalColor(level: string | null | undefined) {
    if (level?.includes("Exceptional")) return { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", hover: "hover:bg-emerald-100", dark: "dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 dark:hover:bg-emerald-500/30" };
    if (level?.includes("High")) return { text: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", hover: "hover:bg-blue-100", dark: "dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30 dark:hover:bg-blue-500/30" };
    if (level?.includes("Moderate")) return { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", hover: "hover:bg-amber-100", dark: "dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 dark:hover:bg-amber-500/30" };
    return { text: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200", hover: "hover:bg-slate-100", dark: "dark:bg-white/10 dark:text-slate-300 dark:border-white/20 dark:hover:bg-white/15" };
}

function getVeridicalLabel(level: string | null | undefined): string {
    if (!level) return "Veridical";
    return level.replace(" Evidential Strength", "");
}

// --- Component ---

interface ScoreBadgesProps {
    greysonScore?: number | null;
    greysonClassification?: string | null;
    transformationScore?: number | null;
    transformationClassification?: string | null;
    veridicalScore?: number | null;
    veridicalLevel?: string | null;
    size?: "sm" | "default";
    className?: string;
    /** When true, renders badges without a wrapping div (for use inside a shared flex container) */
    inline?: boolean;
}

export function ScoreBadges({
    greysonScore,
    greysonClassification,
    transformationScore,
    transformationClassification,
    veridicalScore,
    veridicalLevel,
    size = "default",
    className,
    inline = false,
}: ScoreBadgesProps) {
    // Don't render if no scores
    if (greysonScore == null && transformationScore == null && veridicalScore == null) return null;

    const isSmall = size === "sm";
    const pillBase = cn(
        "inline-flex items-center gap-1 rounded-full border font-medium transition-colors duration-200 cursor-pointer",
        isSmall ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
    );
    const iconSize = isSmall ? "w-2.5 h-2.5" : "w-3 h-3";

    const badges = (
        <TooltipProvider delayDuration={200}>
            <>
                {/* Greyson Scale Score */}
                {greysonScore != null && (
                    (() => {
                        const classInfo = getGreysonClassification(greysonScore);
                        const displayLabel = greysonClassification || classInfo.label;
                        const color = getGreysonColor(greysonScore);
                        return (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={`/explore/greyson?filter=${encodeURIComponent(classInfo.filter)}&dir=desc`}
                                        className={cn(pillBase, color.text, color.bg, color.border, color.hover, color.dark)}
                                        aria-label={`Greyson Scale: ${greysonScore} out of 32 — ${displayLabel}. Click to find similar.`}
                                    >
                                        <Brain className={iconSize} />
                                        {greysonScore}
                                        <span className="opacity-50">/32</span>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs max-w-[200px]">
                                    <p className="font-semibold">{displayLabel}</p>
                                    <p className="text-muted-foreground">Greyson NDE Scale · Click to find similar</p>
                                </TooltipContent>
                            </Tooltip>
                        );
                    })()
                )}

                {/* Transformation Score */}
                {transformationScore != null && (
                    (() => {
                        const classInfo = getTransformationClassification(transformationScore);
                        const displayLabel = transformationClassification || classInfo.label;
                        const color = getTransformationColor(transformationScore);
                        return (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={`/explore/transformation?filter=${encodeURIComponent(classInfo.filter)}&dir=desc`}
                                        className={cn(pillBase, color.text, color.bg, color.border, color.hover, color.dark)}
                                        aria-label={`Transformation Index: ${transformationScore} out of 50 — ${displayLabel}. Click to find similar.`}
                                    >
                                        <Heart className={iconSize} />
                                        {transformationScore}
                                        <span className="opacity-50">/50</span>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs max-w-[200px]">
                                    <p className="font-semibold">{displayLabel}</p>
                                    <p className="text-muted-foreground">Transformation Index · Click to find similar</p>
                                </TooltipContent>
                            </Tooltip>
                        );
                    })()
                )}

                {/* Veridical Perception Score */}
                {veridicalScore != null && (
                    (() => {
                        const color = getVeridicalColor(veridicalLevel);
                        const displayLabel = getVeridicalLabel(veridicalLevel);
                        return (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={`/explore/veridical?dir=desc`}
                                        className={cn(pillBase, color.text, color.bg, color.border, color.hover, color.dark)}
                                        aria-label={`Veridical Perception: ${veridicalScore} out of 28 — ${displayLabel}. Click to find similar.`}
                                    >
                                        <ClipboardCheck className={iconSize} />
                                        {veridicalScore}
                                        <span className="opacity-50">/28</span>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs max-w-[200px]">
                                    <p className="font-semibold">{displayLabel}</p>
                                    <p className="text-muted-foreground">Veridical Perception · Click to find similar</p>
                                </TooltipContent>
                            </Tooltip>
                        );
                    })()
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
