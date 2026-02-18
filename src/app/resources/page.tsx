import Link from "next/link";
import { ArrowLeft, ExternalLink, BookOpen, Globe, FlaskConical, Users, MessageCircleQuestion, GraduationCap, PenLine, Landmark, Heart, Library, Microscope } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Resources — NDE Research Ecosystem | Project Profound",
    description:
        "Explore the organizations, databases, and research tools advancing our understanding of near-death experiences. Curated links to NoeticMap, NDERF, IANDS, UVA DOPS, and more.",
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

// --- Book card (simpler, no external link icon) ---
function BookCard({
    title,
    author,
    year,
    description,
}: {
    title: string;
    author: string;
    year: string;
    description: string;
}) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
            <p className="text-xs text-slate-400 mb-1">{year}</p>
            <h3
                className="font-bold text-slate-900 mb-0.5"
                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
                <em>{title}</em>
            </h3>
            <p className="text-sm text-blue-600 mb-2">{author}</p>
            <p className="text-sm text-slate-500 leading-relaxed">
                {description}
            </p>
        </div>
    );
}

// --- Section header ---
function SectionHeader({
    icon: Icon,
    iconBg,
    iconColor,
    title,
    subtitle,
}: {
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    title: string;
    subtitle: string;
}) {
    return (
        <div className="flex items-center gap-3 mb-6">
            <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
                    {title}
                </h2>
                <p className="text-sm text-slate-500">{subtitle}</p>
            </div>
        </div>
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

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* Section 1: Organizations & Nonprofits (NEW) */}
                {/* ═══════════════════════════════════════════════════════════ */}
                <section>
                    <SectionHeader
                        icon={Landmark}
                        iconBg="bg-blue-50"
                        iconColor="text-blue-600"
                        title="Organizations & Nonprofits"
                        subtitle="The groups leading NDE research, education, and community building"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <ResourceCard
                            href="https://iands.org"
                            icon={Landmark}
                            iconBg="bg-blue-50"
                            iconColor="text-blue-600"
                            title="IANDS"
                            org="International Association for Near-Death Studies"
                            description="Founded in 1981 by Ken Ring, Bruce Greyson, and others. Publishes the Journal of Near-Death Studies, funds research grants, hosts annual conferences, and runs support groups worldwide."
                            stat="Founded 1981 · World's Leading NDE Organization"
                        />
                        <ResourceCard
                            href="https://www.nderf.org"
                            icon={Globe}
                            iconBg="bg-amber-50"
                            iconColor="text-amber-600"
                            title="NDERF"
                            org="Near-Death Experience Research Foundation"
                            description="Founded by Jeffrey Long, M.D. A 501(c)(3) non-profit collecting and researching near-death experiences using standardized questionnaires in 37 languages."
                            stat="5,300+ NDEs · 16,000+ Total Experiences"
                        />
                        <ResourceCard
                            href="https://noeticmap.com"
                            icon={Microscope}
                            iconBg="bg-violet-50"
                            iconColor="text-violet-600"
                            title="NoeticMap"
                            org="AI-Powered Consciousness Research"
                            description="Analyzes 10,000+ NDEs and extraordinary experiences alongside 1,100+ peer-reviewed papers, making findings searchable through AI-powered semantic search and visualizations."
                            stat="1,100+ Papers · 288,000+ Reports"
                        />
                        <ResourceCard
                            href="https://sharedcrossing.com"
                            icon={Heart}
                            iconBg="bg-rose-50"
                            iconColor="text-rose-600"
                            title="Shared Crossing Project"
                            org="William Peters, M.Ed. (Harvard, UC Berkeley)"
                            description="Non-profit dedicated to shared-death experience research. Studies how living individuals can share in the dying process, leading to reduced grief and fear of death."
                        />
                        <ResourceCard
                            href="https://adcrf.org"
                            icon={Users}
                            iconBg="bg-teal-50"
                            iconColor="text-teal-600"
                            title="ADCRF"
                            org="After-Death Communication Research Foundation"
                            description="Founded in 1999 by Dr. Jeffrey Long. Collects and researches first-person accounts of spontaneous after-death communications with deceased loved ones."
                        />
                        <ResourceCard
                            href="https://eternea.org"
                            icon={FlaskConical}
                            iconBg="bg-indigo-50"
                            iconColor="text-indigo-600"
                            title="Eternea"
                            org="Spiritually Transformative Experience Research"
                            description="Researches NDEs, shared-death experiences, OBEs, and other spiritually transformative experiences (STEs) through a scientific lens, exploring non-local consciousness."
                        />
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* Section 2: Academic Institutions (NEW) */}
                {/* ═══════════════════════════════════════════════════════════ */}
                <section>
                    <SectionHeader
                        icon={GraduationCap}
                        iconBg="bg-emerald-50"
                        iconColor="text-emerald-600"
                        title="Academic Institutions"
                        subtitle="University-based research programs studying NDEs and consciousness"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <ResourceCard
                            href="https://med.virginia.edu/perceptual-studies/"
                            icon={GraduationCap}
                            iconBg="bg-emerald-50"
                            iconColor="text-emerald-600"
                            title="Division of Perceptual Studies"
                            org="University of Virginia"
                            description="Founded in 1967 by Dr. Ian Stevenson. Dr. Bruce Greyson studied 1,000+ NDE cases here. The leading university-based research group exploring consciousness survival, veridical NDEs, and the mind-body relationship."
                            stat="Est. 1967 · 1,000+ NDE Cases Studied"
                        />
                        <ResourceCard
                            href="https://nyulangone.org/doctors/1548522964/sam-parnia"
                            icon={GraduationCap}
                            iconBg="bg-emerald-50"
                            iconColor="text-emerald-600"
                            title="AWARE Study"
                            org="NYU Langone — Dr. Sam Parnia"
                            description="The multi-center AWARE I & II studies investigate consciousness during cardiac arrest. Demonstrated that the brain can show signs of electrical activity for up to 60 minutes during CPR, challenging prior assumptions."
                            stat="Multi-Center Study · Published in Resuscitation"
                        />
                        <ResourceCard
                            href="https://iands.org/resources/journal.html"
                            icon={Library}
                            iconBg="bg-emerald-50"
                            iconColor="text-emerald-600"
                            title="Journal of Near-Death Studies"
                            org="Published by IANDS · Peer-Reviewed Since 1982"
                            description="The only peer-reviewed academic journal dedicated to NDE research. Covers phenomenology, aftereffects, out-of-body experiences, deathbed visions, and theoretical implications. Masked review by scholarly experts."
                            stat="Peer-Reviewed Since 1982"
                        />
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* Section 3: Research & Academic Literature (existing) */}
                {/* ═══════════════════════════════════════════════════════════ */}
                <section>
                    <SectionHeader
                        icon={FlaskConical}
                        iconBg="bg-violet-50"
                        iconColor="text-violet-600"
                        title="Research & Academic Literature"
                        subtitle="Searchable databases of peer-reviewed science on consciousness and NDEs"
                    />
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

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* Section 4: First-Hand Accounts (existing) */}
                {/* ═══════════════════════════════════════════════════════════ */}
                <section>
                    <SectionHeader
                        icon={Globe}
                        iconBg="bg-amber-50"
                        iconColor="text-amber-600"
                        title="First-Hand Account Databases"
                        subtitle="Read thousands of documented near-death and related experiences"
                    />
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

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* Section 5: New to NDEs? (existing — reordered) */}
                {/* ═══════════════════════════════════════════════════════════ */}
                <section>
                    <SectionHeader
                        icon={MessageCircleQuestion}
                        iconBg="bg-teal-50"
                        iconColor="text-teal-600"
                        title="New to NDEs? Start Here"
                        subtitle="Educational resources for understanding near-death experiences"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <ResourceCard
                            href="https://iands.org/near-death-experiences/"
                            icon={Landmark}
                            iconBg="bg-blue-50"
                            iconColor="text-blue-600"
                            title="What Are Near-Death Experiences?"
                            org="IANDS"
                            description="IANDS' comprehensive guide to understanding NDEs — what they are, common elements, who has them, and how they change people's lives. The definitive starting point."
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
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* Section 6: Essential Books (NEW) */}
                {/* ═══════════════════════════════════════════════════════════ */}
                <section>
                    <SectionHeader
                        icon={BookOpen}
                        iconBg="bg-sky-50"
                        iconColor="text-sky-600"
                        title="Essential Books"
                        subtitle="Foundational reading on near-death experiences and consciousness"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <BookCard
                            title="Life After Life"
                            author="Raymond Moody, M.D."
                            year="1975"
                            description="The book that started it all — coined the term &quot;near-death experience&quot; and introduced NDE research to the world."
                        />
                        <BookCard
                            title="Evidence of the Afterlife"
                            author="Jeffrey Long, M.D."
                            year="2010"
                            description="New York Times bestseller. A scientific analysis of the largest NDE database, presenting nine lines of evidence for an afterlife."
                        />
                        <BookCard
                            title="After"
                            author="Bruce Greyson, M.D."
                            year="2021"
                            description="Five decades of NDE research from UVA's lead investigator. A rigorous yet compassionate scientific exploration."
                        />
                        <BookCard
                            title="Proof of Heaven"
                            author="Eben Alexander, M.D."
                            year="2012"
                            description="A neurosurgeon's own NDE during a meningitis-induced coma. Changed his scientific perspective on consciousness."
                        />
                        <BookCard
                            title="Consciousness Beyond Life"
                            author="Pim van Lommel, M.D."
                            year="2010"
                            description="The science behind the landmark Lancet 2001 study. A Dutch cardiologist's prospective NDE research across 10 hospitals."
                        />
                        <BookCard
                            title="Dying to Be Me"
                            author="Anita Moorjani"
                            year="2012"
                            description="A powerful first-person account of an NDE during stage 4 cancer and the subsequent healing that followed."
                        />
                    </div>
                    <div className="text-center mt-6">
                        <a
                            href="https://www.amazon.com/s?k=NDE&i=stripbooks&crid=OXV61BOG7P8K&sprefix=nde%2Cstripbooks%2C175&ref=nb_sb_noss_1"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            Browse more NDE books on Amazon
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* Section 7: Support & Community (NEW + existing Share) */}
                {/* ═══════════════════════════════════════════════════════════ */}
                <section>
                    <SectionHeader
                        icon={Heart}
                        iconBg="bg-rose-50"
                        iconColor="text-rose-600"
                        title="Support & Community"
                        subtitle="Find support, connect with others, and share your experience"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <ResourceCard
                            href="https://iands.org/connect/groups.html"
                            icon={Users}
                            iconBg="bg-blue-50"
                            iconColor="text-blue-600"
                            title="IANDS Support Groups"
                            org="IANDS"
                            description="Online and in-person support groups worldwide. A safe space for NDE experiencers to share, connect, and integrate their experiences with others who understand."
                        />
                        <ResourceCard
                            href="https://iands.org/conferences.html"
                            icon={Landmark}
                            iconBg="bg-blue-50"
                            iconColor="text-blue-600"
                            title="IANDS Annual Conference"
                            org="IANDS"
                            description="The world's largest event focused on near-death experiences and related phenomena. Brings together experiencers, researchers, healthcare professionals, and supporters."
                        />
                        <ResourceCard
                            href="https://www.nderf.org"
                            icon={PenLine}
                            iconBg="bg-rose-50"
                            iconColor="text-rose-600"
                            title="Share Your NDE"
                            org="NDERF"
                            description="NDERF's standardized questionnaire has been refined over decades to collect scientifically valuable data from experiencers. Available in 37 languages."
                            stat="Contributing to 25+ years of research"
                        />
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* About These Organizations (expanded) */}
                {/* ═══════════════════════════════════════════════════════════ */}
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
                                IANDS — International Association for Near-Death Studies
                            </h3>
                            <p>
                                Founded in 1981 by researchers Ken Ring, Bruce Greyson, John Audette, and Michael Sabom,
                                IANDS is the world&apos;s leading organization dedicated to the responsible, multi-disciplinary
                                exploration of near-death experiences and related phenomena. A 501(c)(3) non-profit, IANDS
                                publishes the peer-reviewed Journal of Near-Death Studies, manages research grants, hosts
                                the world&apos;s largest annual NDE conference, and facilitates support groups across North
                                America and internationally.
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
                                Shared Crossing Project
                            </h3>
                            <p>
                                Founded by William Peters, a licensed psychotherapist with degrees from Harvard
                                and UC Berkeley, the Shared Crossing Project is a non-profit dedicated to transforming
                                the understanding and experience of death and dying. Through the Shared Crossing
                                Research Initiative (SCRI), Peters and his team study shared-death experiences —
                                extraordinary events where a living person appears to share in the dying process
                                of another.
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
