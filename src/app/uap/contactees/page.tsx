import Link from "next/link";
import type { Metadata } from "next";
import { Users, Shield, Zap, Eye, Play, Search, ChevronRight } from "lucide-react";
import Image from "next/image";
import { getContacteeList, type ContacteeListItem } from "@/lib/data/uap-contactee";

export const revalidate = 86400;

// ─── SEO ────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "UAP Contact Experiencers | Project Profound",
  description:
    "Explore profiles of UAP contact experiencers — first-person accounts of encounters with unidentified aerial phenomena, analyzed with the UAP Contact Triad.",
  openGraph: {
    title: "UAP Contact Experiencers | Project Profound",
    description:
      "Explore profiles of UAP contact experiencers — first-person accounts analyzed with the UAP Contact Triad.",
    type: "website",
  },
};

// ─── Display Helpers ────────────────────────────────────────────────────────

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
  contact: { label: "Contact", color: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" },
  abduction: { label: "Abduction", color: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" },
  "CE-5": { label: "CE-5", color: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300" },
  ongoing: { label: "Ongoing", color: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" },
  mixed: { label: "Mixed", color: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400" },
};

// ─── Contactee Card ─────────────────────────────────────────────────────────

function ContacteeCard({ profile }: { profile: ContacteeListItem }) {
  const initials = profile.display_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const typeBadge = profile.experience_type
    ? TYPE_BADGES[profile.experience_type] || { label: profile.experience_type, color: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400" }
    : null;

  return (
    <Link
      href={`/uap/contactees/${profile.slug}`}
      className="group flex items-start gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-green-300 dark:hover:border-green-700 hover:shadow-lg hover:shadow-green-500/5 transition-all duration-200"
    >
      {/* Avatar */}
      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-200 dark:border-green-800 flex-shrink-0">
        {profile.photo_url ? (
          <Image
            src={profile.photo_url}
            alt={profile.display_name}
            fill
            className="object-cover"
            sizes="56px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg font-bold text-green-600/60 dark:text-green-400/40">
            {initials}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors truncate">
            {profile.display_name}
          </h3>
          <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {typeBadge && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full ${typeBadge.color}`}>
              <Zap className="w-2.5 h-2.5" />
              {typeBadge.label}
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            <Play className="w-2.5 h-2.5" />
            {profile.video_count} video{profile.video_count !== 1 ? "s" : ""}
          </span>
          {profile.total_views > 1000 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              <Eye className="w-2.5 h-2.5" />
              {(profile.total_views / 1000).toFixed(0)}k views
            </span>
          )}
        </div>

        {/* Mini Scores */}
        {(profile.avg_evidence_score != null || profile.avg_contact_depth != null) && (
          <div className="flex gap-3 mt-2 text-xs text-slate-400 dark:text-slate-500">
            {profile.avg_evidence_score != null && (
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-green-500" />
                ESS {profile.avg_evidence_score.toFixed(1)}
              </span>
            )}
            {profile.avg_contact_depth != null && (
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-500" />
                CDS {profile.avg_contact_depth.toFixed(1)}
              </span>
            )}
            {profile.avg_transformation_score != null && (
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3 text-teal-500" />
                CTI {profile.avg_transformation_score.toFixed(1)}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function ContacteesPage() {
  const profiles = await getContacteeList({ sort: "views", limit: 200 });

  // Stats
  const totalVideos = profiles.reduce((sum, p) => sum + p.video_count, 0);
  const totalViews = profiles.reduce((sum, p) => sum + p.total_views, 0);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5" />
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-16 relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-green-100 dark:bg-green-900/40">
              <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm font-medium text-green-600 dark:text-green-400 tracking-wide uppercase">
              UAP Contact Archive
            </span>
          </div>
          <h1
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 dark:text-slate-100 mb-4"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            People Who Made Contact
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Profiles of individuals who have shared their UAP contact experiences.
            Each profile aggregates video testimonies and analysis scores from
            the UAP Contact Experience Triad.
          </p>

          {/* Stats Bar */}
          <div className="flex flex-wrap gap-6 mt-6 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-green-500" />
              <strong className="text-slate-700 dark:text-slate-300">{profiles.length}</strong> contactees
            </span>
            <span className="flex items-center gap-1.5">
              <Play className="w-4 h-4 text-green-500" />
              <strong className="text-slate-700 dark:text-slate-300">{totalVideos}</strong> videos
            </span>
            {totalViews > 0 && (
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-green-500" />
                <strong className="text-slate-700 dark:text-slate-300">{(totalViews / 1000000).toFixed(1)}M</strong> total views
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── Grid ─────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        {profiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profiles.map((profile) => (
              <ContacteeCard key={profile.id} profile={profile} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
              Profiles Coming Soon
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Contactee profiles are being generated from analyzed encounter videos.
              Check back soon.
            </p>
          </div>
        )}
      </section>

      {/* ── JSON-LD ──────────────────────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "UAP Contact Experiencers",
            description:
              "Profiles of UAP contact experiencers analyzed by Project Profound",
            url: "https://projectprofound.org/uap/contactees",
            numberOfItems: profiles.length,
          }),
        }}
      />
    </main>
  );
}
