"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SMART_TAGS, type SmartTagDef } from "./types";

interface SmartTagFilterProps {
  className?: string;
}

export function SmartTagFilter({ className }: SmartTagFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);

  // Parse active tags from URL
  const activeTags = (searchParams.get("tags") || "")
    .split(",")
    .filter(Boolean);

  const updateTags = useCallback(
    (tagId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = new Set(activeTags);

      if (current.has(tagId)) {
        current.delete(tagId);
      } else {
        current.add(tagId);
      }

      const tagsStr = Array.from(current).join(",");
      if (tagsStr) {
        params.set("tags", tagsStr);
      } else {
        params.delete("tags");
      }
      // Reset to page 1 when changing filters
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams, activeTags]
  );

  const clearAll = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tags");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  // Show first 6 tags collapsed, all when expanded
  const COLLAPSE_AFTER = 6;
  const visibleTags = isExpanded
    ? SMART_TAGS
    : SMART_TAGS.slice(0, COLLAPSE_AFTER);
  const hiddenCount = SMART_TAGS.length - COLLAPSE_AFTER;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Quick Filters
        </h3>
        {activeTags.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleTags.map((tag) => {
          const isActive = activeTags.includes(tag.id);
          return (
            <button
              key={tag.id}
              onClick={() => updateTags(tag.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 cursor-pointer",
                isActive
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20"
                  : "bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              )}
            >
              <span>{tag.emoji}</span>
              <span>{tag.label}</span>
            </button>
          );
        })}

        {/* Expand/collapse toggle */}
        {hiddenCount > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <>
                Show fewer <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                +{hiddenCount} more <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
