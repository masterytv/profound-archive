import type { Metadata } from "next";
import Link from "next/link";
import {
    ArrowRight, Database, FlaskConical, Link2,
    MessageCircle, Mic, Search, User,
} from "lucide-react";
import { serializeJsonLd } from "@/lib/json-ld";
import { formatCount, getNdeStats, getUapStats } from "@/lib/og/stats";

// Live archive counts refresh hourly via ISR; stats helpers have
// their own in-memory cache, timeout, and fallbacks.
export const revalidate = 3600;

const SITE_URL = "https://projectprofound.org";

export const metadata: Metadata = {
    title: "Tom Wood, Founder | Project Profound",
    description:
        "The story behind Project Profound — and a working introduction to the archive for podcasters, journalists, and researchers, including the statistics available today and those we can calculate on request.",
    openGraph: {
        title: "Tom Wood, Founder | Project Profound",
        description:
            "From IBM analyst to consciousness researcher: the story behind the largest analyzed archive of first-person NDE and UAP contact testimony.",
        type: "profile",
    },
};

const fontSerif = { fontFamily: "'Crimson Pro', Georgia, serif" };

const card =
    "bg-white dark:bg-white/[0.03] rounded-2xl border border-slate-200/60 dark:border-white/10 p-6 md:p-8";

const sectionHeading =
    "text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-6";

const storyProse =
    "prose prose-lg max-w-none text-slate-600 dark:text-slate-300 space-y-5 leading-relaxed";

