
"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, ChevronDown } from 'lucide-react';
import Link from 'next/link';
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

// --- Types ---

type TransformationDomainItem = {
    name: string;
    score: number;
    direction: string;
    evidence_summary: string;
    key_quote: string;
};

type TransformationBreakdown = {
    quantitative_metrics: {
        overall_transformation_score: number;
        transformation_breadth: number;
        transformation_depth: number;
    };
    domain_analysis: Record<string, TransformationDomainItem>;
    qualitative_profile: {
        dominant_themes: string[];
        integration_notes: string;
        timeline_notes: string;
        unique_features: string;
    };
};

interface TransformationScoreCardProps {
    totalScore: number;
    classification: string;
    breakdown: TransformationBreakdown;
}

// --- Helpers ---

const DOMAIN_ORDER = ['AL', 'SI', 'CC', 'VP', 'SA', 'RO', 'AD', 'PE', 'RS', 'PD'];

// Map direction strings to display symbols
const directionSymbol = (dir: string): string => {
    switch (dir) {
        case 'up': return '↑';
        case 'down': return '↓';
        case 'mixed': return '↕';
        case 'shifted': return '→';
        case 'new': return '✦';
        default: return '—';
    }
};

const directionColor = (dir: string): string => {
    switch (dir) {
        case 'up': return 'text-emerald-700';
        case 'down': return 'text-amber-600';
        case 'mixed': return 'text-purple-700';
        case 'shifted': return 'text-blue-700';
        case 'new': return 'text-cyan-700';
        default: return 'text-muted-foreground';
    }
};

const getScoreColor = (score: number): string => {
    if (score >= 41) return "text-purple-700";  // Comprehensive
    if (score >= 31) return "text-blue-700";     // Major
    if (score >= 21) return "text-emerald-700";  // Significant
    if (score >= 11) return "text-amber-600";    // Moderate
    if (score >= 1) return "text-gray-500";      // Minimal
    return "text-muted-foreground";               // None
};

const getDomainBarWidth = (score: number): string => {
    return `${(score / 5) * 100}%`;
};

// --- Component ---

export function TransformationScoreCard({ totalScore, classification, breakdown }: TransformationScoreCardProps) {
    if (!breakdown || !breakdown.domain_analysis) return null;

    const { domain_analysis, qualitative_profile, quantitative_metrics } = breakdown;
    const breadth = quantitative_metrics?.transformation_breadth ?? 0;
    const depth = quantitative_metrics?.transformation_depth ?? 0;

    return (
        <Card className="h-full border-2 border-primary/20 bg-background/50 backdrop-blur-sm flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                        NDE Transformation Index
                        <Link href="/scale/transformation" target="_blank" className="text-muted-foreground hover:text-primary transition-colors">
                            <ExternalLink className="w-4 h-4" />
                        </Link>
                    </div>
                </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col gap-4">
                {/* Score Header */}
                <div className="flex items-baseline gap-2">
                    <div className={`text-4xl font-bold ${getScoreColor(totalScore)}`}>
                        {totalScore}
                    </div>
                    <div className="text-lg text-muted-foreground font-normal">/ 50</div>
                    <Badge className={`${getScoreColor(totalScore)} bg-primary/10 hover:bg-primary/20 border-0 ml-auto text-[10px]`}>
                        {classification || "N/A"}
                    </Badge>
                </div>

                {/* Breadth & Depth sub-metrics */}
                <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Breadth: <strong className="text-foreground">{breadth}/10</strong> domains</span>
                    <span>Depth: <strong className="text-foreground">{depth.toFixed(1)}/5.0</strong></span>
                </div>

                {/* Domain Scores */}
                <div className="space-y-1.5 pt-2 border-t">
                    {DOMAIN_ORDER.map((code) => {
                        const domain = domain_analysis[code];
                        if (!domain) return null;

                        return (
                            <TooltipProvider key={code}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2 text-xs cursor-help group">
                                            {/* Direction */}
                                            <span className={`font-mono w-4 text-center ${directionColor(domain.direction)}`}>
                                                {directionSymbol(domain.direction)}
                                            </span>
                                            {/* Domain name */}
                                            <span className="text-foreground/80 group-hover:text-foreground transition-colors truncate w-[130px]" title={domain.name}>
                                                {domain.name}
                                            </span>
                                            {/* Score bar */}
                                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary/60 rounded-full transition-all"
                                                    style={{ width: getDomainBarWidth(domain.score) }}
                                                />
                                            </div>
                                            {/* Score number */}
                                            <span className={`font-mono font-medium w-4 text-right ${domain.score > 0 ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                                                {domain.score}
                                            </span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="max-w-xs">
                                        <p className="font-medium mb-1">{domain.name}</p>
                                        <p className="text-xs text-muted-foreground">{domain.evidence_summary}</p>
                                        {domain.key_quote && (
                                            <p className="text-xs italic mt-1 text-muted-foreground/80">"{domain.key_quote}"</p>
                                        )}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        );
                    })}
                </div>

                {/* Qualitative Profile (Collapsible) */}
                {qualitative_profile && (
                    <Collapsible>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-full justify-between text-xs mt-1">
                                Qualitative Profile
                                <ChevronDown className="w-4 h-4" />
                            </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2 space-y-2 text-xs">
                            {qualitative_profile.dominant_themes?.length > 0 && (
                                <div>
                                    <span className="font-semibold text-foreground/80">Dominant Themes: </span>
                                    <span className="text-muted-foreground">{qualitative_profile.dominant_themes.join(', ')}</span>
                                </div>
                            )}
                            {qualitative_profile.integration_notes && (
                                <div>
                                    <span className="font-semibold text-foreground/80">Integration: </span>
                                    <span className="text-muted-foreground">{qualitative_profile.integration_notes}</span>
                                </div>
                            )}
                            {qualitative_profile.timeline_notes && (
                                <div>
                                    <span className="font-semibold text-foreground/80">Timeline: </span>
                                    <span className="text-muted-foreground">{qualitative_profile.timeline_notes}</span>
                                </div>
                            )}
                            {qualitative_profile.unique_features && (
                                <div>
                                    <span className="font-semibold text-foreground/80">Notable: </span>
                                    <span className="text-muted-foreground">{qualitative_profile.unique_features}</span>
                                </div>
                            )}
                        </CollapsibleContent>
                    </Collapsible>
                )}

                {/* Caveat footnote */}
                <p className="text-[10px] text-muted-foreground/60 mt-auto pt-2 border-t">
                    Score reflects transformation as described. Domains scored 0 indicate the topic was not discussed, not that no change occurred.
                </p>
            </CardContent>
        </Card>
    );
}
