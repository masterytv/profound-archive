import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import Link from "next/link";
import type { Metadata } from "next";
import { FileText, CheckCircle2, Clock3, Settings2, Eye, EyeOff, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { BlogGeneratePanel, GuideGeneratePanel, StoryGeneratePanel } from "@/components/admin/blog-generate-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Blog Management | Admin — Project Profound",
};

const CATEGORY_LABELS: Record<string, string> = {
    "guide":         "Guide",
    "big-question":  "Big Question",
    "story":         "Story",
    "experiencer":   "Experiencer",
    "researcher":    "Researcher",
};

const CATEGORY_COLORS: Record<string, string> = {
    "guide":         "bg-blue-50 text-blue-600 border-blue-200",
    "big-question":  "bg-violet-50 text-violet-600 border-violet-200",
    "story":         "bg-amber-50 text-amber-600 border-amber-200",
    "experiencer":   "bg-rose-50 text-rose-600 border-rose-200",
    "researcher":    "bg-emerald-50 text-emerald-600 border-emerald-200",
};

type BlogRow = {
    id: number;
    slug: string;
    title: string;
    category: string;
    author_name: string;
    status: string;
    word_count: number | null;
    published_at: string | null;
    updated_at: string;
};

const PAGE_SIZE = 10;

export default async function AdminBlogPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>;
}) {
    const { page: pageParam } = await searchParams;
    const currentPage = Math.max(1, parseInt(pageParam || "1", 10) || 1);

    // Session client — used only for auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null; // middleware handles redirect, this is a fallback

    // Service client — bypasses RLS so admin can see ALL posts (drafts + published)
    const adminClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get total count
    const { count: totalCount } = await adminClient
        .from("blog_posts")
        .select("id", { count: "exact", head: true });

    const totalPages = Math.ceil((totalCount ?? 0) / PAGE_SIZE);
    const rangeStart = (currentPage - 1) * PAGE_SIZE;
    const rangeEnd = rangeStart + PAGE_SIZE - 1;

    // Fetch all posts for stats, paginated posts for table
    const { data: allPosts } = await adminClient
        .from("blog_posts")
        .select("status, word_count")
        .limit(500);

    const { data: posts, error } = await adminClient
        .from("blog_posts")
        .select("id, slug, title, category, author_name, status, word_count, published_at, updated_at")
        .order("updated_at", { ascending: false })
        .range(rangeStart, rangeEnd);

    // Fetch questions for the generate dropdown (ordered by sort_order)
    const { data: rawQuestions } = await adminClient
        .from("nde_questions")
        .select("slug, consumer_question")
        .eq("is_active", true)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .limit(81);

    // Normalise shape to { slug, question } for BlogGeneratePanel
    const questions = (rawQuestions ?? []).map((q) => ({
        slug: q.slug,
        question: q.consumer_question,
    }));

    const published = (allPosts ?? []).filter((p) => p.status === "published").length;
    const drafts = (allPosts ?? []).filter((p) => p.status === "draft").length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                    <h1
                        className="text-xl font-bold text-slate-900"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                        Blog Management
                    </h1>
                    <p className="text-xs text-slate-500">
                        {published} published · {drafts} drafts
                    </p>
                </div>

            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Total", value: totalCount ?? 0, icon: FileText, color: "text-slate-600 bg-slate-50 border-slate-200" },
                    { label: "Published", value: published, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
                    { label: "Drafts", value: drafts, icon: Clock3, color: "text-amber-600 bg-amber-50 border-amber-200" },
                    { label: "Words written", value: (allPosts ?? []).reduce((s, p) => s + (p.word_count ?? 0), 0).toLocaleString(), icon: FileText, color: "text-blue-600 bg-blue-50 border-blue-200" },
                ].map((stat) => (
                    <div key={stat.label} className={`rounded-xl border p-4 ${stat.color.split(" ").slice(1).join(" ")}`}>
                        <stat.icon className={`w-4 h-4 mb-1 ${stat.color.split(" ")[0]}`} />
                        <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                        <p className="text-xs text-slate-500">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Generate panel */}
            {questions && questions.length > 0 && (
                <BlogGeneratePanel questions={questions} />
            )}

            {/* Guide (pillar page) generation panel */}
            <GuideGeneratePanel />

            {/* Story (experiencer narrative) generation panel */}
            <StoryGeneratePanel />

            {/* Error state */}
            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                    Failed to load posts: {error.message}
                </div>
            )}

            {/* Posts table */}
            <div className="rounded-2xl border border-slate-200/60 bg-white overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/80">
                                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-400 w-full">Title</th>
                                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">Category</th>
                                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap hidden md:table-cell">Author</th>
                                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">Status</th>
                                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap hidden lg:table-cell">Words</th>
                                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">Updated</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {(posts ?? []).map((post: BlogRow) => {
                                const catColor = CATEGORY_COLORS[post.category] ?? "bg-slate-50 text-slate-600 border-slate-200";
                                const catLabel = CATEGORY_LABELS[post.category] ?? post.category;
                                const updated = new Date(post.updated_at).toLocaleDateString("en-US", {
                                    month: "short", day: "numeric",
                                });

                                return (
                                    <tr key={post.id} className="hover:bg-slate-50/60 transition-colors group">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors" title={post.title}>
                                                {post.title}
                                            </p>
                                            <p className="text-xs text-slate-400 font-mono mt-0.5">/blog/{post.slug}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full border ${catColor}`}>
                                                {catLabel}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            <span className="text-slate-600 text-xs">{post.author_name}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                                                post.status === "published"
                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                            }`}>
                                                {post.status === "published"
                                                    ? <Eye className="w-2.5 h-2.5" />
                                                    : <Clock3 className="w-2.5 h-2.5" />
                                                }
                                                {post.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs text-slate-400 font-mono hidden lg:table-cell">
                                            {post.word_count ? post.word_count.toLocaleString() : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs text-slate-400 whitespace-nowrap">
                                            {updated}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 justify-end">
                                                {post.status === "published" && (
                                                    <a
                                                        href={`/blog/${post.slug}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                                                    >
                                                        <Eye className="w-3 h-3" />
                                                        View
                                                    </a>
                                                )}
                                                <Link
                                                    href={`/admin/blog/${post.id}/edit`}
                                                    className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-blue-600 font-medium whitespace-nowrap"
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                    Edit
                                                </Link>
                                                <PublishToggleButton
                                                    id={post.id}
                                                    currentStatus={post.status}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {(!posts || posts.length === 0) && !error && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <FileText className="w-10 h-10 text-slate-300 mb-3" />
                            <p className="text-sm text-slate-500">No blog posts yet.</p>
                            <p className="text-xs text-slate-400 mt-1">They will appear here once the pipeline generates them.</p>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                        <span className="text-xs text-slate-400">
                            Page {currentPage} of {totalPages} · {totalCount} posts
                        </span>
                        <div className="flex items-center gap-2">
                            {currentPage > 1 ? (
                                <Link
                                    href={`/admin/blog?page=${currentPage - 1}`}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                                </Link>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 cursor-not-allowed">
                                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                                </span>
                            )}
                            {currentPage < totalPages ? (
                                <Link
                                    href={`/admin/blog?page=${currentPage + 1}`}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                                >
                                    Next <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 cursor-not-allowed">
                                    Next <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Server-side form for publish toggle (no client JS required)
function PublishToggleButton({ id, currentStatus }: { id: number; currentStatus: string }) {
    const willPublish = currentStatus === "draft";
    return (
        <form action={`/api/admin/blog/${id}`} method="POST">
            <input type="hidden" name="_method" value="PATCH" />
            <input type="hidden" name="status" value={willPublish ? "published" : "draft"} />
            <button
                type="submit"
                className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                    willPublish
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                }`}
            >
                {willPublish ? <CheckCircle2 className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {willPublish ? "Publish" : "Unpublish"}
            </button>
        </form>
    );
}
