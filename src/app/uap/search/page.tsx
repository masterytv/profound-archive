"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  X,
  Play,
  Calendar,
  Eye,
  ChevronRight,
  Sparkles,
  Keyboard,
  Clock,
  Filter,
} from "lucide-react";
import type { Metadata } from "next";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SearchDocument {
  id: string;
  videoId: string;
  title: string;
  content: string;
  channelName: string;
  viewCount: number;
  date: number;
  thumbnailUrl: string;
  url: string;
  startTime: number | null;
  summary: string | null;
  tier: number;
  track: string;
  similarity?: number;
}

interface SearchHit {
  document: SearchDocument;
  highlights: unknown[];
}

interface SearchResponse {
  found: number;
  hits: SearchHit[];
  facet_counts: {
    content_types?: string[];
    tiers?: number[];
    tracks?: string[];
    hynek_types?: string[];
    channel_names?: string[];
  };
  page: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCount(n: number | null): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(epochSec: number): string {
  if (!epochSec) return "";
  try {
    return new Date(epochSec * 1000).toLocaleDateString(undefined, { year: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function videoRoute(tier: number, videoId: string): string {
  return tier === 1 ? `/uap/encounters/${videoId}` : `/uap/programs/${videoId}`;
}

const CONTENT_TYPE_LABELS: Record<string, string> = {
  first_person_encounter: "Encounter",
  retold_story: "Retold",
  program_disclosure: "Disclosure",
  research_analysis: "Research",
  documentary: "Documentary",
  interview_panel: "Interview",
  lecture: "Lecture",
  news_report: "News",
};

// ─── Search Page ────────────────────────────────────────────────────────────

export default function UapSearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="animate-pulse text-slate-400 text-sm">Loading search...</div>
      </div>
    }>
      <UapSearchContent />
    </Suspense>
  );
}

function UapSearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State from URL
  const initialQuery = searchParams.get("q") ?? "";
  const initialMode = (searchParams.get("mode") ?? "keyword") as "keyword" | "semantic";

  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<"keyword" | "semantic">(initialMode);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Run search on mount if URL has query
  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery, initialMode, 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = useCallback(
    async (searchQuery: string, searchMode: "keyword" | "semantic", pageNum: number, activeFilters?: Record<string, unknown>) => {
      if (!searchQuery.trim()) return;
      setLoading(true);

      // Update URL
      const params = new URLSearchParams();
      params.set("q", searchQuery);
      params.set("mode", searchMode);
      router.replace(`/uap/search?${params.toString()}`, { scroll: false });

      try {
        const res = await fetch("/api/uap/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            searchTerm: searchQuery,
            type: searchMode,
            page: pageNum,
            filters: activeFilters ?? filters,
          }),
        });
        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        const data: SearchResponse = await res.json();
        setResults(data);
        setPage(pageNum);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    },
    [filters, router],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query, mode, 1);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header + Search Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 max-w-5xl py-4">
          <nav className="text-sm text-slate-400 dark:text-slate-500 mb-3">
            <Link href="/uap" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">UAP</Link>
            <span className="mx-1.5">›</span>
            <span className="text-slate-600 dark:text-slate-300">Search</span>
          </nav>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search UAP encounters, research, and disclosure..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-400 transition-all"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center bg-white dark:bg-white/10 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setMode("keyword")}
                className={`px-3 py-2.5 text-xs font-medium transition-colors flex items-center gap-1 ${
                  mode === "keyword"
                    ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" /> Keyword
              </button>
              <button
                type="button"
                onClick={() => setMode("semantic")}
                className={`px-3 py-2.5 text-xs font-medium transition-colors flex items-center gap-1 ${
                  mode === "semantic"
                    ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Semantic
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              Search
            </button>
          </form>

          {/* Filter toggle */}
          {results?.facet_counts && (
            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-green-600 flex items-center gap-1 transition-colors"
              >
                <Filter className="w-3 h-3" /> {showFilters ? "Hide filters" : "Show filters"}
              </button>
              {results && (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {results.found.toLocaleString()} result{results.found !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}

          {/* Inline Filters */}
          {showFilters && results?.facet_counts && (
            <FilterBar
              facets={results.facet_counts}
              filters={filters}
              onChange={(f) => {
                setFilters(f);
                handleSearch(query, mode, 1, f);
              }}
            />
          )}
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 max-w-5xl py-6">
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse flex gap-4 p-4 rounded-xl bg-white/50 dark:bg-white/5">
                <div className="w-40 h-24 bg-slate-200 dark:bg-slate-700 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && results && results.hits.length === 0 && (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-lg">
              No results found for &ldquo;{query}&rdquo;
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
              Try a different query or switch to {mode === "keyword" ? "semantic" : "keyword"} mode.
            </p>
          </div>
        )}

        {!loading && results && results.hits.length > 0 && (
          <div className="space-y-3">
            {results.hits.map((hit) => (
              <SearchResultCard key={hit.document.id} doc={hit.document} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && results && results.found > 12 && (
          <div className="flex justify-center gap-2 mt-8">
            {page > 1 && (
              <button
                onClick={() => handleSearch(query, mode, page - 1)}
                className="px-4 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
              >
                Previous
              </button>
            )}
            <span className="px-4 py-2 text-sm text-slate-500">Page {page}</span>
            {results.hits.length === 12 && (
              <button
                onClick={() => handleSearch(query, mode, page + 1)}
                className="px-4 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
              >
                Next
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && !results && (
          <div className="text-center py-24 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-green-600 dark:text-green-400" />
            </div>
            <h2
              className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              Search UAP Content
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Search across encounter reports, disclosure research, and UAP analysis.
              Use <strong>keyword</strong> for exact terms or <strong>semantic</strong> for meaning-based search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Result Card ────────────────────────────────────────────────────────────

function SearchResultCard({ doc }: { doc: SearchDocument }) {
  const href = doc.startTime
    ? `${videoRoute(doc.tier, doc.videoId)}?t=${Math.floor(doc.startTime)}`
    : videoRoute(doc.tier, doc.videoId);

  return (
    <Link
      href={href}
      className="group flex gap-4 p-4 rounded-xl bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 hover:shadow-md hover:border-green-300/60 dark:hover:border-green-600/30 transition-all"
    >
      {/* Thumbnail */}
      <div className="relative w-40 sm:w-48 h-24 sm:h-28 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
        {doc.thumbnailUrl ? (
          <Image src={doc.thumbnailUrl} alt={doc.title} fill sizes="200px" className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-6 h-6 text-slate-400" />
          </div>
        )}
        {doc.startTime && doc.startTime > 0 && (
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-white text-[10px] font-mono rounded">
            <Clock className="w-2.5 h-2.5 inline mr-0.5" />
            {formatTimestamp(doc.startTime)}
          </div>
        )}
        <div className="absolute top-1 left-1">
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
            doc.tier === 1 ? "bg-green-600/90 text-white" : "bg-slate-800/80 text-slate-200"
          }`}>
            {doc.tier === 1 ? "Encounter" : "Research"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors line-clamp-2 leading-snug mb-1">
          {doc.title}
        </h3>
        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mb-2">
          {doc.channelName && <span>{doc.channelName}</span>}
          {doc.date > 0 && (
            <>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="flex items-center gap-0.5">
                <Calendar className="w-3 h-3" /> {formatDate(doc.date)}
              </span>
            </>
          )}
          {doc.viewCount > 0 && (
            <>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="flex items-center gap-0.5">
                <Eye className="w-3 h-3" /> {formatCount(doc.viewCount)}
              </span>
            </>
          )}
          {doc.similarity && (
            <>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="text-green-600 dark:text-green-400 font-medium">
                {Math.round(doc.similarity * 100)}% match
              </span>
            </>
          )}
        </div>
        {doc.content && (
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
            {doc.content}
          </p>
        )}
      </div>
    </Link>
  );
}

// ─── Filter Bar ─────────────────────────────────────────────────────────────

function FilterBar({
  facets,
  filters,
  onChange,
}: {
  facets: SearchResponse["facet_counts"];
  filters: Record<string, unknown>;
  onChange: (f: Record<string, unknown>) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mt-3 py-2">
      {/* Tier filter */}
      <select
        value={(filters.tier as string) ?? ""}
        onChange={(e) => onChange({ ...filters, tier: e.target.value || null })}
        className="text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
      >
        <option value="">All Tiers</option>
        <option value="1">Tier 1 — Encounters</option>
        <option value="2">Tier 2 — Research</option>
      </select>

      {/* Track filter */}
      {facets.tracks && facets.tracks.length > 1 && (
        <select
          value={(filters.track as string) ?? ""}
          onChange={(e) => onChange({ ...filters, track: e.target.value || null })}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
        >
          <option value="">All Tracks</option>
          {facets.tracks.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      )}

      {/* Content Type */}
      {facets.content_types && facets.content_types.length > 1 && (
        <select
          value={(filters.contentType as string) ?? ""}
          onChange={(e) => onChange({ ...filters, contentType: e.target.value || null })}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
        >
          <option value="">All Types</option>
          {facets.content_types.map((ct) => (
            <option key={ct} value={ct}>{CONTENT_TYPE_LABELS[ct] ?? ct.replace(/_/g, " ")}</option>
          ))}
        </select>
      )}

      {/* Clear */}
      {Object.values(filters).some(Boolean) && (
        <button
          onClick={() => onChange({})}
          className="text-[11px] text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1"
        >
          <X className="w-3 h-3" /> Clear
        </button>
      )}
    </div>
  );
}
