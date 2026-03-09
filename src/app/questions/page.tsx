import Link from "next/link";
import { ArrowLeft, Heart, Sparkles, Baby, AlertTriangle, Radio, Waves, Eye, Flame, User, Church, Star, HelpCircle } from "lucide-react";
import type { Metadata } from "next";
import { QuestionsSearchBar } from "@/components/questions-search-bar";

export const metadata: Metadata = {
    title: "Questions — What NDEs Tell Us | Project Profound",
    description:
        "Browse 70+ questions about near-death experiences organized by theme — from reuniting with loved ones, to what dying feels like, to why we're here. Each question searches thousands of real NDE accounts.",
};

// --- Slug helper ---
function toSlug(question: string): string {
    return question
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")   // strip punctuation
        .trim()
        .replace(/\s+/g, "-")            // spaces → hyphens
        .replace(/-{2,}/g, "-")          // collapse double-hyphens
        .slice(0, 100);                   // max length
}

// --- Reusable question card ---
function QuestionCard({
    question,
    index,
}: {
    question: string;
    index: number;
}) {
    const slug = toSlug(question);
    return (
        <Link
            href={`/questions/${slug}`}
            className="group flex items-start gap-3 bg-white rounded-xl border border-slate-200/60 shadow-sm p-4 hover:shadow-md hover:border-blue-200 transition-all duration-200"
        >
            <span className="text-xs font-mono text-slate-300 mt-0.5 shrink-0 w-5 text-right select-none">
                {index}
            </span>
            <p className="text-sm text-slate-700 leading-relaxed group-hover:text-slate-900 transition-colors flex-1">
                {question}
            </p>
            <span className="text-slate-300 group-hover:text-blue-400 transition-colors shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
            </span>
        </Link>
    );
}

// --- Section header ---
function SectionHeader({
    icon: Icon,
    iconBg,
    iconColor,
    title,
    subtitle,
    partLabel,
}: {
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    title: string;
    subtitle: string;
    partLabel?: string;
}) {
    return (
        <div className="flex items-start gap-3 mb-6">
            <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div>
                {partLabel && (
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">
                        {partLabel}
                    </p>
                )}
                <h2
                    className="text-xl font-bold text-slate-900"
                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                >
                    {title}
                </h2>
                <p className="text-sm text-slate-500">{subtitle}</p>
            </div>
        </div>
    );
}

