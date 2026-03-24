"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { VideoCardExpandable } from "./VideoCardExpandable";
import type { VideoExploreItem } from "./types";

interface VideoShelfProps {
  title: string;
  /** URL for "See All" link (goes to grid with pre-set sort) */
  seeAllHref: string;
  videos: VideoExploreItem[];
  /** Index of this shelf on the page (0 = first/above-fold) */
  shelfIndex?: number;
  className?: string;
}

export function VideoShelf({
  title,
  seeAllHref,
  videos,
  shelfIndex = 0,
  className,
}: VideoShelfProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", updateScrollState, { passive: true });
      return () => el.removeEventListener("scroll", updateScrollState);
    }
  }, []);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector("div > div")?.clientWidth || 280;
    el.scrollBy({
      left: direction === "left" ? -cardWidth * 2 : cardWidth * 2,
      behavior: "smooth",
    });
  };

  if (videos.length === 0) return null;

  return (
    <section className={cn("relative group/shelf", className)}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-lg font-bold text-slate-900 dark:text-slate-100"
          style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
        >
          {title}
        </h2>
        <Link
          href={seeAllHref}
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-1"
        >
          See All <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Scrollable row */}
      <div className="relative">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all opacity-0 group-hover/shelf:opacity-100 -translate-x-1 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all opacity-0 group-hover/shelf:opacity-100 translate-x-1 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Card row */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 -mx-1 px-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {videos.map((video, idx) => (
            <div
              key={video.videoId}
              className="snap-start shrink-0 w-[260px] sm:w-[280px]"
            >
              <VideoCardExpandable
                video={video}
                priority={shelfIndex === 0 && idx < 4}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
