import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, BookOpen, Video, List } from "lucide-react";
import type { Metadata } from "next";
import { SearchResultCardV4 } from "@/components/search-result-card-v4";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ─── Types ───────────────────────────────────────────────────────────────────

interface QuestionAnswer {
    slug: string;
    question: string;
    shortAnswer: string; // NEW — one-sentence direct answer
    answer: {
        paragraphs: string[];
        citedVideoIds: string[];
    };
    referencedVideos: ReferencedVideo[];
    moreVideos: MoreVideo[];
}

interface ReferencedVideo {
    video_id: string;
    url: string;
    title: string;
    thumbnailUrl: string;
    date: string | null;
    viewCount: string;
    channelName: string;
    summary: string;
    transcripts: Array<{ content: string; start_time: number }>;
}

interface MoreVideo {
    video_id: string;
    title: string;
    channelName: string;
    thumbnailUrl: string;
    viewCount: number;
    date: string | null;
    experienceType: string;
    tone: string;
    greysonScore: number | null;
    relevance: number;
}

// ─── Dummy Data ───────────────────────────────────────────────────────────────

const DUMMY_ANSWERS: Record<string, QuestionAnswer> = {
    "are-our-loved-ones-really-there-to-greet-us-when-we-die": {
        slug: "are-our-loved-ones-really-there-to-greet-us-when-we-die",
        question: "Are our loved ones really there to greet us when we die?",
        shortAnswer:
            "Yes. In many NDEs, loved ones were not only there to greet those who died — they radiated a love unlike anything experienced on Earth.",
        answer: {
            paragraphs: [
                "Across thousands of near-death experience accounts in our archive, one of the most consistently reported and emotionally moving elements is the encounter with deceased loved ones at the threshold of death. Experiencers frequently describe being met by parents, siblings, spouses, and cherished friends — often appearing younger, radiant, and free from any suffering they experienced in life. In the account shared by Bill Letson, a firefighter who came close to death from a severe illness, he described being greeted by his mother who had passed years earlier, her face full of warmth and recognition. Mary Neal, who drowned in a kayaking accident in Chile, similarly recounted a crowd of joyful beings who felt intimately familiar, later identifying them as relatives she had never met in life yet recognized with complete certainty.",
                "What strikes researchers and listeners alike is the specificity and consistency of these encounters. Unlike vague sensations of \"presence,\" NDE accounts typically describe concrete conversations, shared memories, and gestures of reassurance. Anita Moorjani, whose experience during end-stage lymphoma became widely known, described her father communicating to her that it was not yet her time — a message that came with unmistakable personal warmth, not as an impersonal directive. In account after account, the loved ones described do not appear confused or lost; they seem purposeful, at peace, and fully present to welcome the experiencer home. This pattern holds across cultures, ages, and backgrounds with a remarkable consistency that researchers like Dr. Bruce Greyson have noted is difficult to explain through purely psychological models.",
                "Perhaps the most tender thread running through these accounts is the assurance they offer to the grieving: that the separation felt on this side is not mirrored on the other. Loved ones are often described as aware of those still living — watching, caring, and sometimes even communicating comfort in moments of crisis. Whether or not one holds a particular religious belief, these accounts invite a profound reconsidering of what death means and what might wait on the other side of it. For those carrying the weight of grief, the testimony gathered here offers not a guarantee, but a deeply human chorus of voices saying: you will not arrive alone.",
            ],
            citedVideoIds: ["letson_nde", "neal_nde", "moorjani_nde"],
        },
        referencedVideos: [
            {
                video_id: "dQw4w9WgXcQ",
                url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                title: "Man Dies & Learns We Have It Completely Backwards! (Powerful NDE)",
                thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
                date: "2023-04-13",
                viewCount: "12819034",
                channelName: "Shaman Oaks",
                summary:
                    "Bill Letson was a firefighter and engineer in Santa Barbara in 1994. He caught a severe flu from a patient he treated. He became dehydrated and was hospitalized. A nurse gave him pain and nausea medications which caused him to collapse into unconsciousness. He found himself floating above his body in the hospital room, could see and hear the medical staff trying to revive him. He then passed through the hospital walls and was surrounded by an overwhelming sense of peace and love.",
                transcripts: [
                    {
                        content:
                            "And then I saw my mother. She died when I was twelve, and there she was — young, so young, smiling. And she said, 'It's not your time, Billy. Go back. We'll be here.'",
                        start_time: 553,
                    },
                    {
                        content:
                            "There was this enormous crowd of — I can only call them beings of light. They were so happy to see me. Some of them I recognized as family who had passed. There was this sense that the whole universe had been waiting just to welcome me.",
                        start_time: 722,
                    },
                ],
            },
            {
                video_id: "oHg5SJYRHA0",
                url: "https://www.youtube.com/watch?v=oHg5SJYRHA0",
                title: "She Drowned & Met Beings of Pure Joy at the Gates of Heaven (Mary Neal NDE)",
                thumbnailUrl: "https://i.ytimg.com/vi/oHg5SJYRHA0/hqdefault.jpg",
                date: "2022-11-07",
                viewCount: "5640211",
                channelName: "NDE Compilations",
                summary:
                    "Dr. Mary Neal, an orthopaedic spine surgeon, drowned while kayaking on a river in Chile. She describes leaving her body and being escorted by loving spiritual beings who felt deeply familiar to her. She was given a choice of whether to return, and was told her son would die young and needed her presence on earth. Years later, her son Willie died in a car accident at age 19, fulfilling what she had been told.",
                transcripts: [
                    {
                        content:
                            "They were so joyful — joyful in a way that I had never experienced joy. And they were familiar to me, I knew them intimately, even the ones I had never met in my earthly life. My grandparents were there. My uncle who had died before I was born. They were there to escort me.",
                        start_time: 441,
                    },
                    {
                        content:
                            "The love I felt from these beings was not vague or general. It was personal and specific. They knew every part of me — even the parts I had kept hidden. And they loved me anyway. There was no judgment, only absolute welcome.",
                        start_time: 618,
                    },
                ],
            },
            {
                video_id: "3tmd-ClpJxA",
                url: "https://www.youtube.com/watch?v=3tmd-ClpJxA",
                title: "Stage 4 Cancer patient dies, enters the light: 'I was love. I was everything.' (Anita Moorjani NDE)",
                thumbnailUrl: "https://i.ytimg.com/vi/3tmd-ClpJxA/hqdefault.jpg",
                date: "2021-06-02",
                viewCount: "8322100",
                channelName: "Touching The Afterlife",
                summary:
                    "Anita Moorjani slipped into a coma on February 2, 2006, with end-stage Hodgkin's lymphoma. Tumors the size of lemons had grown throughout her lymphatic system. During the coma she experienced an expanded state of consciousness where she was reunited with her father and her best friend Soni, both deceased. She describes having access to all knowledge and understanding the cause of her illness was rooted in fear. She recovered rapidly after returning, and her recovery was considered medically remarkable.",
                transcripts: [
                    {
                        content:
                            "My father was there. And he communicated to me — not in words, but in a knowing — that it wasn't my time. That I had come too far and was turning back too soon. He was so clear, so present. More present than he had ever been in my physical life.",
                        start_time: 334,
                    },
                    {
                        content:
                            "And Soni was there too — my dearest friend who had died of cancer two years before me. And she was well. She was whole. And she said to me: go back, Anita. Go back and live your life fearlessly. That's all you need to do.",
                        start_time: 512,
                    },
                ],
            },
        ],
        moreVideos: [
            {
                video_id: "L_jWHffIx5E",
                title: "Man Dies, Sees His Parents on the Other Side — and Why He Had to Come Back",
                channelName: "Round Trip Death",
                thumbnailUrl: "https://i.ytimg.com/vi/L_jWHffIx5E/hqdefault.jpg",
                viewCount: 4130000,
                date: "2023-01-15",
                experienceType: "NDE",
                tone: "Very Positive",
                greysonScore: 28,
                relevance: 94,
            },
            {
                video_id: "9bZkp7q19f0",
                title: "She Died During Surgery & Was Greeted by Every Pet She'd Ever Lost",
                channelName: "Pegi Robinson – NDE TV",
                thumbnailUrl: "https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg",
                viewCount: 2880000,
                date: "2022-08-22",
                experienceType: "NDE",
                tone: "Very Positive",
                greysonScore: 24,
                relevance: 91,
            },
            {
                video_id: "e-7Nq5AePN8",
                title: "Atheist Cardiologist Dies, Meets His Skeptical Father Beyond Death",
                channelName: "IANDS",
                thumbnailUrl: "https://i.ytimg.com/vi/e-7Nq5AePN8/hqdefault.jpg",
                viewCount: 3670000,
                date: "2022-03-11",
                experienceType: "NDE",
                tone: "Positive",
                greysonScore: 30,
                relevance: 89,
            },
            {
                video_id: "ZZ5LpwO-An4",
                title: "Woman Dies Twice — Each Time Met by the Same Grandmother She Never Knew",
                channelName: "Tales Of Resilience",
                thumbnailUrl: "https://i.ytimg.com/vi/ZZ5LpwO-An4/hqdefault.jpg",
                viewCount: 1940000,
                date: "2023-05-01",
                experienceType: "NDE",
                tone: "Very Positive",
                greysonScore: 22,
                relevance: 87,
            },
            {
                video_id: "XGK84Poeynk",
                title: "Hospice Nurse Witnesses 30 Years of Patients Meeting Deceased Relatives at the Moment of Death",
                channelName: "Love Covered Life Podcast",
                thumbnailUrl: "https://i.ytimg.com/vi/XGK84Poeynk/hqdefault.jpg",
                viewCount: 890000,
                date: "2023-09-14",
                experienceType: "Other",
                tone: "Positive",
                greysonScore: null,
                relevance: 85,
            },
            {
                video_id: "8UVNT4wvIGY",
                title: "He Was Dead for 45 Minutes — His Wife, Who Didn't Know He Died, Saw Him Standing at Her Bedside",
                channelName: "NDE Radio with Lee Witting",
                thumbnailUrl: "https://i.ytimg.com/vi/8UVNT4wvIGY/hqdefault.jpg",
                viewCount: 2100000,
                date: "2021-12-03",
                experienceType: "NDE",
                tone: "Positive",
                greysonScore: 26,
                relevance: 82,
            },
            {
                video_id: "yPwlS2QGbXo",
                title: "Suicide NDE: He Died, Met His Brother Who Begged Him To Return",
                channelName: "The Other Side NDE",
                thumbnailUrl: "https://i.ytimg.com/vi/yPwlS2QGbXo/hqdefault.jpg",
                viewCount: 3440000,
                date: "2022-06-19",
                experienceType: "NDE",
                tone: "Mixed",
                greysonScore: 20,
                relevance: 80,
            },
            {
                video_id: "T-7kz0Y1LYg",
                title: "Border Patrol Agent Dies: His Late Dad's Final Message Changed Everything",
                channelName: "T&H - Afterlife",
                thumbnailUrl: "https://i.ytimg.com/vi/T-7kz0Y1LYg/hqdefault.jpg",
                viewCount: 1670000,
                date: "2023-02-28",
                experienceType: "NDE",
                tone: "Very Positive",
                greysonScore: 18,
                relevance: 78,
            },
        ],
    },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatViewCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n.toString();
}

