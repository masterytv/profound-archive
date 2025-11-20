"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { Star } from "lucide-react"
import FavoriteButton from "./favorite-button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"

// Define the structure of a search result item
interface SearchResult {
  content: string;
  start_time?: number;
  video_id: string;
  url: string;
  title: string;
  thumbnailUrl: string;
  date: string;
  viewCount: number;
  channelName: string;
  similarity?: number;
  analysisNdeSummary?: string; // Add the summary property
}

interface SearchResultCardProps {
  result: SearchResult;
}

export function SearchResultCard({ result }: SearchResultCardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Guard Clause: If result is null or undefined, don't render anything.
  if (!result) {
    return null;
  }

  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
    }
    getUser()
  }, [supabase])

  const formatTimestamp = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m, s]
      .map((v) => (v < 10 ? "0" + v : v))
      .filter((v, i) => v !== "00" || i > 0)
      .join(":");
  };

  const hasTimestamp = typeof result.start_time === 'number';
  const timestamp = hasTimestamp ? formatTimestamp(result.start_time) : null;
  const videoUrlWithTimestamp = hasTimestamp ? `${result.url}&t=${Math.floor(result.start_time)}s` : result.url;

  const summary = result.analysisNdeSummary || "";
  const isLongSummary = summary.length > 250;
  const displayedSummary = isExpanded ? summary : `${summary.substring(0, 250)}${isLongSummary ? "..." : ""}`;

  return (
    <Card className="flex flex-col overflow-hidden transition-shadow duration-300 ease-in-out hover:shadow-lg">
      <CardHeader className="p-0">
        <div className="relative">
          <Link href={videoUrlWithTimestamp} target="_blank">
            <img
              src={result.thumbnailUrl}
              alt={result.title}
              className="aspect-video w-full object-cover"
            />
          </Link>
          {timestamp && (
            <span className="absolute bottom-2 right-2 rounded bg-black/75 px-2 py-1 text-xs font-semibold text-white">
              {timestamp}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4">
        <CardTitle className="mb-2 text-lg leading-tight">
          <Link
            href={videoUrlWithTimestamp}
            target="_blank"
            className="hover:text-primary"
          >
            {result.title}
          </Link>
        </CardTitle>
        {/* Moment Text */}
        <p
          className="mb-3 text-sm text-muted-foreground border-l-2 pl-3"
          dangerouslySetInnerHTML={{ __html: result.content }}
        />
        {/* Summary Text */}
        {summary && (
            <div>
                <p className="text-sm text-foreground">{displayedSummary}</p>
                {isLongSummary && (
                    <Button variant="link" className="p-0 h-auto text-xs" onClick={() => setIsExpanded(!isExpanded)}>
                        {isExpanded ? "Read Less" : "Read More"}
                    </Button>
                )}
            </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between p-4 pt-0">
        <div className="text-xs text-muted-foreground">
          <p>{result.channelName}</p>
          <p>{new Date(result.date).toLocaleDateString()}</p>
          <p>{result.viewCount.toLocaleString()} views</p>
          {result.similarity != null && (
            <p>Similarity: {(result.similarity * 100).toFixed(1)}%</p>
          )}
        </div>
        <div>
          {user ? (
            <FavoriteButton
              videoId={result.video_id}
              videoTitle={result.title}
            />
          ) : (
            <Link
              href="/login"
              className="p-2 rounded-full hover:bg-muted"
              title="Log in to favorite this video"
            >
              <Star className="h-5 w-5 text-gray-400" />
            </Link>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
