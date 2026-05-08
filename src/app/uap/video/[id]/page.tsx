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
  Loader2,
  Database,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { YouTubePlayer } from "@/components/video/YouTubePlayer";
import { TimestampLink } from "@/components/video/TimestampLink";
import { SocialShareButton } from "@/components/video/ShareButton";
// Tier 1 components
import { TriadScoresPanel, type TriadScores } from "@/components/uap/TriadScoresPanel";
import { UapResearchBreakdown, type EvidenceBreakdown } from "@/components/uap/UapResearchBreakdown";
import { UapEncounterContextCard } from "@/components/uap/UapEncounterContextCard";
import type { UapPhenomenologyResult } from "@/lib/ai/uap-phenomenology";
import type { UapEncounterContextResult } from "@/lib/ai/uap-encounter-context";
// Tier 2 components
import { KnowledgePanel, type KnowledgeData } from "@/components/uap/KnowledgePanel";
import { UapProgramIntelCard } from "@/components/uap/program-intel/UapProgramIntelCard";
import { UapProgramIntelSummaryCard } from "@/components/uap/program-intel/UapProgramIntelSummaryCard";
import type { UapProgramIntelResult } from "@/lib/ai/uap-program-intel";

// ─── Build Client (SSG-safe — no cookies()) ─────────────────────────────────