function formatDate(dateString: string | null): string {
    if (!dateString) return "—";
    try {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch {
        return "—";
    }
}

// ─── Metadata ────────────────────────────────────────────────────────────────

type QuestionResult = QuestionAnswer | { no_results: true; question: string; slug: string } | null;

async function fetchQuestionData(slug: string): Promise<QuestionResult> {
    // Check dummy data first (instant, no network)
    if (DUMMY_ANSWERS[slug]) return DUMMY_ANSWERS[slug];

    // Fall back to live API
    try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
            ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
        const res = await fetch(`${baseUrl}/api/questions/${encodeURIComponent(slug)}`, {
            cache: 'no-store', // API is force-dynamic; do not cache the no_results state across threshold changes
        });
        if (!res.ok) return null;
        const json = await res.json();
        // API returns { no_results: true } when similarity < 50%
        if (json.no_results) return json as { no_results: true; question: string; slug: string };
        return json as QuestionAnswer;
    } catch (err) {
        console.error('[QuestionsPage] fetch error:', err);
        return null;
    }
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const data = await fetchQuestionData(slug);
    const question = data?.question ?? slug.split('-').join(' ');
    return {
        title: `${question} | Project Profound`,
        description: `What do near-death experiences tell us about: ${question} — answered from 5,000+ real NDE accounts.`,
    };
}

