"use client";

import { useState, useEffect, useCallback } from "react";
import { SearchResultCard } from "@/components/search-result-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


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

export default function SearchV2Page() {
    const [searchTerm, setSearchTerm] = useState("");
    const [results, setResults] = useState<HitDocument[]>([]);
    const [facets, setFacets] = useState<FacetCount[]>([]);
    const [totalHits, setTotalHits] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
    const { toast } = useToast();

    const performSearch = useCallback(async () => {
        if (!searchTerm.trim()) {
            toast({
              title: "Search term required",
              description: "Please enter a term to search for.",
              variant: "destructive",
            });
            return;
        }
        setIsLoading(true);

        try {
            const response = await fetch('/api/search2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ searchTerm, filters: activeFilters }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: SearchResponse = await response.json();
            setResults(data.hits.map(hit => hit.document));
            setFacets(data.facet_counts);
            setTotalHits(data.found);

        } catch (error) {
            console.error("Search failed:", error);
            toast({
                title: "Search Failed",
                description: "An error occurred. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
            setHasSearched(true);
        }
    }, [searchTerm, activeFilters, toast]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        performSearch();
    };
    
    const handleFilterChange = (facetField: string, value: string) => {
        setActiveFilters(prev => {
            const newFilters = { ...prev };
            const currentFilterValues = newFilters[facetField] || [];
            
            if (currentFilterValues.includes(value)) {
                // If it's already there, remove it
                newFilters[facetField] = currentFilterValues.filter(v => v !== value);
            } else {
                // Otherwise, add it
                newFilters[facetField] = [...currentFilterValues, value];
            }
            // If a filter category becomes empty, remove the key itself
            if (newFilters[facetField].length === 0) {
                delete newFilters[facetField];
            }
            return newFilters;
        });
    };

    // Re-run the search whenever the filters change
    useEffect(() => {
        if (hasSearched) {
            performSearch();
        }
    }, [activeFilters, hasSearched, performSearch]);

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
                <form onSubmit={handleSearch} className="flex space-x-4">
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
                                            viewCount: doc.viewCount,
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
