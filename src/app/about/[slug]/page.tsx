import Link from "next/link";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { ArrowRight, BookOpen, User } from "lucide-react";
import { notFound } from "next/navigation";

// Static pages — no DB needed for the author data itself.
export const dynamic = "force-static";

// Why: This page is force-static, so cookies() is unavailable.
// Use a direct anon client (blog_posts has public SELECT RLS).
function buildClient() {
    return createAnonClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
}

type AuthorData = {
    name: string;
    title: string;
    bio: string;
    longBio: string;
};

const AUTHORS: Record<string, AuthorData> = {
    "tom-wood": {
        name: "Tom Wood",
        title: "Co-Founder, Project Profound",
        bio: "Tom Wood is a co-founder of Project Profound and leads the platform's technology and research strategy.",
        longBio: `Tom Wood is a co-founder of Project Profound, the world's largest analyzed database of near-death experience accounts. He leads the platform's technology and AI research strategy, overseeing the systems that analyze, classify, and surface patterns across 5,000+ first-person NDE accounts.\n\nHis work sits at the intersection of artificial intelligence, phenomenology, and consciousness research. Tom brings an engineering-first approach to a field historically dominated by anecdotal documentation — building rigorous pipelines that apply Greyson Scale scoring, veridical perception analysis, and transformation tracking at scale.\n\nProject Profound was founded on the belief that first-person testimony, when properly analyzed and aggregated, can offer something clinical studies cannot: the unfiltered, lived experience of what happens at the boundary of life.`,
    },
    "micul-love": {
        name: "Dr. Micul Love",
        title: "Co-Founder, Project Profound",
        bio: "Dr. Micul Love is a co-founder of Project Profound, focusing on the psychological and spiritual dimensions of near-death experiences.",
        longBio: `Dr. Micul Love is a co-founder of Project Profound, where she leads the organization's psychological research and community outreach efforts. Her work centers on the transformative aftereffects of near-death experiences — the profound personality shifts, changes in values, and altered perspectives on mortality that experiencers consistently report.\n\nWith deep grounding in both clinical practice and consciousness research, Dr. Love bridges the gap between lived experience and academic inquiry. She has contributed to Project Profound's scoring methodology, particularly the Transformation Index — a structured measure of the psychological and behavioral changes that follow an NDE.\n\nShe is a passionate advocate for treating experiencer testimony with the seriousness and compassion it deserves.`,
    },
    "pamela-harris": {
        name: "Pamela Harris",
        title: "Co-Founder, Project Profound",
        bio: "Pamela Harris is a co-founder of Project Profound, dedicated to making NDE research accessible to everyone who has been touched by these experiences.",
        longBio: `Pamela Harris is a co-founder of Project Profound and serves as its primary community architect. Her focus is on accessibility — ensuring that the platform's research, tools, and resources are available not just to academics, but to the millions of people who have had a near-death experience or been touched by one.\n\nPamela brings a practitioner's eye to content strategy and community design. She oversees Project Profound's editorial direction, author guidelines, and the voice and tone standards that govern the platform's written output.\n\nShe believes that near-death experiences represent one of the most underexplored frontiers in human consciousness research — and that the most important voices in that exploration are the experiencers themselves.`,
    },
};

