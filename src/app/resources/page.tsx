import Link from "next/link";
import { ArrowLeft, ExternalLink, BookOpen, Globe, FlaskConical, Users, MessageCircleQuestion, GraduationCap, PenLine } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Resources — NDE Research Ecosystem | Project Profound",
    description:
        "Explore the organizations, databases, and research tools advancing our understanding of near-death experiences. Curated links to NoeticMap, NDERF, and more.",
};

// --- Reusable resource card ---
function ResourceCard({
    href,
    icon: Icon,
    iconBg,
    iconColor,
    title,
    org,
    description,
    stat,
}: {
    href: string;
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    title: string;
    org: string;
    description: string;
    stat?: string;
}) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-lg transition-all duration-300"
        >
            <div className="flex items-start gap-4 mb-3">
                <div
                    className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
                >
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {title}
                    </h3>
                    <p className="text-xs text-slate-400">{org}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-blue-400 shrink-0 mt-1 transition-colors" />
            </div>
            <p className="text-sm text-slate-500 leading-relaxed flex-1">
                {description}
            </p>
            {stat && (
                <p className="text-xs font-medium text-blue-600 mt-3 pt-3 border-t border-slate-100">
                    {stat}
                </p>
            )}
        </a>
    );
}

export default function ResourcesPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Hero */}
            <section
                className="relative overflow-hidden py-16 md:py-24"
                style={{
                    background:
                        "linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 40%, #F1F5F9 100%)",
                }}
            >
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: "radial-gradient(circle, #2563EB 1px, transparent 1px)",
                        backgroundSize: "32px 32px",
                    }}
                />
                <div className="relative container mx-auto px-4 max-w-4xl text-center">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors mb-8"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                    <h1
                        className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4 leading-[1.1]"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                        The NDE Research{" "}
                        <span className="text-blue-600" style={{ fontStyle: "italic" }}>
                            Ecosystem
                        </span>
                    </h1>
                    <p className="max-w-2xl mx-auto text-slate-600 text-lg leading-relaxed">
                        Project Profound is one part of a global community studying near-death experiences.
                        Here are the organizations, databases, and tools advancing this research.
                    </p>
                </div>
            </section>

            <div className="container mx-auto px-4 max-w-6xl py-12 space-y-16">
                {/* ─── Section 1: Research & Academic ─── */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
                            <FlaskConical className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
                                Research & Academic Literature
                            </h2>
                            <p className="text-sm text-slate-500">
                                Peer-reviewed science on consciousness and near-death experiences
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <ResourceCard
                            href="https://noeticmap.com/research/literature"
                            icon={BookOpen}
                            iconBg="bg-violet-50"
                            iconColor="text-violet-600"
                            title="Academic Literature Search"
                            org="NoeticMap"
                            description="AI-analyzed academic papers on consciousness research with semantic search across the full literature."
                            stat="1,100+ Papers · 9,000+ Findings"
                        />
                        <ResourceCard
                            href="https://noeticmap.com/research/findings"
                            icon={FlaskConical}
                            iconBg="bg-violet-50"
                            iconColor="text-violet-600"
                            title="Key Findings"
                            org="NoeticMap"
                            description="Browse extracted findings and insights from peer-reviewed consciousness research."
                        />
                        <ResourceCard
                            href="https://noeticmap.com/research/papers"
                            icon={GraduationCap}
                            iconBg="bg-violet-50"
                            iconColor="text-violet-600"
                            title="Paper Browser"
                            org="NoeticMap"
                            description="Browse all papers with extracted metadata, citations, and categories."
                        />
                        <ResourceCard
                            href="https://noeticmap.com/research/cases"
                            icon={Users}
                            iconBg="bg-violet-50"
                            iconColor="text-violet-600"
                            title="Documented Cases"
                            org="NoeticMap"
                            description="Individual cases cited in academic literature with full context and scholarly references."
                            stat="600+ Cases"
                        />
                        <ResourceCard
                            href="https://www.nderf.org/NDERF/Research/Research_Overview_Right.htm"
                            icon={FlaskConical}
                            iconBg="bg-amber-50"
                            iconColor="text-amber-600"
                            title="Research Hub"
                            org="NDERF"
                            description="Scientific papers, statistical analyses, and award-winning research by Dr. Jeffrey Long on the survival of consciousness."
                        />
                    </div>
                </section>

                {/* ─── Section 2: First-Hand Accounts ─── */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                            <Globe className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
                                First-Hand Account Databases
                            </h2>
                            <p className="text-sm text-slate-500">
                                Read thousands of documented near-death and related experiences
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <ResourceCard
                            href="https://www.nderf.org"
                            icon={Globe}
                            iconBg="bg-amber-50"
                            iconColor="text-amber-600"
                            title="NDERF — NDE Archive"
                            org="Near-Death Experience Research Foundation"
                            description="The world's largest NDE website, founded by Jeffrey Long, M.D. Read first-person accounts in a searchable archive available in 37 languages."
                            stat="5,300+ NDEs · 16,000+ Total Experiences"
                        />
                        <ResourceCard
                            href="https://noeticmap.com/community"
                            icon={Users}
                            iconBg="bg-teal-50"
                            iconColor="text-teal-600"
                            title="Community Insights"
                            org="NoeticMap"
                            description="Explore patterns across NDEs, OBEs, after-death communications, shared-death experiences, and reincarnation memories from 15 communities."
                            stat="288,000+ Reports"
                        />
                    </div>
                </section>

                {/* ─── Section 3: New to NDEs? ─── */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
                            <MessageCircleQuestion className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
                                New to NDEs? Start Here
                            </h2>
                            <p className="text-sm text-slate-500">
                                Educational resources for understanding near-death experiences
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <ResourceCard
                            href="https://noeticmap.com/answers"
                            icon={MessageCircleQuestion}
                            iconBg="bg-teal-50"
                            iconColor="text-teal-600"
                            title="Evidence-Based Q&A"
                            org="NoeticMap"
                            description="Research-backed answers to common questions: Are NDEs real? What happens when we die? Can blind people see during NDEs?"
                            stat="30+ Questions Answered"
                        />
                        <ResourceCard
                            href="https://noeticmap.com/learn"
                            icon={GraduationCap}
                            iconBg="bg-teal-50"
                            iconColor="text-teal-600"
                            title="Learning Center"
                            org="NoeticMap"
                            description="Comprehensive guides covering what NDEs are, common elements, the Greyson Scale, the Life Review, and the science behind these experiences."
                        />
                        <ResourceCard
                            href="https://www.nderf.org/NDERF/Articles/NDE%20General%20Information.htm"
                            icon={BookOpen}
                            iconBg="bg-amber-50"
                            iconColor="text-amber-600"
                            title="General NDE Information"
                            org="NDERF"
                            description="Educational articles explaining the fundamentals of near-death experiences, including common elements, aftereffects, and their impact on experiencers."
                        />
                    </div>
                </section>

                {/* ─── Section 4: Share Your Story ─── */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center">
                            <PenLine className="w-5 h-5 text-rose-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
                                Share Your Experience
                            </h2>
                            <p className="text-sm text-slate-500">
                                Had a near-death experience? Your story contributes to research
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <ResourceCard
                            href="https://www.nderf.org"
                            icon={PenLine}
                            iconBg="bg-rose-50"
                            iconColor="text-rose-600"
                            title="Share Your NDE"
                            org="NDERF"
                            description="NDERF's standardized questionnaire has been refined over decades to collect scientifically valuable data from experiencers. Available in 37 languages. Your account helps researchers understand consciousness."
                            stat="Contributing to 25+ years of research"
                        />
                    </div>
                </section>

                {/* ─── About These Organizations ─── */}
                <section className="bg-slate-50 rounded-2xl p-8 border border-slate-200/60">
                    <h2
                        className="text-xl font-bold text-slate-900 mb-4"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                        About These Organizations
                    </h2>
                    <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
                        <div>
                            <h3 className="font-semibold text-slate-800 mb-1">
                                NoeticMap.com
                            </h3>
                            <p>
                                An AI-powered platform for consciousness exploration research. NoeticMap analyzes
                                10,000+ NDEs, OBEs, and extraordinary experiences alongside 1,100+ peer-reviewed
                                academic papers, extracting findings and making them searchable through semantic
                                search and interactive visualizations.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800 mb-1">
                                NDERF — Near-Death Experience Research Foundation
                            </h3>
                            <p>
                                Founded by Jeffrey Long, M.D. and Jody Long, J.D., NDERF is a 501(c)(3) non-profit
                                dedicated to the scientific study of near-death experiences. Since 1998, they have
                                collected over 5,300 NDE accounts and 16,000+ total consciousness experiences
                                using standardized questionnaires available in 37 languages. Their mission is to
                                research and study consciousness experiences and to spread the message of love,
                                unity, and peace around the world.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ─── Back to Home ─── */}
                <div className="text-center pt-4 pb-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
