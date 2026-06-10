import { serializeJsonLd } from '@/lib/json-ld';
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowLeft, Clock, Calendar, Tag, ExternalLink, BookOpen, Pencil } from "lucide-react";
import { markdownToHtml } from "@/lib/markdown";
import MicroFeedback from "@/components/micro-feedback";

export const revalidate = 86400; // ISR: revalidate once per day

type Ref = {
    title: string;
    url: string;
    type: "academic" | "book" | "scripture" | "site";
};

type BlogPost = {
    id: number;
    slug: string;
    title: string;
    subtitle: string | null;
    category: string;
    status: string;
    author_name: string;
    author_bio: string | null;
    lead_paragraph: string | null;
    body_mdx: string | null;
    word_count: number | null;
    read_time_mins: number | null;
    tags: string[] | null;
    refs: Ref[] | null;
    seo_title: string | null;
    seo_description: string | null;
    published_at: string;
    updated_at: string;
    related_question_slugs: string[] | null;
    related_video_ids: string[] | null;
    hero_image_url: string | null;
    source_question_slug: string | null;
    faq_data: Array<{ question: string; answer: string }> | null;
};

async function getPost(slug: string): Promise<BlogPost | null> {
    // Service client to read all statuses
    const serviceClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
    );
    const { data } = await serviceClient
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("domain", "uap")
        .single();

    if (!data) return null;

    // Published posts are visible to everyone
    if (data.status === "published") return data;

    // Draft posts require a logged-in user (admin preview)
    try {
        const sessionClient = await createClient();
        const { data: { user } } = await sessionClient.auth.getUser();
        if (user) return data; // Logged in → can preview drafts
    } catch {
        // Auth check failed — treat as anonymous
    }

    return null; // Anonymous user → draft is hidden
}

export async function generateStaticParams() {
    // Use service client — createClient() calls cookies() which throws outside request scope during build
    const supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
    );
    const { data } = await supabase
        .from("blog_posts")
        .select("slug")
        .eq("status", "published")
        .eq("domain", "uap");
    return (data ?? []).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPost(slug);
    if (!post) return { title: "Article Not Found | Project Profound" };

    const title = post.seo_title ?? `${post.title} | UFO/UAP Research — Project Profound`;
    const description = post.seo_description ?? post.lead_paragraph ?? "";
    const ogImageUrl = `https://projectprofound.org/api/og/${post.slug}`;

    return {
        title,
        description,
        authors: [{ name: post.author_name }],
        openGraph: {
            title,
            description,
            type: "article",
            publishedTime: post.published_at,
            modifiedTime: post.updated_at,
            authors: [post.author_name],
            images: [{ url: ogImageUrl, width: 1200, height: 630, alt: post.title }],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [ogImageUrl],
        },
    };
}

const CATEGORY_COLORS: Record<string, string> = {
    "guide":         "bg-teal-50 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
    "big-question":  "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
    "story":         "bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    "experiencer":   "bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
    "researcher":    "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
};

const REF_TYPE_LABEL: Record<string, string> = {
    academic: "Academic",
    book: "Book",
    scripture: "Text",
    site: "Web",
};

