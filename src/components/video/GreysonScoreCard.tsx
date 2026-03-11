
"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export type GreysonItem = {
    score: 0 | 1 | 2;
    reasoning: string;
};

export type GreysonBreakdown = {
    cognitive: {
        time_distortion: GreysonItem;
        thought_speed: GreysonItem;
        life_review: GreysonItem;
        sudden_understanding: GreysonItem;
    };
    affective: {
        peace_pleasantness: GreysonItem;
        joy: GreysonItem;
        cosmic_unity: GreysonItem;
        brilliant_light: GreysonItem;
    };
    paranormal: {
        enhanced_senses: GreysonItem;
        esp: GreysonItem;
        precognition: GreysonItem;
        out_of_body: GreysonItem;
    };
    transcendental: {
        unearthly_world: GreysonItem;
        mystical_being: GreysonItem;
        spirits_deceased: GreysonItem;
        border_point_no_return: GreysonItem;
    };
};

interface GreysonScoreCardProps {
    totalScore: number;
    classification: string;
    breakdown: GreysonBreakdown;
    title?: string;
}

// Helper to format key names (e.g., "time_distortion" -> "Time distortion")
const formatLabel = (key: string) => {
    return key
        .replace(/_/g, ' ')
        .replace(/^\w/, (c) => c.toUpperCase());
};

const getScoreColor = (score: number) => {
    if (score >= 20) return "text-blue-400"; // Deep
    if (score >= 13) return "text-blue-400";   // Moderate
    if (score >= 7) return "text-yellow-400";  // Mild
    return "text-gray-400"; // Not NDE
};

// Normalize an item that may be a GreysonItem, a raw number, or an unknown shape
const normalizeItem = (item: any): GreysonItem => {
    if (typeof item === 'number') {
        return { score: (isNaN(item) ? 0 : item) as 0 | 1 | 2, reasoning: '' };
    }
    if (item && typeof item === 'object' && 'score' in item) {
        const s = Number(item.score);
        return { score: (isNaN(s) ? 0 : s) as 0 | 1 | 2, reasoning: String(item.reasoning || '') };
    }
    // Fallback for completely unknown shapes
    return { score: 0, reasoning: '' };
};

const CategorySection = ({
    title,
    items
}: {
    title: string;
    items: Record<string, any>
}) => {
    if (!items || typeof items !== 'object') return null;
    return (
        <div className="space-y-2">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b pb-1">
                {title}
            </div>
            <div className="space-y-1">
                {Object.entries(items).map(([key, rawItem]) => {
                    const item = normalizeItem(rawItem);
                    return (
                        <div key={key} className="flex justify-between items-center text-xs group">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="text-foreground/80 cursor-help hover:text-foreground transition-colors truncate max-w-[120px]">
                                            {formatLabel(key)}
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-xs">
                                        <p className="font-medium mb-1">{formatLabel(key)}</p>
                                        <p className="text-xs text-muted-foreground">{item.reasoning || 'No reasoning available'}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <span className={`font-mono font-medium ${item.score > 0 ? 'text-primary' : 'text-muted-foreground/40'}`}>
                                {item.score}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export function GreysonScoreCard({ totalScore, classification, breakdown, title }: GreysonScoreCardProps) {
    if (!breakdown) return null;

    return (
        <Card className={`h-full border-2 border-primary/20 bg-background/50 backdrop-blur-sm flex flex-col`}>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                        {title ?? "Greyson NDE Scale"}
                        <Link href="/scale/greyson" target="_blank" className="text-muted-foreground hover:text-primary transition-colors">
                            <ExternalLink className="w-4 h-4" />
                        </Link>
                    </div>
                </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col gap-4">
                <div className="flex items-baseline gap-2">
                    <div className={`text-4xl font-bold ${getScoreColor(totalScore)}`}>
                        {Math.round((totalScore / 32) * 100)}%
                    </div>
                    <div className="text-sm text-muted-foreground font-normal">{totalScore}/32</div>
                    <Badge className={`${getScoreColor(totalScore)} bg-primary/10 hover:bg-primary/20 border-0 ml-auto`}>
                        {classification || "N/A"}
                    </Badge>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-4 pt-2 border-t">
                    <CategorySection title="Cognitive" items={breakdown.cognitive} />
                    <CategorySection title="Affective" items={breakdown.affective} />
                    <CategorySection title="Paranormal" items={breakdown.paranormal} />
                    <CategorySection title="Transcendental" items={breakdown.transcendental} />
                </div>
            </CardContent>
        </Card>
    );
}
