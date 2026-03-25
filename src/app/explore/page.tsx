import Link from "next/link";
import type { Metadata } from "next";
import { Brain, Sparkles, TrendingUp, Tv, HelpCircle, Search, Video } from "lucide-react";

export const metadata: Metadata = {
    title: "Explore NDEs | Project Profound",
    description: "Browse 5,000+ near-death experience accounts through research lenses: veridical perception, Greyson Scale depth, transformation impact, and direct search.",
};

const researchSections = [
    {
        href: "/questions",
        icon: HelpCircle,
        color: "violet",
        bg: "bg-violet-50",
        iconColor: "text-violet-600",
        border: "border-violet-100",
        badge: "Most Popular",
        title: "Big Questions",
        description: "81 profound questions answered directly from NDE accounts — grief, death, the afterlife, and what experiencers say about love.",
        cta: "Browse all questions →",
    },
    {
        href: "/channels",
        icon: Tv,
        color: "indigo",
        bg: "bg-indigo-50",
        iconColor: "text-indigo-600",
        border: "border-indigo-100",
        badge: null,
        title: "NDE Channels",
        description: "47 curated YouTube channels ranked by experience depth, transformation impact, and veridical evidence. Browse by source.",
        cta: "Browse channels →",
    },
    {
        href: "/video-explore",
        icon: Video,
        color: "blue",
        bg: "bg-blue-50",
        iconColor: "text-blue-600",
        border: "border-blue-100",
        badge: "New",
        title: "Explore Videos",
        description: "Browse 5,000+ NDE videos by research scores, core elements, and experience type. Filter by what happened, sort by impact.",
        cta: "Explore videos →",
    },
    {
        href: "/search3",
        icon: Search,
        color: "slate",
        bg: "bg-slate-100",
        iconColor: "text-slate-600",
        border: "border-slate-200",
        badge: null,
        title: "Search Transcripts",
        description: "Search across every word of 5,000+ NDE accounts using keyword or AI-powered semantic matching. Find exactly what you're looking for.",
        cta: "Search transcripts →",
    },
] as const;

const exploreSections = [
    {
        href: "/explore/veridical",
        icon: TrendingUp,
        color: "emerald",
        bg: "bg-emerald-50",
        iconColor: "text-emerald-600",
        border: "border-emerald-100",
        title: "Veridical Perception",
        description: "Accounts where experiencers accurately perceived verifiable events during their NDE — things they couldn't have known. The most evidential cases for consciousness beyond the body.",
        cta: "Explore veridical accounts →",
    },
    {
        href: "/explore/greyson",
        icon: Brain,
        color: "blue",
        bg: "bg-blue-50",
        iconColor: "text-blue-600",
        border: "border-blue-100",
        title: "Greyson Scale",
        description: "The clinical gold standard for NDE depth — 16 elements scored from cognitive changes to mystical experience. Find the most profound, well-documented accounts.",
        cta: "See highest-scoring experiences →",
    },
    {
        href: "/explore/transformation",
        icon: Sparkles,
        color: "rose",
        bg: "bg-rose-50",
        iconColor: "text-rose-600",
        border: "border-rose-100",
        title: "Transformation Index",
        description: "NDEs don't just happen — they change people. This index surfaces accounts with the most profound and lasting life transformations: lost fear of death, renewed purpose, ability to feel others' emotions.",
        cta: "Explore transformative accounts →",
    },
] as const;

export default function ExplorePage() {
    return (
        <div className="min-h-screen bg-slate-50">

            {/* ── Hero ──────────────────────────────────────────────────────── */}
            <div className="bg-white border-b border-slate-200/60">
                <div className="max-w-4xl mx-auto px-4 py-14 sm:py-20 text-center">
                    <p className="text-sm font-semibold text-violet-600 uppercase tracking-widest mb-4">5,000+ Accounts</p>
                    <h1
                        className="text-4xl sm:text-5xl font-bold text-slate-900 mb-5 leading-tight"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                        Explore Near-Death Experiences
                    </h1>
                    <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
                        Browse the archive through different lenses — questions people ask, research scales, or direct search across every account.
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-12 space-y-14">

                {/* ── Browse & Ask ──────────────────────────────────────────── */}
                <section>
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5">
                        Browse &amp; Ask
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                        {researchSections.map(({ href, icon: Icon, bg, iconColor, border, badge, title, description, cta }) => (
                            <Link
                                key={href}
                                href={href}
                                className={`relative group flex flex-col gap-4 p-6 bg-white rounded-2xl border ${border} hover:shadow-md transition-all hover:-translate-y-0.5`}
                            >
                                {badge && (
                                    <span className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wide text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                                        {badge}
                                    </span>
                                )}
                                <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center`}>
                                    <Icon className={`w-5 h-5 ${iconColor}`} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
                                </div>
                                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                                    {cta}
                                </span>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* ── Research Lenses ───────────────────────────────────────── */}
                <section>
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5">
                        Research Lenses
                    </h2>
                    <div className="grid sm:grid-cols-3 gap-4">
                        {exploreSections.map(({ href, icon: Icon, bg, iconColor, border, title, description, cta }) => (
                            <Link
                                key={href}
                                href={href}
                                className={`group flex flex-col gap-4 p-6 bg-white rounded-2xl border ${border} hover:shadow-md transition-all hover:-translate-y-0.5`}
                            >
                                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                                    <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-slate-900 mb-1.5">{title}</h3>
                                    <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
                                </div>
                                <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                                    {cta}
                                </span>
                            </Link>
                        ))}
                    </div>
                </section>



            </div>
        </div>
    );
}
