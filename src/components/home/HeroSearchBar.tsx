"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Client island for the homepage hero.
 * Renders a search bar + keyword/concept toggle.
 * On submit, navigates to /search3 with the appropriate query params.
 */
export function HeroSearchBar() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [searchType, setSearchType] = useState<"keyword" | "semantic">(
        "keyword"
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (query.trim()) {
            params.set("q", query.trim());
        }
        params.set("type", searchType);
        params.set("sort", "viewCount");
        params.set("dir", "desc");
        if (searchType === "semantic") {
            params.set("sim", "0.50");
        }
        router.push(`/search3?${params.toString()}`);
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
            {/* Search input */}
            <div className="relative mb-4">
                <Input
                    type="text"
                    placeholder={
                        searchType === "keyword"
                            ? "Search for 'life review', 'tunnel', 'angels'..."
                            : "Ask a question like 'what happens after we die?'..."
                    }
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-11 pr-28 h-14 text-lg rounded-full border-2 border-primary/20 focus:border-primary shadow-lg bg-white dark:bg-slate-800 dark:border-slate-600/50 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                <Search className="w-5 h-5 absolute left-4 top-4.5 text-muted-foreground" />
                <Button
                    type="submit"
                    size="lg"
                    className={`absolute right-1.5 top-1.5 rounded-full px-6 h-11 ${searchType === "semantic"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : ""
                        }`}
                >
                    Search
                </Button>
            </div>

            {/* Search mode toggle */}
            <div className="flex justify-center">
                <div className="inline-flex items-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-1 rounded-full border dark:border-slate-700 shadow-sm">
                    <button
                        type="button"
                        onClick={() => setSearchType("keyword")}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${searchType === "keyword"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        Keyword Match
                    </button>
                    <button
                        type="button"
                        onClick={() => setSearchType("semantic")}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${searchType === "semantic"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                            }`}
                    >
                        <BrainCircuit className="w-3 h-3" />
                        Concept AI
                    </button>
                </div>
            </div>
        </form>
    );
}
