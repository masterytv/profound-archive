"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Loader2, BookOpen } from "lucide-react";

interface SearchResult {
    slug: string;
    consumer_question: string;
    category_label: string;
}

function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

export function QuestionsSearchBar() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [navigating, setNavigating] = useState<string | null>(null); // slug being navigated to
    const [activeIdx, setActiveIdx] = useState(-1);
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const debouncedQuery = useDebounce(query, 300);

    // ── Fetch autocomplete results ───────────────────────────────────────────
    useEffect(() => {
        const q = debouncedQuery.trim();
        if (q.length < 2) {
            setResults([]);
            setOpen(false);
            return;
        }
        setLoading(true);
        fetch(`/api/questions/search?q=${encodeURIComponent(q)}`)
            .then(r => r.json())
            .then(d => {
                setResults(d.results ?? []);
                setOpen((d.results ?? []).length > 0 || q.length >= 2);
            })
            .catch(() => setResults([]))
            .finally(() => setLoading(false));
    }, [debouncedQuery]);

    // ── Close dropdown when clicking outside ────────────────────────────────
    useEffect(() => {
        function onClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    // ── Navigate to a curated question ───────────────────────────────────────
    const goToQuestion = useCallback((slug: string) => {
        setOpen(false);
        setQuery("");
        setNavigating(slug); // show per-item spinner immediately
        router.push(`/questions/${slug}`);
    }, [router]);

    // ── Submit a custom question ─────────────────────────────────────────────
    const submitCustom = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || trimmed.length < 5) return;
        setSubmitting(true);
        setOpen(false);
        try {
            const res = await fetch("/api/questions/custom", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: trimmed }),
            });
            const data = await res.json();
            if (data.slug) {
                router.push(`/questions/${data.slug}`);
            }
        } catch {
            // Fallback — just redirect to search
            router.push(`/search3?q=${encodeURIComponent(trimmed)}&mode=semantic`);
        } finally {
            setSubmitting(false);
        }
    }, [router]);

    // ── Form submit: if exact curated match → navigate; else custom ──────────
    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = query.trim();
        if (!trimmed) return;

        // If the user navigated to a result via keyboard (activeIdx), use that
        if (activeIdx >= 0 && activeIdx < results.length) {
            goToQuestion(results[activeIdx].slug);
            return;
        }

        // Otherwise treat as a custom question
        submitCustom(trimmed);
    }

    // ── Keyboard navigation ──────────────────────────────────────────────────
    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (!open) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIdx(i => Math.min(i + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIdx(i => Math.max(i - 1, -1));
        } else if (e.key === "Escape") {
            setOpen(false);
            setActiveIdx(-1);
        } else if (e.key === "Enter" && activeIdx >= 0) {
            e.preventDefault();
            goToQuestion(results[activeIdx].slug);
        }
    }

    const isLocked = submitting || navigating !== null;
    const showCustomOption = query.trim().length >= 5 && !isLocked;

    return (
        <div ref={containerRef} className="mt-8 w-full max-w-2xl mx-auto relative">
            <form onSubmit={handleSubmit} className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => { setQuery(e.target.value); setActiveIdx(-1); }}
                        onKeyDown={handleKeyDown}
                        onFocus={() => { if (results.length > 0) setOpen(true); }}
                        placeholder="Ask anything about NDEs…"
                        disabled={isLocked}
                        autoComplete="off"
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-white shadow-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-base transition disabled:opacity-60"
                    />
                    {loading && (
                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 animate-spin" />
                    )}
                </div>
                <button
                    type="submit"
                    disabled={isLocked || !query.trim()}
                    className="shrink-0 px-5 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold text-sm transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
                >
                    {isLocked ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Searching…</>
                    ) : (
                        "Ask"
                    )}
                </button>
            </form>

            {/* ── Dropdown ─────────────────────────────────────────────────── */}
            {open && (results.length > 0 || showCustomOption) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-[9999]">
                    {/* Curated matches */}
                    {results.length > 0 && (
                        <div>
                            <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
                                Questions in our archive
                            </p>
                            {results.map((r, i) => (
                                <button
                                    key={r.slug}
                                    type="button"
                                    onClick={() => goToQuestion(r.slug)}
                                    disabled={navigating !== null}
                                    className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer ${
                                        i === activeIdx ? "bg-blue-50" : "hover:bg-slate-50"
                                    } disabled:cursor-default`}
                                >
                                    {navigating === r.slug ? (
                                        <Loader2 className="w-4 h-4 text-blue-500 shrink-0 animate-spin" />
                                    ) : (
                                        <BookOpen className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm leading-snug ${
                                            navigating === r.slug ? "text-blue-700 font-medium" : "text-slate-800"
                                        }`}>{r.consumer_question}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{r.category_label}</p>
                                    </div>
                                    {navigating === r.slug ? (
                                        <span className="text-xs text-blue-500 shrink-0">Loading…</span>
                                    ) : (
                                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Divider + custom option */}
                    {showCustomOption && (
                        <>
                            {results.length > 0 && <div className="border-t border-slate-100 mx-4" />}
                            <button
                                type="button"
                                onClick={() => submitCustom(query)}
                                className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors cursor-pointer group"
                            >
                                <Search className="w-4 h-4 text-blue-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-700 group-hover:text-blue-700 transition-colors">
                                        Search NDEs for: <span className="font-semibold">&ldquo;{query.trim()}&rdquo;</span>
                                    </p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Ask your own question — we&apos;ll search 5,000+ accounts
                                    </p>
                                </div>
                                <ArrowRight className="w-3.5 h-3.5 text-blue-300 group-hover:text-blue-500 transition-colors shrink-0" />
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