export default async function UapBlogPostPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const post = await getPost(slug);
    if (!post) notFound();

    // Check if the current user is an admin (for edit button)
    let isAdmin = false;
    try {
        const sessionClient = await createClient();
        const { data: { user } } = await sessionClient.auth.getUser();
        if (user) {
            const { data: profile } = await sessionClient
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();
            isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
        }
    } catch {
        // Not logged in — no edit button
    }

    const date = new Date(post.published_at).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
    });

    // Article JSON-LD for SEO + LLM citation — UAP-specific URLs
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.title,
        "description": post.seo_description ?? post.lead_paragraph ?? "",
        "author": {
            "@type": "Person",
            "name": post.author_name,
            "affiliation": { "@type": "Organization", "name": "Project Profound" },
        },
        "publisher": {
            "@type": "Organization",
            "name": "Project Profound",
            "url": "https://projectprofound.org",
        },
        "datePublished": post.published_at,
        "dateModified": post.updated_at,
        "url": `https://projectprofound.org/uap/blog/${post.slug}`,
        "mainEntityOfPage": `https://projectprofound.org/uap/blog/${post.slug}`,
    };

    return (
        <>
            {/* JSON-LD */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
            />

            {/* FAQPage JSON-LD for guide posts with FAQ data */}
            {post.faq_data && post.faq_data.length > 0 && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: serializeJsonLd({
                            "@context": "https://schema.org",
                            "@type": "FAQPage",
                            "mainEntity": post.faq_data.map((faq) => ({
                                "@type": "Question",
                                "name": faq.question,
                                "acceptedAnswer": {
                                    "@type": "Answer",
                                    "text": faq.answer,
                                },
                            })),
                        }),
                    }}
                />
            )}

            {/* BreadcrumbList JSON-LD */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: serializeJsonLd({
                        "@context": "https://schema.org",
                        "@type": "BreadcrumbList",
                        itemListElement: [
                            { "@type": "ListItem", position: 1, name: "UAP Blog", item: "https://projectprofound.org/uap/blog" },
                            { "@type": "ListItem", position: 2, name: post.category.replace("-", " "), item: `https://projectprofound.org/uap/blog/category/${post.category}` },
                            { "@type": "ListItem", position: 3, name: post.title },
                        ],
                    }),
                }}
            />
            {post.status !== "published" && (
                <div className="bg-amber-400 text-amber-950 px-4 py-2.5 text-sm font-semibold text-center flex items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1.5 bg-amber-950/10 px-3 py-1 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-amber-700 animate-pulse" />
                        DRAFT PREVIEW — Not published
                    </span>
                    <a href="/admin/uap/blog" className="underline hover:no-underline text-amber-900 ml-2">Publish in admin →</a>
                </div>
            )}

            <div className="min-h-screen bg-background text-foreground">
                {/* Header strip */}
                <div className="border-b border-slate-200/60 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                    <div className="container mx-auto px-4 max-w-4xl py-4 flex items-center gap-4">
                        <Link
                            href="/uap/blog"
                            className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            UFO/UAP Blog
                        </Link>
                        <span className="text-slate-300 dark:text-slate-600">/</span>
                        <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[post.category] ?? "bg-slate-50 text-slate-700"}`}
                        >
                            {post.category.replace("-", " ")}
                        </span>
                        {isAdmin && (
                            <Link
                                href={`/admin/blog/${post.id}/edit`}
                                className="ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/30 border border-green-200/60 dark:border-green-500/30 transition-colors"
                            >
                                <Pencil className="w-3 h-3" />
                                Edit
                            </Link>
                        )}
                    </div>
                </div>

                <article className="container mx-auto px-4 max-w-3xl py-10 md:py-16">
                    {/* Title block */}
                    <header className="mb-8">
                        <h1
                            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mb-3 leading-[1.1]"
                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                        >
                            {post.title}
                        </h1>
                        {post.subtitle && (
                            <p className="text-xl text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
                                {post.subtitle}
                            </p>
                        )}

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400 border-t border-b border-slate-100 dark:border-white/10 py-4 my-4">
                            <span className="font-medium text-slate-700 dark:text-slate-200">{post.author_name}</span>
                            <span className="text-slate-300 dark:text-slate-600">·</span>
                            <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {date}
                            </span>
                            {post.read_time_mins && (
                                <>
                                    <span className="text-slate-300 dark:text-slate-600">·</span>
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        {post.read_time_mins} min read
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Lead paragraph — QEO: first paragraph answers the core question */}
                        {post.lead_paragraph && (
                            <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed font-medium border-l-4 border-green-500/40 pl-5 bg-green-50/30 dark:bg-green-500/10 py-3 rounded-r-lg">
                                {post.lead_paragraph}
                            </p>
                        )}

                        {/* Cross-link: link to UAP question summary page */}
                        {post.source_question_slug && (
                            <Link
                                href={`/uap/questions/${post.source_question_slug}`}
                                className="inline-flex items-center gap-2 text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors mt-2"
                            >
                                <BookOpen className="w-3.5 h-3.5" />
                                See a short answer and related videos →
                            </Link>
                        )}
                    </header>

                    {/* Hero image */}
                    {post.hero_image_url && (
                        <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-10 shadow-lg">
                            <Image
                                src={post.hero_image_url}
                                alt={post.title}
                                fill
                                priority
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 768px"
                            />
                        </div>
                    )}

                    {/* Body */}
                    {post.body_mdx && (() => {
                        // Strip leading H1 (title is already rendered in <h1> above)
                        // Also strip repeated title lines that LLMs sometimes echo
                        let cleaned = post.body_mdx
                            .replace(/^#\s+.+\n*/m, '')  // Remove first # heading
                            .replace(new RegExp(`^${post.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n*`, 'm'), '') // Remove echoed title text
                            .trimStart();
                        return (
                            <div
                                className="prose prose-slate dark:prose-invert prose-lg max-w-none
                                    prose-headings:font-bold prose-headings:tracking-tight
                                    prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                                    prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3
                                    prose-p:leading-relaxed prose-p:text-slate-700 dark:prose-p:text-slate-300
                                    prose-a:text-green-600 dark:prose-a:text-green-400 prose-a:no-underline hover:prose-a:underline
                                    prose-blockquote:border-green-500/40 prose-blockquote:bg-green-50/30 dark:prose-blockquote:bg-green-500/10
                                    prose-strong:text-slate-900 dark:prose-strong:text-slate-100"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                                dangerouslySetInnerHTML={{ __html: markdownToHtml(cleaned) }}
                            />
                        );
                    })()}

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mt-10 pt-6 border-t border-slate-100 dark:border-white/10">
                            <Tag className="w-3.5 h-3.5 text-slate-400" />
                            {post.tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* References */}
                    {post.refs && post.refs.length > 0 && (
                        <section className="mt-10 pt-6 border-t border-slate-200 dark:border-white/10">
                            <h2
                                className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                References
                            </h2>
                            <ol className="space-y-2">
                                {post.refs.map((ref, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                                        <span className="text-xs font-bold text-slate-400 mt-0.5 w-5 shrink-0">{i + 1}.</span>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-xs font-semibold text-slate-400 mr-2">
                                                [{REF_TYPE_LABEL[ref.type] ?? ref.type}]
                                            </span>
                                            {ref.url ? (
                                                <a
                                                    href={ref.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-green-600 dark:text-green-400 hover:underline break-words inline-flex items-center gap-1"
                                                >
                                                    {ref.title}
                                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                                </a>
                                            ) : (
                                                <span>{ref.title}</span>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    )}

                    {/* Author bio */}
                    {post.author_bio && (
                        <section className="mt-10 pt-6 border-t border-slate-200 dark:border-white/10">
                            <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-5 border border-slate-200/60 dark:border-white/10">
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                                    About the Author
                                </p>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                                    {post.author_name}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {post.author_bio}
                                </p>
                            </div>
                        </section>
                    )}

                    {/* Related questions — link to UAP questions */}
                    {post.related_question_slugs && post.related_question_slugs.length > 0 && (
                        <section className="mt-10">
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
                                Explore Related Questions
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {post.related_question_slugs.map((slug) => (
                                    <Link
                                        key={slug}
                                        href={`/uap/questions/${slug}`}
                                        className="text-sm px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-500/30 transition-colors"
                                    >
                                        {slug.replace(/-/g, " ")}
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Micro feedback */}
                    <div className="mt-10">
                        <MicroFeedback
                            feature="uap_blog_article"
                            contextId={slug}
                            prompt="Was this article helpful?"
                        />
                    </div>

                    {/* Back link */}
                    <div className="mt-12 pt-6 border-t border-slate-100 dark:border-white/10">
                        <Link
                            href="/uap/blog"
                            className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to UFO/UAP articles
                        </Link>
                    </div>
                </article>
            </div>
        </>
    );
}
