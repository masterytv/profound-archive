"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ChevronDown } from "lucide-react";
import Link from "next/link";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

// ---------- Types ----------

interface RvndeDetailItem {
    quote?: string;
    score?: number;
    reasoning?: string;
}

interface EvidenceStrengthCardProps {
    totalScore: number | null;
    level: string | null;
    descriptor: string;               // e.g. "Suggestive", "Strong", "Exceptional"
    summaryReason: string | null;
    details: unknown;                 // raw rvnde_details JSON
    title?: string;                   // override heading (default: "Evidence Strength")
}

// ---------- Helpers ----------

function getScoreColor(descriptor: string): string {
    if (descriptor === "Exceptional") return "text-emerald-700";
    if (descriptor === "Strong")      return "text-amber-700";
    if (descriptor === "Moderate")    return "text-blue-700";
    return "text-slate-600"; // Suggestive / default
}

function CriteriaGrid({ details }: { details: unknown }) {
    if (!details || typeof details !== "object") return null;
    const entries = Object.entries(details as Record<string, RvndeDetailItem>);
    if (entries.length === 0) return null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {entries.map(([key, value]) => {
                if (typeof value !== "object" || value === null) return null;
                const label = key
                    .replace(/_/g, " ")
                    .replace(/([a-z])([A-Z])/g, "$1 $2")
                    .replace(/\b\w/g, (c) => c.toUpperCase());

                return (
                    <TooltipProvider key={key}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center justify-between gap-2 cursor-help group">
                                    <span className="text-foreground/80 group-hover:text-foreground transition-colors truncate">{label}</span>
                                    {value.score !== undefined && (
                                        <span className={`font-mono font-medium shrink-0 ${value.score > 0 ? "text-primary" : "text-muted-foreground/40"}`}>
                                            {value.score}
                                        </span>
                                    )}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                                <p className="font-medium mb-1">{label}</p>
                                {value.quote && (
                                    <p className="text-xs text-muted-foreground italic mb-1">"{value.quote}"</p>
                                )}
                                {value.reasoning && (
                                    <p className="text-xs text-muted-foreground">{value.reasoning}</p>
                                )}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            })}
        </div>
    );
}

// ---------- Component ----------

export function EvidenceStrengthCard({
    totalScore,
    level,
    descriptor,
    summaryReason,
    details,
    title,
}: EvidenceStrengthCardProps) {
    const scoreColor = getScoreColor(descriptor);
    const pct = totalScore !== null ? Math.round((totalScore / 28) * 100) : null;

    return (
        <Card className="h-full border-2 border-primary/20 bg-background/50 backdrop-blur-sm flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                        {title ?? "Evidence Strength"}
                        <Link href="/scale/cvnde" target="_blank" className="text-muted-foreground hover:text-primary transition-colors">
                            <ExternalLink className="w-4 h-4" />
                        </Link>
                    </div>
                </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col gap-4">
                {/* Score row — same rhythm as GreysonScoreCard */}
                <div className="flex items-baseline gap-2">
                    <div className={`text-4xl font-bold ${scoreColor}`}>
                        {pct !== null ? `${pct}%` : "—"}
                    </div>
                    {totalScore !== null && (
                        <div className="text-sm text-muted-foreground font-normal">{totalScore}/28</div>
                    )}
                    <Badge className={`${scoreColor} bg-primary/10 hover:bg-primary/20 border-0 ml-auto`}>
                        {descriptor}
                    </Badge>
                </div>

                {/* Summary reason (short text) */}
                {summaryReason && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{summaryReason}</p>
                )}

                {/* Criteria breakdown — collapsible, same as Transformation's */}
                {typeof details === "object" && details !== null && (
                    <Collapsible>
                        <div className="pt-2 border-t">
                            {/* Collapsed preview: mini flat list */}
                            <CriteriaGrid details={details} />
                        </div>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-full justify-between text-xs mt-2">
                                View Criteria Detail
                                <ChevronDown className="w-4 h-4" />
                            </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-3 space-y-2 text-xs">
                            {/* Expanded: show quotes + reasoning per criterion */}
                            {Array.from(
                                Object.entries(details as Record<string, RvndeDetailItem>)
                            ).map(([key, value]) => {
                                if (typeof value !== "object" || value === null) return null;
                                const label = key
                                    .replace(/_/g, " ")
                                    .replace(/([a-z])([A-Z])/g, "$1 $2")
                                    .replace(/\b\w/g, (c) => c.toUpperCase());
                                return (
                                    <div key={key} className="bg-muted/40 rounded-lg p-2">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-semibold text-foreground/80">{label}</span>
                                            {value.score !== undefined && (
                                                <span className={`font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-background border ${value.score > 0 ? "text-primary border-primary/30" : "text-muted-foreground border-border"}`}>
                                                    {value.score}/4
                                                </span>
                                            )}
                                        </div>
                                        {value.quote && (
                                            <p className="text-muted-foreground italic mb-1">"{value.quote}"</p>
                                        )}
                                        {value.reasoning && (
                                            <p className="text-muted-foreground">{value.reasoning}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </CollapsibleContent>
                    </Collapsible>
                )}

                {/* Caveat footnote — mirrors TransformationScoreCard */}
                <p className="text-[10px] text-muted-foreground/60 mt-auto pt-2 border-t">
                    Score reflects verifiable perceptions reported. A low score indicates the experience was primarily spiritual or subjective, not that it didn't occur.
                </p>
            </CardContent>
        </Card>
    );
}
