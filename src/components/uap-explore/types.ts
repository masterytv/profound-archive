// Shared types for the UAP /uap/video-explore page

export interface UapExploreItem {
  video_id: string;
  title: string | null;
  thumbnail_url: string | null;
  channel_name: string | null;
  date: string | null;
  view_count: number | null;
  tier: number;
  track: string;
  content_type: string | null;
  experiencer_name: string | null;
  // Triad scores (Tier 1 only — null for Tier 2)
  evidence_score: number | null;
  contact_depth_score: number | null;
  transformation_score: number | null;
  // Analysis metadata
  experience_type: string | null;
  overall_tone: string | null;
  hynek_type: string | null;
}

// ─── Tier Filter Definitions ─────────────────────────────────────────────────

export interface TierFilterDef {
  id: string;
  label: string;
  emoji: string;
  tierValue: number; // 0 = all
}

export const TIER_FILTERS: TierFilterDef[] = [
  { id: "all", label: "All Videos", emoji: "📺", tierValue: 0 },
  { id: "encounters", label: "Encounters", emoji: "🛸", tierValue: 1 },
  { id: "research", label: "Research", emoji: "📡", tierValue: 2 },
];

// ─── Sort Presets ────────────────────────────────────────────────────────────

export interface SortPreset {
  id: string;
  label: string;
  emoji: string;
  sort: string;
  dir: "asc" | "desc";
}

export const UAP_SORT_PRESETS: SortPreset[] = [
  { id: "latest", label: "Latest", emoji: "🆕", sort: "date", dir: "desc" },
  { id: "most_viewed", label: "Most Viewed", emoji: "🔥", sort: "view_count", dir: "desc" },
  { id: "top_evidence", label: "Top Evidence", emoji: "🏆", sort: "evidence_score", dir: "desc" },
  { id: "deepest_contact", label: "Deepest Contact", emoji: "🌀", sort: "contact_depth_score", dir: "desc" },
];

// ─── Sort Fields ─────────────────────────────────────────────────────────────

export interface SortField {
  value: string;
  label: string;
}

export const UAP_SORT_FIELDS: SortField[] = [
  { value: "date", label: "Date Published" },
  { value: "view_count", label: "Views" },
  { value: "evidence_score", label: "Evidence Strength" },
  { value: "contact_depth_score", label: "Contact Depth" },
  { value: "transformation_score", label: "Transformation" },
  { value: "channel_name", label: "Channel" },
  { value: "title", label: "Title" },
];

// ─── Content Type Labels ─────────────────────────────────────────────────────

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  first_person: "First-Person Account",
  retold_story: "Retold Account",
  research_analysis: "Research & Analysis",
  program_disclosure: "Disclosure",
  out_of_scope: "Other",
};
