"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { SearchResultCardV4 } from "@/components/search-result-card-v4";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Loader2, Search, ChevronDown, ChevronUp, Bookmark, SlidersHorizontal, BrainCircuit, ArrowUpDown, FlaskConical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Link from "next/link";

// Shape of a single document returned from our API
interface HitDocument {
    id: string;
    title: string;
    content: string;
    videoId: string;
    channelName: string;
    isNde: string;
    viewCount: number;
    date: number;
    thumbnailUrl: string;
    url: string;
    start_time: number;
    analysis_nde_summary?: string;
    similarity?: number;
}

interface GroupedVideo {
    video_id: string;
    url: string;
    title: string;
    thumbnailUrl: string;
    date: string | null;
    viewCount: string;
    channelName: string;
    summary: string;
    tags: string[];
    transcripts: Array<{
        content: string;
        start_time: number;
        similarity?: number;
    }>;
}

interface FacetCount {
    field_name: string;
    counts: Array<{
        count: number;
        value: string;
    }>;
}

interface SearchResponse {
    found: number;
    hits: Array<{ document: HitDocument }>;
    facet_counts: FacetCount[];
}

function SearchV4Content() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const supabase = createClient();

    const [user, setUser] = useState<User | null>(null);
    const initialQuery = searchParams.get("q") || "";
    const initialSortBy = searchParams.get("sort") || "viewCount";
    const initialDirection = (searchParams.get("dir") as "asc" | "desc") || "desc";
    const initialType = (searchParams.get("type") as "keyword" | "semantic") || "keyword";
    const initialSimilarity = parseFloat(searchParams.get("sim") || "0.50");

    const [searchTerm, setSearchTerm] = useState(initialQuery);
    const [sortBy, setSortBy] = useState(initialSortBy);
    const [direction, setDirection] = useState<"asc" | "desc">(initialDirection);
    const [searchType, setSearchType] = useState<"keyword" | "semantic">(initialType);
    const [similarity, setSimilarity] = useState(initialSimilarity);
    const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});

    const [results, setResults] = useState<HitDocument[]>([]);
    const [facets, setFacets] = useState<FacetCount[]>([]);
    const [totalHits, setTotalHits] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedFacets, setExpandedFacets] = useState<Record<string, boolean>>({});
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Filter panel collapsible state (mobile responsive)
    const [isFiltersOpen, setIsFiltersOpen] = useState(true);

    const [localGreyson, setLocalGreyson] = useState<number>(0);
    const [localTransformation, setLocalTransformation] = useState<number>(0);
    const [localVeridical, setLocalVeridical] = useState<number>(0);

    // Sync local state when activeFilters change from URL
    useEffect(() => {
        setLocalGreyson(activeFilters.minGreyson?.length ? parseInt(activeFilters.minGreyson[0]) : 0);
        setLocalTransformation(activeFilters.minTransformation?.length ? parseInt(activeFilters.minTransformation[0]) : 0);
        setLocalVeridical(activeFilters.minVeridical?.length ? parseInt(activeFilters.minVeridical[0]) : 0);
    }, [activeFilters]);

    const { toast } = useToast();

    useEffect(() => {
        const getUser = async () => {
            const { data } = await supabase.auth.getUser();
            setUser(data.user);
        }
        getUser();

        // Setup initial responsive filter state
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setIsFiltersOpen(false);
            } else {
                setIsFiltersOpen(true);
            }
        };

        // Trigger once on mount
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [supabase]);

    useEffect(() => {
        const filterParam = searchParams.get("filter");
        if (filterParam) {
            try {
                const parsed = JSON.parse(filterParam);
                setActiveFilters(parsed);
            } catch (e) { }
        }
    }, [searchParams]);

    useEffect(() => {
        const q = searchParams.get("q") || "";
        setSearchTerm(q);
        const sort = searchParams.get("sort") || "viewCount";
        setSortBy(sort);
        const dir = (searchParams.get("dir") as "asc" | "desc") || "desc";
        setDirection(dir);
        const type = (searchParams.get("type") as "keyword" | "semantic") || "keyword";
        setSearchType(type);
        const sim = parseFloat(searchParams.get("sim") || "0.50");
        setSimilarity(sim);

        const filterParam = searchParams.get("filter");
        let filters = {};
        if (filterParam) {
            try { filters = JSON.parse(filterParam); } catch (e) { }
        }
        setActiveFilters(filters);
        setPage(1);

        if (q || filterParam) {
            performSearch(q, filters, 1, true, sort, dir, type, sim);
        } else {
            setResults([]);
            setHasSearched(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const performSearch = async (
        term: string,
        filters: Record<string, string[]>,
        pageNum: number,
        isNewSearch: boolean,
        currentSort: string = sortBy,
        currentDir: string = direction,
        currentType: "keyword" | "semantic" = searchType,
        currentSim: number = similarity
    ) => {
        const query = term.trim() || "*";
        if (isNewSearch) {
            setIsLoading(true);
            setError(null);
        } else {
            setIsLoadingMore(true);
        }

        let sortParam = currentSort;
        if (currentType === 'keyword') {
            if (currentSort === 'viewCount') sortParam = `viewCount:${currentDir}`;
            else if (currentSort === 'date') sortParam = `date:${currentDir}`;
            else if (currentSort === 'text_match' || currentSort === 'relevance') sortParam = `_text_match:${currentDir}`;
            else if (currentSort === 'title') sortParam = `title:${currentDir}`;
            else if (currentSort === 'channelName') sortParam = `channelName:${currentDir}`;
        } else {
            if (currentSort === 'relevance' || currentSort === 'text_match') sortParam = 'similarity';
            sortParam = `${sortParam}:${currentDir}`;
        }

        try {
            const response = await fetch('/api/search3', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    searchTerm: query,
                    filters: filters,
                    page: pageNum,
                    sortBy: sortParam,
                    type: currentType,
                    similarity: currentSim
                }),
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Search failed: ${response.status} ${errText}`);
            }

            const data: SearchResponse = await response.json();
            const newHits = data.hits.map(hit => hit.document);

            if (isNewSearch) {
                setResults(newHits);
                setFacets(data.facet_counts || []);
                setTotalHits(data.found);
                setHasSearched(true);
            } else {
                setResults(prev => [...prev, ...newHits]);
            }

            const total = data.found;
            if (newHits.length < 12 || (results.length + newHits.length) >= total) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

        } catch (error) {
            console.error("Search failed:", error);
            setError(error instanceof Error ? error.message : "An error occurred");
            toast({
                title: "Search Failed",
                description: "An error occurred. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    };

    const updateUrl = (
        term: string,
        filters: Record<string, string[]>,
        sort: string,
        dir: string,
        type: "keyword" | "semantic",
        sim: number
    ) => {
        const params = new URLSearchParams(searchParams.toString());
        if (term.trim()) { params.set("q", term.trim()); } else { params.delete("q"); }
        if (Object.keys(filters).length > 0) {
            params.set("filter", JSON.stringify(filters));
        } else {
            params.delete("filter");
        }
        params.set("sort", sort);
        params.set("dir", dir);
        params.set("type", type);
        params.set("sim", sim.toString());
        params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`);
    };

    const onSearchClick = () => {
        updateUrl(searchTerm, activeFilters, sortBy, direction, searchType, similarity);
    };

    const handleFilterChange = (facetField: string, value: string) => {
        const newFilters = { ...activeFilters };
        const currentFilterValues = newFilters[facetField] || [];
        if (currentFilterValues.includes(value)) {
            newFilters[facetField] = currentFilterValues.filter(v => v !== value);
        } else {
            newFilters[facetField] = [...currentFilterValues, value];
        }
        if (newFilters[facetField].length === 0) {
            delete newFilters[facetField];
        }
        updateUrl(searchTerm, newFilters, sortBy, direction, searchType, similarity);
    };

    const handleScoreFilterChange = (field: string, value: number) => {
        const newFilters = { ...activeFilters };
        if (value > 0) {
            newFilters[field] = [value.toString()];
        } else {
            delete newFilters[field];
        }
        updateUrl(searchTerm, newFilters, sortBy, direction, searchType, similarity);
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        performSearch(searchTerm, activeFilters, nextPage, false);
    };

    const toggleFacetExpansion = (fieldName: string) => {
        setExpandedFacets(prev => ({ ...prev, [fieldName]: !prev[fieldName] }));
    };

    const handleSaveSearch = async () => {
        if (!user) return;
        if (!searchTerm.trim()) {
            toast({ title: 'Cannot save empty search', variant: 'destructive' });
            return;
        }
        const { error } = await supabase
            .from('saved_searches')
            .insert({
                user_id: user.id,
                search_term: searchTerm.trim(),
                search_type: searchType,
                sort_by: sortBy,
                sort_direction: direction,
                similarity_threshold: similarity
            });
        if (error) {
            toast({ title: 'Error saving search', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Search Saved!', description: `"${searchTerm.trim()}" has been saved to your dashboard.` });
        }
    };

    const groupResultsByVideo = (results: HitDocument[]): GroupedVideo[] => {
        const grouped = new Map<string, GroupedVideo>();
        results.forEach((doc) => {
            if (!grouped.has(doc.videoId)) {
                grouped.set(doc.videoId, {
                    video_id: doc.videoId,
                    url: doc.url,
                    title: doc.title,
                    thumbnailUrl: doc.thumbnailUrl,
                    date: new Date(doc.date * 1000).toISOString(),
                    viewCount: doc.viewCount.toString(),
                    channelName: doc.channelName,
                    summary: doc.analysis_nde_summary || "",
                    tags: [],
                    transcripts: [],
                });
            }
            grouped.get(doc.videoId)!.transcripts.push({
                content: doc.content,
                start_time: doc.start_time,
                similarity: doc.similarity,
            });
        });
        return Array.from(grouped.values());
    };

    const groupedResults = useMemo(() => groupResultsByVideo(results), [results]);

    const formatFacetTitle = (fieldName: string) => {
        if (fieldName === 'isNde') return 'Is NDE?';
        if (fieldName === 'channelName') return 'Channel';
        if (fieldName === 'experienceType') return 'Experience Type';
        if (fieldName === 'triggerCategory') return 'Trigger Category';
        if (fieldName === 'overallTone') return 'Overall Tone';
        if (fieldName === 'intensityBucket') return 'Intensity';
        return fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    };

    const formatFacetValue = (fieldName: string, value: string) => {
        if (fieldName === 'isNde') {
            if (value === 'clear_nde') return 'Clear NDE';
            if (value === 'possible_nde') return 'Possible NDE';
            if (value === 'not_nde') return 'Not NDE';
            if (!value || value === 'null') return 'Not Analysed';
        }
        return value;
    };

    return (
        <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
            {/* ─── Dev Banner ─── */}
            <div className="bg-amber-50 border-b border-amber-200">
                <div className="container mx-auto px-4 py-2 max-w-5xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
                        <FlaskConical className="w-4 h-4" />
                        <span>Dev Preview: V4 — Interactive Badges</span>
                    </div>
                    <Link href="/search3" className="text-xs text-amber-600 hover:text-amber-800 underline">
                        View Original
                    </Link>
                </div>
            </div>

            {/* ─── Search Header ─── */}
            <div
                className="border-b border-slate-200"
                style={{ background: "linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%)" }}
            >
                <div className="container mx-auto px-4 py-10 max-w-5xl">
                    <h1
                        className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-2"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                        Search Engine for the{" "}
                        <span className="text-blue-600" style={{ fontStyle: "italic" }}>Soul</span>
                    </h1>
                    <p className="text-slate-500 text-center mb-8">
                        Find specific moments in more than 5,000 NDE YouTube videos.
                    </p>

                    {/* Search Input */}
                    <div className="max-w-3xl mx-auto">
                        <form onSubmit={(e) => { e.preventDefault(); onSearchClick(); }}>
                            <div className="relative">
                                <Input
                                    type="text"
                                    placeholder={searchType === 'keyword'
                                        ? "Search for 'life review', 'tunnel', 'angels'..."
                                        : "Ask a question like 'what happens after we die?'..."
                                    }
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-32 h-14 text-lg rounded-2xl border-2 border-slate-200 focus:border-blue-400 shadow-sm bg-white"
                                    style={{ fontSize: "16px" }}
                                />
                                <Search className="w-5 h-5 absolute left-4 top-4.5 text-slate-400" />
                                <div className="absolute right-1.5 top-1.5 flex items-center gap-1.5">
                                    {user && searchTerm.trim() && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleSaveSearch}
                                            className="h-11 w-11 text-slate-400 hover:text-blue-600"
                                        >
                                            <Bookmark className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className={`rounded-xl px-6 h-11 font-medium ${searchType === 'semantic'
                                            ? "bg-blue-600 hover:bg-blue-700"
                                            : "bg-slate-900 hover:bg-slate-800"
                                            }`}
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                                    </Button>
                                </div>
                            </div>
                        </form>

                        {/* Mode + Sort Controls */}
                        <div className="flex flex-wrap items-center justify-between mt-4 gap-3">
                            {/* Search Type Pills */}
                            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                                <button
                                    onClick={() => setSearchType('keyword')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${searchType === 'keyword'
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                        }`}
                                >
                                    Keyword Match
                                </button>
                                <button
                                    onClick={() => setSearchType('semantic')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${searchType === 'semantic'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-blue-600 hover:bg-blue-50'
                                        }`}
                                >
                                    <BrainCircuit className="w-3.5 h-3.5" />
                                    Concept AI
                                </button>
                            </div>

                            {/* Sort controls */}
                            <div className="flex items-center gap-2">
                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="text-sm text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                >
                                    <option value="relevance">Relevance</option>
                                    <option value="viewCount">View Count</option>
                                    <option value="date">Date</option>
                                    <option value="title">Title</option>
                                    <option value="channelName">Channel</option>
                                </select>
                                <button
                                    onClick={() => setDirection(d => d === "desc" ? "asc" : "desc")}
                                    className="text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors"
                                >
                                    {direction === "desc" ? "↓ High" : "↑ Low"}
                                </button>
                            </div>
                        </div>

                        {/* Similarity slider for concept mode */}
                        {searchType === 'semantic' && (
                            <div className="mt-4 bg-white rounded-xl border border-slate-200 p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-slate-700">Similarity Threshold</span>
                                    <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-lg">{similarity.toFixed(2)}</span>
                                </div>
                                <Slider
                                    defaultValue={[0.5]}
                                    min={0} max={1} step={0.01}
                                    value={[similarity]}
                                    onValueChange={(vals) => setSimilarity(vals[0])}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                    <span>Broad</span>
                                    <span>Exact</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Results Area ─── */}
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Filters */}
                    {hasSearched && !isLoading && (
                        <div className="w-full lg:w-64 shrink-0">
                            <Collapsible
                                open={isFiltersOpen}
                                onOpenChange={setIsFiltersOpen}
                                className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto"
                            >
                                <CollapsibleTrigger asChild className="lg:hidden w-full cursor-pointer hover:bg-slate-50 rounded-xl transition-colors">
                                    <div className="flex items-center justify-between mb-0 pb-4">
                                        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                                            Filters
                                        </h2>
                                        <div className="h-8 w-8 flex flex-col justify-center items-center text-slate-400">
                                            {isFiltersOpen ? (
                                                <ChevronUp className="h-4 w-4" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4" />
                                            )}
                                        </div>
                                    </div>
                                </CollapsibleTrigger>

                                {/* Desktop static header (hidden on mobile) */}
                                <div className="hidden lg:flex items-center justify-between mb-4">
                                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                                        Filters
                                    </h2>
                                </div>
                                <CollapsibleContent className="space-y-4 pt-2">
                                    <Accordion type="multiple" defaultValue={facets.map(f => f.field_name)} className="w-full">
                                        {facets.filter(f => f.field_name !== 'isNde').map(facet => {
                                            const isExpanded = expandedFacets[facet.field_name] || false;
                                            const visibleItems = isExpanded ? facet.counts : facet.counts.slice(0, 10);
                                            const hasMoreItems = facet.counts.length > 10;

                                            return (
                                                <AccordionItem value={facet.field_name} key={facet.field_name} className="border-b-0">
                                                    <AccordionTrigger className="text-xs font-semibold uppercase tracking-wider text-slate-500 py-3 hover:no-underline">
                                                        {formatFacetTitle(facet.field_name)}
                                                    </AccordionTrigger>
                                                    <AccordionContent>
                                                        <div className="space-y-2">
                                                            {visibleItems.map(item => (
                                                                <div className="flex items-center space-x-2" key={item.value}>
                                                                    <Checkbox
                                                                        id={`v4-${facet.field_name}-${item.value}`}
                                                                        onCheckedChange={() => handleFilterChange(facet.field_name, item.value)}
                                                                        checked={(activeFilters[facet.field_name] || []).includes(item.value)}
                                                                    />
                                                                    <label
                                                                        htmlFor={`v4-${facet.field_name}-${item.value}`}
                                                                        className="text-sm text-slate-600 leading-none cursor-pointer"
                                                                    >
                                                                        {formatFacetValue(facet.field_name, item.value)}{" "}
                                                                        <span className="text-slate-400">({item.count})</span>
                                                                    </label>
                                                                </div>
                                                            ))}
                                                            {hasMoreItems && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 px-2 text-xs w-full justify-between text-blue-600 hover:text-blue-700"
                                                                    onClick={() => toggleFacetExpansion(facet.field_name)}
                                                                >
                                                                    {isExpanded ? (
                                                                        <>Show Fewer <ChevronUp className="h-3 w-3 ml-1" /></>
                                                                    ) : (
                                                                        <>Show {facet.counts.length - 10} More <ChevronDown className="h-3 w-3 ml-1" /></>
                                                                    )}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            );
                                        })}
                                    </Accordion>

                                    {/* Numeric Score Filters */}
                                    <div className="mt-6 pt-4 border-t border-slate-200">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Minimum Scores</h3>

                                        <div className="space-y-6">
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-600 font-medium">Greyson Scale</span>
                                                    <span className="text-primary font-bold">{localGreyson}+</span>
                                                </div>
                                                <Slider
                                                    min={0}
                                                    max={32}
                                                    step={1}
                                                    value={[localGreyson]}
                                                    onValueChange={(val) => setLocalGreyson(val[0])}
                                                    onValueCommit={(val) => handleScoreFilterChange('minGreyson', val[0])}
                                                />
                                                <div className="flex justify-between text-xs text-slate-400">
                                                    <span>0</span>
                                                    <span>32</span>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-600 font-medium">Transformation</span>
                                                    <span className="text-primary font-bold">{localTransformation}+</span>
                                                </div>
                                                <Slider
                                                    min={0}
                                                    max={50}
                                                    step={1}
                                                    value={[localTransformation]}
                                                    onValueChange={(val) => setLocalTransformation(val[0])}
                                                    onValueCommit={(val) => handleScoreFilterChange('minTransformation', val[0])}
                                                />
                                                <div className="flex justify-between text-xs text-slate-400">
                                                    <span>0</span>
                                                    <span>50</span>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-600 font-medium">Veridical (M-CVNDE)</span>
                                                    <span className="text-primary font-bold">{localVeridical}+</span>
                                                </div>
                                                <Slider
                                                    min={0}
                                                    max={25}
                                                    step={1}
                                                    value={[localVeridical]}
                                                    onValueChange={(val) => setLocalVeridical(val[0])}
                                                    onValueCommit={(val) => handleScoreFilterChange('minVeridical', val[0])}
                                                />
                                                <div className="flex justify-between text-xs text-slate-400">
                                                    <span>0</span>
                                                    <span>25</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        </div>
                    )}

                    {/* Main Results */}
                    <div className="w-full lg:flex-1 min-w-0">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6 text-sm">
                                <strong>Error:</strong> {error}
                            </div>
                        )}

                        {isLoading ? (
                            <div className="space-y-4">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="bg-white rounded-2xl border border-slate-200/60 p-6">
                                        <div className="flex gap-4">
                                            <Skeleton className="w-48 h-28 rounded-xl shrink-0" />
                                            <div className="flex-1 space-y-3">
                                                <Skeleton className="h-5 w-3/4" />
                                                <Skeleton className="h-4 w-1/2" />
                                                <Skeleton className="h-16 w-full" />
                                                <div className="flex gap-2">
                                                    <Skeleton className="h-5 w-12 rounded-full" />
                                                    <Skeleton className="h-5 w-16 rounded-full" />
                                                    <Skeleton className="h-5 w-20 rounded-full" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : hasSearched ? (
                            <>
                                <div className="mb-5 flex items-center justify-between">
                                    <p className="text-sm text-slate-500">
                                        <strong className="text-slate-800">{totalHits >= 2000 ? "2,000+" : totalHits.toLocaleString()}</strong> results found
                                    </p>
                                </div>

                                {results.length === 0 ? (
                                    <div className="text-center py-20">
                                        <h3 className="text-lg font-semibold text-slate-800 mb-2">No results found.</h3>
                                        <p className="text-slate-500">Try a different search term or adjust your filters.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {groupedResults.map(video => (
                                            <SearchResultCardV4
                                                key={video.video_id}
                                                video={video}
                                                searchTerm={searchTerm}
                                                user={user}
                                            />
                                        ))}

                                        {hasMore && (
                                            <div className="flex justify-center pt-6 pb-4">
                                                <Button
                                                    onClick={handleLoadMore}
                                                    disabled={isLoadingMore}
                                                    className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-600/20"
                                                >
                                                    {isLoadingMore ? (
                                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</>
                                                    ) : (
                                                        "Load More Results"
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            /* Empty state before first search */
                            <div className="text-center py-20">
                                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-blue-50 flex items-center justify-center">
                                    <Search className="w-7 h-7 text-blue-400" />
                                </div>
                                <h3
                                    className="text-xl font-bold text-slate-800 mb-2"
                                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                                >
                                    Start your search
                                </h3>
                                <p className="text-slate-400 max-w-md mx-auto">
                                    Enter a keyword or question above to find relevant NDE accounts across 5,000+ transcripts.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SearchV4DevPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        }>
            <SearchV4Content />
        </Suspense>
    );
}
