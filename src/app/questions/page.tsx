import Link from "next/link";
import {
    ArrowLeft, Heart, Sparkles, Baby, AlertTriangle, Radio,
    Waves, Eye, Flame, User, Church, Star, HelpCircle,
    Users, Skull, Lightbulb, ChevronRight,
} from "lucide-react";
import type { Metadata } from "next";
import { QuestionsSearchBar } from "@/components/questions-search-bar";
import { createClient } from "@/lib/supabase/server";
import { CategoryAccordion } from "@/components/questions/category-accordion";

export const metadata: Metadata = {
    title: "Questions — What NDEs Tell Us | Project Profound",
    description:
        "Browse 70+ questions about near-death experiences organized by theme — from reuniting with loved ones, to what dying feels like, to why we're here. Each question searches thousands of real NDE accounts.",
};

export const revalidate = 86400;

// ─── Part navigation (the 3 big sections) ────────────────────────────────────

const PARTS = [
    {
        id: "part-1",
        number: "I",
        title: "The People & Beings We Love",
        subtitle: "Reunion, grief, and what awaits those we've lost",
        icon: Users,
        color: "text-rose-600",
        bg: "bg-rose-50 dark:bg-rose-900/20",
        border: "border-rose-100 hover:border-rose-300 dark:border-rose-900/40 dark:hover:border-rose-700",
        activeBorder: "border-l-rose-400",
    },
    {
        id: "part-2",
        number: "II",
        title: "Dying, Judgment & What We Face",
        subtitle: "Fear of death, the life review, and what awaits",
        icon: Skull,
        color: "text-blue-500 dark:text-blue-400",
        bg: "bg-blue-50 dark:bg-blue-900/20",
        border: "border-blue-100 hover:border-blue-300 dark:border-blue-900/40 dark:hover:border-blue-700",
        activeBorder: "border-l-blue-400",
    },
    {
        id: "part-3",
        number: "III",
        title: "Who We Are & What It Means",
        subtitle: "Identity, belief, purpose, and the nature of existence",
        icon: Lightbulb,
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-900/20",
        border: "border-emerald-100 hover:border-emerald-300 dark:border-emerald-900/40 dark:hover:border-emerald-700",
        activeBorder: "border-l-emerald-400",
    },
];

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, {
    iconName: string;
    iconColor: string;
    accentColor: string;
    partId: string;
    subtitle: string;
}> = {
    reunion: {
        iconName: "Heart", iconColor: "text-rose-500", accentColor: "border-l-rose-400",
        partId: "part-1",
        subtitle: "Reunion, recognition, and the bonds that outlast death",
    },
    pets: {
        iconName: "Sparkles", iconColor: "text-amber-500", accentColor: "border-l-amber-400",
        partId: "part-1",
        subtitle: "The companions we've lost and hope to find again",
    },
    children: {
        iconName: "Baby", iconColor: "text-sky-500", accentColor: "border-l-sky-400",
        partId: "part-1",
        subtitle: "Where innocent souls go, and whether we will ever hold them again",
    },
    suicide: {
        iconName: "AlertTriangle", iconColor: "text-orange-500", accentColor: "border-l-orange-400",
        partId: "part-1",
        subtitle: "Compassion, consequences, and what awaits those who died in crisis",
    },
    signs: {
        iconName: "Radio", iconColor: "text-teal-500", accentColor: "border-l-teal-400",
        partId: "part-1",
        subtitle: "Communication across the veil — what's real and how to recognize it",
    },
    "dying-process": {
        iconName: "Waves", iconColor: "text-blue-500", accentColor: "border-l-blue-400",
        partId: "part-2",
        subtitle: "The crossing itself — fear, peace, and the first moments after",
    },
    "life-review": {
        iconName: "Eye", iconColor: "text-violet-500", accentColor: "border-l-violet-400",
        partId: "part-2",
        subtitle: "Facing everything you've ever done — judgment, shame, and mercy",
    },
    hell: {
        iconName: "Flame", iconColor: "text-red-500", accentColor: "border-l-red-400",
        partId: "part-2",
        subtitle: "Dark NDEs, consequences for wrongdoing, and whether mercy has limits",
    },
    identity: {
        iconName: "User", iconColor: "text-indigo-500", accentColor: "border-l-indigo-400",
        partId: "part-3",
        subtitle: "Identity, memory, and the continuity of who we are",
    },
    religion: {
        iconName: "Church", iconColor: "text-yellow-600", accentColor: "border-l-yellow-400",
        partId: "part-3",
        subtitle: "What NDEs reveal about faith, dogma, and the question of God",
    },
    "afterlife-description": {
        iconName: "Star", iconColor: "text-purple-500", accentColor: "border-l-purple-400",
        partId: "part-3",
        subtitle: "Time, sensation, beauty, and the nature of existence beyond death",
    },
    purpose: {
        iconName: "HelpCircle", iconColor: "text-emerald-500", accentColor: "border-l-emerald-400",
        partId: "part-3",
        subtitle: "The purpose of life, the choice to be born, and the view from the other side",
    },
};

