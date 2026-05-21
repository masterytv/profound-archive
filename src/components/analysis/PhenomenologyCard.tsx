"use client";

import { cn } from "@/lib/utils";
import {
    Eye,
    Ear,
    Hand,
    Wind,
    Zap,
    ArrowRight,
    Brain,
} from "lucide-react";

// --- Types matching actual DB schema ---

export interface PhenomenologyData {
    reality_comparison?: string;
    vividness_rating?: number;
    reality_quote?: string;
    vividness_quote?: string;
    sensory_modalities?: Record<string, { active: boolean; description?: string; extraordinary?: boolean }> | string[];
    emotional_progression?: Array<{ emotion: string; intensity?: number; context?: string }> | string[];
    altered_cognition?: Record<string, string> | string[];
    distinguishing_features?: string;
    // Legacy simple string fields
    vividness?: string;
}

// --- Config ---

// Reality comparison scale
const REALITY_LEVELS = [
    { value: "less_real", label: "Less Real", position: 0, color: "bg-slate-300" },
    { value: "equally_real", label: "Equally Real", position: 33, color: "bg-blue-400" },
    { value: "more_real", label: "More Real", position: 66, color: "bg-blue-500" },
    { value: "most_real", label: "Most Real Ever", position: 100, color: "bg-blue-600" },
];

const VIVIDNESS_LEVELS = [
    { value: "faint", label: "Faint", color: "bg-slate-300" },
    { value: "normal", label: "Normal", color: "bg-blue-300" },
    { value: "vivid", label: "Vivid", color: "bg-blue-500" },
    { value: "hyper_vivid", label: "Hyper-Vivid", color: "bg-indigo-600" },
];

// Sensory icons
const SENSORY_ICONS: Record<string, { icon: typeof Eye; label: string }> = {
    visual: { icon: Eye, label: "Visual" },
    auditory: { icon: Ear, label: "Auditory" },
    tactile: { icon: Hand, label: "Tactile" },
    olfactory: { icon: Wind, label: "Smell" },
    kinesthetic: { icon: Zap, label: "Kinesthetic" },
    gustatory: { icon: Zap, label: "Taste" },
};

// --- Helpers ---

function formatSnakeCase(str: string) {
    return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Normalize sensory_modalities to a list of active modality names */
function normalizeSensory(
    raw: PhenomenologyData["sensory_modalities"]
): { name: string; description?: string; extraordinary?: boolean }[] {
    if (!raw) return [];
    // If it's already a string array (legacy format)
    if (Array.isArray(raw)) {
        return raw.map((s) => ({ name: typeof s === "string" ? s : String(s) }));
    }
    // Object format: { visual: { active: true, description: "..." }, ... }
    return Object.entries(raw)
        .filter(([, v]) => v && v.active)
        .map(([key, v]) => ({
            name: key,
            description: v.description || undefined,
            extraordinary: v.extraordinary,
        }));
}

/** Normalize emotional_progression to { emotion, intensity?, context? }[] */
function normalizeEmotions(
    raw: PhenomenologyData["emotional_progression"]
): { emotion: string; intensity?: number; context?: string }[] {
    if (!raw) return [];
    if (Array.isArray(raw)) {
        return raw.map((item) => {
            if (typeof item === "string") return { emotion: item };
            return {
                emotion: item.emotion || "unknown",
                intensity: item.intensity,
                context: item.context,
            };
        });
    }
    return [];
}

/** Normalize altered_cognition to { key, value }[] */
function normalizeCognition(
    raw: PhenomenologyData["altered_cognition"]
): { key: string; value: string }[] {
    if (!raw) return [];
    // String array (legacy)
    if (Array.isArray(raw)) {
        return raw.map((s) => ({ key: typeof s === "string" ? s : String(s), value: "" }));
    }
    // Object format: { thought_speed: "normal", ... }
    return Object.entries(raw).map(([key, value]) => ({ key, value: String(value) }));
}

// --- Helper Components ---

function RealityMeter({ value }: { value?: string }) {
    if (!value) return null;
    const level = REALITY_LEVELS.find((l) => l.value === value) || REALITY_LEVELS[1];
    const percentage = level.position;

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Less Real</span>
                <span>Most Real</span>
            </div>
            <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-500", level.color)}
                    style={{ width: `${Math.max(percentage, 8)}%` }}
                />
            </div>
            <p className="text-xs font-medium text-slate-700 text-center">{level.label}</p>
        </div>
    );
}

