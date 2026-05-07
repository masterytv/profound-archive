import { createClient as createAnonClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ChevronRight,
  Eye,
  Calendar,
  BookOpen,
  ChevronDown,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { YouTubePlayer } from "@/components/video/YouTubePlayer";
import { TimestampLink } from "@/components/video/TimestampLink";
import { SocialShareButton } from "@/components/video/ShareButton";
import { KnowledgePanel, type KnowledgeData } from "@/components/uap/KnowledgePanel";

// ─── Build Client (SSG-safe — no cookies()) ─────────────────────────────────

function buildClient() {
  return createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string }>;
}

interface TimestampedSegment {
  start: number;
  end: number;
  text: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatViewCount(count: number | null): string {
  if (!count) return "0";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString();
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "Unknown date";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Unknown date";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Unknown date";
  }
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getTimestampedSegments(raw: unknown): TimestampedSegment[] | null {
  if (!raw) return null;
  let parsed = raw;
  if (typeof raw === "string") {
    try { parsed = JSON.parse(raw); } catch { return null; }
  }
  if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) && Array.isArray((parsed as Record<string, unknown>).data)) {
    return (parsed as { data: TimestampedSegment[] }).data;
  }
  if (Array.isArray(parsed)) return parsed as TimestampedSegment[];
  return null;
}

function groupSegmentsIntoBlocks(segments: TimestampedSegment[], blockDurationSeconds = 60) {
  const blocks: { blockStart: number; text: string; startSeconds: number }[] = [];
  let currentBlock: string[] = [];
  let blockStart = 0;
  let blockStartSeconds = 0;

  for (const seg of segments) {
    if (!seg.text || seg.text.startsWith("[")) continue;
    const blockNum = Math.floor(seg.start / blockDurationSeconds);
    if (blockNum !== blockStart && currentBlock.length > 0) {
      blocks.push({ blockStart: blockStart * blockDurationSeconds, text: currentBlock.join(" "), startSeconds: blockStartSeconds });
      currentBlock = [];
      blockStart = blockNum;
      blockStartSeconds = Math.floor(seg.start);
    }
    if (currentBlock.length === 0) blockStartSeconds = Math.floor(seg.start);
    currentBlock.push(seg.text.trim());
  }
  if (currentBlock.length > 0) {
    blocks.push({ blockStart: blockStart * blockDurationSeconds, text: currentBlock.join(" "), startSeconds: blockStartSeconds });
  }
  return blocks;
}

// Content type labels for Tier 2 program videos
const CONTENT_TYPE_LABELS: Record<string, string> = {
  program_disclosure: "Government & Disclosure",
  research_analysis: "Research & Analysis",
  documentary: "Documentary",
  interview_panel: "Interview / Panel",
  lecture: "Lecture",
  news_report: "News Report",
};

// ─── Data Fetching ──────────────────────────────────────────────────────────

async function getProgram(videoId: string) {
  const supabase = buildClient();
  const { data: video, error } = await supabase
    .from("uap_vids")
    .select(`
      video_id, title, channel_name, channel_id, channel_url,
      date, view_count, content_type, tier, track,
      analysis_uap_summary, subtitles_punctuated,
      raw_timestamped_subtitles, url, thumbnail_url, intake_status
    `)
    .eq("video_id", videoId)
    .eq("tier", 2)
    .single();

  if (error || !video) return null;

  // Fetch knowledge extraction data
  const { data: analysis } = await supabase
    .from("uap_analysis")
    .select(`
      claims, people_mentioned, programs_mentioned,
      timeline_events, consciousness_connections,
      content_safety
    `)
    .eq("video_id", videoId)
    .single();

  return { video, analysis };
}

