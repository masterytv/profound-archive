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
  Radar,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { YouTubePlayer } from "@/components/video/YouTubePlayer";
import { TimestampLink } from "@/components/video/TimestampLink";
import { SocialShareButton } from "@/components/video/ShareButton";
import { TriadScoresPanel, type TriadScores } from "@/components/uap/TriadScoresPanel";

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

/** Safely extract timestamped segments from JSONB (handles multiple shapes) */
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

/** Group subtitle segments into 60-second blocks for the transcript view */
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

// ─── Data Fetching ──────────────────────────────────────────────────────────

async function getEncounter(videoId: string) {
  const supabase = buildClient();
  const { data: video, error } = await supabase
    .from("uap_vids")
    .select(`
      video_id, title, channel_name, channel_id, channel_url,
      date, view_count, experiencer_name, content_type, tier, track,
      analysis_uap_summary, subtitles_punctuated,
      raw_timestamped_subtitles, url, thumbnail_url, intake_status
    `)
    .eq("video_id", videoId)
    .eq("tier", 1)
    .single();

  if (error || !video) return null;

  // Fetch triad analysis
  const { data: analysis } = await supabase
    .from("uap_analysis")
    .select(`
      evidence_score, evidence_breakdown, hynek_type, vallee_type,
      contact_depth_score, contact_depth_breakdown,
      transformation_score, transformation_breakdown,
      experience_type, phenomenology, entities, overall_tone,
      physical_effects, technology_described, message_content,
      recurrence_pattern, witness_count, evidence_types, content_safety
    `)
    .eq("video_id", videoId)
    .single();

  return { video, analysis };
}

