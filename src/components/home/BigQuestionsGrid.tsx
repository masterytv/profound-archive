import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HelpCircle, ArrowRight } from "lucide-react";

/**
 * The 6 question slugs to display on the homepage.
 * These are hand-picked for emotional resonance and search volume.
 */
const FEATURED_SLUGS = [
    "are-our-loved-ones-really-there-to-greet-us-when-we-die",
    "do-pets-have-souls-and-will-mine-really-be-waiting-for-me-when-i-die",
    "is-dying-painful-or-do-people-feel-peace-at-the-end",
    "will-i-have-to-relive-everything-ive-ever-done-especially-the-things-im-most-ashamed-of",
    "what-is-the-actual-purpose-of-my-life-from-a-souls-perspective",
    "is-hell-a-real-place-or-is-it-a-story-religion-invented-to-control-people-through-fear",
];

// Category → color mapping for visual variety
const CATEGORY_COLORS: Record<string, { border: string; icon: string; bg: string }> = {
    reunion:          { border: "hover:border-rose-300 dark:hover:border-rose-500/40", icon: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-500/20" },
    pets:             { border: "hover:border-amber-300 dark:hover:border-amber-500/40", icon: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/20" },
    "dying-process":  { border: "hover:border-blue-300 dark:hover:border-blue-500/40", icon: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/20" },
    "life-review":    { border: "hover:border-violet-300 dark:hover:border-violet-500/40", icon: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-500/20" },
    purpose:          { border: "hover:border-emerald-300 dark:hover:border-emerald-500/40", icon: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/20" },
    hell:             { border: "hover:border-red-300 dark:hover:border-red-500/40", icon: "text-red-500", bg: "bg-red-50 dark:bg-red-500/20" },
};

type QuestionRow = {
    id: number;
    slug: string;
    category: string;
    consumer_question: string;
};

/**
 * BigQuestionsGrid — 6 emotionally resonant NDE questions in a 2×3 grid.
 * Server component that fetches from nde_questions.
 */
export async function BigQuestionsGrid() {
    const supabase = await createClient();

    const { data: questions } = await supabase
        .from("nde_questions")
        .select("id, slug, category, consumer_question")
        .in("slug", FEATURED_SLUGS)
        .eq("is_active", true);

    // If the DB query fails or returns empty, fall back gracefully
    if (!questions || questions.length === 0) return null;

    // Sort them to match FEATURED_SLUGS order
    const sortedQuestions = FEATURED_SLUGS
        .map(slug => questions.find(q => q.slug === slug))
        .filter(Boolean) as QuestionRow[];

    return (
        <section className="container mx-auto px-4 py-10 max-w-5xl">
            <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2.5 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
                        <HelpCircle className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <h2
                        className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                        Questions People Are Asking
                    </h2>
                </div>
                <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
                    81 questions answered directly from 5,000+ NDE accounts.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedQuestions.map((q) => {
                    const colors = CATEGORY_COLORS[q.category] ?? CATEGORY_COLORS.reunion;
                    return (
                        <Link
                            key={q.slug}
                            href={`/questions/${q.slug}`}
                            className={`group flex items-start gap-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-white/5 p-5 ${colors.border} hover:shadow-lg transition-all duration-300`}
                        >
                            <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                                <HelpCircle className={`w-4 h-4 ${colors.icon}`} />
                            </div>
                            <p
                                className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed group-hover:text-slate-900 dark:group-hover:text-white transition-colors"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                {q.consumer_question}
                            </p>
                        </Link>
                    );
                })}
            </div>

            <div className="text-center mt-8">
                <Link
                    href="/questions"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-sm font-medium hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors"
                >
                    View All 81 Questions
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </section>
    );
}
