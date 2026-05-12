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
  // New: from uap_video_stats
  video_tone: string | null;
  intelligence_value: number | null;
  has_psi_content: boolean | null;
  has_under_oath_claims: boolean | null;
  dominant_entity_type: string | null;
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
  { value: "intelligence_value", label: "Intelligence Value" },
  { value: "channel_name", label: "Channel" },
  { value: "title", label: "Title" },
];

// ─── Content Type Labels ─────────────────────────────────────────────────────

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  first_person: "First-Person Account",
  retold_story: "Retold Account",
  retold_encounter: "Retold Encounter",
  research_analysis: "Research & Analysis",
  program_disclosure: "Disclosure",
  interview: "Interview",
  documentary_survey: "Documentary",
  out_of_scope: "Other",
};

// ─── Facet Types (from uap_explore_facets RPC) ──────────────────────────────

export interface FacetItem {
  value: string;
  count: number;
}

export interface ToggleCounts {
  has_psi: number;
  has_oath: number;
  has_craft: number;
  has_biologics: number;
  has_crash: number;
}

export interface TierCounts {
  all: number;
  tier1: number;
  tier2: number;
}

export interface ExploreFacets {
  video_tones: FacetItem[];
  hynek_types: FacetItem[];
  experience_types: FacetItem[];
  content_types: FacetItem[];
  recurrence_patterns: FacetItem[];
  channels: FacetItem[];
  entity_types: FacetItem[];
  decades: FacetItem[];
  toggle_counts: ToggleCounts;
  tier_counts: TierCounts;
}

// ─── Deep Filter State ───────────────────────────────────────────────────────
// URL param keys → values for the sidebar filter state

export interface DeepFilterState {
  videoTones: string[];
  hynekTypes: string[];
  entityTypes: string[];
  contentTypes: string[];
  recurrence: string;
  decade: string;
  channel: string;
  minIntelligence: number;
  hasOath: boolean | null;
  hasPsi: boolean | null;
}

export const EMPTY_DEEP_FILTERS: DeepFilterState = {
  videoTones: [],
  hynekTypes: [],
  entityTypes: [],
  contentTypes: [],
  recurrence: "",
  decade: "",
  channel: "",
  minIntelligence: 0,
  hasOath: null,
  hasPsi: null,
};

// ─── Human-readable labels for filter values ─────────────────────────────────

export const VIDEO_TONE_LABELS: Record<string, string> = {
  neutral: "Neutral",
  investigative: "Investigative",
  academic: "Academic",
  journalistic: "Journalistic",
  experiential: "Experiential",
  conspiratorial: "Conspiratorial",
  editorial: "Editorial",
  emotional: "Emotional",
  humorous: "Humorous",
  skeptical: "Skeptical",
};

export const HYNEK_LABELS: Record<string, string> = {
  CE1: "CE-1 (Close Encounter)",
  CE2: "CE-2 (Physical Effects)",
  CE3: "CE-3 (Entities)",
  CE4: "CE-4 (Abduction)",
  CE5: "CE-5 (Communication)",
  NL: "Nocturnal Light",
  DD: "Daylight Disc",
};

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  grey: "Grey",
  mantis: "Mantis",
  reptilian: "Reptilian",
  nordic: "Nordic",
  humanoid: "Humanoid",
  hybrid: "Hybrid",
  light_being: "Light Being",
  shadow_entity: "Shadow Entity",
  robotic: "Robotic/Mechanical",
  insectoid: "Insectoid",
  unknown: "Unknown",
};

export const RECURRENCE_LABELS: Record<string, string> = {
  single_event: "Single Event",
  recurring: "Recurring",
  lifelong: "Lifelong",
  clustered: "Clustered",
};

export const DECADE_LABELS: Record<string, string> = {
  "2020s": "2020s",
  "2010s": "2010s",
  "2000s": "2000s",
  "pre2000": "Pre-2000",
};
