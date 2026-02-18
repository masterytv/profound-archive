"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, X, ChevronDown, ChevronUp, Quote } from "lucide-react";

// --- Types ---

export interface ElementDetection {
    name: string;
    present: boolean;
    confidence: number;
    quote: string;
}

// Human-readable labels + short descriptions for the 15 NDERF elements
const ELEMENT_META: Record<string, { label: string; desc: string }> = {
    out_of_body: { label: "Out-of-Body", desc: "Perceived from outside the physical body" },
    tunnel: { label: "Tunnel", desc: "Entered or traveled through a tunnel" },
    bright_light: { label: "Bright Light", desc: "Encountered brilliant or supernatural light" },
    deceased_relatives: { label: "Deceased Relatives", desc: "Met dead family members or friends" },
    life_review: { label: "Life Review", desc: "Reviewed life events or life flash" },
    being_of_light: { label: "Being of Light", desc: "Encountered a distinct, powerful light being" },
    border_boundary: { label: "Border/Boundary", desc: "Reached a barrier or point of no return" },
    feelings_of_peace: { label: "Peace", desc: "Overwhelming peace, absence of pain" },
    cosmic_unity: { label: "Cosmic Unity", desc: "Felt one with everything" },
    time_distortion: { label: "Time Distortion", desc: "Time stopped, sped up, or was meaningless" },
    enhanced_senses: { label: "Enhanced Senses", desc: "Heightened perception, vivid colors" },
    telepathy: { label: "Telepathy", desc: "Communication without words" },
    otherworldly_realm: { label: "Other Realm", desc: "Being in another dimension or realm" },
    knowledge_download: { label: "Knowledge Download", desc: "Received universal knowledge" },
    choice_to_return: { label: "Choice to Return", desc: "Given choice to stay or return" },
};

// Confidence color coding
function getConfidenceColor(confidence: number): string {
    if (confidence >= 80) return "text-emerald-600";
    if (confidence >= 50) return "text-amber-600";
    return "text-slate-400";
}

function getConfidenceDot(confidence: number): string {
    if (confidence >= 80) return "bg-emerald-500";
    if (confidence >= 50) return "bg-amber-500";
    return "bg-slate-300";
}

// --- Component ---

interface CoreElementsGridProps {
    elements: ElementDetection[] | null | undefined;
    className?: string;
}

export function CoreElementsGrid({ elements, className }: CoreElementsGridProps) {
    const [expandedElement, setExpandedElement] = useState<string | null>(null);

    if (!elements || elements.length === 0) return null;

    const presentCount = elements.filter((el) => el.present).length;

    return (
        <div className={cn("space-y-3", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                    {presentCount} of {elements.length} elements detected
                </span>
                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> High
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Medium
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Low
                    </span>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {elements.map((el) => {
                    const meta = ELEMENT_META[el.name] || {
                        label: el.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                        desc: "",
                    };
                    const isOpen = expandedElement === el.name;

                    return (
                        <button
                            key={el.name}
                            onClick={() => {
                                if (el.quote && el.present) {
                                    setExpandedElement(isOpen ? null : el.name);
                                }
                            }}
                            className={cn(
                                "relative text-left rounded-lg p-2.5 border transition-all",
                                el.present
                                    ? "bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm cursor-pointer"
                                    : "bg-slate-50/50 border-slate-100 opacity-50 cursor-default",
                                isOpen && "ring-2 ring-blue-200 border-blue-300"
                            )}
                        >
                            <div className="flex items-start gap-2">
                                {/* Present/absent icon */}
                                <div className={cn(
                                    "w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                    el.present ? "bg-emerald-100" : "bg-slate-100"
                                )}>
                                    {el.present ? (
                                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                                    ) : (
                                        <X className="w-2.5 h-2.5 text-slate-400" />
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1">
                                        <span className={cn(
                                            "text-xs font-medium leading-tight",
                                            el.present ? "text-slate-800" : "text-slate-400"
                                        )}>
                                            {meta.label}
                                        </span>
                                        {el.present && (
                                            <span className={cn(
                                                "w-1.5 h-1.5 rounded-full shrink-0",
                                                getConfidenceDot(el.confidence)
                                            )} title={`${el.confidence}% confidence`} />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded quote */}
                            {isOpen && el.quote && (
                                <div className="mt-2 pt-2 border-t border-slate-100">
                                    <div className="flex items-start gap-1.5">
                                        <Quote className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
                                        <p className="text-[11px] text-slate-500 italic leading-snug">
                                            {el.quote}
                                        </p>
                                    </div>
                                    <p className={cn("text-[10px] mt-1", getConfidenceColor(el.confidence))}>
                                        {el.confidence}% confidence
                                    </p>
                                </div>
                            )}

                            {/* Quote available indicator */}
                            {!isOpen && el.present && el.quote && (
                                <div className="absolute bottom-1 right-1">
                                    <Quote className="w-2.5 h-2.5 text-slate-300" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
