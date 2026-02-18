"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronRight } from "lucide-react";

// --- Types ---

export interface JourneyElement {
    element: string;
    order: number;
    confidence?: number;
}

// Human-readable labels for the 25 NDERF journey elements
const ELEMENT_LABELS: Record<string, string> = {
    out_of_body: "Out of Body",
    tunnel: "Tunnel",
    bright_light: "Bright Light",
    deceased_relatives: "Deceased Loved Ones",
    life_review: "Life Review",
    being_of_light: "Being of Light",
    border_boundary: "Border / Boundary",
    feelings_of_peace: "Peace & Calm",
    cosmic_unity: "Cosmic Unity",
    time_distortion: "Time Distortion",
    enhanced_senses: "Enhanced Senses",
    telepathy: "Telepathy",
    otherworldly_realm: "Other Realm",
    knowledge_download: "Knowledge Download",
    choice_to_return: "Choice to Return",
    separation: "Separation",
    darkness: "Darkness",
    void: "Void",
    movement: "Movement",
    landscape: "Landscape",
    music: "Heavenly Music",
    guides: "Spiritual Guides",
    judgment: "Judgment",
    mission: "Life Mission",
    return: "Sudden Return",
    observing_body: "Observing Body",
    peace_calm: "Peace & Calm",
    future_visions: "Future Visions",
};

// Ghost/outline pill colors — light tinted bg, colored border + text
// Follows BRAND.md "Classification Pills" pattern: bg-{color}-50, border-{color}-200, text-{color}-700
const STEP_STYLES = [
    { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-700", dot: "bg-amber-500", arrow: "text-amber-300" },
    { bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-700", dot: "bg-orange-500", arrow: "text-orange-300" },
    { bg: "bg-rose-50", border: "border-rose-300", text: "text-rose-700", dot: "bg-rose-500", arrow: "text-rose-300" },
    { bg: "bg-pink-50", border: "border-pink-300", text: "text-pink-700", dot: "bg-pink-500", arrow: "text-pink-300" },
    { bg: "bg-fuchsia-50", border: "border-fuchsia-300", text: "text-fuchsia-700", dot: "bg-fuchsia-500", arrow: "text-fuchsia-300" },
    { bg: "bg-violet-50", border: "border-violet-300", text: "text-violet-700", dot: "bg-violet-500", arrow: "text-violet-300" },
    { bg: "bg-indigo-50", border: "border-indigo-300", text: "text-indigo-700", dot: "bg-indigo-500", arrow: "text-indigo-300" },
    { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-700", dot: "bg-blue-500", arrow: "text-blue-300" },
    { bg: "bg-sky-50", border: "border-sky-300", text: "text-sky-700", dot: "bg-sky-500", arrow: "text-sky-300" },
    { bg: "bg-cyan-50", border: "border-cyan-300", text: "text-cyan-700", dot: "bg-cyan-500", arrow: "text-cyan-300" },
    { bg: "bg-teal-50", border: "border-teal-300", text: "text-teal-700", dot: "bg-teal-500", arrow: "text-teal-300" },
    { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700", dot: "bg-emerald-500", arrow: "text-emerald-300" },
];

function getStepStyle(index: number) {
    return STEP_STYLES[index % STEP_STYLES.length];
}

// --- Component ---

interface JourneyFlowTimelineProps {
    journeyFlow: JourneyElement[] | null | undefined;
    className?: string;
    /** How many nodes to show before collapsing. Default 5. */
    collapseAfter?: number;
}

export function JourneyFlowTimeline({
    journeyFlow,
    className,
    collapseAfter = 5,
}: JourneyFlowTimelineProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!journeyFlow || journeyFlow.length === 0) return null;

    // Sort by order
    const sorted = [...journeyFlow].sort((a, b) => a.order - b.order);
    const showAll = isExpanded || sorted.length <= collapseAfter;
    const displayed = showAll ? sorted : sorted.slice(0, collapseAfter);
    const hiddenCount = sorted.length - collapseAfter;

    return (
        <div className={cn("space-y-3", className)}>
            {/* Timeline — ghost/outline pills connected by chevron arrows */}
            <div className="overflow-x-auto pb-1 -mx-1 px-1">
                <div className="flex items-center gap-1 min-w-max">
                    {displayed.map((el, idx) => {
                        const label = ELEMENT_LABELS[el.element] || el.element.replace(/_/g, " ");
                        const style = getStepStyle(idx);
                        const isLast = idx === displayed.length - 1 && showAll;

                        return (
                            <div key={`${el.element}-${el.order}`} className="flex items-center">
                                {/* Ghost pill — light bg, colored border + text */}
                                <div
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full border",
                                        "text-xs font-semibold whitespace-nowrap",
                                        "transition-all duration-200",
                                        style.bg,
                                        style.border,
                                        style.text,
                                    )}
                                    title={`Step ${idx + 1}: ${label} (confidence: ${el.confidence ?? "N/A"}%)`}
                                >
                                    {/* Colored dot as step indicator */}
                                    <span className={cn(
                                        "w-2 h-2 rounded-full flex-shrink-0",
                                        style.dot,
                                    )} />
                                    {label}
                                </div>

                                {/* Arrow connector */}
                                {!isLast && (
                                    <ChevronRight
                                        className={cn(
                                            "w-4 h-4 flex-shrink-0",
                                            style.arrow,
                                        )}
                                    />
                                )}
                            </div>
                        );
                    })}

                    {/* Collapsed indicator */}
                    {!showAll && hiddenCount > 0 && (
                        <div className="flex items-center">
                            <ChevronRight
                                className={cn(
                                    "w-4 h-4 flex-shrink-0 text-slate-300",
                                )}
                            />
                            <button
                                onClick={() => setIsExpanded(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-500 text-xs font-semibold whitespace-nowrap hover:bg-slate-100 hover:border-slate-300 hover:text-slate-700 transition-all duration-200 cursor-pointer"
                            >
                                <span className="w-2 h-2 rounded-full bg-slate-300" />
                                +{hiddenCount} more
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Collapse button when expanded */}
            {isExpanded && sorted.length > collapseAfter && (
                <button
                    onClick={() => setIsExpanded(false)}
                    className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors cursor-pointer font-medium"
                >
                    <ChevronUp className="w-3.5 h-3.5" />
                    Show less
                </button>
            )}
        </div>
    );
}
