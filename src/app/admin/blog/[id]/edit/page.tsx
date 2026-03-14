"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, ExternalLink, Eye } from "lucide-react";
import Link from "next/link";

interface BlogPost {
    id: number;
    slug: string;
    title: string;
    subtitle: string;
    lead_paragraph: string;
    body_mdx: string;
    seo_title: string;
    seo_description: string;
    status: string;
    word_count: number | null;
    category: string;
    author_name: string;
    hero_image_url: string | null;
}

export default function BlogEditPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [post, setPost] = useState<BlogPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Editable fields
    const [title, setTitle] = useState("");
    const [subtitle, setSubtitle] = useState("");
    const [leadParagraph, setLeadParagraph] = useState("");
    const [bodyMdx, setBodyMdx] = useState("");
    const [seoTitle, setSeoTitle] = useState("");
    const [seoDescription, setSeoDescription] = useState("");

    useEffect(() => {
        fetch(`/api/admin/blog/${id}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.post) {
                    const p = data.post as BlogPost;
                    setPost(p);
                    setTitle(p.title);
                    setSubtitle(p.subtitle ?? "");
                    setLeadParagraph(p.lead_paragraph ?? "");
                    setBodyMdx(p.body_mdx ?? "");
                    setSeoTitle(p.seo_title ?? "");
                    setSeoDescription(p.seo_description ?? "");
                } else {
                    setError(data.error ?? "Post not found");
                }
                setLoading(false);
            })
            .catch((err) => {
                setError(String(err));
                setLoading(false);
            });
    }, [id]);

    const handleSave = useCallback(async () => {
        setSaving(true);
        setSaved(false);
        setError(null);
        try {
            const res = await fetch(`/api/admin/blog/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    subtitle,
                    lead_paragraph: leadParagraph,
                    body_mdx: bodyMdx,
                    seo_title: seoTitle,
                    seo_description: seoDescription,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            setError(String(err));
        } finally {
            setSaving(false);
        }
    }, [id, title, subtitle, leadParagraph, bodyMdx, seoTitle, seoDescription]);

    // Ctrl+S / Cmd+S to save
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [handleSave]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
        );
    }

    if (!post) {
        return (
            <div className="p-6 text-red-600">
                {error ?? "Post not found"}
            </div>
        );
    }

    const wordCount = bodyMdx.split(/\s+/).filter(Boolean).length;

    return (
        <div className="space-y-4 max-w-5xl">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/blog"
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Back
                    </Link>
                    <h1
                        className="text-lg font-bold text-slate-900"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                        Edit Post
                    </h1>
                    <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        post.status === "published"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                        {post.status}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {post.status === "published" && (
                        <a
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50"
                        >
                            <ExternalLink className="w-3 h-3" />
                            View Live
                        </a>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {saving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Save className="w-3.5 h-3.5" />
                        )}
                        {saving ? "Saving..." : saved ? "Saved ✓" : "Save (⌘S)"}
                    </button>
                </div>
            </div>

            {/* Error / Success */}
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* Fields */}
            <div className="space-y-4">
                {/* Title */}
                <FieldBlock label="Title">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 text-lg font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    />
                </FieldBlock>

                {/* Subtitle */}
                <FieldBlock label="Subtitle">
                    <input
                        type="text"
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    />
                </FieldBlock>

                {/* Lead Paragraph */}
                <FieldBlock label="Lead Paragraph" hint="Shown as the intro/excerpt">
                    <textarea
                        value={leadParagraph}
                        onChange={(e) => setLeadParagraph(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 font-mono"
                    />
                </FieldBlock>

                {/* Body MDX — the main editor */}
                <FieldBlock
                    label="Body (MDX/HTML)"
                    hint={`${wordCount.toLocaleString()} words · Use ## for H2, ### for H3, > for blockquotes, **bold**, [text](url) for links`}
                >
                    <textarea
                        value={bodyMdx}
                        onChange={(e) => setBodyMdx(e.target.value)}
                        rows={30}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 font-mono leading-relaxed"
                        spellCheck={false}
                    />
                </FieldBlock>

                {/* SEO Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldBlock label="SEO Title" hint="60 chars max">
                        <input
                            type="text"
                            value={seoTitle}
                            onChange={(e) => setSeoTitle(e.target.value)}
                            maxLength={70}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                        />
                        <span className="text-xs text-slate-400 mt-1 block">
                            {seoTitle.length}/60
                        </span>
                    </FieldBlock>
                    <FieldBlock label="SEO Description" hint="150 chars max">
                        <input
                            type="text"
                            value={seoDescription}
                            onChange={(e) => setSeoDescription(e.target.value)}
                            maxLength={160}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                        />
                        <span className="text-xs text-slate-400 mt-1 block">
                            {seoDescription.length}/150
                        </span>
                    </FieldBlock>
                </div>
            </div>

            {/* Bottom save bar */}
            <div className="sticky bottom-4 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 text-sm font-medium px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-600/20"
                >
                    {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    {saving ? "Saving..." : saved ? "Saved ✓" : "Save Changes"}
                </button>
            </div>
        </div>
    );
}

function FieldBlock({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-slate-200/60 bg-white p-4">
            <div className="flex items-baseline justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    {label}
                </label>
                {hint && (
                    <span className="text-xs text-slate-400">{hint}</span>
                )}
            </div>
            {children}
        </div>
    );
}
