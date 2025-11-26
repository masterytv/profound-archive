"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { SearchResultCard } from "@/components/search-result-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Loader2, MessageSquare, Search, ChevronDown, ChevronUp, Bookmark } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";


// Shape of a single document returned from our Typesense-like API
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
}

// Shape for grouping results by video (same as /search)
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

function SearchV2Content() {
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
    
    const [searchTerm, setSearchTerm] = useState(initialQuery);
    const [sortBy, setSortBy] = useState(initialSortBy);
    const [direction, setDirection] = useState<"asc" | "desc">(initialDirection);
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

        const filterParam = searchParams.get("filter");
        let filters = {};
        if (filterParam) {
            try {
                filters = JSON.parse(filterParam);
            } catch (e) {}
        }
        setActiveFilters(filters);
        
        // Reset page to 1 when URL params change (new search context)
        setPage(1);
        
        if (q || filterParam) {
             performSearch(q, filters, 1, true, sort, dir);
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
        currentDir: string = direction
    ) => {
        const query = term.trim() || "*";
        
        if (isNewSearch) {
            setIsLoading(true);
            setError(null);
        } else {
            setIsLoadingMore(true);
        }

        let sortParam = currentSort;
        if (currentSort === 'viewCount') sortParam = `viewCount:${currentDir}`;
        else if (currentSort === 'date') sortParam = `date:${currentDir}`;
        else if (currentSort === 'text_match' || currentSort === 'relevance') sortParam = `_text_match:${currentDir}`;
        else if (currentSort === 'title') sortParam = `title:${currentDir}`;
        else if (currentSort === 'channelName') sortParam = `channelName:${currentDir}`;

        try {
            const response = await fetch('/api/search2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    searchTerm: query, 
                    filters, 
                    page: pageNum,
                    sortBy: sortParam
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: SearchResponse = await response.json();
            const newHits = data.hits.map(hit => hit.document);

            if (isNewSearch) {
                setResults(newHits);
                setFacets(data.facet_counts);
                setTotalHits(data.found);
                setHasSearched(true);
            } else {
                setResults(prev => [...prev, ...newHits]);
            }
            
            // Determine if there are more results
            if (newHits.length < 12 || (results.length + newHits.length) >= data.found) {
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
        dir: string
    ) => {
        const params = new URLSearchParams(searchParams.toString());
        
        if (term.trim()) {
            params.set("q", term.trim());
        } else {
            params.delete("q");
        }

        if (Object.keys(filters).length > 0) {
            params.set("filter", JSON.stringify(filters));
        } else {
            params.delete("filter");
        }
        
        params.set("sort", sort);
        params.set("dir", dir);
        params.set("page", "1");
        
        params.delete("type");

        router.push(`${pathname}?${params.toString()}`);
    };

    const onSearchClick = () => {
        updateUrl(searchTerm, activeFilters, sortBy, direction);
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
        
        updateUrl(searchTerm, newFilters, sortBy, direction);
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
            .insert({ user_id: user.id, search_term: searchTerm.trim() });
        
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
                    summary: "", 
                    tags: [],
                    transcripts: [],
                });
            }
            grouped.get(doc.videoId)!.transcripts.push({
                content: doc.content,
                start_time: doc.start_time,
                similarity: undefined, 
            });
        });
        return Array.from(grouped.values());
    };

    const groupedResults = groupResultsByVideo(results);

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
            <h2 className="text-lg font-semibold">Filters</h2>
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
        </div>
    );

    return (
        <div className="container mx-auto p-4 py-12 max-w-6xl">
            <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-8">
                <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2">Search Engine for the Soul</h1>
                <p className="text-muted-foreground mb-6">Find specific moments in more than 5000 NDE YouTube videos.</p>
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/chat" className="text-primary hover:underline text-sm flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        Chat Instead
                    </Link>
                    <span className="text-gray-300">|</span>
                    <Link href="/search" className="text-primary hover:underline text-sm flex items-center gap-1">
                        Semantic Search
                    </Link>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">Search Term</label>
                    <Input
                        type="text"
                        placeholder="e.g., 'life review' (Exact), 'visited dead relatives' (Semantic)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") onSearchClick() }}
                        className="w-full"
                    />
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="sortBy" className="block text-sm font-medium mb-2">Sort By</label>
                            <select
                                id="sortBy"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md"
                            >
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
                                className="w-full p-2 border border-gray-300 rounded-md"
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
                    <Button onClick={onSearchClick} disabled={isLoading} className="bg-primary text-primary-foreground px-8">
                        {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Searching...</> : <><Search className="w-4 h-4 mr-2" />Search</>}
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
                                <p className="text-sm text-muted-foreground">{totalHits.toLocaleString()} results found.</p>
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
                                            onTagClick={() => {}}
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

export default function SearchV2Page() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
            <SearchV2Content />
        </Suspense>
    );
}
