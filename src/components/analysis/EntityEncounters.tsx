"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
    User,
    Users,
    Sun,
    MessageSquare,
    Eye,
    Radio,
    ChevronDown,
    ChevronUp,
} from "lucide-react";

// --- Types matching actual DB shape ---

// The DB stores entities as { encounters: [...], entity_count, dominant_entity_type }
// Each encounter has rich fields: order, gender, identity, appearance, confidence,
// luminosity, entity_type, message_quote, age_appearance, message_summary,
// emotional_quality, communication_method

export interface EntityEncounter {
    identity?: string;
    appearance?: string;
    communication_method?: string;
    messages?: string[];
    // Rich DB fields
    entity_type?: string;
    gender?: string;
    luminosity?: string;
    emotional_quality?: string;
    message_quote?: string;
    message_summary?: string;
    age_appearance?: string;
    confidence?: number;
    order?: number;
}

export interface EntitiesWrapper {
    encounters?: EntityEncounter[];
    entity_count?: number;
    dominant_entity_type?: string;
}

// Normalize: accept either flat array or wrapper object
export function normalizeEntities(
    raw: EntityEncounter[] | EntitiesWrapper | null | undefined
): EntityEncounter[] {
    if (!raw) return [];
    // Already a flat array
    if (Array.isArray(raw)) return raw;
    // Wrapper object with encounters array
    if (raw.encounters && Array.isArray(raw.encounters)) {
        return raw.encounters;
    }
    return [];
}

// Icon based on entity type or identity
function getEntityIcon(entity: EntityEncounter) {
    const type = (entity.entity_type || entity.identity || "").toLowerCase();
    if (type.includes("relative") || type.includes("family") || type.includes("deceased")) return Users;
    if (type.includes("being") || type.includes("light") || type.includes("angel") || type.includes("divine")) return Sun;
    if (type.includes("guide") || type.includes("guardian")) return Sun;
    return User;
}

// Communication method badge color
function getCommColor(method?: string): { bg: string; text: string; border: string } {
    if (!method) return { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" };
    const m = method.toLowerCase();
    if (m.includes("telepat")) return { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" };
    if (m.includes("verbal") || m.includes("voice") || m.includes("spoke")) return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" };
    if (m.includes("gestur") || m.includes("visual")) return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
    if (m.includes("emotion") || m.includes("feel")) return { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" };
    if (m.includes("presence")) return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
    return { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" };
}

function formatSnakeCase(str: string) {
    return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// --- Component ---

interface EntityEncountersProps {
    entities: EntityEncounter[] | EntitiesWrapper | null | undefined;
    className?: string;
}

export function EntityEncounters({ entities: rawEntities, className }: EntityEncountersProps) {
    const [expanded, setExpanded] = useState<number | null>(null);

    const entities = normalizeEntities(rawEntities);

    if (entities.length === 0) {
        return (
            <div className={cn("text-xs text-slate-400 italic py-2", className)}>
                No entity encounters detected in this account.
            </div>
        );
    }

    // Sort by order if available
    const sorted = [...entities].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return (
        <div className={cn("space-y-2", className)}>
            {sorted.map((entity, idx) => {
                const Icon = getEntityIcon(entity);
                const commColor = getCommColor(entity.communication_method);
                const isOpen = expanded === idx;

                // Build messages list from either messages[] or message_quote/message_summary
                const messageList: string[] = [];
                if (entity.messages && entity.messages.length > 0) {
                    messageList.push(...entity.messages);
                } else {
                    if (entity.message_quote) messageList.push(entity.message_quote);
                    if (entity.message_summary && entity.message_summary !== entity.message_quote) {
                        messageList.push(entity.message_summary);
                    }
                }

                const hasMessages = messageList.length > 0;
                const hasDetails = entity.luminosity || entity.emotional_quality || entity.confidence;

                // Build display identity
                const displayIdentity = entity.identity
                    ? formatSnakeCase(entity.identity)
                    : entity.entity_type
                        ? formatSnakeCase(entity.entity_type)
                        : "Unknown Entity";

                // Subtitle: appearance or age + gender
                let subtitle = entity.appearance && entity.appearance !== "not described" ? entity.appearance : "";
                if (!subtitle && entity.age_appearance) {
                    subtitle = formatSnakeCase(entity.age_appearance);
                    if (entity.gender) subtitle += ` ${formatSnakeCase(entity.gender)}`;
                }

                return (
                    <div
                        key={idx}
                        className={cn(
                            "rounded-lg border transition-all",
                            isOpen ? "bg-white border-blue-200 shadow-sm" : "bg-slate-50/50 border-slate-100 hover:border-slate-200"
                        )}
                    >
                        <button
                            onClick={() => setExpanded(isOpen ? null : idx)}
                            className="w-full text-left p-3 flex items-center gap-3 cursor-pointer"
                        >
                            {/* Avatar */}
                            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                                <Icon className="w-4 h-4 text-blue-600" />
                            </div>

                            {/* Identity */}
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-slate-800 leading-snug">
                                    {displayIdentity}
                                </p>
                                {subtitle && (
                                    <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>
                                )}
                            </div>

                            {/* Communication Method badge */}
                            {entity.communication_method && (
                                <span className={cn(
                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0",
                                    commColor.bg, commColor.text, commColor.border
                                )}>
                                    <Radio className="w-2.5 h-2.5" />
                                    {formatSnakeCase(entity.communication_method)}
                                </span>
                            )}

                            {/* Expand indicator */}
                            {(hasMessages || hasDetails) && (
                                <div className="shrink-0">
                                    {isOpen ? (
                                        <ChevronUp className="w-4 h-4 text-slate-400" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-slate-400" />
                                    )}
                                </div>
                            )}
                        </button>

                        {/* Expanded details */}
                        {isOpen && (hasMessages || hasDetails) && (
                            <div className="px-3 pb-3 pt-0 border-t border-slate-100 space-y-2">
                                {/* Extra detail badges */}
                                {hasDetails && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {entity.luminosity && entity.luminosity !== "not_stated" && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-700 text-[10px] font-medium">
                                                ✦ {formatSnakeCase(entity.luminosity)}
                                            </span>
                                        )}
                                        {entity.emotional_quality && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-medium">
                                                ♡ {formatSnakeCase(entity.emotional_quality)}
                                            </span>
                                        )}
                                        {entity.confidence != null && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-medium">
                                                {entity.confidence}% confidence
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Messages */}
                                {hasMessages && (
                                    <div>
                                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-2 mb-1.5">
                                            Messages
                                        </p>
                                        <div className="space-y-1.5">
                                            {messageList.map((msg, mIdx) => (
                                                <div
                                                    key={mIdx}
                                                    className="flex items-start gap-2 pl-2 border-l-2 border-blue-200"
                                                >
                                                    <MessageSquare className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
                                                    <p className="text-xs text-slate-600 italic leading-snug">
                                                        &ldquo;{msg}&rdquo;
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