// ─── Metadata ───────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getEncounter(slug);
  if (!result) return { title: "Encounter Not Found | Project Profound" };

  const { video, analysis } = result;
  const title = `${video.title} | UAP Encounter | Project Profound`;
  const description = video.analysis_uap_summary
    ? video.analysis_uap_summary.slice(0, 160)
    : `Explore this UAP encounter account on Project Profound.`;

  return {
    title,
    description,
    openGraph: {
      title: video.title ?? "UAP Encounter",
      description,
      type: "article",
      images: video.thumbnail_url ? [video.thumbnail_url] : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default async function EncounterDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { t } = await searchParams;
  const startTime = t ? parseInt(t, 10) : undefined;

  const result = await getEncounter(slug);
  if (!result) notFound();

  const { video, analysis } = result;

  // Build triad scores object for the panel
  const triadScores: TriadScores = {
    evidence_score: analysis?.evidence_score ?? null,
    evidence_breakdown: analysis?.evidence_breakdown as TriadScores["evidence_breakdown"],
    contact_depth_score: analysis?.contact_depth_score ?? null,
    contact_depth_breakdown: analysis?.contact_depth_breakdown as TriadScores["contact_depth_breakdown"],
    transformation_score: analysis?.transformation_score ?? null,
    transformation_breakdown: analysis?.transformation_breakdown as TriadScores["transformation_breakdown"],
    hynek_type: analysis?.hynek_type ?? null,
    vallee_type: analysis?.vallee_type ?? null,
  };

  // Timestamped transcript
  const rawSegments = getTimestampedSegments(video.raw_timestamped_subtitles);
  const transcriptBlocks = rawSegments ? groupSegmentsIntoBlocks(rawSegments) : null;

  // Tag strip
  const tags: { label: string; color?: string }[] = [];
  if (analysis?.experience_type) tags.push({ label: analysis.experience_type });
  if (analysis?.overall_tone) tags.push({ label: analysis.overall_tone, color: "green" });
  if (analysis?.hynek_type) tags.push({ label: `Hynek ${analysis.hynek_type}` });
  if (analysis?.recurrence_pattern) tags.push({ label: analysis.recurrence_pattern });
  if (analysis?.witness_count && analysis.witness_count > 1) {
    tags.push({ label: `${analysis.witness_count} witnesses` });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* JSON-LD: VideoObject structured data for encounter pages */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "VideoObject",
            name: video.title,
            description: video.analysis_uap_summary?.slice(0, 300) ?? `UAP encounter account: ${video.title}`,
            thumbnailUrl: video.thumbnail_url ?? `https://img.youtube.com/vi/${video.video_id}/maxresdefault.jpg`,
            uploadDate: video.date ?? undefined,
            contentUrl: `https://www.youtube.com/watch?v=${video.video_id}`,
            embedUrl: `https://www.youtube.com/embed/${video.video_id}`,
            ...(video.channel_name && { publisher: { "@type": "Organization", name: video.channel_name } }),
            ...(video.experiencer_name && { about: { "@type": "Person", name: video.experiencer_name } }),
            isPartOf: {
              "@type": "WebSite",
              name: "Project Profound",
              url: "https://projectprofound.org",
            },
          }),
        }}
      />
      {/* Breadcrumb */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-6xl">
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 py-3">
            <Link href="/uap" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">UAP</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/uap/search" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Search</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[200px] sm:max-w-xs">
              {video.title || "Encounter"}
            </span>
          </nav>
        </div>
      </div>

      {/* Main Layout: Player + Sidebar */}
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
                {video.title || "Untitled Encounter"}
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
                {video.experiencer_name && (
                  <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    Witness: <strong className="text-slate-700 dark:text-slate-300">{video.experiencer_name}</strong>
                  </div>
                )}
              </div>

              {/* Tier + Track badges */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                  Tier 1 — First-Person Encounter
                </span>
                {video.content_type && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                    {video.content_type.replace(/_/g, " ")}
                  </span>
                )}
              </div>

              <SocialShareButton
                url={`https://projectprofound.org/uap/encounters/${video.video_id}`}
                title={`${video.title} — UAP Encounter | Project Profound`}
                description="Explore this UAP encounter account on Project Profound."
              />
            </div>

            {/* Mobile-only: Triad Scores */}
            <div className="lg:hidden">
              <TriadScoresPanel scores={triadScores} />
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
                    The Encounter
                  </h2>
                </div>

                {tags.length > 0 && (
                  <div className="px-6 pt-4 pb-2 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag.label}
                        className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                          tag.color === "green"
                            ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-100 dark:border-green-800"
                            : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10"
                        }`}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                )}

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

            {/* Phenomenology highlights */}
            {analysis?.phenomenology && (
              <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center gap-2">
                  <Radar className="w-4 h-4 text-green-500" />
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
                    Phenomenology
                  </h2>
                </div>
                <div className="px-6 py-5">
                  <PhenomenologyGrid data={analysis.phenomenology} />
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

            {/* Comfort footer (UAP-specific) */}
            <div className="bg-green-50/40 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 rounded-2xl px-6 py-6 space-y-3">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Have you had a similar experience?
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Many people have reported encounters they struggle to explain. You are not alone.
                Project Profound collects and analyzes these accounts to advance understanding.
              </p>
              <Link
                href="/uap/chat"
                className="text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors inline-flex items-center gap-1"
              >
                Talk about it with AI →
              </Link>
            </div>
          </div>

          {/* Right Sidebar (desktop only) */}
          <div className="hidden lg:block space-y-6 lg:pr-1">
            <TriadScoresPanel scores={triadScores} />

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

// ─── Phenomenology Grid ─────────────────────────────────────────────────────

function PhenomenologyGrid({ data }: { data: unknown }) {
  if (!data || typeof data !== "object") return null;
  const entries = Object.entries(data as Record<string, unknown>).filter(
    ([, v]) => v !== null && v !== undefined && v !== "" && v !== false
  );
  if (entries.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="bg-slate-50 dark:bg-white/5 rounded-lg p-2.5 border border-slate-100 dark:border-white/10"
        >
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-0.5">
            {key.replace(/_/g, " ")}
          </span>
          <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
            {typeof value === "boolean" ? "Yes" : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}
