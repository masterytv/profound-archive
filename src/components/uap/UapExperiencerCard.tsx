import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Shield, Zap, Eye, Play } from "lucide-react";

export type UapExperiencerProfile = {
  id: string;
  slug: string;
  display_name: string;
  photo_url: string | null;
  experience_type: string | null;
  video_count: number;
  total_views: number;
  avg_evidence_score: number | null;
  avg_contact_depth: number | null;
  avg_transformation_score: number | null;
};

export function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K views`;
  return `${n} views`;
}

/** UAP CET score maximums — must match the ScoreBar maxes on the profile page */
const ESS_MAX = 28;  // Evidence Strength Scale: 7 criteria × 1-4
const CDS_MAX = 32;  // Contact Depth Scale: 16 items × 0-2
const CTI_MAX = 50;  // Contact Transformation Index: used as /50 on profile

export function UapExperiencerCard({ profile }: { profile: UapExperiencerProfile }) {
  const initials = profile.display_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      href={`/uap/experiencer/${profile.slug}`}
      className="group flex bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-slate-200/60 dark:border-white/10 overflow-hidden hover:shadow-lg hover:border-green-300/60 dark:hover:border-green-500/30 transition-all duration-300"
    >
      {/* Photo — 1/3 width */}
      <div className="relative w-1/3 min-h-[140px] bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-500/20 dark:to-emerald-500/20 flex-shrink-0">
        {profile.photo_url ? (
          <Image
            src={profile.photo_url}
            alt={profile.display_name}
            fill
            sizes="(max-width: 640px) 33vw, 150px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl font-bold text-green-400/60 dark:text-green-300/40">
              {initials}
            </span>
          </div>
        )}
      </div>

      {/* Content — 2/3 width */}
      <div className="flex flex-col flex-1 p-4 min-w-0">
        <h2
          className="text-base font-bold text-slate-900 dark:text-slate-50 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors truncate mb-0.5"
          style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
        >
          {profile.display_name}
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
          {profile.video_count > 0 && (
            <>
              <Play className="w-3 h-3 inline mb-0.5 mr-0.5" />
              {profile.video_count} {profile.video_count === 1 ? "account" : "accounts"}
            </>
          )}
          {profile.video_count > 0 && profile.total_views ? " · " : ""}
          {profile.total_views ? (
            <>
              <Eye className="w-3 h-3 inline mb-0.5 mr-0.5" /> {formatViews(profile.total_views)}
            </>
          ) : null}
        </p>

        {/* Score percentages with icons */}
        <div className="flex items-center gap-3 mt-auto">
          {profile.avg_evidence_score !== null && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
              <Shield className="w-3.5 h-3.5" />
              {Math.round((profile.avg_evidence_score / ESS_MAX) * 100)}%
            </span>
          )}
          {profile.avg_contact_depth !== null && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Zap className="w-3.5 h-3.5" />
              {Math.round((profile.avg_contact_depth / CDS_MAX) * 100)}%
            </span>
          )}
          {profile.avg_transformation_score !== null && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400">
              <Eye className="w-3.5 h-3.5" />
              {Math.round((profile.avg_transformation_score / CTI_MAX) * 100)}%
            </span>
          )}
          <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-green-500 group-hover:translate-x-0.5 transition-all ml-auto self-center" />
        </div>
      </div>
    </Link>
  );
}
