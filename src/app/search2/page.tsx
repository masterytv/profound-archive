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
import { Loader2 } from "lucide-react";


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

    // Initialize state from URL params
    const initialQuery = searchParams.get("q") || "";
    
    const [searchTerm, setSearchTerm] = useState(initialQuery);
    const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
    
    // Internal state
    const [results, setResults] = useState<HitDocument[]>([]);
    const [facets, setFacets] = useState<FacetCount[]>([]);
    const [totalHits, setTotalHits] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    
    // Pagination state
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const { toast } = useToast();

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

        const filterParam = searchParams.get("filter");
        let filters = {};
        if (filterParam) {
            try {
                filters = JSON.parse(filterParam);
            } catch (e) {}
        }
        setActiveFilters(filters);
        
        // Reset page to 1 when URL params change (new search context)
        // NOTE: This logic assumes standard navigation. "Load More" does NOT change URL page param currently.
        setPage(1);
        
        if (q || filterParam) {
             performSearch(q, filters, 1, true);
        } else {
             setResults([]);
             setHasSearched(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const performSearch = async (term: string, filters: Record<string, string[]>, pageNum: number, isNewSearch: boolean) => {
        const query = term.trim() || "*";
        
        if (isNewSearch) {
            setIsLoading(true);
        } else {
            setIsLoadingMore(true);
        }

        try {
            const response = await fetch('/api/search2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ searchTerm: query, filters, page: pageNum }),
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

    const updateUrl = (term: string, filters: Record<string, string[]>) => {
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
        
        params.set("page", "1");

        router.push(`${pathname}?${params.toString()}`);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateUrl(searchTerm, activeFilters);
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
        
        updateUrl(searchTerm, newFilters);
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        performSearch(searchTerm, activeFilters, nextPage, false);
    };

    // Group results by video logic (copied and adapted from /search)
    const groupResultsByVideo = (results: HitDocument[]): GroupedVideo[] => {
        const grouped = new Map<string, GroupedVideo>();
        results.forEach((doc) => {
            if (!grouped.has(doc.videoId)) {
                grouped.set(doc.videoId, {
                    video_id: doc.videoId,
                    url: doc.url,
                    title: doc.title,
                    thumbnailUrl: doc.thumbnailUrl,
                    date: new Date(doc.date * 1000).toISOString(), // Typesense returns unix timestamp usually? If number
                    viewCount: doc.viewCount.toString(),
                    channelName: doc.channelName,
                    summary: "", // Typesense might not return summary in this hit, leave empty or add field if available
                    tags: [],
                    transcripts: [],
                });
            }
            grouped.get(doc.videoId)!.transcripts.push({
                content: doc.content,
                start_time: doc.start_time,
                similarity: undefined, // Typesense results are exact/text match, not vector similarity usually unless configured
            });
        });
        return Array.from(grouped.values());
    };

    const groupedResults = groupResultsByVideo(results);

    // Component to render the filter sidebar
    const FilterSidebar = () => (
        <div className="w-full lg:w-1/4 xl:w-1/5 space-y-6">
            <h2 className="text-lg font-semibold">Filters</h2>
            <Accordion type="multiple" defaultValue={facets.map(f => f.field_name)} className="w-full">
                {facets.map(facet => (
                    <AccordionItem value={facet.field_name} key={facet.field_name}>
                        <AccordionTrigger className="capitalize">{facet.field_name.replace(/([A-Z])/g, ' $1')}</AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-2">
                            {facet.counts.map(item => (
                                <div className="flex items-center space-x-2" key={item.value}>
                                    <Checkbox 
                                        id={`${facet.field_name}-${item.value}`}
                                        onCheckedChange={() => handleFilterChange(facet.field_name, item.value)}
                                        checked={(activeFilters[facet.field_name] || []).includes(item.value)}
                                    />
                                    <label htmlFor={`${facet.field_name}-${item.value}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {item.value} ({item.count})
                                    </label>
                                </div>
                            ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );

    return (
        <div className="container mx-auto p-4">
            <div className="mb-8 rounded-lg bg-card p-6 shadow-sm">
                <form onSubmit={handleSearchSubmit} className="flex space-x-4">
                    <Input
                        type="text"
                        placeholder="Search for profound experiences..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-grow"
                    />
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Searching...' : 'Search'}
                    </Button>
                </form>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {hasSearched && !isLoading && (
                    <FilterSidebar />
                )}
                
                <div className="w-full lg:flex-1">
                    {isLoading ? (
                        // Single column skeleton for consistency
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
                                // Changed to single column stack
                                <div className="space-y-6">
                                    {groupedResults.map(video => (
                                        <SearchResultCard 
                                            key={video.video_id} 
                                            video={video} 
                                            searchTerm={searchTerm} 
                                            onTagClick={() => {}}
                                        />
                                    ))}
                                    
                                    {/* Load More Button */}
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
                        <div className="text-center py-12">
                           <h3 className="text-lg font-semibold">Search the Archive</h3>
                           <p className="text-muted-foreground">Enter a term above to find moments within our collection of testimonies.</p>
                        </div>
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
