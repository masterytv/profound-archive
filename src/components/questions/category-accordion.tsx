"use client";

import { useState } from "react";
import Link from "next/link";
import {
    ChevronDown, ArrowRight,
    Heart, Sun, Baby, AlertTriangle, Radio,
    Waves, Eye, Flame, User, Church, Star, HelpCircle,
} from "lucide-react";

// Map icon name strings → components so the Server Component
// can pass a plain string across the RSC boundary.
const ICON_MAP: Record<string, React.ElementType> = {
    Heart, Sun, Baby, AlertTriangle, Radio,
    Waves, Eye, Flame, User, Church, Star, HelpCircle,
};

interface NdeQuestion {
    id: number;
    slug: string;
    category: string;
    category_label: string;
    consumer_question: string;
    sort_order: number;
}

interface CategoryAccordionProps {
    category: string;
    label: string;
    subtitle: string;
    accentColor: string;
    iconColor: string;
    iconName: string;        // plain string — safe across RSC boundary
    questions: NdeQuestion[];
    defaultOpen?: boolean;
}

function QuestionCard({ question, index }: { question: NdeQuestion; index: number }) {
    return (
        <Link
            href={`/questions/${question.slug}`}
            className="group flex items-start gap-3 bg-white dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 p-4 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md dark:hover:bg-white/10 transition-all duration-200 cursor-pointer"
        >
            <span className="text-xs font-mono text-slate-300 mt-0.5 shrink-0 w-5 text-right select-none">
                {index}
            </span>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex-1">
                {question.consumer_question}
            </p>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400 transition-colors shrink-0 mt-0.5" />
        </Link>
    );
}

export function CategoryAccordion({
    category,
    label,
    subtitle,
    accentColor,
    iconColor,
    iconName,
    questions,
    defaultOpen = false,
}: CategoryAccordionProps) {
    const [open, setOpen] = useState(defaultOpen);

    if (questions.length === 0) return null;

    const Icon = ICON_MAP[iconName] ?? HelpCircle;

    return (
        <section id={`cat-${category}`}>
            <button
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className={`w-full flex items-center gap-4 pl-4 border-l-4 ${accentColor} mb-0 text-left group cursor-pointer`}
            >
                <div className="flex-1 py-1">
                    <div className="flex items-center gap-2 mb-0.5">
                        <Icon className={`w-4 h-4 ${iconColor}`} />
                        <h2
                            className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-slate-700 dark:group-hover:text-white transition-colors"
                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                        >
                            {label}
                        </h2>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0 pr-1">
                    <span className="text-xs font-medium text-slate-400 tabular-nums">
                        {questions.length} questions
                    </span>
                    <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                    />
                </div>
            </button>

            {open && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {questions.map((q, i) => (
                        <QuestionCard key={q.id} question={q} index={i + 1} />
                    ))}
                </div>
            )}
        </section>
    );
}
