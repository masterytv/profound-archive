"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, MessageSquare, Loader2 } from "lucide-react"
import Link from "next/link"
import { SearchResultCard } from "@/components/search-result-card"

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
  similarity?: number
  analysis_nde_summary?: string
  tags?: string[] // Kept for data structure consistency, but not used in UI
}

interface GroupedVideo {
  video_id: string
  url: string
  title: string
  thumbnailUrl: string
  date: string | null
  viewCount: string
  channelName: string
  summary: string
  tags: string[]
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
          summary: result.analysis_nde_summary || "",
          tags: result.tags || [],
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
      {/* Search Controls */}
      <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2">Search Engine for the Soul</h1>
        <p className="text-muted-foreground mb-6">Find specific moments in more than 5000 NDE YouTube videos.</p>
        <Link href="/chat" className="text-primary hover:underline text-sm flex items-center gap-1 mb-8">
          <MessageSquare className="w-4 h-4" />
          Chat Instead
        </Link>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Search Term</label>
          <Input
            type="text"
            placeholder="e.g., 'life review' (keyword), 'visited dead relatives' (concept)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch() }}
            className="w-full"
          />
        </div>
        
        <div className="space-y-6">
            {/* Search Type and Similarity */}
            <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-shrink-0">
                    <label className="block text-sm font-medium mb-2">Search Type</label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="searchType" value="keyword" checked={searchType === "keyword"} onChange={() => setSearchType("keyword")} />
                            Keyword
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="searchType" value="concept" checked={searchType === "concept"} onChange={() => setSearchType("concept")} />
                            Concept
                        </label>
                    </div>
                </div>
                {searchType === "concept" && (
                <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium mb-2">Similarity: <span className="font-semibold text-primary">{similarity.toFixed(2)}</span></label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={similarity}
                        onChange={(e) => setSimilarity(parseFloat(e.target.value))}
                        className="w-full"
                    />
                </div>
                )}
            </div>

            {/* Sort By and Direction */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="sortBy" className="block text-sm font-medium mb-2">Sort By</label>
                    <select
                        id="sortBy"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                    >
                        {searchType === "concept" && <option value="similarity">Similarity</option>}
                        <option value="viewCount">View Count</option>
                        <option value="date">Date</option>
                        <option value="title">Title</option>
                        <option value="channelName">Channel Name</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="direction" className="block text-sm font-medium mb-2">Direction</label>
                    <select
                        id="direction"
                        value={direction}
                        onChange={(e) => setDirection(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                    >
                        <option value="descending">Descending</option>
                        <option value="ascending">Ascending</option>
                    </select>
                </div>
            </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={handleSearch} disabled={isLoading} className="bg-primary text-primary-foreground px-8">
            {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Searching...</> : <><Search className="w-4 h-4 mr-2" />Search</>}
          </Button>
        </div>
      </div>

      {/* Search Results */}
      <main>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-8">
            <p className="font-medium">Error: <span className="font-normal">{error}</span></p>
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
              <SearchResultCard 
                key={video.video_id} 
                video={video} 
                searchTerm={searchTerm}
                searchType={searchType}
                onTagClick={() => {}} // Pass an empty function as onTagClick is required by the component
              />
            ))}
            {hasMoreResults && (
              <div className="flex justify-center pt-4">
                <Button onClick={handleLoadMore} disabled={isLoadingMore} className="bg-primary text-primary-foreground px-8">
                  {isLoadingMore ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading...</> : "Load More"}
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
