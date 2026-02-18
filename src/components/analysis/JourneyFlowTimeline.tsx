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

// Assign a rich color to each step based on its position in the journey
// Uses a warm-to-cool gradient arc: gold → amber → rose → violet → indigo → blue → teal
const STEP_COLORS = [
    { bg: "bg-amber-500", text: "text-white", ring: "ring-amber-200" },
    { bg: "bg-orange-500", text: "text-white", ring: "ring-orange-200" },
    { bg: "bg-rose-500", text: "text-white", ring: "ring-rose-200" },
    { bg: "bg-pink-500", text: "text-white", ring: "ring-pink-200" },
    { bg: "bg-fuchsia-500", text: "text-white", ring: "ring-fuchsia-200" },
    { bg: "bg-violet-500", text: "text-white", ring: "ring-violet-200" },
    { bg: "bg-indigo-500", text: "text-white", ring: "ring-indigo-200" },
    { bg: "bg-blue-500", text: "text-white", ring: "ring-blue-200" },
    { bg: "bg-sky-500", text: "text-white", ring: "ring-sky-200" },
    { bg: "bg-cyan-500", text: "text-white", ring: "ring-cyan-200" },
    { bg: "bg-teal-500", text: "text-white", ring: "ring-teal-200" },
    { bg: "bg-emerald-500", text: "text-white", ring: "ring-emerald-200" },
];

function getStepColor(index: number) {
    return STEP_COLORS[index % STEP_COLORS.length];
}

// Connector arrow color based on position
const CONNECTOR_COLORS = [
    "text-amber-300",
    "text-orange-300",
    "text-rose-300",
    "text-pink-300",
    "text-fuchsia-300",
    "text-violet-300",
    "text-indigo-300",
    "text-blue-300",
    "text-sky-300",
    "text-cyan-300",
    "text-teal-300",
    "text-emerald-300",
];

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
            {/* Timeline — a horizontal row of colorful pill badges connected by arrows */}
            <div className="overflow-x-auto pb-1 -mx-1 px-1">
                <div className="flex items-center gap-1 min-w-max">
                    {displayed.map((el, idx) => {
                        const label = ELEMENT_LABELS[el.element] || el.element.replace(/_/g, " ");
                        const color = getStepColor(idx);
                        const isLast = idx === displayed.length - 1 && showAll;

                        return (
                            <div key={`${el.element}-${el.order}`} className="flex items-center">
                                {/* Step pill */}
                                <div
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full ring-2 shadow-sm",
                                        "text-xs font-semibold whitespace-nowrap",
                                        color.bg,
                                        color.text,
                                        color.ring,
                                    )}
                                    title={`Step ${idx + 1}: ${label} (confidence: ${el.confidence ?? "N/A"}%)`}
                                >
                                    {/* Step number */}
                                    <span className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center text-[10px] font-bold">
                                        {idx + 1}
                                    </span>
                                    {label}
                                </div>

                                {/* Arrow connector */}
                                {!isLast && (
                                    <ChevronRight
                                        className={cn(
                                            "w-4 h-4 flex-shrink-0",
                                            CONNECTOR_COLORS[idx % CONNECTOR_COLORS.length],
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
                                    "w-4 h-4 flex-shrink-0",
                                    CONNECTOR_COLORS[displayed.length % CONNECTOR_COLORS.length],
                                )}
                            />
                            <button
                                onClick={() => setIsExpanded(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full ring-2 ring-slate-200 bg-slate-100 text-slate-600 text-xs font-semibold whitespace-nowrap hover:bg-slate-200 hover:ring-slate-300 transition-colors cursor-pointer shadow-sm"
                            >
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