function VividnessMeter({ rating, label }: { rating?: number; label?: string }) {
    // Support both numeric rating (1-10) and label-based
    if (!rating && !label) return null;

    let percentage = 50;
    let displayLabel = "Normal";

    if (rating != null) {
        percentage = Math.max(8, (rating / 10) * 100);
        if (rating >= 9) displayLabel = "Hyper-Vivid";
        else if (rating >= 7) displayLabel = "Vivid";
        else if (rating >= 4) displayLabel = "Normal";
        else displayLabel = "Faint";
    } else if (label) {
        const level = VIVIDNESS_LEVELS.find((l) => l.value === label);
        if (level) {
            const idx = VIVIDNESS_LEVELS.indexOf(level);
            percentage = ((idx + 1) / VIVIDNESS_LEVELS.length) * 100;
            displayLabel = level.label;
        }
    }

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Faint</span>
                <span>Hyper-Vivid</span>
            </div>
            <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className="absolute inset-y-0 left-0 rounded-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <p className="text-xs font-medium text-slate-700 text-center">{displayLabel}</p>
        </div>
    );
}

// --- Main Component ---

interface PhenomenologyCardProps {
    phenomenology: PhenomenologyData | null | undefined;
    className?: string;
}

export function PhenomenologyCard({ phenomenology, className }: PhenomenologyCardProps) {
    if (!phenomenology) return null;

    const sensory = normalizeSensory(phenomenology.sensory_modalities);
    const emotions = normalizeEmotions(phenomenology.emotional_progression);
    const cognition = normalizeCognition(phenomenology.altered_cognition);

    // Don't render if all fields are empty
    const hasContent =
        phenomenology.reality_comparison ||
        phenomenology.vividness ||
        phenomenology.vividness_rating ||
        sensory.length > 0 ||
        emotions.length > 0 ||
        cognition.length > 0 ||
        phenomenology.distinguishing_features;

    if (!hasContent) return null;

    return (
        <div className={cn("space-y-4", className)}>
            {/* Reality + Vividness meters */}
            {(phenomenology.reality_comparison || phenomenology.vividness || phenomenology.vividness_rating) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {phenomenology.reality_comparison && (
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                Reality Comparison
                            </h4>
                            <RealityMeter value={phenomenology.reality_comparison} />
                        </div>
                    )}
                    {(phenomenology.vividness || phenomenology.vividness_rating) && (
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                Vividness
                            </h4>
                            <VividnessMeter
                                rating={phenomenology.vividness_rating}
                                label={phenomenology.vividness}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Sensory Modalities */}
            {sensory.length > 0 && (
                <div>
                    <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Sensory Channels
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {sensory.map((mod) => {
                            const config = SENSORY_ICONS[mod.name.toLowerCase()];
                            const Icon = config?.icon || Zap;
                            const label = config?.label || formatSnakeCase(mod.name);

                            return (
                                <div
                                    key={mod.name}
                                    className={cn(
                                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium",
                                        mod.extraordinary
                                            ? "bg-violet-50 border-violet-300 text-violet-800"
                                            : "bg-violet-50 border-violet-200 text-violet-700"
                                    )}
                                    title={mod.description || undefined}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    <span>{label}</span>
                                    {mod.extraordinary && (
                                        <Zap className="w-2.5 h-2.5 text-violet-400" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Emotional Progression */}
            {emotions.length > 0 && (
                <div>
                    <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Emotional Progression
                    </h4>
                    <div className="flex flex-wrap items-center gap-1">
                        {emotions.map((emo, idx) => (
                            <span key={idx} className="flex items-center gap-1">
                                <span
                                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-medium"
                                    title={emo.context || undefined}
                                >
                                    {formatSnakeCase(emo.emotion)}
                                    {emo.intensity != null && (
                                        <span className="ml-1 text-[9px] text-rose-400">
                                            {emo.intensity}/10
                                        </span>
                                    )}
                                </span>
                                {idx < emotions.length - 1 && (
                                    <ArrowRight className="w-3 h-3 text-slate-300" />
                                )}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Altered Cognition */}
            {cognition.length > 0 && (
                <div>
                    <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Altered Cognition
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                        {cognition.map((item) => (
                            <span
                                key={item.key}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-medium"
                            >
                                <Brain className="w-3 h-3" />
                                {formatSnakeCase(item.key)}
                                {item.value && (
                                    <span className="text-[9px] text-amber-500">
                                        {formatSnakeCase(item.value)}
                                    </span>
                                )}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Distinguishing Features */}
            {phenomenology.distinguishing_features && (
                <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                    <h4 className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider mb-1">
                        Distinguishing Features
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        {phenomenology.distinguishing_features}
                    </p>
                </div>
            )}
        </div>
    );
}
