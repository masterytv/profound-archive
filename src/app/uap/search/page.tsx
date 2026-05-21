"use client";

import { useState, useCallback, useRef, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  X,
  Cpu,
  Keyboard,
  Filter,
  Bookmark,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { UapSearchResultCard, type GroupedUapVideo } from "@/components/uap-search-result-card";

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
    experience_types?: string[];
    recurrence_patterns?: string[];
    entity_types?: string[];
    evidence_type_values?: string[];
  };
  page: number;
}



/** Group flat search hits by videoId, collecting transcript chunks under each video */
function groupResultsByVideo(hits: SearchHit[]): GroupedUapVideo[] {
  const grouped = new Map<string, GroupedUapVideo>();
  for (const hit of hits) {
    const doc = hit.document;
    if (!grouped.has(doc.videoId)) {
      grouped.set(doc.videoId, {
        videoId: doc.videoId,
        url: doc.url,
        title: doc.title,
        thumbnailUrl: doc.thumbnailUrl,
        date: doc.date,
        viewCount: doc.viewCount,
        channelName: doc.channelName,
        summary: doc.summary,
        tier: doc.tier,
        track: doc.track,
        transcripts: [],
      });
    }
    grouped.get(doc.videoId)!.transcripts.push({
      content: doc.content,
      startTime: doc.startTime,
      similarity: doc.similarity,
    });
  }
  return Array.from(grouped.values());
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
  const supabase = createClient();
  const { toast } = useToast();

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
  const [user, setUser] = useState<User | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Group flat hits by videoId for rich card display
  const groupedResults = useMemo(
    () => (results ? groupResultsByVideo(results.hits) : []),
    [results],
  );

  // Check auth for save functionality — use getSession() to avoid navigator.lock contention
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch {
        // Harmless — session not available yet
      }
    };
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleSaveSearch = async () => {
    if (!user) return;
    if (!query.trim()) {
      toast({ title: "Cannot save empty search", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("saved_searches")
      .insert({
        user_id: user.id,
        search_term: query.trim(),
        search_type: mode,
        sort_by: "relevance",
        sort_direction: "desc",
        domain: "uap",
      });
    if (error) {
      toast({ title: "Error saving search", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Search Saved!", description: `"${query.trim()}" saved to your dashboard.` });
    }
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
                <Cpu className="w-3.5 h-3.5" /> Semantic
              </button>
            </div>

            {user && query.trim() && (
              <button
                type="button"
                onClick={handleSaveSearch}
                className="p-2.5 text-slate-400 hover:text-green-600 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/10 transition-colors"
                aria-label="Save search to dashboard"
              >
                <Bookmark className="w-4 h-4" />
              </button>
            )}
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
          <div className="space-y-4">
            {groupedResults.map((video) => (
              <UapSearchResultCard
                key={video.videoId}
                video={video}
                searchTerm={query}
                user={user}
              />
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

      {/* Experience Type */}
      {facets.experience_types && facets.experience_types.length > 0 && (
        <select
          value={(filters.experienceType as string) ?? ""}
          onChange={(e) => onChange({ ...filters, experienceType: e.target.value || null })}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
        >
          <option value="">Experience Type</option>
          {facets.experience_types.map((et) => (
            <option key={et} value={et}>{et.replace(/_/g, " ")}</option>
          ))}
        </select>
      )}

      {/* Entity Type */}
      {facets.entity_types && facets.entity_types.length > 0 && (
        <select
          value={(filters.entityType as string) ?? ""}
          onChange={(e) => onChange({ ...filters, entityType: e.target.value || null })}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
        >
          <option value="">Entity Type</option>
          {facets.entity_types.map((et) => (
            <option key={et} value={et}>{et.replace(/_/g, " ")}</option>
          ))}
        </select>
      )}

      {/* Evidence Type */}
      {facets.evidence_type_values && facets.evidence_type_values.length > 0 && (
        <select
          value={(filters.evidenceType as string) ?? ""}
          onChange={(e) => onChange({ ...filters, evidenceType: e.target.value || null })}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
        >
          <option value="">Evidence Type</option>
          {facets.evidence_type_values.map((ev) => (
            <option key={ev} value={ev}>{ev.replace(/_/g, " ")}</option>
          ))}
        </select>
      )}

      {/* Recurrence Pattern */}
      {facets.recurrence_patterns && facets.recurrence_patterns.length > 0 && (
        <select
          value={(filters.recurrence as string) ?? ""}
          onChange={(e) => onChange({ ...filters, recurrence: e.target.value || null })}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
        >
          <option value="">Recurrence</option>
          {facets.recurrence_patterns.map((rp) => (
            <option key={rp} value={rp}>{rp.replace(/_/g, " ")}</option>
          ))}
        </select>
      )}

      {/* Hynek Classification */}
      {facets.hynek_types && facets.hynek_types.length > 0 && (
        <select
          value={(filters.hynekType as string) ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            onChange({ ...filters, hynekType: val ? [val] : null });
          }}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
        >
          <option value="">Hynek Class</option>
          {facets.hynek_types.map((ht) => (
            <option key={ht} value={ht}>{ht}</option>
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