// ─── Metadata ───────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProgram(slug);
  if (!result) return { title: "Program Not Found | Project Profound" };

  const { video } = result;
  const title = `${video.title} | UAP Research | Project Profound`;
  const description = video.analysis_uap_summary
    ? video.analysis_uap_summary.slice(0, 160)
    : `Watch and analyze this UAP research video on Project Profound.`;

  return {
    title,
    description,
    openGraph: {
      title: video.title ?? "UAP Research",
      description,
      type: "article",
      images: video.thumbnail_url ? [video.thumbnail_url] : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default async function ProgramDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { t } = await searchParams;
  const startTime = t ? parseInt(t, 10) : undefined;

  const result = await getProgram(slug);
  if (!result) notFound();

  const { video, analysis } = result;

  // Build knowledge data for the panel
  const knowledgeData: KnowledgeData = {
    claims: analysis?.claims as KnowledgeData["claims"],
    people_mentioned: analysis?.people_mentioned as KnowledgeData["people_mentioned"],
    programs_mentioned: analysis?.programs_mentioned as KnowledgeData["programs_mentioned"],
    timeline_events: analysis?.timeline_events as KnowledgeData["timeline_events"],
    consciousness_connections: analysis?.consciousness_connections as KnowledgeData["consciousness_connections"],
  };

  // Timestamped transcript
  const rawSegments = getTimestampedSegments(video.raw_timestamped_subtitles);
  const transcriptBlocks = rawSegments ? groupSegmentsIntoBlocks(rawSegments) : null;

  const contentLabel = CONTENT_TYPE_LABELS[video.content_type ?? ""] ?? video.content_type?.replace(/_/g, " ") ?? "Research";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Breadcrumb */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-6xl">
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 py-3">
            <Link href="/uap" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">UAP</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/uap/search" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Research</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[200px] sm:max-w-xs">
              {video.title || "Program"}
            </span>
          </nav>
        </div>
      </div>

      {/* Main Layout */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Video Player */}
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-lg bg-black">
              <YouTubePlayer videoId={video.video_id} title={video.title || "Video"} startTime={startTime} />
            </div>

            {/* Title + Metadata */}
            <div className="space-y-4">
              <h1
                className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 leading-tight"
                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
              >
                {video.title || "Untitled Program"}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                {video.channel_name && (
                  <Link
                    href={`/uap/channels/${video.channel_id}`}
                    className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-xs font-bold">
                      {video.channel_name.charAt(0)}
                    </div>
                    {video.channel_name}
                  </Link>
                )}
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(video.date)}
                </div>
                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <Eye className="w-3.5 h-3.5" />
                  {formatViewCount(video.view_count)} views
                </div>
              </div>

              {/* Tier + Content type badges */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                  Tier 2 — Research & Disclosure
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                  {contentLabel}
                </span>
              </div>

              <SocialShareButton
                url={`https://projectprofound.org/uap/programs/${video.video_id}`}
                title={`${video.title} — UAP Research | Project Profound`}
                description="UAP research and disclosure analysis on Project Profound."
              />
            </div>

            {/* Mobile-only: Knowledge Panel */}
            <div className="lg:hidden">
              <KnowledgePanel data={knowledgeData} />
            </div>

            {/* AI Summary */}
            {video.analysis_uap_summary && (
              <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-green-500" />
                  <h2
                    className="text-lg font-bold text-slate-900 dark:text-slate-100"
                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                  >
                    Summary
                  </h2>
                </div>
                <div className="px-6 py-5">
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line text-[15px]">
                    {video.analysis_uap_summary}
                  </p>
                </div>
                <div className="px-6 pb-4 border-t border-slate-50 dark:border-white/5 pt-3">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">✦ AI Generated</span>
                </div>
              </div>
            )}

            {/* Timestamped Transcript */}
            {(transcriptBlocks || video.subtitles_punctuated) && (
              <Collapsible>
                <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
                          Full Transcript
                        </h2>
                      </div>
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-6 pb-6">
                      {transcriptBlocks ? (
                        <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-5 max-h-[500px] overflow-y-auto border border-slate-100 dark:border-white/10 space-y-4">
                          {transcriptBlocks.map((block, i) => (
                            <div key={i} className="flex gap-3">
                              <TimestampLink seconds={block.startSeconds} label={`[${formatTimestamp(block.startSeconds)}]`} />
                              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{block.text}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-5 max-h-[500px] overflow-y-auto border border-slate-100 dark:border-white/10">
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                            {video.subtitles_punctuated}
                          </p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}
          </div>

          {/* Right Sidebar (desktop only) */}
          <div className="hidden lg:block space-y-6 lg:pr-1">
            <KnowledgePanel data={knowledgeData} />

            {/* External link */}
            {video.url && (
              <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm p-4">
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-600 dark:text-green-400 hover:underline font-medium"
                >
                  Watch on YouTube →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
