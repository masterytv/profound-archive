import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { BookOpen, Clock, ArrowRight, Tag } from "lucide-react";

export const revalidate = 3600; // Regenerate hourly

export const metadata: Metadata = {
    title: "Blog — NDE Research & Insights | Project Profound",
    description:
        "In-depth articles on near-death experiences: the research, the stories, and what they mean. Written by the Project Profound team.",
    openGraph: {
        title: "Blog — Project Profound",
        description: "Research-backed articles on near-death experiences, consciousness, and what happens when we die.",
        type: "website",
    },
};

const CATEGORY_LABELS: Record<string, string> = {
    "guide":         "Guide",
    "big-question":  "Big Question",
    "story":         "Story",
    "experiencer":   "Experiencer",
    "researcher":    "Researcher",
};

const CATEGORY_COLORS: Record<string, string> = {
    "guide":         "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
    "big-question":  "bg-violet-50 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
    "story":         "bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    "experiencer":   "bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
    "researcher":    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
};

type BlogPost = {
    id: number;
    slug: string;
    title: string;
    subtitle: string | null;
    category: string;
    author_name: string;
    lead_paragraph: string | null;
    read_time_mins: number | null;
    tags: string[] | null;
    published_at: string;
};

function PostCard({ post }: { post: BlogPost }) {
    const categoryLabel = CATEGORY_LABELS[post.category] ?? post.category;
    const categoryColor = CATEGORY_COLORS[post.category] ?? "bg-slate-50 text-slate-700";
    const date = new Date(post.published_at).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
    });

    return (
        <Link
            href={`/blog/${post.slug}`}
            className="group flex flex-col bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-slate-200/60 dark:border-white/10 p-6 hover:shadow-lg hover:border-blue-300/60 dark:hover:border-blue-500/30 transition-all duration-300"
        >
            {/* Category badge */}
            <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryColor}`}>
                    {categoryLabel}
                </span>
            </div>

            {/* Title */}
            <h2
                className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
                {post.title}
            </h2>

            {/* Lead paragraph */}
            {post.lead_paragraph && (
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4 flex-1 line-clamp-3">
                    {post.lead_paragraph}
                </p>
            )}

            {/* Footer */}
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

const CATEGORIES = [
    { value: "all",          label: "All" },
    { value: "guide",         label: "Guides" },
    { value: "big-question", label: "Big Questions" },
    { value: "story",        label: "Stories" },
    { value: "experiencer",  label: "Experiencers", href: "/experiencer" },
];

export default async function BlogIndexPage({
    searchParams,
}: {
    searchParams: Promise<{ category?: string }>;
}) {
    const { category } = await searchParams;
    const supabase = await createClient();

    let query = supabase
        .from("blog_posts")
        .select("id, slug, title, subtitle, category, author_name, lead_paragraph, read_time_mins, tags, published_at")
        .eq("status", "published")
        .eq("domain", "nde")
        .order("published_at", { ascending: false })
        .limit(50);

    if (category && category !== "all") {
        query = query.eq("category", category);
    }

    const { data: posts } = await query;

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* JSON-LD: CollectionPage + ItemList for AI discoverability */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "CollectionPage",
                        name: "NDE Research Blog — Project Profound",
                        description: "Research-backed articles on near-death experiences, consciousness, and what 5,000 first-person accounts reveal about the nature of existence.",
                        url: "https://projectprofound.org/blog",
                        mainEntity: {
                            "@type": "ItemList",
                            numberOfItems: (posts ?? []).length,
                            itemListElement: (posts ?? []).slice(0, 30).map((post, i) => ({
                                "@type": "ListItem",
                                position: i + 1,
                                name: (post as BlogPost).title,
                                url: `https://projectprofound.org/blog/${(post as BlogPost).slug}`,
                            })),
                        },
                    }),
                }}
            />
            <section className="relative overflow-hidden py-16 md:py-20 hero-gradient">
                <div
                    className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
                    style={{
                        backgroundImage: "radial-gradient(circle, #2563EB 1px, transparent 1px)",
                        backgroundSize: "32px 32px",
                    }}
                />
                <div className="relative container mx-auto px-4 max-w-4xl text-center">
                    <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/20 rounded-full">
                        <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 tracking-wide uppercase">
                            Project Profound Blog
                        </span>
                    </div>
                    <h1
                        className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mb-4 leading-[1.1]"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                        What Near-Death Experiences{" "}
                        <span className="text-blue-600 dark:text-blue-400" style={{ fontStyle: "italic" }}>
                            Tell Us
                        </span>
                    </h1>
                    <p className="max-w-2xl mx-auto text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                        Research-backed articles on NDEs, consciousness, and what 5,000 first-person
                        accounts reveal about the nature of existence.
                    </p>
                </div>
            </section>

            <div className="container mx-auto px-4 max-w-7xl py-10">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* ─── Sidebar ─── */}
                    <aside className="lg:w-56 shrink-0">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 px-1">
                            Categories
                        </p>
                        <nav className="flex flex-row lg:flex-col gap-1 flex-wrap">
                            {CATEGORIES.map((cat) => {
                                const isActive = (category ?? "all") === cat.value;
                                return (
                                    <Link
                                        key={cat.value}
                                        href={'href' in cat && cat.href ? cat.href : cat.value === "all" ? "/blog" : `/blog?category=${cat.value}`}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                            isActive
                                                ? "bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
                                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                                        }`}
                                    >
                                        <Tag className={`w-3.5 h-3.5 ${isActive ? "text-blue-500" : "text-slate-300"}`} />
                                        {cat.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </aside>

                    {/* ─── Article grid ─── */}
                    <main className="flex-1 min-w-0">
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
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                                    We are building a comprehensive library of research-backed NDE articles.
                                    Check back soon.
                                </p>
                            </div>
                        )}
                    </main>

                </div>
            </div>
        </div>
    );
}
