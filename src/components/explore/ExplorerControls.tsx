"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";

export interface SortOption {
    value: string;
    label: string;
}

export interface FilterOption {
    value: string;
    label: string;
    count?: number;
}

interface ExplorerControlsProps {
    /** Available sort options */
    sortOptions: SortOption[];
    /** Available filter options (e.g., classification) */
    filterOptions?: FilterOption[];
    filterLabel?: string;
    /** Current sort value */
    currentSort: string;
    /** Current sort direction */
    currentDirection: "asc" | "desc";
    /** Current filter value (empty = all) */
    currentFilter?: string;
    /** Current page */
    currentPage: number;
    /** Total pages */
    totalPages: number;
    /** Total results */
    totalResults: number;
}

/**
 * Shared sort/filter/pagination controls for all explorer pages.
 * State is managed via URL search params for SEO and shareability.
 */
export function ExplorerControls({
    sortOptions,
    filterOptions,
    filterLabel = "Filter",
    currentSort,
    currentDirection,
    currentFilter,
    currentPage,
    totalPages,
    totalResults,
}: ExplorerControlsProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const updateParams = useCallback(
        (updates: Record<string, string>) => {
            const params = new URLSearchParams(searchParams.toString());
            for (const [key, val] of Object.entries(updates)) {
                if (val) {
                    params.set(key, val);
                } else {
                    params.delete(key);
                }
            }
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
        },
        [router, pathname, searchParams]
    );

    return (
        <div className="space-y-4">
            {/* Controls row */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Sort */}
                <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                    <Select
                        value={currentSort}
                        onValueChange={(val) => updateParams({ sort: val, page: "1" })}
                    >
                        <SelectTrigger className="w-[180px] h-9 text-sm">
                            <SelectValue placeholder="Sort by..." />
                        </SelectTrigger>
                        <SelectContent>
                            {sortOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-2 text-xs"
                        onClick={() =>
                            updateParams({
                                dir: currentDirection === "desc" ? "asc" : "desc",
                                page: "1",
                            })
                        }
                    >
                        {currentDirection === "desc" ? "High → Low" : "Low → High"}
                    </Button>
                </div>

                {/* Filter */}
                {filterOptions && filterOptions.length > 0 && (
                    <Select
                        value={currentFilter || "all"}
                        onValueChange={(val) =>
                            updateParams({ filter: val === "all" ? "" : val, page: "1" })
                        }
                    >
                        <SelectTrigger className="w-[220px] h-9 text-sm">
                            <SelectValue placeholder={filterLabel} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All {filterLabel}</SelectItem>
                            {filterOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                    {opt.count !== undefined && (
                                        <span className="ml-1 text-muted-foreground">
                                            ({opt.count})
                                        </span>
                                    )}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {/* Result count */}
                <span className="text-sm text-muted-foreground ml-auto">
                    {totalResults.toLocaleString()} results
                </span>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() =>
                            updateParams({ page: String(currentPage - 1) })
                        }
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-3">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() =>
                            updateParams({ page: String(currentPage + 1) })
                        }
                    >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            )}
        </div>
    );
}
