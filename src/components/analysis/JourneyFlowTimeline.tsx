"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Info } from "lucide-react";

// --- Types ---

export interface JourneyElement {
    element: string;
    order: number;
    confidence?: number;
}

// Human-readable labels for the 25 NDERF journey elements
const ELEMENT_LABELS: Record<string, string> = {
    out_of_body: "OBE",
    tunnel: "Tunnel",
    bright_light: "Light",
    deceased_relatives: "Deceased",
    life_review: "Life Review",
    being_of_light: "Being of Light",
    border_boundary: "Border",
    feelings_of_peace: "Peace",
    cosmic_unity: "Unity",
    time_distortion: "Time Shift",
    enhanced_senses: "Enhanced Senses",
    telepathy: "Telepathy",
    otherworldly_realm: "Other Realm",
    knowledge_download: "Knowledge",
    choice_to_return: "Choice",
    // Extended journey flow elements
    separation: "Separation",
    darkness: "Darkness",
    void: "Void",
    movement: "Movement",
    landscape: "Landscape",
    music: "Music",
    guides: "Guides",
    judgment: "Judgment",
    mission: "Mission",
    return: "Return",
};

// Color for nodes based on confidence
function getNodeColor(confidence?: number): string {
    if (!confidence || confidence >= 70) return "bg-blue-500";
    if (confidence >= 40) return "bg-blue-400";
    return "bg-blue-300";
}

function getNodeOpacity(confidence?: number): string {
    if (!confidence || confidence >= 70) return "opacity-100";
    if (confidence >= 40) return "opacity-70";
    return "opacity-40";
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
        <div className={cn("space-y-2", className)}>
            {/* Timeline */}
            <div className="overflow-x-auto pb-2 -mx-1 px-1">
                <div className="flex items-center gap-0 min-w-max">
                    {displayed.map((el, idx) => {
                        const label = ELEMENT_LABELS[el.element] || el.element.replace(/_/g, " ");
                        const isLast = idx === displayed.length - 1 && showAll;

                        return (
                            <div key={`${el.element}-${el.order}`} className="flex items-center">
                                {/* Node */}
                                <div className="flex flex-col items-center gap-1 min-w-[56px]">
                                    <div
                                        className={cn(
                                            "w-3 h-3 rounded-full border-2 border-white shadow-sm",
                                            getNodeColor(el.confidence),
                                            getNodeOpacity(el.confidence)
                                        )}
                                        title={`${label} (confidence: ${el.confidence ?? "N/A"}%)`}
                                    />
                                    <span className={cn(
                                        "text-[10px] font-medium text-slate-600 text-center leading-tight max-w-[56px]",
                                        getNodeOpacity(el.confidence)
                                    )}>
                                        {label}
                                    </span>
                                </div>

                                {/* Connector line */}
                                {!isLast && (
                                    <div className="w-4 h-px bg-blue-200 -mt-4" />
                                )}
                            </div>
                        );
                    })}

                    {/* Collapsed indicator */}
                    {!showAll && hiddenCount > 0 && (
                        <div className="flex items-center">
                            <div className="w-4 h-px bg-blue-200 -mt-4" />
                            <button
                                onClick={() => setIsExpanded(true)}
                                className="flex flex-col items-center gap-1 min-w-[56px] cursor-pointer group"
                            >
                                <div className="w-3 h-3 rounded-full bg-slate-200 border-2 border-white shadow-sm group-hover:bg-blue-300 transition-colors" />
                                <span className="text-[10px] font-medium text-blue-500 group-hover:text-blue-600 transition-colors">
                                    +{hiddenCount} more
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Collapse button when expanded */}
            {isExpanded && sorted.length > collapseAfter && (
                <button
                    onClick={() => setIsExpanded(false)}
                    className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-600 transition-colors cursor-pointer"
                >
                    <ChevronUp className="w-3 h-3" />
                    Show less
                </button>
            )}
        </div>
    );
}