const CATEGORY_ORDER = [
    "reunion", "pets", "children", "suicide", "signs",
    "dying-process", "life-review", "hell",
    "identity", "religion", "afterlife-description", "purpose",
];

// Which category is the first of each Part — gets the part anchor + divider
const PART_ANCHORS: Record<string, string> = {
    reunion: "part-1",
    "dying-process": "part-2",
    identity: "part-3",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface NdeQuestion {
    id: number;
    slug: string;
    category: string;
    category_label: string;
    consumer_question: string;
    sort_order: number;
}

function PartNavCard({ part }: { part: typeof PARTS[number] }) {
    const Icon = part.icon;
    return (
        <a
            href={`#${part.id}`}
            className={`group flex-1 min-w-0 flex flex-col gap-2 bg-white dark:bg-white/5 rounded-xl border ${part.border} p-5 hover:shadow-md transition-all duration-200 cursor-pointer`}
        >
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${part.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${part.color}`} />
                </div>
                <span className={`text-xs font-bold uppercase tracking-widest ${part.color}`}>
                    Part {part.number}
                </span>
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                {part.title}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {part.subtitle}
            </p>
        </a>
    );
}

function PartDivider({ part }: { part: typeof PARTS[number] }) {
    const Icon = part.icon;
    return (
        <div className="flex items-center gap-4 pt-4 pb-2">
            <div className={`shrink-0 w-9 h-9 rounded-lg ${part.bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${part.color}`} />
            </div>
            <div>
                <p className={`text-xs font-bold uppercase tracking-widest ${part.color}`}>
                    Part {part.number}
                </p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
                    {part.title}
                </p>
            </div>
            <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
        </div>
    );
}



export default async function QuestionsPage() {
    const supabase = await createClient();

    const { data: questions, error } = await supabase
        .from("nde_questions")
        .select("id, slug, category, category_label, consumer_question, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

    if (error || !questions) {
        console.error("[Questions Page] Failed to load questions:", error?.message);
    }

    const byCategory = CATEGORY_ORDER.reduce<Record<string, NdeQuestion[]>>((acc, cat) => {
        acc[cat] = (questions ?? []).filter(q => q.category === cat);
        return acc;
    }, {});

    // Build the content in order, inserting Part dividers at boundaries
    const sections: {
        type: "part" | "category";
        partIndex?: number;
        category?: string;
        catIndex?: number;
    }[] = [];

    let catIndex = 0;
    for (const cat of CATEGORY_ORDER) {
        if (PART_ANCHORS[cat] !== undefined) {
            const partId = PART_ANCHORS[cat];
            const partIndex = PARTS.findIndex(p => p.id === partId);
            sections.push({ type: "part", partIndex });
        }
        sections.push({ type: "category", category: cat, catIndex: catIndex++ });
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* ── Hero ─────────────────────────────────────────────────── */}
            <section className="relative overflow-visible py-16 md:py-24 hero-gradient">
                <div
                    className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
                    style={{
                        backgroundImage: "radial-gradient(circle, #2563EB 1px, transparent 1px)",
                        backgroundSize: "32px 32px",
                    }}
                />
                <div className="relative container mx-auto px-4 max-w-7xl text-center">
                    <nav className="flex items-center justify-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 mb-8">
                        <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Home</Link>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Questions</span>
                    </nav>
                    <h1
                        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mb-4 leading-[1.05]"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                        What&apos;s On Your{" "}
                        <span className="text-blue-600 dark:text-blue-400" style={{ fontStyle: "italic" }}>
                            Heart?
                        </span>
                    </h1>
                    <p className="max-w-2xl mx-auto text-slate-600 dark:text-slate-400 text-lg leading-relaxed mb-8">
                        Your questions answered from 5,000+ NDE videos.
                    </p>
                    <QuestionsSearchBar />
                </div>
            </section>

            {/* ── "Most Asked Questions" intro ───────────────────────────── */}
            <div className="container mx-auto px-4 max-w-5xl pt-14 pb-4">
                <h2
                    className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-3"
                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                >
                    The Most Asked Questions
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed max-w-2xl">
                    We&apos;ve found more than 1,000 NDE-related questions on Reddit, YouTube, Facebook,
                    and other online communities. These are the top questions organized by category.
                </p>
            </div>

            {/* ── Part Navigation Cards ─────────────────────────────────── */}
            <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-white/[0.03]">
                <div className="container mx-auto px-4 max-w-5xl py-6">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">
                        Browse by theme
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        {PARTS.map(part => (
                            <PartNavCard key={part.id} part={part} />
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Question Sections ─────────────────────────────────────── */}
            <div className="container mx-auto px-4 max-w-5xl py-12 space-y-12">
                {sections.map((section, i) => {
                    if (section.type === "part" && section.partIndex !== undefined) {
                        const part = PARTS[section.partIndex];
                        return (
                            <div key={`part-${part.id}`} id={part.id}>
                                <PartDivider part={part} />
                            </div>
                        );
                    }

                    if (section.type === "category" && section.category) {
                        const cat = section.category;
                        const qs = byCategory[cat];
                        const label = qs?.[0]?.category_label ?? cat;
                        const meta = CATEGORY_META[cat];
                        if (!meta) return null;
                        // First category of each Part defaults open
                        const isFirstInPart = Object.keys(PART_ANCHORS).includes(cat);
                        return (
                            <CategoryAccordion
                                key={cat}
                                category={cat}
                                label={label}
                                subtitle={meta.subtitle}
                                accentColor={meta.accentColor}
                                iconColor={meta.iconColor}
                                iconName={meta.iconName}
                                questions={qs ?? []}
                                defaultOpen={isFirstInPart}
                            />
                        );
                    }

                    return null;
                })}

                {/* ── Footer callout ────────────────────────────────────── */}
                <section className="bg-slate-50 dark:bg-white/5 rounded-2xl p-8 border border-slate-200 dark:border-white/10 text-center">
                    <p
                        className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                        How these searches work
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
                        Each question uses semantic search to find the most relevant moments from thousands of
                        first-person NDE accounts — matching meaning and emotion, not just keywords. Click any
                        question to explore what experiencers actually reported.
                    </p>
                    <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/search3"
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 dark:bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 dark:hover:bg-blue-700 transition-colors cursor-pointer"
                        >
                            Open Free Search
                        </Link>
                        <Link
                            href="/resources"
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            NDE Research Resources
                        </Link>
                    </div>
                </section>

                {/* Back to home */}
                <div className="text-center pt-4 pb-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
