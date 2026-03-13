import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { BookOpen, Clock, ArrowRight, Tag, ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

export const revalidate = 86400;

const CATEGORY_LABELS: Record<string, string> = {
    "cluster":       "Deep Dives",
    "big-question":  "Big Questions",
    "story":         "Stories",
    "experiencer":   "Experiencers",
    "researcher":    "Researchers",
};

const CATEGORY_COLORS: Record<string, string> = {
    "cluster":       "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
    "big-question":  "bg-violet-50 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
    "story":         "bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    "experiencer":   "bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
    "researcher":    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
    "cluster":       "Comprehensive guides that anchor our content on each major NDE topic.",
    "big-question":  "Long-form answers to the questions people ask most about near-death experiences.",
    "story":         "First-person NDE accounts retold with journalistic precision.",
    "experiencer":   "Scored, sourced profiles of the most documented NDE experiencers.",
    "researcher":    "In-depth profiles of the scientists who study near-death experiences.",
};

const VALID_CATEGORIES = ["cluster", "big-question", "story", "experiencer", "researcher"];

export async function generateStaticParams() {
    return VALID_CATEGORIES.map((category) => ({ category }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ category: string }>;
}): Promise<Metadata> {
    const { category } = await params;
    if (!VALID_CATEGORIES.includes(category)) return { title: "Not Found" };

    const label = CATEGORY_LABELS[category] ?? category;
    const description = CATEGORY_DESCRIPTIONS[category] ?? "";

    return {
        title: `${label} — NDE Articles | Project Profound`,
        description,
        openGraph: {
            title: `${label} | Project Profound Blog`,
            description,
            type: "website",
        },
    };
}

type BlogPost = {
    id: number;
    slug: string;
    title: string;
    subtitle: string | null;
    category: string;
    author_name: string;
    lead_paragraph: string | null;
    read_time_mins: number | null;
    published_at: string;
};

function PostCard({ post }: { post: BlogPost }) {
    const categoryColor = CATEGORY_COLORS[post.category] ?? "bg-slate-50 text-slate-700";
    const label = CATEGORY_LABELS[post.category] ?? post.category;
    const date = new Date(post.published_at).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
    });

    return (
        <Link
            href={`/blog/${post.slug}`}
            className="group flex flex-col bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-slate-200/60 dark:border-white/10 p-6 hover:shadow-lg hover:border-blue-300/60 dark:hover:border-blue-500/30 transition-all duration-300"
        >
            <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryColor}`}>
                    {label}
                </span>
            </div>
            <h2
                className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
                {post.title}
            </h2>
            {post.lead_paragraph && (
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4 flex-1 line-clamp-3">
                    {post.lead_paragraph}
                </p>
            )}
            <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100 dark:border-white/10">
                <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                    <span>{post.author_name}</span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span>{date}</span>
                    {post.read_time_mins && (
                        <>
                            <span className="text-slate-300 dark:text-slate-600">·</span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {post.read_time_mins} min
                            </span>
                        </>
                    )}
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
            </div>
        </Link>
    );
}

export default async function BlogCategoryPage({
    params,
}: {
    params: Promise<{ category: string }>;
}) {
    const { category } = await params;
    if (!VALID_CATEGORIES.includes(category)) notFound();

    const supabase = await createClient();
    const { data: posts } = await supabase
        .from("blog_posts")
        .select("id, slug, title, subtitle, category, author_name, lead_paragraph, read_time_mins, published_at")
        .eq("status", "published")
        .eq("category", category)
        .order("published_at", { ascending: false })
        .limit(100);

    const label = CATEGORY_LABELS[category];
    const description = CATEGORY_DESCRIPTIONS[category];

    // BreadcrumbList JSON-LD
    const breadcrumbJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://projectprofound.org" },
            { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://projectprofound.org/blog" },
            { "@type": "ListItem", "position": 3, "name": label, "item": `https://projectprofound.org/blog/category/${category}` },
        ],
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />

            <div className="min-h-screen bg-background text-foreground">
                {/* Breadcrumb header */}
                <div className="border-b border-slate-200/60 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                    <div className="container mx-auto px-4 max-w-7xl py-4 flex items-center gap-3 text-sm">
                        <Link href="/blog" className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Blog
                        </Link>
                        <span className="text-slate-300 dark:text-slate-600">/</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{label}</span>
                    </div>
                </div>

                {/* Hero */}
                <section className="py-14 md:py-18 hero-gradient relative overflow-hidden">
                    <div
                        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
                        style={{
                            backgroundImage: "radial-gradient(circle, #2563EB 1px, transparent 1px)",
                            backgroundSize: "32px 32px",
                        }}
                    />
                    <div className="relative container mx-auto px-4 max-w-4xl text-center">
                        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/20 rounded-full">
                            <Tag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 tracking-wide uppercase">
                                {label}
                            </span>
                        </div>
                        <h1
                            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mb-4 leading-[1.1]"
                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                        >
                            {label}
                        </h1>
                        <p className="max-w-2xl mx-auto text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                            {description}
                        </p>
                    </div>
                </section>

                {/* Grid */}
                <div className="container mx-auto px-4 max-w-7xl py-10">
                    {posts && posts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {posts.map((post) => (
                                <PostCard key={post.id} post={post as BlogPost} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                            <h2
                                className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                Articles coming soon
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
                                We are building this section now. Check back soon, or browse all articles.
                            </p>
                            <Link
                                href="/blog"
                                className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                All articles
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