// ─── Page ────────────────────────────────────────────────────────────────────

function NoResultsPage({ question }: { question: string }) {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="border-b border-border/60 bg-muted/30">
                <div className="container mx-auto px-4 max-w-5xl py-3">
                    <Link
                        href="/questions"
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        All Questions
                    </Link>
                </div>
            </div>
            <div className="container mx-auto px-4 max-w-2xl py-24 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
                    <BookOpen className="w-8 h-8 text-slate-400" />
                </div>
                <h1
                    className="text-2xl font-bold text-slate-900 mb-3"
                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                >
                    Not enough NDE evidence found
                </h1>
                <p className="text-slate-600 text-base leading-relaxed mb-2">
                    We searched 5,000+ near-death experience accounts for:
                </p>
                <p className="text-slate-800 font-medium italic mb-8 text-lg">&#8220;{question}&#8221;</p>
                <p className="text-slate-500 text-sm leading-relaxed mb-8">
                    Our database doesn&apos;t have enough relevant testimony to give you a reliable answer
                    to this specific question. NDEs are a rich but finite dataset.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/questions"
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
                    >
                        Browse curated questions
                    </Link>
                    <Link
                        href="/search3"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        Search NDE accounts directly
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default async function QuestionResultPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const data = await fetchQuestionData(slug);

    if (!data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-muted-foreground text-lg">Question not found.</p>
                <Link href="/questions" className="text-primary hover:underline text-sm">
                    ← Browse all questions
                </Link>
            </div>
        );
    }

    // No-results state — insufficient NDE evidence
    if ('no_results' in data) {
        return <NoResultsPage question={data.question} />;
    }

    return (
        <div className="min-h-screen bg-background text-foreground">

            {/* ── Breadcrumb ───────────────────────────────────────────── */}
            <div className="border-b border-border/60 bg-muted/30">
                <div className="container mx-auto px-4 max-w-5xl py-3">
                    <Link
                        href="/questions"
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        All Questions
                    </Link>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                ABOVE THE FOLD HERO
                1. Title
                2. Short Answer
                3. Small Thumbnail Strip
                ═══════════════════════════════════════════════════════ */}
            <section
                className="relative overflow-hidden pt-12 pb-10"
                style={{
                    background: "linear-gradient(135deg, #F0FDF4 0%, #F8FAFC 40%, #EFF6FF 100%)",
                }}
            >
                {/* subtle dot grid */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: "radial-gradient(circle, #059669 1px, transparent 1px)",
                        backgroundSize: "32px 32px",
                    }}
                />

                <div className="relative container mx-auto px-4 max-w-3xl">

                    {/* 1. Title */}
                    <h1
                        className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-[1.2] mb-6"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                        {data.question}
                    </h1>

                    {/* 2. Short Answer — direct, confident pull-quote */}
                    <p
                        className="text-lg sm:text-xl font-medium text-emerald-800 leading-relaxed mb-8"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                        {data.shortAnswer}
                    </p>

                    {/* 3. Small Thumbnail Strip — click to scroll to detail cards */}
                    <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
                        {data.referencedVideos.map((video, i) => (
                            <a
                                key={video.video_id}
                                href={`#ref-video-${video.video_id}`}
                                className="group flex-1 min-w-[120px] max-w-[180px]"
                                title={video.title}
                            >
                                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted shadow-sm ring-1 ring-black/5 group-hover:ring-2 group-hover:ring-emerald-500/50 transition-all">
                                    <Image
                                        src={video.thumbnailUrl}
                                        alt={video.title}
                                        fill
                                        sizes="(max-width: 640px) 33vw, 180px"
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    {/* dark scrim + play icon on hover */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                        <div className="w-8 h-8 rounded-full bg-white/0 group-hover:bg-white/90 flex items-center justify-center transition-all scale-75 group-hover:scale-100">
                                            <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-800 fill-current ml-0.5">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </div>
                                    </div>
                                    {/* citation number badge */}
                                    <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shadow">
                                        {i + 1}
                                    </div>
                                </div>
                                <p className="mt-1.5 text-[11px] text-slate-600 line-clamp-2 leading-[1.3]">
                                    {video.channelName}
                                </p>
                            </a>
                        ))}

                        {/* "↓ More videos" nudge — shown when there are >3 refs future-proof */}
                        <div className="hidden sm:flex flex-col justify-start pt-1">
                            <a
                                href="#more-videos"
                                className="text-xs text-slate-400 hover:text-emerald-700 transition-colors inline-flex flex-col items-center gap-1 mt-2"
                            >
                                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                                    <path d="M7 10l5 5 5-5z" />
                                </svg>
                                <span className="whitespace-nowrap">{data.moreVideos.length} more</span>
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════
                LONG ANSWER — below the fold
                ═══════════════════════════════════════════════════════ */}
            <section
                className="relative overflow-hidden py-12"
                style={{
                    background: "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)",
                }}
            >
                <div className="relative container mx-auto px-4 max-w-3xl space-y-6">

                    {/* Section label */}
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-5 rounded-full bg-emerald-500" />
                        <span className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
                            A Deeper Look
                        </span>
                    </div>

                    {data.answer.paragraphs.map((para, i) => (
                        <p
                            key={i}
                            className="text-slate-700 leading-[1.85] text-[1.05rem]"
                        >
                            {para}
                        </p>
                    ))}

                    {/* AI disclaimer */}
                    <div className="mt-8 flex items-start gap-2.5 bg-white/80 border border-slate-100 rounded-xl p-4 text-sm text-slate-400 shadow-sm">
                        <span className="shrink-0 mt-0.5 text-slate-300">✦</span>
                        <p className="leading-relaxed">
                            This synthesis was generated from real NDE accounts in our archive. It is
                            not medical or spiritual advice. Accounts are first-person testimonies —
                            reported experiences, not verified facts.
                        </p>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════
                BOTTOM SECTIONS — full width content
                ═══════════════════════════════════════════════════════ */}
            <div className="container mx-auto px-4 max-w-5xl py-12 space-y-16">

                {/* ════════ SECTION: Videos Referenced ════════ */}
                <section>
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                            <Video className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <h2
                                className="text-2xl font-bold text-slate-900"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                Videos Referenced
                            </h2>
                            <p className="text-sm text-slate-500">
                                The accounts cited above, with the relevant quotes
                            </p>
                        </div>
                    </div>

                    <div className="space-y-5">
                        {data.referencedVideos.map((video) => (
                            // Anchor target so thumbnail strip links scroll here
                            <div key={video.video_id} id={`ref-video-${video.video_id}`}>
                                <SearchResultCardV4
                                    video={video}
                                    user={null}
                                />
                            </div>
                        ))}
                    </div>
                </section>

                {/* ════════ SECTION: More Relevant Videos ════════ */}
                <section id="more-videos">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                            <List className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2
                                className="text-2xl font-bold text-slate-900"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                More Relevant Videos
                            </h2>
                            <p className="text-sm text-slate-500">
                                Additional accounts from the archive related to this question
                            </p>
                        </div>
                    </div>

                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border/60 bg-muted/40">
                                        <th className="text-left font-medium text-muted-foreground px-4 py-3 w-16 hidden sm:table-cell">
                                            Video
                                        </th>
                                        <th className="text-left font-medium text-muted-foreground px-4 py-3">
                                            Title
                                        </th>
                                        <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">
                                            Channel
                                        </th>
                                        <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">
                                            Type
                                        </th>
                                        <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">
                                            Tone
                                        </th>
                                        <th className="text-right font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">
                                            Greyson
                                        </th>
                                        <th className="text-right font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">
                                            Views
                                        </th>
                                        <th className="text-right font-medium text-muted-foreground px-4 py-3">
                                            Relevance
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.moreVideos.map((video, i) => (
                                        <tr
                                            key={video.video_id}
                                            className={`border-b border-border/40 hover:bg-muted/30 transition-colors ${
                                                i % 2 === 0 ? "" : "bg-muted/10"
                                            }`}
                                        >
                                            {/* Thumbnail */}
                                            <td className="px-4 py-3 hidden sm:table-cell">
                                                <Link href={`/video/${video.video_id}`}>
                                                    <div className="relative w-14 aspect-video rounded overflow-hidden bg-muted shrink-0">
                                                        <Image
                                                            src={video.thumbnailUrl}
                                                            alt={video.title}
                                                            fill
                                                            sizes="56px"
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                </Link>
                                            </td>

                                            {/* Title */}
                                            <td className="px-4 py-3 max-w-xs">
                                                <Link
                                                    href={`/video/${video.video_id}`}
                                                    className="font-medium text-foreground hover:text-primary transition-colors line-clamp-2 leading-snug"
                                                >
                                                    {video.title}
                                                </Link>
                                                <p className="text-xs text-muted-foreground mt-0.5 md:hidden">
                                                    {video.channelName}
                                                    {video.date && ` · ${formatDate(video.date)}`}
                                                </p>
                                            </td>

                                            {/* Channel */}
                                            <td className="px-4 py-3 text-muted-foreground hidden md:table-cell whitespace-nowrap">
                                                {video.channelName}
                                            </td>

                                            {/* Type */}
                                            <td className="px-4 py-3 hidden lg:table-cell">
                                                <Badge variant="outline" className="text-[10px] font-medium">
                                                    {video.experienceType}
                                                </Badge>
                                            </td>

                                            {/* Tone */}
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                <TonePill tone={video.tone} />
                                            </td>

                                            {/* Greyson score */}
                                            <td className="px-4 py-3 text-right hidden lg:table-cell">
                                                {video.greysonScore != null ? (
                                                    <span className="font-mono text-xs text-muted-foreground">
                                                        {video.greysonScore}
                                                        <span className="text-muted-foreground/50">/32</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground/40 text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Views */}
                                            <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                                                {typeof video.viewCount === 'number'
                                                    ? formatViewCount(video.viewCount)
                                                    : (video.viewCount ?? '—')}
                                            </td>

                                            {/* Relevance bar — API returns 0-1 float, dummy uses 0-100 */}
                                            <td className="px-4 py-3 text-right">
                                                {(() => {
                                                    const pct = video.relevance <= 1
                                                        ? Math.round(video.relevance * 100)
                                                        : Math.round(video.relevance);
                                                    return (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="hidden sm:flex w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full bg-emerald-500"
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                                                                {pct}%
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Link to full search */}
                    <div className="mt-6 text-center">
                        <Link
                            href={`/search3?q=${encodeURIComponent(data.question)}&type=semantic`}
                            className="text-sm text-primary hover:underline inline-flex items-center gap-1.5"
                        >
                            <BookOpen className="w-3.5 h-3.5" />
                            Search all matching accounts in the archive
                        </Link>
                    </div>
                </section>

            </div>
        </div>
    );
}

// ─── Tone pill helper ─────────────────────────────────────────────────────────

function TonePill({ tone }: { tone: string }) {
    const map: Record<string, string> = {
        "Very Positive": "bg-emerald-50 text-emerald-700 border-emerald-200",
        "Positive": "bg-green-50 text-green-700 border-green-200",
        "Mixed": "bg-yellow-50 text-yellow-700 border-yellow-200",
        "Negative": "bg-orange-50 text-orange-700 border-orange-200",
        "Very Negative": "bg-red-50 text-red-700 border-red-200",
    };
    const cls = map[tone] ?? "bg-muted text-muted-foreground border-border";
    return (
        <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded border ${cls}`}>
            {tone}
        </span>
    );
}
