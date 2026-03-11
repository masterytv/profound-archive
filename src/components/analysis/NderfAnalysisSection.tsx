"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Sparkles, AlertTriangle, ShieldAlert } from "lucide-react";
import { ExperienceBadges } from "./ExperienceBadges";
import { JourneyFlowTimeline, type JourneyElement } from "./JourneyFlowTimeline";
import { CoreElementsGrid, type ElementDetection } from "./CoreElementsGrid";
import { PhenomenologyCard, type PhenomenologyData } from "./PhenomenologyCard";
import { EntityEncounters, normalizeEntities, type EntityEncounter, type EntitiesWrapper } from "./EntityEncounters";

// --- Types ---

export interface NderfAnalysisData {
    experience_type?: string | null;
    trigger_category?: string | null;
    tone?: string | null;
    intensity_rating?: number | null;
    nde_elements?: ElementDetection[] | null;
    journey_flow?: JourneyElement[] | null;
    phenomenology?: PhenomenologyData | null;
    entities?: EntityEncounter[] | EntitiesWrapper | null;
    content_safety?: {
        overall_safe?: boolean;
        flags?: Record<string, boolean>;
        warning_level?: string;
    } | null;
    nde_summary?: string | null;
}

// --- Collapsible Section ---

function CollapsibleSection({
    title,
    children,
    defaultOpen = false,
}: {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border border-slate-100 dark:border-white/10 rounded-xl overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
                <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {title}
                </h4>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
            </button>
            {isOpen && <div className="px-3 pb-3">{children}</div>}
        </div>
    );
}

// --- Content Safety Warning ---

function ContentSafetyWarning({
    contentSafety,
}: {
    contentSafety: NderfAnalysisData["content_safety"];
}) {
    if (!contentSafety || contentSafety.warning_level === "none") return null;

    const isSevere = contentSafety.warning_level === "severe";
    const activeFlags = contentSafety.flags
        ? Object.entries(contentSafety.flags)
            .filter(([, flagged]) => flagged)
            .map(([key]) => key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
        : [];

    return (
        <div className={cn(
            "flex items-start gap-3 p-3 rounded-lg border",
            isSevere
                ? "bg-red-50 dark:bg-red-500/20 border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-300"
                : "bg-amber-50 dark:bg-amber-500/20 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300"
        )}>
            <ShieldAlert className={cn(
                "w-4 h-4 shrink-0 mt-0.5",
                isSevere ? "text-red-600" : "text-amber-600"
            )} />
            <div className="min-w-0">
                <p className="text-xs font-semibold">
                    {isSevere ? "Sensitive Content" : "Content Note"}
                </p>
                {activeFlags.length > 0 && (
                    <p className="text-[11px] mt-0.5 opacity-80">
                        Contains: {activeFlags.join(", ")}
                    </p>
                )}
            </div>
        </div>
    );
}

// --- Main Component ---

interface NderfAnalysisSectionProps {
    data: NderfAnalysisData | null | undefined;
    className?: string;
}

export function NderfAnalysisSection({ data, className }: NderfAnalysisSectionProps) {
    if (!data) return null;

    // Check if any data exists at all
    const hasElements = data.nde_elements && data.nde_elements.length > 0;
    const hasJourney = data.journey_flow && data.journey_flow.length > 0;
    const hasPhenomenology = data.phenomenology && Object.keys(data.phenomenology).length > 0;
    const hasEntities = normalizeEntities(data.entities).length > 0;
    const hasBadges = data.experience_type || data.trigger_category || data.tone || data.intensity_rating;

    if (!hasElements && !hasJourney && !hasPhenomenology && !hasEntities && !hasBadges) return null;

    return (
        <div className={cn("bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none overflow-hidden", className)}>
            {/* Header */}
            <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Experience Analysis
                </h3>
                <span className="text-[10px] text-slate-400 ml-auto">NDERF Framework</span>
            </div>

            <div className="px-4 pb-4 space-y-4">
                {/* Content Safety Warning */}
                <ContentSafetyWarning contentSafety={data.content_safety} />

                {/* Badges — always visible */}
                {hasBadges && (
                    <ExperienceBadges
                        experienceType={data.experience_type}
                        triggerCategory={data.trigger_category}
                        tone={data.tone}
                        intensityRating={data.intensity_rating}
                    />
                )}

                {/* AI Summary */}
                {data.nde_summary && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {data.nde_summary}
                    </p>
                )}

                {/* Journey Timeline — always visible */}
                {hasJourney && (
                    <div>
                        <h4 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Journey Flow
                        </h4>
                        <JourneyFlowTimeline journeyFlow={data.journey_flow} />
                    </div>
                )}

                {/* Core Elements — collapsible */}
                {hasElements && (
                    <CollapsibleSection title="Core Elements" defaultOpen={false}>
                        <CoreElementsGrid elements={data.nde_elements} />
                    </CollapsibleSection>
                )}

                {/* Phenomenology — collapsible */}
                {hasPhenomenology && (
                    <CollapsibleSection title="Phenomenology" defaultOpen={false}>
                        <PhenomenologyCard phenomenology={data.phenomenology} />
                    </CollapsibleSection>
                )}

                {/* Entities — collapsible */}
                {hasEntities && (
                    <CollapsibleSection title="Entity Encounters" defaultOpen={false}>
                        <EntityEncounters entities={data.entities} />
                    </CollapsibleSection>
                )}
            </div>
        </div>
    );
}
