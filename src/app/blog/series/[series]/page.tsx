import { serializeJsonLd } from '@/lib/json-ld';
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClient as createBrowserClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { Clock, ArrowRight, Layers, ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

export const revalidate = 86400;

const CATEGORY_COLORS: Record<string, string> = {
    "guide":         "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
    "big-question":  "bg-violet-50 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
    "story":         "bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    "experiencer":   "bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
    "researcher":    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
};

const CATEGORY_LABELS: Record<string, string> = {
    "guide":         "Guide",
    "big-question":  "Big Question",
    "story":         "Story",
    "experiencer":   "Experiencer",
    "researcher":    "Researcher",
};

// Why: generateStaticParams runs at build time — no request scope, so cookies() is unavailable.
// Use a direct Supabase client with anon key (blog_posts has public SELECT RLS).
export async function generateStaticParams() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data } = await supabase
        .from("blog_posts")
        .select("series")
        .eq("status", "published")
        .not("series", "is", null);

    const unique = Array.from(new Set((data ?? []).map((r) => r.series).filter(Boolean)));
    return unique.map((series) => ({ series }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ series: string }>;
}): Promise<Metadata> {
    const { series } = await params;
    const label = series.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    return {
        title: `${label} Series — Project Profound Blog`,
        description: `All articles in the "${label}" series from Project Profound.`,
        openGraph: {
            title: `${label} Series | Project Profound`,
            description: `A curated series of NDE articles: ${label}.`,
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
    series: string | null;
    author_name: string;
    lead_paragraph: string | null;
    read_time_mins: number | null;
    published_at: string;
};

function PostCard({ post, index }: { post: BlogPost; index: number }) {
    const categoryColor = CATEGORY_COLORS[post.category] ?? "bg-slate-50 text-slate-700";
    const categoryLabel = CATEGORY_LABELS[post.category] ?? post.category;
    const date = new Date(post.published_at).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
    });

    return (
        <Link
            href={`/blog/${post.slug}`}
            className="group flex gap-5 bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-slate-200/60 dark:border-white/10 p-5 hover:shadow-lg hover:border-blue-300/60 dark:hover:border-blue-500/30 transition-all duration-300"
        >
            {/* Part number */}
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center">
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{index + 1}</span>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColor}`}>
                        {categoryLabel}
                    </span>
                </div>
                <h2
                    className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-1 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                >
                    {post.title}
                </h2>
                {post.lead_paragraph && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                        {post.lead_paragraph}
                    </p>
                )}
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-400 dark:text-slate-500">
                    <span>{post.author_name}</span>
                    <span>·</span>
                    <span>{date}</span>
                    {post.read_time_mins && (
                        <>
                            <span>·</span>
                            <span className="flex items-center gap-0.5">
                                <Clock className="w-3 h-3" />
                                {post.read_time_mins} min
                            </span>
                        </>
                    )}
                </div>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all self-center shrink-0" />
        </Link>
    );
}

export default async function BlogSeriesPage({
    params,
}: {
    params: Promise<{ series: string }>;
}) {
    const { series } = await params;
    const supabase = await createClient();

    const { data: posts } = await supabase
        .from("blog_posts")
        .select("id, slug, title, subtitle, category, series, author_name, lead_paragraph, read_time_mins, published_at")
        .eq("status", "published")
        .eq("series", series)
        .order("published_at", { ascending: true });

    if (!posts || posts.length === 0) notFound();

    const label = series.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    // BreadcrumbList JSON-LD
    const breadcrumbJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://projectprofound.org" },
            { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://projectprofound.org/blog" },
            { "@type": "ListItem", "position": 3, "name": label, "item": `https://projectprofound.org/blog/series/${series}` },
        ],
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
            />

            <div className="min-h-screen bg-background text-foreground">
                {/* Breadcrumb header */}
                <div className="border-b border-slate-200/60 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                    <div className="container mx-auto px-4 max-w-4xl py-4 flex items-center gap-3 text-sm">
                        <Link href="/blog" className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Blog
                        </Link>
                        <span className="text-slate-300 dark:text-slate-600">/</span>
                        <span className="text-slate-500 dark:text-slate-400">Series</span>
                        <span className="text-slate-300 dark:text-slate-600">/</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{label}</span>
                    </div>
                </div>

                {/* Hero */}
                <section className="py-14 hero-gradient relative overflow-hidden">
                    <div
                        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
                        style={{
                            backgroundImage: "radial-gradient(circle, #2563EB 1px, transparent 1px)",
                            backgroundSize: "32px 32px",
                        }}
                    />
                    <div className="relative container mx-auto px-4 max-w-3xl text-center">
                        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/20 rounded-full">
                            <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 tracking-wide uppercase">
                                Series · {posts.length} {posts.length === 1 ? "article" : "articles"}
                            </span>
                        </div>
                        <h1
                            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mb-3 leading-[1.1]"
                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                        >
                            {label}
                        </h1>
                    </div>
                </section>

                {/* Numbered list */}
                <div className="container mx-auto px-4 max-w-3xl py-10">
                    <div className="flex flex-col gap-3">
                        {posts.map((post, i) => (
                            <PostCard key={post.id} post={post as BlogPost} index={i} />
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
