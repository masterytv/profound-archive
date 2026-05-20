import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Play, ExternalLink, Eye, Shield, Zap, Radio, Clock, User, Users, Calendar, FileText, Building2 } from "lucide-react";
import Image from "next/image";
import {
  getContacteeProfile,
  getContacteeVideos,
  type ContacteeProfile,
  type ContacteeVideoWithAnalysis,
} from "@/lib/data/uap-contactee";
import UapEntityLinkSection from "@/components/uap/UapEntityLinkSection";
import {
  findLinkedPersons,
  findLinkedPrograms,
  findLinkedEvents,
  findLinkedOrgs,
  findLinkedChannels,
} from "@/lib/data/uap-entity-links";

export const revalidate = 86400;

// ─── Display Labels ─────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  contact: "Contact Experience",
  abduction: "Abduction/Taken",
  "CE-5": "CE-5 / Initiated Contact",
  ongoing: "Ongoing Contact",
  mixed: "Multiple Experience Types",
  sighting: "Close Encounter / Sighting",
};

const RECURRENCE_LABELS: Record<string, string> = {
  "one-time": "Single Event",
  periodic: "Recurring Contact",
  ongoing: "Ongoing Contact",
};

const ENTITY_LABELS: Record<string, string> = {
  humanoid: "Humanoid Being",
  grey: "Grey",
  nordic: "Nordic / Tall White",
  reptilian: "Reptilian",
  insectoid: "Insectoid",
  light_being: "Light Being",
  shadow: "Shadow Entity",
  craft: "Craft",
  orb: "Orb / Light",
  other: "Other Entity",
};

const SOCIAL_ICONS: Record<string, { label: string; icon: string }> = {
  website: { label: "Website", icon: "🌐" },
  youtube: { label: "YouTube", icon: "▶" },
  twitter: { label: "Twitter / X", icon: "𝕏" },
  instagram: { label: "Instagram", icon: "📸" },
  facebook: { label: "Facebook", icon: "📘" },
  linkedin: { label: "LinkedIn", icon: "💼" },
};

// No generateStaticParams — pages render on-demand with fresh DB data,
// cached for 24h via ISR (revalidate = 86400 above).

