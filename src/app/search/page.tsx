"use client"

import { useState, useEffect, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, MessageSquare, Loader2 } from "lucide-react"
import Link from "next/link"
import { SearchResultCard } from "@/components/search-result-card"
import { useSearchParams, useRouter, usePathname } from "next/navigation"

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
  tags?: string[]
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

function SearchPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const DEFAULT_TYPE = "exact"
  const DEFAULT_SORT = "viewCount" 
  const DEFAULT_DIR = "DESC"
  const DEFAULT_SIM = 0.78

  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "")
  const [searchType, setSearchType] = useState<"semantic" | "exact">((searchParams.get("type") as "semantic" | "exact") || DEFAULT_TYPE)
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || DEFAULT_SORT)
  const [direction, setDirection] = useState(searchParams.get("dir") || DEFAULT_DIR)
  const [similarity, setSimilarity] = useState(parseFloat(searchParams.get("sim") || String(DEFAULT_SIM)))
  
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const initialPage = parseInt(searchParams.get("page") || "1", 10)
  const [offset, setOffset] = useState((initialPage - 1) * 12)
  const [hasMoreResults, setHasMoreResults] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Direct N8N URL from Env or Hardcoded Fallback
  const WEBHOOK_URL = process.env.NEXT_PUBLIC_SEARCH_WEBHOOK_URL || "https://n8n.awetomatic.com/webhook/4e993b0f-a3be-42ba-925d-4c5f78b3381c";

  useEffect(() => {
    const q = searchParams.get("q") || ""
    const type = (searchParams.get("type") as "semantic" | "exact") || DEFAULT_TYPE
    const sort = searchParams.get("sort") || (type === "semantic" ? "similarity" : "viewCount")
    const dir = searchParams.get("dir") || DEFAULT_DIR
    const sim = parseFloat(searchParams.get("sim") || String(DEFAULT_SIM))
    
    setSearchTerm(q)
    setSearchType(type)
    setSortBy(sort)
    setDirection(dir)
    setSimilarity(sim)
    
    if (q) {
      const page = parseInt(searchParams.get("page") || "1", 10)
      const calculatedOffset = (page - 1) * 12
      performSearch(q, type, sort, dir, sim, calculatedOffset)
    } else {
        setResults([])
        setHasSearched(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const updateUrl = (newParams: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        params.delete(key)
      } else {
        params.set(key, String(value))
      }
    })
    
    if (newParams.page === undefined) {
        params.set("page", "1")
    }

    router.push(`${pathname}?${params.toString()}`)
  }

  const performSearch = async (
    term: string, 
    type: "semantic" | "exact", 
    sort: string, 
    dir: string, 
    sim: number, 
    searchOffset: number
  ) => {
    if (!term.trim()) return

    setIsLoading(true)
    setError(null)
    setHasSearched(true)
    
    try {
      // Direct Client-Side Fetch
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchTerm: term.trim(),
          similarityThreshold: sim,
          sortColumn: sort,
          sortDirection: dir,
          searchType: type,
          limit: 12,
          offset: searchOffset,
        }),
      })

      if (!response.ok) {
        throw new Error(`Search failed: ${await response.text()}`)
      }

      const data = await response.json()
      
      if (!Array.isArray(data)) {
        console.error("Data is not an array:", data);
        setResults([]);
        return;
      }

      setResults(data)
      setOffset(searchOffset)
      
      if (data.length < 12) {
        setHasMoreResults(false)
      } else {
        setHasMoreResults(true)
      }
    } catch (err) {
      console.error("Search Error:", err);
      setError(err instanceof Error ? err.message : "An error occurred while searching")
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const onSearchClick = () => {
    if (!searchTerm.trim()) {
      setError("Please enter a search term")
      return
    }
    updateUrl({
      q: searchTerm,
      type: searchType,
      sort: sortBy,
      dir: direction,
      sim: similarity,
      page: "1"
    })
  }

  const handleLoadMore = async () => {
    setIsLoadingMore(true)
    setError(null)

    try {
      const newOffset = offset + 12

      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchTerm: searchTerm.trim(),
          similarityThreshold: similarity,
          sortColumn: sortBy,
          sortDirection: direction,
          searchType: searchType,
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
    if (!Array.isArray(results)) return [];
    
    results.forEach((result) => {
      if (!result || !result.video_id) return;
      
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
            placeholder="e.g., 'life review' (Exact), 'visited dead relatives' (Semantic)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onSearchClick() }}
            className="w-full"
          />
        </div>
        
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-shrink-0">
                    <label className="block text-sm font-medium mb-2">Search Type</label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="searchType" value="exact" checked={searchType === "exact"} onChange={() => setSearchType("exact")} />
                            Exact Match
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="searchType" value="semantic" checked={searchType === "semantic"} onChange={() => setSearchType("semantic")} />
                            Similar (Semantic)
                        </label>
                    </div>
                </div>
                {searchType === "semantic" && (
                <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium mb-2">Similarity Threshold: <span className="font-semibold text-primary">{similarity.toFixed(2)}</span></label>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="sortBy" className="block text-sm font-medium mb-2">Sort By</label>
                    <select
                        id="sortBy"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                    >
                        {searchType === "semantic" && <option value="similarity">Similarity</option>}
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
                        <option value="DESC">Descending</option>
                        <option value="ASC">Ascending</option>
                    </select>
                </div>
            </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={onSearchClick} disabled={isLoading} className="bg-primary text-primary-foreground px-8">
            {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Searching...</> : <><Search className="w-4 h-4 mr-2" />Search</>}
          </Button>
        </div>
      </div>

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
        {(results.length > 0 || isLoading) && (
          <div className="space-y-6">
            {isLoading && results.length === 0 && (
                <div className="text-center py-12">
                     <Loader2 className="w-8 h-8 mx-auto animate-spin mb-4" />
                     <p>Searching...</p>
                </div>
            )}
            
            {groupedResults.length > 0 && groupedResults.map((video) => (
              <SearchResultCard 
                key={video.video_id} 
                video={video} 
                searchTerm={searchTerm}
                searchType={searchType === "semantic" ? "concept" : "keyword"}
                onTagClick={() => {}} 
              />
            ))}

            {/* PRODUCTION DIAGNOSTIC: Render raw list if cards failed but data exists */}
            {groupedResults.length > 0 && (
                <div className="mt-12 p-4 bg-gray-100 text-xs text-gray-500 hidden">
                    <p>Diagnostic Data Load:</p>
                    <ul>
                        {groupedResults.map(g => (
                            <li key={g.video_id}>{g.title} ({g.transcripts.length} matches)</li>
                        ))}
                    </ul>
                </div>
            )}
            
            {hasSearched && !isLoading && hasMoreResults && (
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

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <SearchPageContent />
    </Suspense>
  )
}
