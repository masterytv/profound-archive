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
    // filter param might look like: "channelName:Some Channel,isNde:true"
    // We need to parse that back into the Record<string, string[]> format if we want complex filter support from URL
    // For now, let's assume simple stringified JSON or comma separated. 
    // The requirement said `filter` -> `filter_by` for Typesense. 
    // Let's adopt a standard format for the URL: `filter=field:value1,field:value2` 
    // But Typesense `filter_by` syntax is `field:=value`. 
    // Let's use a URL-friendly format. 
    // We will serialize activeFilters to URL.
    
    const [searchTerm, setSearchTerm] = useState(initialQuery);
    const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
    
    // Internal state
    const [results, setResults] = useState<HitDocument[]>([]);
    const [facets, setFacets] = useState<FacetCount[]>([]);
    const [totalHits, setTotalHits] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const { toast } = useToast();

    // Initial parsing of filters from URL
    useEffect(() => {
        const filterParam = searchParams.get("filter");
        if (filterParam) {
             // Let's assume filterParam is JSON for maximum flexibility or a specific custom format
             // The simple format "category:A,category:B" is ambiguous if values contain colons/commas.
             // Let's try to parse as JSON first, fallback to none.
             try {
                const parsed = JSON.parse(filterParam);
                setActiveFilters(parsed);
             } catch (e) {
                 // Ignore or handle legacy format
             }
        }
    }, [searchParams]); // Run once on mount basically, or if back button changes it.

    // Sync state with URL whenever search params change (Back/Forward navigation)
    // We need to trigger search when URL changes.
    // However, our state `searchTerm` and `activeFilters` drive the UI.
    // `performSearch` drives the fetch. 
    
    // Strategy:
    // 1. User Interaction -> Update URL.
    // 2. URL Change (via Interaction or Back/Forward) -> Update State -> Trigger Search.

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
        
        const page = parseInt(searchParams.get("page") || "1", 10);
        
        if (q || filterParam) {
             performSearch(q, filters, page);
        } else {
             // Reset if empty
             setResults([]);
             setHasSearched(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const performSearch = async (term: string, filters: Record<string, string[]>, page: number = 1) => {
        // If empty term and no filters, maybe we don't search? 
        // Typesense usually allows `*` for everything.
        const query = term.trim() || "*";
        
        setIsLoading(true);

        try {
            const response = await fetch('/api/search2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ searchTerm: query, filters, page }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: SearchResponse = await response.json();
            setResults(data.hits.map(hit => hit.document));
            setFacets(data.facet_counts);
            setTotalHits(data.found);
            setHasSearched(true);

        } catch (error) {
            console.error("Search failed:", error);
            toast({
                title: "Search Failed",
                description: "An error occurred. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
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
        
        // Reset page to 1 on new search/filter
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
        
        // Update URL immediately on filter change
        updateUrl(searchTerm, newFilters);
    };

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
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-96 w-full" />)}
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
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                                    {results.map(doc => {
                                        // We need to transform the Typesense document to match the props of SearchResultCard
                                        const cardProps = {
                                            content: doc.content,
                                            start_time: doc.start_time,
                                            video_id: doc.videoId,
                                            url: doc.url,
                                            title: doc.title,
                                            thumbnailUrl: doc.thumbnailUrl,
                                            date: new Date(doc.date * 1000).toISOString(),
                                            viewCount: doc.viewCount.toString(), // Ensure string for compatibility
                                            channelName: doc.channelName,
                                        };
                                        return <SearchResultCard key={doc.id} result={cardProps} />;
                                    })}
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
