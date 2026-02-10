"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { SearchResultCard } from "@/components/search-result-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Loader2, MessageSquare, Search, ChevronDown, ChevronUp, Bookmark, SlidersHorizontal, Sparkles } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";

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

// Shape for grouping results by video
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

// Shape of the facet counts from the API
interface FacetCount {
    field_name: string;
    counts: Array<{
        count: number;
        value: string;
    }>;
}

// Shape of the entire API response
interface SearchResponse {
    found: number;
    hits: Array<{ document: HitDocument }>;
    facet_counts: FacetCount[];
}

function SearchV3Content() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const supabase = createClient();

    // User state
    const [user, setUser] = useState<User | null>(null);

    // Initialize state from URL params
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

    // Internal state
    const [results, setResults] = useState<HitDocument[]>([]);
    const [facets, setFacets] = useState<FacetCount[]>([]);
    const [totalHits, setTotalHits] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedFacets, setExpandedFacets] = useState<Record<string, boolean>>({});

    // Pagination state
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const { toast } = useToast();

    // Check for user on mount
    useEffect(() => {
        const getUser = async () => {
            const { data } = await supabase.auth.getUser();
            setUser(data.user);
        }
        getUser();
    }, [supabase]);


    // Initial parsing of filters from URL
    useEffect(() => {
        const filterParam = searchParams.get("filter");
        if (filterParam) {
            try {
                const parsed = JSON.parse(filterParam);
                setActiveFilters(parsed);
            } catch (e) {
                // Ignore or handle legacy format
            }
        }
    }, [searchParams]);

    // Sync state with URL whenever search params change
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
            try {
                filters = JSON.parse(filterParam);
            } catch (e) { }
        }
        setActiveFilters(filters);

        // Reset page to 1 when URL params change (new search context)
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
            // For semantic, map to what routes.ts expectation or let route handle it
            // Route expects "column:DIRECTION" or just "column"
            if (currentSort === 'relevance' || currentSort === 'text_match') sortParam = 'similarity';
            sortParam = `${sortParam}:${currentDir}`;
        }

        try {
            const response = await fetch('/api/search3', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    searchTerm: query,
                    filters: currentType === 'keyword' ? filters : {}, // Disable filters for semantic for now
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

            // Determine if there are more results
            // Typesense returns strict found count, RPC returns dummy 100 sometimes or exact
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

        if (term.trim()) {
            params.set("q", term.trim());
        } else {
            params.delete("q");
        }

        if (type === 'keyword' && Object.keys(filters).length > 0) {
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

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearchClick();
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

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        performSearch(searchTerm, activeFilters, nextPage, false);
    };

    const toggleFacetExpansion = (fieldName: string) => {
        setExpandedFacets(prev => ({
            ...prev,
            [fieldName]: !prev[fieldName]
        }));
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
                    tags: [], // Not returned by Typesense yet
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

    const FilterSidebar = () => (
        <div className="w-full lg:w-1/4 xl:w-1/5 space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5" />
                Filters
            </h2>
            {searchType === 'semantic' ? (
                <div className="bg-blue-50 text-blue-800 p-4 rounded-md text-sm">
                    Filters are currently disabled in Semantic Mode. Switch to Keyword Search to filter by Channel, NDE status, etc.
                </div>
            ) : (
                <Accordion type="multiple" defaultValue={facets.map(f => f.field_name)} className="w-full">
                    {facets.map(facet => {
                        const isExpanded = expandedFacets[facet.field_name] || false;
                        const visibleItems = isExpanded ? facet.counts : facet.counts.slice(0, 10);
                        const hasMoreItems = facet.counts.length > 10;

                        return (
                            <AccordionItem value={facet.field_name} key={facet.field_name}>
                                <AccordionTrigger className="capitalize">{formatFacetTitle(facet.field_name)}</AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-2">
                                        {visibleItems.map(item => (
                                            <div className="flex items-center space-x-2" key={item.value}>
                                                <Checkbox
                                                    id={`${facet.field_name}-${item.value}`}
                                                    onCheckedChange={() => handleFilterChange(facet.field_name, item.value)}
                                                    checked={(activeFilters[facet.field_name] || []).includes(item.value)}
                                                />
                                                <label htmlFor={`${facet.field_name}-${item.value}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    {formatFacetValue(facet.field_name, item.value)} ({item.count})
                                                </label>
                                            </div>
                                        ))}
                                        {hasMoreItems && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2 text-xs font-medium mt-2 w-full justify-between"
                                                onClick={() => toggleFacetExpansion(facet.field_name)}
                                            >
                                                {isExpanded ? (
                                                    <>
                                                        Show Fewer <ChevronUp className="h-3 w-3 ml-1" />
                                                    </>
                                                ) : (
                                                    <>
                                                        Show {facet.counts.length - 10} More <ChevronDown className="h-3 w-3 ml-1" />
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        );
                    })}
                </Accordion>
            )}
        </div>
    );

    return (
        <div className="container mx-auto p-4 py-12 max-w-6xl">
            <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-8">
                <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2">Search Engine for the Soul</h1>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <p className="text-muted-foreground">Find specific moments in more than 5000 NDE YouTube videos.</p>
                    <Link href="/chat-compassionate" className="text-primary hover:underline text-sm flex items-center gap-1 font-medium bg-primary/10 px-3 py-1 rounded-full">
                        <MessageSquare className="w-4 h-4" />
                        Chat with our AI
                    </Link>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">Search Term</label>
                    <div className="relative">
                        <Input
                            type="text"
                            placeholder={searchType === 'keyword' ? "e.g., 'life review' 'tunnel' 'angels' (Exact keywords)" : "e.g., 'what happens after we die?' 'meeting loved ones' (Natural language)"}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") onSearchClick() }}
                            className="w-full pl-10 h-12 text-lg"
                        />
                        <Search className="w-5 h-5 absolute left-3 top-3.5 text-muted-foreground" />
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Controls Row */}
                    <div className="flex flex-col md:flex-row gap-6 p-4 bg-gray-50 rounded-lg border">
                        {/* Search Type Toggle */}
                        <div className="flex-1">
                            <label className="text-sm font-medium mb-2 block">Search Mode</label>
                            <div className="flex bg-white p-1 rounded-md border w-fit">
                                <button
                                    onClick={() => setSearchType('keyword')}
                                    className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${searchType === 'keyword' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-gray-100'}`}
                                >
                                    Keyword Match
                                </button>
                                <button
                                    onClick={() => setSearchType('semantic')}
                                    className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors flex items-center gap-2 ${searchType === 'semantic' ? 'bg-purple-600 text-white shadow-sm' : 'text-purple-700 hover:bg-purple-50'}`}
                                >
                                    <Sparkles className="w-3 h-3" />
                                    Semantic AI
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                {searchType === 'keyword' ? "Best for finding exact words and filtering by channel." : "Best for finding concepts and meaning, even if words don't match exactly."}
                            </p>
                        </div>

                        {/* Similarity Slider (Semantic Only) */}
                        {searchType === 'semantic' && (
                            <div className="flex-1 min-w-[200px]">
                                <label className="text-sm font-medium mb-2 flex justify-between">
                                    <span>Similarity Threshold</span>
                                    <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-bold">{similarity.toFixed(2)}</span>
                                </label>
                                <div className="pt-2">
                                    <Slider
                                        defaultValue={[0.5]}
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        value={[similarity]}
                                        onValueChange={(vals) => setSimilarity(vals[0])}
                                        className="w-full"
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                                    <span>Broad</span>
                                    <span>Exact</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="sortBy" className="block text-sm font-medium mb-2">Sort By</label>
                            <select
                                id="sortBy"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md h-10"
                            >
                                <option value="relevance">Relevance</option>
                                <option value="viewCount">View Count</option>
                                <option value="date">Date</option>
                                <option value="title">Title</option>
                                <option value="channelName">Channel Name</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="direction" className="block text-sm font-medium mb-2">Direction</label>
                            <select
                                id="direction"
                                value={direction}
                                onChange={(e) => setDirection(e.target.value as "asc" | "desc")}
                                className="w-full p-2 border border-gray-300 rounded-md h-10"
                            >
                                <option value="desc">Descending</option>
                                <option value="asc">Ascending</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end items-center mt-6 gap-2">
                    {user && searchTerm.trim() && (
                        <Button variant="outline" size="icon" onClick={handleSaveSearch} title="Save this search">
                            <Bookmark className="h-4 w-4" />
                        </Button>
                    )}
                    <Button onClick={onSearchClick} disabled={isLoading} className={`px-8 h-12 text-lg ${searchType === 'semantic' ? "bg-purple-600 hover:bg-purple-700" : ""}`}>
                        {isLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Searching...</> : <><Search className="w-5 h-5 mr-2" />Search</>}
                    </Button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {hasSearched && !isLoading && (
                    <FilterSidebar />
                )}

                <div className="w-full lg:flex-1">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-8">
                            <p className="font-medium">Error: <span className="font-normal">{error}</span></p>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="space-y-6">
                            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
                        </div>
                    ) : hasSearched ? (
                        <>
                            <div className="mb-4">
                                <p className="text-sm text-muted-foreground">{totalHits >= 2000 ? "2000+" : totalHits.toLocaleString()} results found.</p>
                            </div>
                            {results.length === 0 ? (
                                <div className="text-center py-12">
                                    <h3 className="text-lg font-semibold">No results found.</h3>
                                    <p className="text-muted-foreground">Try a different search term or adjust your filters.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {groupedResults.map(video => (
                                        <SearchResultCard
                                            key={video.video_id}
                                            video={video}
                                            searchTerm={searchTerm}
                                            onTagClick={() => { }}
                                            user={user}
                                        />
                                    ))}

                                    {hasMore && (
                                        <div className="flex justify-center pt-6 pb-8">
                                            <Button
                                                onClick={handleLoadMore}
                                                disabled={isLoadingMore}
                                                variant="outline"
                                                className="w-full md:w-auto px-8"
                                            >
                                                {isLoadingMore ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Loading more...
                                                    </>
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
                        null
                    )}
                </div>
            </div>
        </div>
    );
}

export default function SearchV3Page() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
            <SearchV3Content />
        </Suspense>
    );
}