// ─── SEO Metadata ───────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getContacteeProfile(slug);
  if (!profile) return { title: "Profile Not Found | Project Profound" };

  const title = `${profile.display_name} — UAP Contact Experiencer | Project Profound`;
  const description = profile.highlight_quote
    ? `"${profile.highlight_quote.slice(0, 140)}…" — ${profile.display_name}'s UAP contact experience profiled by Project Profound.`
    : profile.summary?.slice(0, 160) ??
      `Explore ${profile.display_name}'s UAP contact experience, profiled by Project Profound.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary_large_image", title, description },
  };
}

// ─── Section Heading ────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4"
      style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
    >
      {children}
    </h2>
  );
}

// ─── Score Bar Component ────────────────────────────────────────────────────

function ScoreBar({
  label,
  score,
  max,
  icon: Icon,
  color,
  href,
}: {
  label: string;
  score: number | null;
  max: number;
  icon: React.ElementType;
  color: string;
  href: string;
}) {
  if (score == null) return null;
  const pct = Math.round((score / max) * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <Link
          href={href}
          className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </Link>
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {score.toFixed(1)} / {max}
        </span>
      </div>
      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Video Card ─────────────────────────────────────────────────────────────

function VideoCard({ video }: { video: ContacteeVideoWithAnalysis }) {
  return (
    <Link
      href={`/uap/video/${video.video_id}`}
      className="group flex gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors border border-slate-200 dark:border-slate-700"
    >
      <div className="relative w-32 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700">
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={video.title}
            fill
            className="object-cover"
            sizes="128px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-6 h-6 text-slate-400" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="w-8 h-8 text-white drop-shadow-lg" fill="white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
          {video.title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {video.channel_name || "Unknown Channel"}
        </p>
        {video.analysis && (
          <div className="flex gap-3 mt-1.5 text-xs font-medium">
            {video.analysis.evidence_score != null && (
              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                <Shield className="w-3 h-3" />
                Evidence {Math.round((video.analysis.evidence_score / 28) * 100)}%
              </span>
            )}
            {video.analysis.contact_depth_score != null && (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Zap className="w-3 h-3" />
                Depth {Math.round((video.analysis.contact_depth_score / 32) * 100)}%
              </span>
            )}
            {video.analysis.transformation_score != null && (
              <span className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400">
                <Eye className="w-3 h-3" />
                Impact {Math.round((video.analysis.transformation_score / 50) * 100)}%
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function ContacteeProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await getContacteeProfile(slug);
  if (!profile) notFound();

  // Fetch all linked videos with analysis + cross-entity links
  const videoIds = profile.video_ids || [];
  const [videos, linkedPersons, linkedPrograms, linkedEvents, linkedOrgs, linkedChannels] = await Promise.all([
    getContacteeVideos(videoIds),
    findLinkedPersons(videoIds, slug),
    findLinkedPrograms(videoIds, slug),
    findLinkedEvents(videoIds, slug),
    findLinkedOrgs(videoIds),
    findLinkedChannels(videoIds),
  ]);

  // Compute initials for avatar placeholder
  const initials = profile.display_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* ── Breadcrumb ──────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-2">
        <Link
          href="/uap/experiencer"
          className="inline-flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All Experiencers
        </Link>
      </div>

      {/* ── Hero Section ────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          {/* Photo / Avatar */}
          <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-2xl overflow-hidden bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-200 dark:border-green-800 flex-shrink-0">
            {profile.photo_url ? (
              <Image
                src={profile.photo_url}
                alt={profile.display_name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 112px, 144px"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl md:text-4xl font-bold text-green-600/60 dark:text-green-400/40">
                {initials}
              </div>
            )}
          </div>

          {/* Name + Meta */}
          <div className="flex-1">
            <h1
              className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              {profile.display_name}
            </h1>

            {/* Badges Row */}
            <div className="flex flex-wrap gap-2 mt-3">
              {profile.experience_type && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                  <Zap className="w-3 h-3" />
                  {TYPE_LABELS[profile.experience_type] || profile.experience_type}
                </span>
              )}
              {profile.recurrence && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <Clock className="w-3 h-3" />
                  {RECURRENCE_LABELS[profile.recurrence] || profile.recurrence}
                </span>
              )}
              {profile.contribution_label && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  <User className="w-3 h-3" />
                  {profile.contribution_label}
                </span>
              )}
            </div>

            {/* Stats Row */}
            <div className="flex gap-4 mt-4 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Play className="w-3.5 h-3.5" />
                {videos.length} video{videos.length !== 1 ? "s" : ""}
              </span>
              {profile.total_views > 0 && (
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {profile.total_views.toLocaleString()} views
                </span>
              )}
              {profile.first_shared_year && (
                <span>First shared: {profile.first_shared_year}</span>
              )}
            </div>

            {/* Highlight Quote */}
            {profile.highlight_quote && (
              <blockquote className="mt-4 pl-4 border-l-3 border-green-400 dark:border-green-600 italic text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                &ldquo;{profile.highlight_quote}&rdquo;
                {profile.highlight_quote_source && (
                  <span className="block mt-1 text-xs text-slate-400 dark:text-slate-500 not-italic">
                    — via {profile.highlight_quote_source}
                  </span>
                )}
              </blockquote>
            )}
          </div>
        </div>
      </section>

      {/* ── Content Grid ────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Videos */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio */}
            {(profile.summary || profile.bio) && (
              <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                <SectionHeading>About</SectionHeading>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                  {profile.bio || profile.summary}
                </p>
              </div>
            )}

            {/* Videos */}
            <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
              <SectionHeading>
                Video References ({videos.length})
              </SectionHeading>
              {videos.length > 0 ? (
                <div className="space-y-3">
                  {videos.map((video) => (
                    <VideoCard key={video.video_id} video={video} />
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  No videos linked yet.
                </p>
              )}
            </div>

            {/* Entity Types */}
            {profile.entity_types.length > 0 && (
              <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                <SectionHeading>Entities Described</SectionHeading>
                <div className="flex flex-wrap gap-2">
                  {profile.entity_types.map((et) => (
                    <span
                      key={et}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      {ENTITY_LABELS[et] || et}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Standardized Cross-Entity Links (canonical order) ── */}
            <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-8">
              <UapEntityLinkSection
                icon={Radio}
                title={`Featured on Channels (${linkedChannels.length})`}
                description="Channels that have published videos featuring this experiencer."
                entities={linkedChannels.map((ch) => ({
                  slug: ch.channel_id,
                  name: ch.name,
                  subtitle: `${ch.video_count} video${ch.video_count !== 1 ? 's' : ''}`,
                  href: ch.href,
                  count: ch.video_count,
                }))}
              />
              <UapEntityLinkSection
                icon={User}
                title={`Linked Persons of Interest (${linkedPersons.length})`}
                description="These individuals are discussed in the same videos featuring this experiencer. This reflects topical co-occurrence, not a direct relationship."
                entities={linkedPersons}
              />
              <UapEntityLinkSection
                icon={Calendar}
                title={`Linked Events (${linkedEvents.length})`}
                description="These events are discussed in the same videos featuring this experiencer. This reflects topical co-occurrence, not confirmed involvement."
                entities={linkedEvents}
              />
              <UapEntityLinkSection
                icon={Building2}
                title={`Linked Organizations (${linkedOrgs.length})`}
                description="These organizations are discussed in the same videos featuring this experiencer. This reflects topical co-occurrence, not a confirmed affiliation."
                entities={linkedOrgs}
              />
              <UapEntityLinkSection
                icon={FileText}
                title={`Linked Programs (${linkedPrograms.length})`}
                description="These programs are discussed in the same videos featuring this experiencer. This reflects topical co-occurrence, not a confirmed connection."
                entities={linkedPrograms}
              />
            </div>
          </div>

          {/* Right Column: Scores + Themes + Social */}
          <div className="space-y-6">
            {/* Triad Scores */}
            {(profile.avg_evidence_score != null ||
              profile.avg_contact_depth != null ||
              profile.avg_transformation_score != null) && (
              <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                <SectionHeading>UAP Contact Triad</SectionHeading>
                <div className="space-y-4">
                  <ScoreBar
                    label="Evidence Strength"
                    score={profile.avg_evidence_score}
                    max={28}
                    icon={Shield}
                    color="bg-green-500"
                    href="/uap/methodology/evidence-strength"
                  />
                  <ScoreBar
                    label="Contact Depth"
                    score={profile.avg_contact_depth}
                    max={32}
                    icon={Zap}
                    color="bg-emerald-500"
                    href="/uap/methodology/contact-depth"
                  />
                  <ScoreBar
                    label="Transformation"
                    score={profile.avg_transformation_score}
                    max={50}
                    icon={Eye}
                    color="bg-teal-500"
                    href="/uap/methodology/transformation"
                  />
                </div>
                <Link
                  href="/uap/methodology"
                  className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:underline mt-3"
                >
                  About our scoring methodology →
                </Link>
              </div>
            )}

            {/* Core Themes */}
            {profile.core_themes.length > 0 && (
              <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                <SectionHeading>Themes</SectionHeading>
                <div className="flex flex-wrap gap-2">
                  {profile.core_themes.map((theme) => (
                    <span
                      key={theme}
                      className="px-2.5 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Channel Appearances */}
            {profile.channel_appearances.length > 0 && (
              <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                <SectionHeading>Featured On</SectionHeading>
                <div className="space-y-3">
                  {profile.channel_appearances.map((ch) => (
                    <Link
                      key={ch.channel_id}
                      href={`https://youtube.com/channel/${ch.channel_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 group"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                        {ch.avatar_url ? (
                          <Image
                            src={ch.avatar_url}
                            alt={ch.name}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-medium text-slate-400">
                            {ch.name[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors truncate">
                          {ch.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {ch.video_count} video{ch.video_count !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Social Links */}
            {profile.social_links &&
              Object.keys(profile.social_links).length > 0 && (
                <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                  <SectionHeading>Connect</SectionHeading>
                  <div className="space-y-2">
                    {Object.entries(profile.social_links).map(
                      ([key, url]) => {
                        const social = SOCIAL_ICONS[key];
                        if (!social || !url) return null;
                        return (
                          <a
                            key={key}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                          >
                            <span>{social.icon}</span>
                            {social.label}
                            <ExternalLink className="w-3 h-3 ml-auto" />
                          </a>
                        );
                      }
                    )}
                  </div>
                </div>
              )}
          </div>
        </div>
      </section>

      {/* ── JSON-LD ──────────────────────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: profile.display_name,
            description:
              profile.summary ||
              `UAP contact experiencer profiled by Project Profound`,
            url: `https://projectprofound.org/uap/experiencer/${profile.slug}`,
            image: profile.photo_url || undefined,
          }),
        }}
      />
    </main>
  );
}
