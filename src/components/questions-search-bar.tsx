"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function QuestionsSearchBar() {
    const [query, setQuery] = useState("");
    const router = useRouter();

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = query.trim();
        if (!trimmed) return;
        router.push(`/search3?q=${encodeURIComponent(trimmed)}&mode=semantic`);
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="mt-8 flex w-full max-w-2xl mx-auto gap-2"
        >
            <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask anything about NDEs…"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-white shadow-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-base transition"
                />
            </div>
            <button
                type="submit"
                className="shrink-0 px-5 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors shadow-sm"
            >
                Search
            </button>
        </form>
    );
}