// --- Part divider ---
function PartDivider({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
    return (
        <div className="flex items-center gap-4 py-2">
            <div className="shrink-0 w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center">
                <span className="text-white font-bold text-sm">{number}</span>
            </div>
            <div className="flex-1 border-t border-slate-200" />
            <div className="shrink-0 text-right">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{title}</p>
                <p className="text-xs text-slate-400 max-w-xs">{subtitle}</p>
            </div>
        </div>
    );
}

export default function QuestionsPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Hero */}
            <section
                className="relative overflow-hidden py-16 md:py-24"
                style={{
                    background:
                        "linear-gradient(135deg, #F0FDF4 0%, #F8FAFC 40%, #EFF6FF 100%)",
                }}
            >
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: "radial-gradient(circle, #059669 1px, transparent 1px)",
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
                        What&apos;s On Your{" "}
                        <span className="text-emerald-600" style={{ fontStyle: "italic" }}>
                            Heart?
                        </span>
                    </h1>
                    <p className="max-w-2xl mx-auto text-slate-600 text-lg leading-relaxed">
                        Your questions answered from 5,000+ NDE videos.
                    </p>
                    <QuestionsSearchBar />
                </div>
            </section>

            <div className="container mx-auto px-4 max-w-5xl py-12 space-y-16">

                {/* ═══════════ PART ONE ═══════════ */}
                <PartDivider
                    number="I"
                    title="The People and Beings We Love and Miss"
                    subtitle="For anyone grieving, longing for reunion, or desperate to know that someone they love is safe"
                />

                {/* Section 1: Seeing Our Loved Ones Again */}
                <section>
                    <SectionHeader
                        icon={Heart}
                        iconBg="bg-rose-50"
                        iconColor="text-rose-600"
                        title="Seeing Our Loved Ones Again"
                        subtitle="Reunion, recognition, and the bonds that outlast death"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                            "Are our loved ones really there to greet us when we die?",
                            "Will I recognize the people I've lost, and will they look the way I remember?",
                            "Do the people who've crossed over know what's happening in my life right now?",
                            "I never got to say goodbye — does my loved one know what they meant to me?",
                            "Is the love between us still personal and deep, or does it become something universal and impersonal?",
                            "If my spouse remarries after I die, who are they with on the other side?",
                            "Can deceased loved ones come to escort us when it's our time to cross over?",
                            "What if someone who hurt or abused me in life is waiting on the other side?",
                            "What if my loved one has already reincarnated by the time I die — will I ever see them again?",
                        ].map((q, i) => (
                            <QuestionCard key={i} question={q} index={i + 1} />
                        ))}
                    </div>
                </section>

                {/* Section 2: Pets */}
                <section>
                    <SectionHeader
                        icon={Sparkles}
                        iconBg="bg-amber-50"
                        iconColor="text-amber-600"
                        title="Pets on the Other Side"
                        subtitle="The companions we've lost and hope to find again"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                            "Do pets have souls, and will mine really be waiting for me when I die?",
                            "Will my pet be young, healthy, and free from the suffering of their final days?",
                            "Did my pet understand why I had to let them go?",
                            "Will all the different pets I've loved throughout my life be there?",
                            "Who is looking after my pet right now while they wait for me?",
                            "Have NDE experiencers ever encountered animals during their experience?",
                        ].map((q, i) => (
                            <QuestionCard key={i} question={q} index={i + 1} />
                        ))}
                    </div>
                </section>

                {/* Section 3: Children, Babies & Pregnancy Loss */}
                <section>
                    <SectionHeader
                        icon={Baby}
                        iconBg="bg-sky-50"
                        iconColor="text-sky-600"
                        title="Children, Babies & Pregnancy Loss"
                        subtitle="Where innocent souls go, and whether we will ever hold them again"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                            "Where does the soul of a miscarried or stillborn baby go?",
                            "Will my child be waiting as the baby I lost, or will they have grown up on the other side?",
                            "Will I get the chance to raise and be close to the child I never got to raise here?",
                            "Is my child frightened or alone in the afterlife, or are they safe and loved?",
                            "Do deceased relatives look after children who cross over before their parents arrive?",
                            "Why would a loving God allow a child to suffer and die?",
                        ].map((q, i) => (
                            <QuestionCard key={i} question={q} index={i + 1} />
                        ))}
                    </div>
                </section>

                {/* Section 4: Suicide & Tragic Death */}
                <section>
                    <SectionHeader
                        icon={AlertTriangle}
                        iconBg="bg-orange-50"
                        iconColor="text-orange-600"
                        title="Suicide & Tragic Death"
                        subtitle="Compassion, consequences, and what awaits those who died in crisis"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                            "What happens to someone who dies by suicide — are they punished, or met with compassion?",
                            "Does someone who takes their own life regret it when they cross over?",
                            "Is suicide an unforgivable act, or does God understand that depth of desperation?",
                            "If someone was murdered or died violently, is their soul protected before the worst of it?",
                            "Do people who die suddenly — in accidents or without warning — get extra help crossing over?",
                            "Can a soul get stuck after a violent death without realizing they've died?",
                            "If someone dies from addiction or overdose, do they find clarity on the other side?",
                            "Can someone who died in terrible suffering still find complete peace and healing?",
                        ].map((q, i) => (
                            <QuestionCard key={i} question={q} index={i + 1} />
                        ))}
                    </div>
                </section>

                {/* Section 5: Signs, Dreams & Messages */}
                <section>
                    <SectionHeader
                        icon={Radio}
                        iconBg="bg-teal-50"
                        iconColor="text-teal-600"
                        title="Signs, Dreams & Messages"
                        subtitle="Communication across the veil — what's real and how to recognize it"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                            "When lights flicker, coins appear, or I see my loved one's favorite bird — is that really them contacting me?",
                            "Why hasn't my deceased loved one visited me in a dream — are they unable to, or upset with me?",
                            "Can the people who've crossed over actually hear me when I talk to them out loud?",
                            "Does my constant grief disturb the peace of the people I've lost — should I try to let go?",
                            "Are mediums really communicating with deceased loved ones, or just reading our emotions?",
                            "How do I tell the difference between a genuine sign from a loved one and just a coincidence?",
                            "If I start to heal and feel happy again, will my deceased loved one think I've moved on and forgotten them?",
                        ].map((q, i) => (
                            <QuestionCard key={i} question={q} index={i + 1} />
                        ))}
                    </div>
                </section>

                {/* ═══════════ PART TWO ═══════════ */}
                <PartDivider
                    number="II"
                    title="Dying, Judgment & What We Face"
                    subtitle="For anyone afraid of dying, terrified of judgment, or haunted by guilt and shame"
                />

                {/* Section 6: What Dying Actually Feels Like */}
                <section>
                    <SectionHeader
                        icon={Waves}
                        iconBg="bg-blue-50"
                        iconColor="text-blue-600"
                        title="What Dying Actually Feels Like"
                        subtitle="The crossing itself — fear, peace, and the first moments after"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                            "Is dying painful, or do people feel peace at the end?",
                            "Will I panic and feel terror as I die, or does calm come over you?",
                            "What does it feel like in the first moments after leaving the body?",
                            "If I die suddenly — in a crash or in my sleep — will I understand what happened?",
                            "Will someone be there to meet me, or could I die completely alone?",
                            "What if I'm aware but unable to move or speak as my body shuts down?",
                            "Do people who have NDEs actually lose their fear of death afterward?",
                        ].map((q, i) => (
                            <QuestionCard key={i} question={q} index={i + 1} />
                        ))}
                    </div>
                </section>

                {/* Section 7: The Life Review */}
                <section>
                    <SectionHeader
                        icon={Eye}
                        iconBg="bg-violet-50"
                        iconColor="text-violet-600"
                        title="The Life Review"
                        subtitle="Facing everything you've ever done — judgment, shame, and mercy"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                            "Will I have to relive everything I've ever done — especially the things I'm most ashamed of?",
                            "Do you feel the pain you caused others, exactly as they experienced it?",
                            "Is the life review meant to punish, or to help a soul understand and heal?",
                            "Does God judge me during the life review, or am I the one doing the judging?",
                            "What if I'm so ashamed of what I see that I can't forgive myself?",
                            "Do small, forgotten acts of kindness show up during the life review and matter?",
                            "If I've already made amends for my worst mistakes, does that change how the life review feels?",
                        ].map((q, i) => (
                            <QuestionCard key={i} question={q} index={i + 1} />
                        ))}
                    </div>
                </section>

                {/* Section 8: Hell & Judgment */}
                <section>
                    <SectionHeader
                        icon={Flame}
                        iconBg="bg-red-50"
                        iconColor="text-red-600"
                        title="Hell & Judgment"
                        subtitle="Dark NDEs, consequences for wrongdoing, and whether mercy has limits"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                            "Is hell a real place, or is it a story religion invented to control people through fear?",
                            "What happens to genuinely evil people — murderers, abusers — do they face real consequences?",
                            "I've done things I'm deeply ashamed of — does that mean I'm going to hell?",
                            "Some people describe dark and terrifying NDEs — what causes those, and could that happen to anyone?",
                            "If someone dies while deeply depressed or afraid, could their mental state pull them into a dark experience?",
                            "Is there always a way out if someone ends up in a frightening or hellish NDE?",
                        ].map((q, i) => (
                            <QuestionCard key={i} question={q} index={i + 1} />
                        ))}
                    </div>
                </section>

                {/* ═══════════ PART THREE ═══════════ */}
                <PartDivider
                    number="III"
                    title="Who We Are and What It All Means"
                    subtitle="For anyone questioning identity, belief, or the deeper purpose of existence"
                />

                {/* Section 9: Will I Still Be Me? */}
                <section>
                    <SectionHeader
                        icon={User}
                        iconBg="bg-indigo-50"
                        iconColor="text-indigo-600"
                        title="Will I Still Be Me?"
                        subtitle="Identity, memory, and the continuity of who we are"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                            "Will I still feel like \"me\" — with my personality, my sense of humor, my memories?",
                            "If my loved one had dementia or brain damage when they died, is their mind fully restored?",
                            "Does my identity dissolve into a cosmic \"oneness\" where I disappear — or do I stay myself?",
                            "Do people keep their sense of gender, their appearance, and the things that made them who they are?",
                            "If I've lived past lives, which version of \"me\" am I in the afterlife?",
                            "Is consciousness actually separate from the brain — can it survive after the brain has stopped?",
                        ].map((q, i) => (
                            <QuestionCard key={i} question={q} index={i + 1} />
                        ))}
                    </div>
                </section>

                {/* Section 10: God, Religion & Belief */}
                <section>
                    <SectionHeader
                        icon={Church}
                        iconBg="bg-yellow-50"
                        iconColor="text-yellow-600"
                        title="God, Religion & Belief"
                        subtitle="What NDEs reveal about faith, dogma, and the question of God"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                            "Do atheists and nonreligious people have beautiful, loving NDEs too?",
                            "Why do people from different religions encounter different beings — Jesus, Hindu gods, ancestors?",
                            "If I followed the wrong religion my whole life, will I be turned away?",
                            "Does God care more about what I believed, or how I actually treated people?",
                            "If God is real and loving, why is there so much horrific suffering in the world?",
                            "I left the faith I was raised in — will I face consequences for that when I die?",
                        ].map((q, i) => (
                            <QuestionCard key={i} question={q} index={i + 1} />
                        ))}
                    </div>
                </section>

                {/* Section 11: What the Afterlife Is Like */}
                <section>
                    <SectionHeader
                        icon={Star}
                        iconBg="bg-purple-50"
                        iconColor="text-purple-600"
                        title="What the Afterlife Is Like"
                        subtitle="Time, sensation, beauty, and the nature of existence beyond death"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                            "What does the afterlife actually look like, according to people who've been there?",
                            "Can you still enjoy pleasures there — music, laughter, a sense of touch?",
                            "Does eternity get boring, or is there always something meaningful to experience?",
                            "How does time work — will it feel like my loved ones arrive moments after me, even if decades pass on Earth?",
                            "Can you explore other worlds or dimensions from the other side?",
                            "Are the colors and sensations really beyond anything we can perceive as humans?",
                            "Will I finally be able to rest? I am so tired from this life.",
                        ].map((q, i) => (
                            <QuestionCard key={i} question={q} index={i + 1} />
                        ))}
                    </div>
                </section>

                {/* Section 12: Why We're Here */}
                <section>
                    <SectionHeader
                        icon={HelpCircle}
                        iconBg="bg-emerald-50"
                        iconColor="text-emerald-600"
                        title="Why We're Here"
                        subtitle="The purpose of life, the choice to be born, and the view from the other side"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                            "If the afterlife is so beautiful and full of love, why do we come to Earth at all?",
                            "Did I choose this life — including the suffering — before I was born?",
                            "What is the actual purpose of my life from a soul's perspective?",
                            "When I die, will I finally understand why everything happened the way it did?",
                            "Do people come back from NDEs struggling and depressed because they miss the peace of the other side?",
                            "If souls choose their lives for growth, why would anyone choose abuse, illness, or tragedy?",
                        ].map((q, i) => (
                            <QuestionCard key={i} question={q} index={i + 1} />
                        ))}
                    </div>
                </section>

                {/* Footer callout */}
                <section className="bg-slate-50 rounded-2xl p-8 border border-slate-200/60 text-center">
                    <p
                        className="text-lg font-bold text-slate-900 mb-2"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                        How these searches work
                    </p>
                    <p className="text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
                        Each question uses semantic search to find the most relevant moments from thousands of
                        first-person NDE accounts — matching meaning and emotion, not just keywords. Click any
                        question to explore what experiencers actually reported.
                    </p>
                    <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/search3"
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
                        >
                            Open Free Search
                        </Link>
                        <Link
                            href="/resources"
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            NDE Research Resources
                        </Link>
                    </div>
                </section>

                {/* Back to home */}
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