export async function generateStaticParams() {
    return Object.keys(AUTHORS).map((slug) => ({ slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const author = AUTHORS[slug];
    if (!author) return { title: "Not Found" };

    return {
        title: `${author.name} — ${author.title} | Project Profound`,
        description: author.bio,
        openGraph: {
            title: `${author.name} | Project Profound`,
            description: author.bio,
            type: "profile",
        },
    };
}

export default async function AuthorPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const author = AUTHORS[slug];
    if (!author) notFound();

    // Fetch published articles by this author
    const supabase = buildClient();
    const { data: articles } = await supabase
        .from("blog_posts")
        .select("id, slug, title, category, lead_paragraph, published_at, read_time_mins")
        .eq("status", "published")
        .eq("author_name", author.name)
        .order("published_at", { ascending: false })
        .limit(50);

    // Person + BreadcrumbList JSON-LD for E-E-A-T
    const personJsonLd = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": author.name,
        "jobTitle": author.title,
        "description": author.bio,
        "url": `https://projectprofound.org/about/${slug}`,
        "worksFor": { "@type": "Organization", "name": "Project Profound", "url": "https://projectprofound.org" },
    };

    const breadcrumbJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://projectprofound.org" },
            { "@type": "ListItem", "position": 2, "name": "About", "item": "https://projectprofound.org/about" },
            { "@type": "ListItem", "position": 3, "name": author.name, "item": `https://projectprofound.org/about/${slug}` },
        ],
    };

    const CATEGORY_COLORS: Record<string, string> = {
        "cluster":       "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
        "big-question":  "bg-violet-50 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
        "story":         "bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
        "experiencer":   "bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
        "researcher":    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
    };

    const CATEGORY_LABELS: Record<string, string> = {
        "cluster":       "Deep Dive",
        "big-question":  "Big Question",
        "story":         "Story",
        "experiencer":   "Experiencer",
        "researcher":    "Researcher",
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

            <div className="min-h-screen bg-background text-foreground">
                <div className="container mx-auto px-4 max-w-3xl py-14">
                    {/* Author hero */}
                    <header className="mb-12">
                        <div className="flex items-center gap-5 mb-6">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-violet-100 dark:from-blue-500/30 dark:to-violet-500/30 flex items-center justify-center flex-shrink-0">
                                <User className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                            </div>
                            <div>
                                <h1
                                    className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 leading-tight"
                                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                                >
                                    {author.name}
                                </h1>
                                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">
                                    {author.title}
                                </p>
                            </div>
                        </div>

                        <div className="prose prose-slate dark:prose-invert prose-p:leading-relaxed prose-p:text-slate-700 dark:prose-p:text-slate-300 max-w-none">
                            {author.longBio.split("\n\n").map((para, i) => (
                                <p key={i}>{para}</p>
                            ))}
                        </div>
                    </header>

                    {/* Articles by author */}
                    {articles && articles.length > 0 ? (
                        <section>
                            <h2
                                className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                <BookOpen className="w-4 h-4 text-blue-500" />
                                Articles by {author.name.split(" ")[0]}
                            </h2>
                            <div className="flex flex-col gap-3">
                                {articles.map((article) => {
                                    const categoryColor = CATEGORY_COLORS[article.category] ?? "bg-slate-50 text-slate-700";
                                    const categoryLabel = CATEGORY_LABELS[article.category] ?? article.category;
                                    const date = new Date(article.published_at).toLocaleDateString("en-US", {
                                        year: "numeric", month: "long", day: "numeric",
                                    });
                                    return (
                                        <Link
                                            key={article.id}
                                            href={`/blog/${article.slug}`}
                                            className="group flex items-start gap-4 bg-white dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/10 p-4 hover:shadow-md hover:border-blue-300/60 dark:hover:border-blue-500/30 transition-all"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColor}`}>
                                                        {categoryLabel}
                                                    </span>
                                                    <span className="text-xs text-slate-400 dark:text-slate-500">{date}</span>
                                                </div>
                                                <p
                                                    className="text-base font-semibold text-slate-900 dark:text-slate-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug"
                                                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                                                >
                                                    {article.title}
                                                </p>
                                                {article.lead_paragraph && (
                                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                                        {article.lead_paragraph}
                                                    </p>
                                                )}
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all self-center shrink-0" />
                                        </Link>
                                    );
                                })}
                            </div>
                        </section>
                    ) : (
                        <section className="flex flex-col items-center py-12 text-center">
                            <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Articles by {author.name} coming soon.
                            </p>
                        </section>
                    )}
                </div>
            </div>
        </>
    );
}
