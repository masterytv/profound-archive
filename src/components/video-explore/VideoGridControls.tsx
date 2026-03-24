"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SORT_PRESETS, SORT_FIELDS, type SortPreset } from "./types";

interface VideoGridControlsProps {
  currentSort: string;
  currentDirection: "asc" | "desc";
  currentQuery: string;
  currentPage: number;
  totalPages: number;
  totalResults: number;
  className?: string;
}

export function VideoGridControls({
  currentSort,
  currentDirection,
  currentQuery,
  currentPage,
  totalPages,
  totalResults,
  className,
}: VideoGridControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filterInput, setFilterInput] = useState(currentQuery);

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

  const applyPreset = (preset: SortPreset) => {
    updateParams({ sort: preset.sort, dir: preset.dir, page: "1" });
  };

  const toggleSort = (field: string) => {
    if (currentSort === field) {
      // Toggle direction
      updateParams({ dir: currentDirection === "desc" ? "asc" : "desc", page: "1" });
    } else {
      // Switch field, default desc
      updateParams({ sort: field, dir: "desc", page: "1" });
    }
  };

  const applyFilter = () => {
    updateParams({ q: filterInput.trim(), page: "1" });
  };

  const clearFilter = () => {
    setFilterInput("");
    updateParams({ q: "", page: "1" });
  };

  // Which preset is currently active?
  const activePreset = SORT_PRESETS.find(
    (p) => p.sort === currentSort && p.dir === currentDirection
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Preset buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {SORT_PRESETS.map((preset) => {
          const isActive = activePreset?.id === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer",
                isActive
                  ? "bg-slate-900 dark:bg-white/[0.15] text-white shadow-sm"
                  : "bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/10"
              )}
            >
              <span>{preset.emoji}</span>
              <span>{preset.label}</span>
            </button>
          );
        })}

        {/* Sort chip dropdown for all fields */}
        <div className="flex items-center gap-1.5 ml-auto">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={currentSort}
            onChange={(e) => toggleSort(e.target.value)}
            className="text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:[color-scheme:dark] cursor-pointer"
          >
            {SORT_FIELDS.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              updateParams({
                dir: currentDirection === "desc" ? "asc" : "desc",
                page: "1",
              })
            }
            className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            {currentDirection === "desc" ? "↓ High" : "↑ Low"}
          </button>
        </div>
      </div>

      {/* Name filter + results count + pagination */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Name filter */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyFilter();
          }}
          className="relative flex-1 min-w-[200px] max-w-sm"
        >
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={filterInput}
            onChange={(e) => setFilterInput(e.target.value)}
            placeholder="Filter by name..."
            className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:[color-scheme:dark]"
            style={{ fontSize: "14px" }}
          />
          {filterInput && (
            <button
              type="button"
              onClick={clearFilter}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Result count */}
        <span className="text-sm text-slate-500 dark:text-slate-400 ml-auto">
          <strong className="text-slate-800 dark:text-slate-200">
            {totalResults.toLocaleString()}
          </strong>{" "}
          results
        </span>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => updateParams({ page: String(currentPage - 1) })}
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
            onClick={() => updateParams({ page: String(currentPage + 1) })}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
