"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, MessageSquare, Loader2 } from "lucide-react"
import Link from "next/link"

interface SearchResult {
  content: string
  start_time: number
  video_id: string
  url: string
  title: string
  thumbnailUrl: string
  date: string | null
  viewCount: string
  channelName: string
  similarity?: number // Optional, only present for concept match
}

interface GroupedVideo {
  video_id: string
  url: string
  title: string
  thumbnailUrl: string
  date: string | null
  viewCount: string
  channelName: string
  transcripts: Array<{
    content: string
    start_time: number
    similarity?: number
  }>
}

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchType, setSearchType] = useState<"keyword" | "concept">("keyword")
  const [sortBy, setSortBy] = useState("viewCount")
  const [direction, setDirection] = useState("descending")
  const [similarity, setSimilarity] = useState(0.5)
  const [hasSearched, setHasSearched] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [hasMoreResults, setHasMoreResults] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  useEffect(() => {
    if (searchType === "keyword") {
      setSortBy("viewCount")
    } else {
      setSortBy("similarity")
    }
  }, [searchType])

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError("Please enter a search term")
      return
    }

    setIsLoading(true)
    setError(null)
    setHasSearched(true)
    setOffset(0)
    setHasMoreResults(true)

    try {
      const webhookUrl = process.env.NEXT_PUBLIC_SEARCH_WEBHOOK_URL
      if (!webhookUrl || webhookUrl === 'YOUR_SEARCH_WEBHOOK_URL_HERE') {
        throw new Error("Search webhook URL is not configured")
      }

      // Map UI values to webhook parameters
      const searchTypeValue = searchType === "keyword" ? "exact" : "semantic"
      const sortDirectionValue = direction === "descending" ? "DESC" : "ASC"

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchTerm: searchTerm.trim(),
          similarityThreshold: similarity,
          sortColumn: sortBy,
          sortDirection: sortDirectionValue,
          searchType: searchTypeValue,
          limit: 12,
          offset: 0,
        }),
      })

      if (!response.ok) {
        throw new Error(`Search failed: ${await response.text()}`)
      }

      const data = await response.json()
      setResults(data)
      if (data.length < 12) {
        setHasMoreResults(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while searching")
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadMore = async () => {
    setIsLoadingMore(true)
    setError(null)

    try {
      const webhookUrl = process.env.NEXT_PUBLIC_SEARCH_WEBHOOK_URL
      if (!webhookUrl || webhookUrl === 'YOUR_SEARCH_WEBHOOK_URL_HERE') {
        throw new Error("Search webhook URL is not configured")
      }

      const searchTypeValue = searchType === "keyword" ? "exact" : "semantic"
      const sortDirectionValue = direction === "descending" ? "DESC" : "ASC"
      const newOffset = offset + 12

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchTerm: searchTerm.trim(),
          similarityThreshold: similarity,
          sortColumn: sortBy,
          sortDirection: sortDirectionValue,
          searchType: searchTypeValue,
          limit: 12,
          offset: newOffset,
        }),
      })

      if (!response.ok) {
        throw new Error(`Load more failed: ${await response.text()}`)
      }

      const data = await response.json()

      // Append new results to existing results
      setResults((prevResults) => [...prevResults, ...data])
      setOffset(newOffset)

      if (data.length < 12) {
        setHasMoreResults(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while loading more results")
    } finally {
      setIsLoadingMore(false)
    }
  }

  const formatTimestamp = (seconds: number) => {
    const roundedSeconds = Math.round(seconds)
    const hours = Math.floor(roundedSeconds / 3600)
    const minutes = Math.floor((roundedSeconds % 3600) / 60)
    const secs = roundedSeconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Date unavailable"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
  }

  const formatViewCount = (viewCountString: string): string => {
    if (typeof viewCountString !== 'string') {
      return 'N/A views';
    }
  
    const numberPart = viewCountString.replace(/[^0-9]/g, '');
    if (!numberPart) {
      return viewCountString; // Return original if no number found
    }
  
    const num = parseInt(numberPart, 10);
  
    if (isNaN(num)) {
      return viewCountString; // Return original if parsing fails
    }
  
    let formattedNumber;
    if (num > 9999) {
      formattedNumber = num.toLocaleString();
    } else {
      formattedNumber = num.toString();
    }
  
    return `${formattedNumber} views`;
  };

  const highlightSearchTerm = (text: string, term: string) => {
    if (!term.trim() || searchType !== "keyword") {
      return text
    }

    // Escape special regex characters in the search term
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const regex = new RegExp(`(${escapedTerm})`, "gi")
    const parts = text.split(regex)

    return (
      <>
        {parts.map((part, index) => {
          if (regex.test(part)) {
            return <strong key={index}>{part}</strong>
          }
          return <span key={index}>{part}</span>
        })}
      </>
    )
  }

  const groupResultsByVideo = (results: SearchResult[]): GroupedVideo[] => {
    const grouped = new Map<string, GroupedVideo>()

    results.forEach((result) => {
      if (!grouped.has(result.video_id)) {
        grouped.set(result.video_id, {
          video_id: result.video_id,
          url: result.url,
          title: result.title,
          thumbnailUrl: result.thumbnailUrl,
          date: result.date,
          viewCount: result.viewCount,
          channelName: result.channelName,
          transcripts: [],
        })
      }

      grouped.get(result.video_id)!.transcripts.push({
        content: result.content,
        start_time: result.start_time,
        similarity: result.similarity,
      })
    })

    return Array.from(grouped.values())
  }

  const groupedResults = groupResultsByVideo(results)

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h1 className="text-4xl font-extrabold text-foreground mb-2">Search Engine for the Soul</h1>
        <p className="text-muted-foreground mb-6">Find specific moments in more than 5000 NDE YouTube videos.</p>
        <Link
          href="/chat"
          className="hover:underline text-sm flex items-center gap-1 mb-8"
          style={{ color: "#2563eb" }}
        >
          <MessageSquare className="w-4 h-4" />
          Chat Instead
        </Link>

        {/* Search Term */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Search Term</label>
          <Input
            type="text"
            placeholder="e.g., 'life review' (keyword), 'visited dead relatives and loved ones' (concept)'"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch()
              }
            }}
            className="w-full"
          />
        </div>

        {/* Search Type and Options */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Search Type */}
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">
                Search Type
                <span
                  className="ml-1 text-muted-foreground cursor-help"
                  title="Keyword Match: Exact word matching. Concept Match: Semantic similarity."
                >
                  ⓘ
                </span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="searchType"
                    value="keyword"
                    checked={searchType === "keyword"}
                    onChange={() => setSearchType("keyword")}
                    className="w-4 h-4"
                  />
                  <span>Keyword Match</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="searchType"
                    value="concept"
                    checked={searchType === "concept"}
                    onChange={() => setSearchType("concept")}
                    className="w-4 h-4"
                  />
                  <span>Concept Match</span>
                </label>
              </div>
            </div>

            {/* Similarity Slider (only for Concept Match) */}
            {searchType === "concept" && (
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium flex items-center gap-1">
                    Similarity
                    <span className="text-muted-foreground cursor-help" title="Adjust semantic similarity threshold">
                      ⓘ
                    </span>
                  </label>
                  <span className="text-sm font-medium" style={{ color: "#2563eb" }}>
                    {similarity.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={similarity}
                  onChange={(e) => setSimilarity(Number.parseFloat(e.target.value))}
                  className="w-full h-1 rounded-lg appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none 
                    [&::-webkit-slider-thumb]:w-5 
                    [&::-webkit-slider-thumb]:h-5 
                    [&::-webkit-slider-thumb]:rounded-full 
                    [&::-webkit-slider-thumb]:bg-white 
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:shadow-md
                    [&::-moz-range-thumb]:w-5 
                    [&::-moz-range-thumb]:h-5 
                    [&::-moz-range-thumb]:rounded-full 
                    [&::-moz-range-thumb]:bg-white 
                    [&::-moz-range-thumb]:border-2
                    [&::-moz-range-thumb]:cursor-pointer
                    [&::-moz-range-thumb]:shadow-md"
                  style={{
                    background: `linear-gradient(to right, #2563eb 0%, #2563eb ${similarity * 100}%, #e5e7eb ${similarity * 100}%, #e5e7eb 100%)`,
                    borderColor: "#2563eb",
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Sort By */}
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-white"
              >
                {searchType === "concept" && <option value="similarity">Similarity</option>}
                <option value="viewCount">View Count</option>
                <option value="date">Date</option>
                <option value="title">Title</option>
                <option value="channelName">Channel Name</option>
              </select>
            </div>

            {/* Direction */}
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Direction</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-white"
              >
                <option value="descending">Descending</option>
                <option value="ascending">Ascending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Search Button */}
        <div className="flex justify-end mt-6">
          <Button
            onClick={handleSearch}
            disabled={isLoading}
            className="text-white px-8"
            style={{ backgroundColor: "#2563eb" }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-8">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {hasSearched && !isLoading && results.length === 0 && !error && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-muted-foreground">No results found. Try adjusting your search parameters.</p>
        </div>
      )}

      {hasSearched && results.length > 0 && (
        <div className="space-y-6">
          {groupedResults.map((video) => (
            <div
              key={video.video_id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col md:flex-row">
                {/* Thumbnail Section */}
                <div className="md:w-80 flex-shrink-0 bg-gray-200 p-4">
                  <a
                    href={`${video.url}&t=${Math.round(video.transcripts[0].start_time)}s`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <div className="aspect-video bg-gray-300 rounded mb-3 overflow-hidden relative group">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl || "/placeholder.svg"}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-16 h-16 bg-gray-400 rounded-full flex items-center justify-center">
                            <div className="w-0 h-0 border-l-8 border-l-white border-t-6 border-t-transparent border-b-6 border-b-transparent ml-1"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </a>
                  <div className="text-sm">
                    <div className="font-medium">{video.channelName}</div>
                    <div className="text-muted-foreground">{formatViewCount(video.viewCount)}</div>
                    <div className="text-muted-foreground">{formatDate(video.date)}</div>
                  </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 p-6">
                  <a
                    href={`${video.url}&t=${Math.round(video.transcripts[0].start_time)}s`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <h3 className="text-xl font-bold text-foreground mb-4 hover:text-primary cursor-pointer">
                      {video.title}
                    </h3>
                  </a>
                  <div className="space-y-3">
                    {video.transcripts.map((transcript, index) => (
                      <div
                        key={`${video.video_id}-${transcript.start_time}-${index}`}
                        className="flex items-start gap-2"
                      >
                        <a
                          href={`${video.url}&t=${Math.round(transcript.start_time)}s`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors flex-shrink-0"
                          style={{ color: "#2563eb" }}
                        >
                          {formatTimestamp(transcript.start_time)}
                        </a>
                        <a
                          href={`${video.url}&t=${Math.round(transcript.start_time)}s`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground leading- relaxed flex-1 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          {highlightSearchTerm(transcript.content, searchTerm)}
                          {searchType === "concept" && transcript.similarity !== undefined && (
                            <span className="text-muted-foreground ml-1">({transcript.similarity.toFixed(2)})</span>
                          )}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {hasMoreResults && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="text-white px-8"
                style={{ backgroundColor: "#2563eb" }}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
