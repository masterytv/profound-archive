"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import Link from "next/link"

interface SearchResultCardProps {
  video: {
    video_id: string
    url: string
    title: string
    thumbnailUrl: string
    date: string | null
    viewCount: string
    channelName: string
    summary: string // AI-generated summary
    tags: string[] // AI-generated tags - kept for data model consistency
    transcripts: Array<{
      content: string
      start_time: number
      similarity?: number
    }>
  }
  searchTerm: string
  searchType: "keyword" | "concept"
  onTagClick: (tag: string) => void // Kept for prop consistency, but not used.
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
  if (isNaN(date.getTime())) {
    return "Invalid date"
  }
  return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
}

const formatViewCount = (viewCountString: string): string => {
  if (typeof viewCountString !== 'string') {
    return 'N/A views';
  }
  const numberPart = viewCountString.replace(/[^0-9]/g, '');
  if (!numberPart) {
    return viewCountString;
  }
  const num = parseInt(numberPart, 10);
  if (isNaN(num)) {
    return viewCountString;
  }
  let formattedNumber;
  if (num > 9999) {
    formattedNumber = num.toLocaleString();
  } else {
    formattedNumber = num.toString();
  }
  return `${formattedNumber} views`;
};

const highlightSearchTerm = (text: string, term: string, searchType: "keyword" | "concept") => {
    if (!term.trim() || searchType !== "keyword") {
      return <span>{text}</span>
    }
  
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const regex = new RegExp(`(${escapedTerm})`, "gi")
    const parts = text.split(regex)
  
    return (
      <>
        {parts.map((part, index) =>
          regex.test(part) ? <strong key={index}>{part}</strong> : <span key={index}>{part}</span>
        )}
      </>
    )
  }

export function SearchResultCard({ video, searchTerm, searchType, onTagClick }: SearchResultCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="flex flex-col md:flex-row">
        {/* Left Column: Thumbnail and Video Info */}
        <div className="md:w-80 flex-shrink-0 bg-gray-50 p-4">
          <Link
            href={`${video.url}&t=${Math.round(video.transcripts[0].start_time)}s`}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <div className="aspect-video bg-gray-300 rounded mb-3 overflow-hidden relative group">
              <img
                src={video.thumbnailUrl || "/placeholder.svg"}
                alt={video.title}
                className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
              />
            </div>
          </Link>
          <div className="text-sm space-y-1">
            <div className="font-medium">{video.channelName}</div>
            <div className="text-muted-foreground">{formatViewCount(video.viewCount)}</div>
            <div className="text-muted-foreground">{formatDate(video.date)}</div>
          </div>
        </div>

        {/* Right Column: Title, Summary, Transcripts */}
        <div className="flex-1 p-6">
          <CardHeader className="p-0 mb-4">
            <Link
              href={`${video.url}&t=${Math.round(video.transcripts[0].start_time)}s`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <CardTitle className="text-xl hover:text-primary transition-colors">{video.title}</CardTitle>
            </Link>
          </CardHeader>

          <CardContent className="p-0">
            {/* AI Summary */}
            <div className="mb-6">
              <h4 className="font-semibold text-md mb-2">
                AI Summary 
                <span className="font-normal text-foreground"> (AI makes mistakes)</span>
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {video.summary || "No summary available."}
              </p>
            </div>

            {/* Transcript Snippets */}
            <div>
              <h4 className="font-semibold text-md mb-3">Relevant Moments</h4>
              <div className="space-y-3">
                {video.transcripts.map((transcript, index) => (
                  <div
                    key={`${video.video_id}-${transcript.start_time}-${index}`}
                    className="flex items-start gap-3"
                  >
                    <Link
                      href={`${video.url}&t=${Math.round(transcript.start_time)}s`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline whitespace-nowrap"
                    >
                      {formatTimestamp(transcript.start_time)}
                    </Link>
                    <Link
                      href={`${video.url}&t=${Math.round(transcript.start_time)}s`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-foreground leading-relaxed hover:text-primary transition-colors"
                    >
                      {highlightSearchTerm(transcript.content, searchTerm, searchType)}
                      {searchType === "concept" && transcript.similarity !== undefined && (
                        <span className="text-muted-foreground ml-1">({transcript.similarity.toFixed(2)})</span>
                      )}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  )
}