function buildClient() {
  return createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
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

// Content type labels
const CONTENT_TYPE_LABELS: Record<string, string> = {
  first_person: "First-Person Account",
  retold_story: "Retold Account",
  research_analysis: "Research & Analysis",
  program_disclosure: "Government & Disclosure",
  out_of_scope: "Other",
};

// ─── Data Fetching ──────────────────────────────────────────────────────────

async function getUapVideo(videoId: string) {
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
    .in("tier", [1, 2])
    .single();

  if (error || !video) return null;

  // Fetch analysis (works for both tiers — different fields populated)
  const { data: analysis } = await supabase
    .from("uap_analysis")
    .select(`
      evidence_score, evidence_breakdown, hynek_type, vallee_type,
      contact_depth_score, contact_depth_breakdown,
      transformation_score, transformation_breakdown,
      experience_type, phenomenology, phenomenology_breakdown, encounter_context,
      entities, overall_tone,
      physical_effects, technology_described, message_content,
      recurrence_pattern, witness_count, evidence_types,
      claims, people_mentioned, programs_mentioned,
      timeline_events, consciousness_connections,
      content_safety, program_intel_breakdown
    `)
    .eq("video_id", videoId)
    .single();

  // Look up contactee profile by checking if this video_id is in their video_ids array
  const { data: contactee } = await supabase
    .from("uap_contactee_profiles")
    .select("slug, display_name")
    .contains("video_ids", [videoId])
    .single();

  return { video, analysis, contactee };
}

// ─── Metadata ───────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getUapVideo(id);
  if (!result) return { title: "Video Not Found | Project Profound" };

  const { video } = result;
  const tierLabel = video.tier === 1 ? "UAP Encounter" : "UAP Research";
  const title = `${video.title} | ${tierLabel} | Project Profound`;
  const description = video.analysis_uap_summary
    ? video.analysis_uap_summary.slice(0, 160)
    : `Explore this ${tierLabel.toLowerCase()} on Project Profound.`;

  return {
    title,
    description,
    openGraph: {
      title: video.title ?? tierLabel,
      description,
      type: "article",
      images: video.thumbnail_url ? [video.thumbnail_url] : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default async function UapVideoDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { t } = await searchParams;
  const startTime = t ? parseInt(t, 10) : undefined;

  const result = await getUapVideo(id);
  if (!result) notFound();

  const { video, analysis, contactee } = result;
  const isTier1 = video.tier === 1;

  // Build triad scores for Tier 1 sidebar
  const triadScores: TriadScores | null = isTier1 && analysis ? {
    evidence_score: analysis.evidence_score,
    evidence_breakdown: analysis.evidence_breakdown as TriadScores["evidence_breakdown"],
    contact_depth_score: analysis.contact_depth_score,
    contact_depth_breakdown: analysis.contact_depth_breakdown as TriadScores["contact_depth_breakdown"],
    transformation_score: analysis.transformation_score,
    transformation_breakdown: analysis.transformation_breakdown as TriadScores["transformation_breakdown"],
    hynek_type: analysis.hynek_type,
    vallee_type: analysis.vallee_type,
  } : null;

  // Build knowledge data for Tier 2 sidebar
  const knowledgeData: KnowledgeData | null = !isTier1 && analysis ? {
    claims: analysis.claims as KnowledgeData["claims"],
    people_mentioned: analysis.people_mentioned as KnowledgeData["people_mentioned"],
    programs_mentioned: analysis.programs_mentioned as KnowledgeData["programs_mentioned"],
    timeline_events: analysis.timeline_events as KnowledgeData["timeline_events"],
    consciousness_connections: analysis.consciousness_connections as KnowledgeData["consciousness_connections"],
  } : null;

  // Timestamped transcript
  const rawSegments = getTimestampedSegments(video.raw_timestamped_subtitles);
  const transcriptBlocks = rawSegments ? groupSegmentsIntoBlocks(rawSegments) : null;

  const contentLabel = CONTENT_TYPE_LABELS[video.content_type ?? ""] ?? video.content_type?.replace(/_/g, " ") ?? "";
  const tierLabel = isTier1 ? "Encounter" : "Research";
  const breadcrumbLabel = isTier1 ? "Encounters" : "Research";
  const summaryHeading = isTier1 ? "The Encounter" : "Summary";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Breadcrumb */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-6xl">
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 py-3">
            <Link href="/uap" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">UAP</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/uap/video-explore" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Videos</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[200px] sm:max-w-xs">
              {video.title || "Video"}
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
                {video.title || "Untitled Video"}
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
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                  isTier1
                    ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                    : "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10"
                }`}>
                  {isTier1 ? "🛸" : "📡"} Tier {video.tier} — {tierLabel}
                </span>
                {contentLabel && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                    {contentLabel}
                  </span>
                )}
              </div>

              {/* Experiencer name (Tier 1) */}
              {video.experiencer_name && (
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Experiencer:{" "}
                  {contactee ? (
                    <Link href={`/uap/contactees/${contactee.slug}`} className="font-bold text-green-600 dark:text-green-400 hover:underline">{video.experiencer_name}</Link>
                  ) : (
                    <span className="font-bold text-slate-700 dark:text-slate-300">{video.experiencer_name}</span>
                  )}
                </div>
              )}

              <SocialShareButton
                url={`https://projectprofound.org/uap/video/${video.video_id}`}
                title={`${video.title} — UAP ${tierLabel} | Project Profound`}
                description={`Explore this UAP ${tierLabel.toLowerCase()} on Project Profound.`}
              />
            </div>

            {/* Mobile-only sidebar content */}
            <div className="lg:hidden">
              {isTier1 && triadScores && <TriadScoresPanel scores={triadScores} />}
              {!isTier1 && knowledgeData && <KnowledgePanel data={knowledgeData} />}
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
                    {summaryHeading}
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

            {/* ── Tier 1: Encounter Context + Deep Analysis ────────────── */}
            {isTier1 && video.intake_status !== "punctuated" && video.intake_status !== "pending" && (
              <UapEncounterContextCard
                data={analysis?.encounter_context as UapEncounterContextResult | null}
              />
            )}

            {isTier1 && (
              video.intake_status === "punctuated" || video.intake_status === "pending" ? (
                <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center gap-2">
                    <Radar className="w-4 h-4 text-green-500" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
                      Research Breakdown
                    </h2>
                  </div>
                  <div className="px-6 py-8 text-center">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">Analysis pending</p>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">This video is in the queue for deep phenomenological extraction.</p>
                  </div>
                </div>
              ) : analysis?.phenomenology && !analysis?.phenomenology_breakdown ? (
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
              ) : (
                <UapResearchBreakdown
                  data={analysis?.phenomenology_breakdown as UapPhenomenologyResult | null}
                  evidenceBreakdown={analysis?.evidence_breakdown as EvidenceBreakdown | null}
                />
              )
            )}

            {/* ── Tier 2: Program Intelligence Breakdown ────────────── */}
            {!isTier1 && (
              video.intake_status === "punctuated" || video.intake_status === "pending" ? (
                <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center gap-2">
                    <Database className="w-4 h-4 text-green-500" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
                      Program Intelligence
                    </h2>
                  </div>
                  <div className="px-6 py-8 text-center">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">Analysis pending</p>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">This video is in the queue for deep program intelligence extraction.</p>
                  </div>
                </div>
              ) : (
                <UapProgramIntelCard data={analysis?.program_intel_breakdown as UapProgramIntelResult | null} />
              )
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

            {/* Tier 1: Comfort footer */}
            {isTier1 && (
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
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6 lg:pr-1">
            {/* Tier-conditional sidebar */}
            {isTier1 && triadScores && <TriadScoresPanel scores={triadScores} />}
            {!isTier1 && analysis?.program_intel_breakdown ? (
              <UapProgramIntelSummaryCard data={analysis.program_intel_breakdown as UapProgramIntelResult} />
            ) : (
              !isTier1 && knowledgeData && <KnowledgePanel data={knowledgeData} />
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Phenomenology Grid (legacy fallback for older Tier 1 records) ────────

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
