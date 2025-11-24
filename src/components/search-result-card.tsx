"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { Star } from "lucide-react"
import FavoriteButton from "./favorite-button"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"

interface SearchResult {
  content: string;
  start_time?: number;
  video_id: string;
  url: string;
  title: string;
  thumbnailUrl: string;
  date: string;
  viewCount: number | string;
  channelName: string;
  similarity?: number;
  analysis_nde_summary?: string;
  analysisNdeSummary?: string;
}

interface Transcript {
    content: string;
    start_time?: number;
    similarity?: number;
}

interface SearchResultCardProps {
  result?: SearchResult;
  video?: any; 
  searchTerm?: string;
  searchType?: string;
  onTagClick?: (tag: string) => void;
}

export function SearchResultCard({ result, video, searchTerm }: SearchResultCardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
    }
    getUser()
  }, [supabase])

  // Data Normalization
  let displayData: {
      video_id: string;
      url: string;
      title: string;
      thumbnailUrl: string;
      date: string;
      viewCount: string | number;
      channelName: string;
      summary: string;
  } | null = null;

  let transcripts: Transcript[] = [];

  if (video) {
      // GroupedVideo
      transcripts = Array.isArray(video.transcripts) ? video.transcripts : [];
      displayData = {
          video_id: video.video_id,
          url: video.url,
          title: video.title || "Untitled Video",
          thumbnailUrl: video.thumbnailUrl || "/placeholder.jpg",
          date: video.date || "",
          viewCount: video.viewCount || 0,
          channelName: video.channelName || "Unknown Channel",
          summary: video.summary || ""
      };
  } else if (result) {
      // Single SearchResult
      transcripts = [{
          content: result.content,
          start_time: result.start_time,
          similarity: result.similarity
      }];
      displayData = {
          video_id: result.video_id,
          url: result.url,
          title: result.title,
          thumbnailUrl: result.thumbnailUrl,
          date: result.date,
          viewCount: result.viewCount,
          channelName: result.channelName,
          summary: result.analysis_nde_summary || result.analysisNdeSummary || ""
      };
  }

  if (!displayData) {
    return <div className="text-red-500 p-4 border border-red-200 rounded">Error: Invalid Data for Card</div>;
  }

  // Helper for formatting timestamp
  const formatTimestamp = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m, s]
      .map((v) => (v < 10 ? "0" + v : v))
      .filter((v, i) => v !== "00" || i > 0)
      .join(":");
  };

  // Safe Date Formatter
  const formatDate = (dateString: string) => {
      if (!dateString) return 'Unknown Date';
      try {
          const d = new Date(dateString);
          if (isNaN(d.getTime())) return 'Invalid Date';
          return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      } catch (e) {
          return 'Invalid Date';
      }
  };

  // Helper for Highlighting
  const highlightTerm = (text: string, term?: string) => {
      if (!term || !term.trim()) return text;
      try {
        const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) => 
            regex.test(part) ? <strong key={i} className="text-primary font-bold bg-yellow-100 px-1 rounded">{part}</strong> : part
        );
      } catch (e) {
          return text;
      }
  };

  const summary = displayData.summary;
  const isLongSummary = summary.length > 250;
  const displayedSummary = isExpanded ? summary : `${summary.substring(0, 250)}${isLongSummary ? "..." : ""}`;

  return (
    <Card className="overflow-hidden transition-shadow duration-300 ease-in-out hover:shadow-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Left Column (Metadata) - Approx 1/3 width (4/12) */}
            <div className="md:col-span-4 flex flex-col gap-3">
                {/* Thumbnail */}
                <div className="relative rounded-md overflow-hidden aspect-video w-full bg-gray-100">
                    <Link href={displayData.url} target="_blank">
                        {displayData.thumbnailUrl ? (
                            <img
                            src={displayData.thumbnailUrl}
                            alt={displayData.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://placehold.co/600x400?text=No+Thumbnail";
                            }}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
                        )}
                    </Link>
                </div>

                {/* Metadata Lines */}
                <div className="text-sm text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">{displayData.channelName}</p>
                    <p>{formatDate(displayData.date)}</p>
                    <p>{Number(displayData.viewCount).toLocaleString()} views</p>
                    <div className="pt-2">
                        {user ? (
                            <FavoriteButton
                            videoId={displayData.video_id}
                            videoTitle={displayData.title}
                            />
                        ) : (
                            <Link
                            href="/login"
                            className="inline-flex items-center gap-1 text-xs hover:text-primary transition-colors"
                            title="Log in to favorite"
                            >
                            <Star className="h-4 w-4" />
                            <span>Favorite</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column (Content) - Approx 2/3 width (8/12) */}
            <div className="md:col-span-8 flex flex-col gap-4">
                {/* Title */}
                <div>
                    <h3 className="text-xl font-bold leading-tight hover:text-primary transition-colors">
                        <Link href={displayData.url} target="_blank">
                            {displayData.title}
                        </Link>
                    </h3>
                </div>

                {/* Summary */}
                {summary && (
                    <div className="bg-muted/30 p-3 rounded-md text-sm">
                        <div className="flex items-center gap-2 mb-1">
                             <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary/50 text-primary">AI Video Summary - AI makes mistakes</Badge>
                        </div>
                        <p className="text-foreground/90">
                            {displayedSummary}
                            {isLongSummary && (
                                <Button variant="link" className="p-0 h-auto text-xs ml-1" onClick={() => setIsExpanded(!isExpanded)}>
                                    {isExpanded ? "Read Less" : "Read More"}
                                </Button>
                            )}
                        </p>
                    </div>
                )}

                {/* Transcripts (Matches) */}
                <div className="space-y-4">
                    {transcripts.map((t, idx) => {
                        const hasTimestamp = typeof t.start_time === 'number' && !isNaN(t.start_time);
                        const timestampStr = hasTimestamp ? formatTimestamp(t.start_time!) : null;
                        const linkUrl = hasTimestamp 
                            ? `${displayData!.url}&t=${Math.floor(t.start_time!)}s` 
                            : displayData!.url;

                        return (
                            <div key={idx} className="group relative pl-4 border-l-2 border-primary/20 hover:border-primary transition-colors">
                                <Link href={linkUrl} target="_blank" className="block">
                                    <div className="text-sm text-foreground/80 leading-relaxed">
                                        "{highlightTerm(t.content, searchTerm)}"
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground font-mono">
                                        {timestampStr && (
                                            <span className="bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                {timestampStr}
                                            </span>
                                        )}
                                        {t.similarity != null && (
                                            <span>Match: {(t.similarity * 100).toFixed(0)}%</span>
                                        )}
                                    </div>
                                </Link>
                            </div>
                        )
                    })}
                </div>
            </div>

        </div>
    </Card>
  );
}