export default async function FounderPage() {
    const [nde, uap] = await Promise.all([getNdeStats(), getUapStats()]);

    const personJsonLd = {
        "@context": "https://schema.org",
        "@type": "Person",
        name: "Tom Wood",
        jobTitle: "Founder, Project Profound",
        description:
            "Founder of Project Profound, an independent research platform applying AI analysis to thousands of first-person NDE and UAP contact testimonies.",
        url: `${SITE_URL}/about/founder`,
        worksFor: { "@type": "Organization", name: "Project Profound", url: SITE_URL },
    };

    const breadcrumbJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "About", item: `${SITE_URL}/about` },
            { "@type": "ListItem", position: 3, name: "Founder", item: `${SITE_URL}/about/founder` },
        ],
    };

    const liveStats = [
        { value: formatCount(nde.videos), label: "Confirmed NDE accounts", note: "Greyson-screened" },
        { value: formatCount(uap.encounters), label: "UAP encounter records", note: "22 research dimensions" },
        { value: formatCount(nde.channels + uap.channels), label: "Source channels", note: "Independent communities" },
        { value: formatCount(nde.videos + uap.videos), label: "Video testimonies archived", note: "First-person accounts" },
    ];

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: serializeJsonLd(personJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
            />

            <div className="min-h-screen bg-background text-foreground">
                {/* ── Hero ── */}
                <section className="relative overflow-hidden consciousness-hero-gradient border-b border-slate-200/60 dark:border-white/10">
                    <div
                        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
                        style={{
                            backgroundImage: "radial-gradient(circle, #8b5cf6 1px, transparent 1px)",
                            backgroundSize: "32px 32px",
                        }}
                    />
                    <div className="relative container mx-auto px-4 py-20 md:py-28 max-w-4xl text-center">
                        <p className="text-sm font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-4">
                            About the Founder
                        </p>
                        <h1
                            className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-slate-100 mb-6 leading-tight"
                            style={fontSerif}
                        >
                            It Started with a Click.{" "}
                            <em className="bg-gradient-to-r from-violet-500 to-emerald-500 bg-clip-text text-transparent not-italic">
                                Then It Got Weird.
                            </em>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
                            I&apos;m Tom Wood. I built Project Profound to answer a question I couldn&apos;t
                            let go of using data, transparency, and a lot of stubbornness. This page is my
                            story, and a working introduction for podcasters, journalists, and researchers.
                        </p>
                    </div>
                </section>

                <div className="container mx-auto px-4 max-w-4xl">
                    {/* ── The story ── */}
                    <section className="py-16 md:py-20">
                        <div className={`${card}`}>
                            <div className={storyProse}>
                                <p>
                                    I wasn&apos;t looking for God, the afterlife, UFOs, or a reason to question
                                    everything I thought I knew.
                                </p>
                                <p>
                                    I was a tech-focused entrepreneur. Before that, an analyst at IBM, then
                                    management consulting. My world was built on the tangible, the measurable,
                                    the kind of stuff you can put in a spreadsheet. If you&apos;d asked me about
                                    my beliefs, I&apos;d have given you the classic non-answer:{" "}
                                    <em>&quot;spiritual, but not religious.&quot;</em>{" "}It was a polite way of
                                    saying I wanted to believe in something more, but I just... didn&apos;t.
                                </p>
                                <p>
                                    Then one night in 2020, a YouTube algorithm suggested a video:{" "}
                                    <em>the near-death experience of Anita Moorjani</em>. I clicked. Maybe it was
                                    idle curiosity.
                                </p>
                                <p>
                                    As I listened to this woman describe leaving her body, feeling an ocean of
                                    pure, unconditional love, and perceiving things she couldn&apos;t possibly
                                    have perceived, something broke open inside me. Not intellectually.
                                    Physically. It first felt like every cell in my body was electrified with a
                                    sudden, overwhelming euphoria. Then, I had an instantaneous understanding
                                    of everything. I found myself sitting on my couch, muttering to my dog:{" "}
                                    <strong>&quot;I know this. I KNOW THIS. How do I know this?&quot;</strong>
                                </p>
                                <p>
                                    For three days, I lived in a state of absolute bliss. The world was saturated
                                    with infinite, conscious, unconditional love that was more real than anything
                                    I&apos;ve ever experienced. It was an ineffable experience that is diminished
                                    every time I try to use words to describe it. Some people call it a shared
                                    NDE. Others call it a spiritually transformative experience. Some might call
                                    it a breakdown. Whatever you call it, it changed the direction of my life.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* ── Seeker's heart, tech nerd's brain ── */}
                    <section className="pb-16 md:pb-20">
                        <h2 className={sectionHeading} style={fontSerif}>
                            When a Seeker&apos;s Heart Meets a Tech Nerd&apos;s Brain
                        </h2>
                        <div className={storyProse}>
                            <p>
                                My inner analyst kicked in immediately. I didn&apos;t just want to marvel at the
                                mystery, I needed to find the signal in the noise. That impulse launched a
                                multi-year quest. I became a digital archaeologist of consciousness, immersing
                                myself in thousands of NDE accounts, documenting the patterns (the tunnel, the
                                life review, the beings of light, the messages of unconditional love) and
                                building tools to analyze them at a scale no individual researcher could.
                            </p>
                            <p>
                                My hypothesis was simple:{" "}
                                <strong>
                                    one story is an anecdote. Thousands of stories? That&apos;s data.
                                </strong>
                            </p>
                            <p>
                                But the data pointed me toward a truth I never expected. The most consistent
                                pattern wasn&apos;t about what happens when we die. It was about what happens to
                                people <em>after</em> their NDE. Almost universally, they came back transformed.
                                Fear of death: gone. Desire for material wealth: diminished. In its place: an
                                overwhelming urge to love more, connect more deeply, and live with purpose.
                            </p>
                            <p>
                                I realized I&apos;d been chasing the wrong question. The real power of NDEs
                                isn&apos;t proving the afterlife. It&apos;s providing a blueprint for how to live
                                a better life, right now.
                            </p>
                        </div>
                    </section>

                    {/* ── The UFOs ── */}
                    <section className="pb-16 md:pb-20">
                        <h2 className={sectionHeading} style={fontSerif}>
                            And Then... the UFOs.
                        </h2>
                        <div className={storyProse}>
                            <p>
                                Here&apos;s where the story gets strange. Or maybe it was always strange, and I
                                just couldn&apos;t see it yet.
                            </p>
                            <p>
                                Even during my corporate years, I&apos;d always had an unusual pull toward the
                                UFO phenomenon. I couldn&apos;t explain it and didn&apos;t talk about it at work,
                                but it was there: a quiet, persistent tug, like the Richard Dreyfuss character
                                in <em>Close Encounters</em>{" "}who can&apos;t stop sculpting a mountain he&apos;s
                                never seen. I&apos;m not the only one. Millions of people feel that inexplicable
                                draw toward a subject mainstream culture tells you to laugh off.
                            </p>
                            <p>
                                In 2025, I attended the PSI Games International event with Chris Bledsoe, a man
                                whose contact experiences have been investigated by NASA, the CIA, and multiple
                                intelligence agencies. During that event, I personally witnessed three
                                unidentified anomalous phenomena. Not lights, not airplanes, not helicopters.
                                These were objects that moved in ways no conventional aircraft can.
                            </p>
                            <p>
                                That experience deepened my understanding of consciousness and sent me on a
                                quest to understand &quot;Experiencers&quot;, people who have experienced
                                UFO/UAP phenomenon. I ingested tens of thousands of videos to find nearly 7000
                                first-person experiencer accounts. And here&apos;s what I started finding in
                                the data: people who report near-death experiences and people who report UAP
                                contact describe strikingly similar phenomena. Entity encounters. Telepathic
                                communication. Time distortion. Downloads of knowledge they can&apos;t explain.
                                Lasting changes to their worldview that never fade.
                            </p>
                            <p>
                                <strong>
                                    These two separate mysteries may be a window into a bigger one.
                                </strong>
                            </p>
                        </div>
                    </section>

                    {/* ── Live archive stats ── */}
                    <section className="pb-16 md:pb-20">
                        <h2 className={sectionHeading} style={fontSerif}>
                            The Archive, Right Now
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {liveStats.map((s) => (
                                <div key={s.label} className={`${card} !p-5 text-center`}>
                                    <p
                                        className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-violet-500 to-emerald-500 bg-clip-text text-transparent"
                                        style={fontSerif}
                                    >
                                        {s.value}
                                    </p>
                                    <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                                        {s.label}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{s.note}</p>
                                </div>
                            ))}
                        </div>
                        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 text-center">
                            Counts are pulled live from the research database and refresh hourly.
                        </p>
                    </section>

                    {/* ── For podcasters & journalists ── */}
                    <section className="pb-16 md:pb-20">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-11 h-11 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                <Mic className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100" style={fontSerif}>
                                For Podcasters &amp; Journalists
                            </h2>
                        </div>
                        <div className={storyProse}>
                            <p>
                                I&apos;m happy to educate and entertain your audience with the fascinating
                                facts, stories and implications of consciousness being fundamental to reality.
                            </p>
                            <p>I can tell my story or retell any number of the thousands we have.</p>
                            <p>
                                I can give your audience statistics and facts we already have or calculate new
                                ones specifically for you.
                            </p>
                        </div>

                        <div className={`${card} mt-8`}>
                            <p className="font-medium text-slate-800 dark:text-slate-100 mb-4 leading-relaxed">
                                What do you and your audience want to ask thousands of experiencers? For
                                example:
                            </p>
                            <ul className="space-y-2.5 text-slate-600 dark:text-slate-300 leading-relaxed list-disc pl-5">
                                <li>
                                    What percentage of NDErs and UFO/UAP experiencers come back with healing
                                    abilities?
                                </li>
                                <li>How many people see Jesus in NDEs vs UAP encounters?</li>
                                <li>How common is telepathy in NDEers?</li>
                                <li>
                                    What percentage of people experience After Death Communication (mediumship)
                                    abilities?
                                </li>
                                <li>WHAT QUESTION DO YOU HAVE?</li>
                            </ul>
                        </div>

                        <div className={`${storyProse} mt-8`}>
                            <p>
                                Every account in the archive is scored with published, transparent instruments,
                                which means your audience gets patterns from thousands of witnesses, not one
                                guest&apos;s anecdote.
                            </p>
                        </div>
                    </section>

                    {/* ── For researchers ── */}
                    <section className="pb-16 md:pb-20">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <FlaskConical className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100" style={fontSerif}>
                                For Researchers
                            </h2>
                        </div>
                        <div className={storyProse}>
                            <p>
                                Project Profound is research infrastructure. Every NDE account is scored on the
                                Greyson Scale, the NDE-C, our Transformation Index (NDE-TI), and a veridical
                                perception index (rvNDE). Every UAP encounter is analyzed across 22 research
                                dimensions with a six-factor credibility framework. The two corpora share
                                parallel instruments by design — so cross-phenomenon comparison is a query, not
                                a new study.
                            </p>
                            <p>
                                We publish our methodology, scales, and AI prompts. We don&apos;t ask you to
                                trust us; we give you the tools to verify. If your work needs a slice of this
                                data, a new calculation, or a collaboration, reach out — that&apos;s exactly what
                                this platform is for.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-6">
                            <Link
                                href="/research/methodology"
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.03] text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                            >
                                <FlaskConical className="w-4 h-4 text-violet-500" /> Methodology
                            </Link>
                            <Link
                                href="/research/cross-domain"
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.03] text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                            >
                                <Link2 className="w-4 h-4 text-violet-500" /> Cross-Domain Research
                            </Link>
                            <Link
                                href="/search3"
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.03] text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                            >
                                <Search className="w-4 h-4 text-violet-500" /> Search the Archive
                            </Link>
                        </div>
                    </section>

                    {/* ── Why I do this ── */}
                    <section className="pb-16 md:pb-20">
                        <h2 className={sectionHeading} style={fontSerif}>
                            Why I Walked Away from Everything Else
                        </h2>
                        <div className={storyProse}>
                            <p>
                                Since that night in 2020, I&apos;ve completely changed the direction of my life.
                                Every single day, I wake up and work on understanding who we are, and on
                                building tools that make this research accessible to everyone: academics,
                                experiencers, regular people.
                            </p>
                            <p>
                                The message emerging from these experiences, NDE and UAP alike, is remarkably
                                consistent:{" "}
                                <strong>
                                    we are more connected than we realize, consciousness is more than we&apos;ve
                                    been told, and there is far less to fear than we think.
                                </strong>{" "}
                                I believe we&apos;re at the beginning of a profound shift in how humanity
                                understands itself.
                            </p>
                            <p className="text-slate-800 dark:text-slate-100 font-medium">
                                — Tom Wood, Founder, Project Profound
                            </p>
                        </div>
                    </section>

                    {/* ── CTA ── */}
                    <section className="pb-20 md:pb-24">
                        <div className={`${card} text-center`}>
                            <div className="w-12 h-12 mx-auto rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-5">
                                <MessageCircle className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3" style={fontSerif}>
                                Book an interview, request a statistic, or just talk
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-6">
                                Podcast and media inquiries, research collaborations, and questions from
                                experiencers are all welcome. I read everything.
                            </p>
                            <div className="flex flex-wrap justify-center gap-3">
                                <Link
                                    href="/about#connect"
                                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                                >
                                    Get in touch <ArrowRight className="w-4 h-4" />
                                </Link>
                                <Link
                                    href="/about"
                                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.03] text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                                >
                                    <User className="w-4 h-4 text-violet-500" /> About the project
                                </Link>
                                <Link
                                    href="/channels"
                                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.03] text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                                >
                                    <Database className="w-4 h-4 text-violet-500" /> Explore the data
                                </Link>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}
