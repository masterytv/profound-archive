// Shared types for the /video-explore page

export interface VideoExploreItem {
  videoId: string;
  title: string | null;
  thumbnailUrl: string | null;
  channelName: string | null;
  date: string | null;
  viewCount: number | null;
  experiencerFullName: string | null;
  // Scores (from nde_vids)
  rvnde_total_score: number | null;
  rvnde_level: string | null;
  // Scores (from nde_analysis join)
  total_greyson_score: number | null;
  transformation_score: number | null;
  intensity_rating: number | null;
  // Research Breakdown fields
  experience_type: string | null;
  trigger_category: string | null;
  overall_tone: string | null;
  transformation_classification: string | null;
  core_elements: CoreElement[] | null;
  journey_sequence: JourneyElement[] | null;
}

export interface CoreElement {
  name: string;
  present: boolean;
  confidence: number;
  quote: string;
}

export interface JourneyElement {
  element: string;
  order: number;
  confidence?: number;
}

// Smart tag definitions — each maps to a SQL condition
export interface SmartTagDef {
  id: string;
  label: string;
  emoji: string;
  // Which field this tag queries (for display grouping)
  category: "element" | "score" | "tone";
}

export const SMART_TAGS: SmartTagDef[] = [
  // Core element tags
  { id: "being_of_light", label: "Being of Light", emoji: "✦", category: "element" },
  { id: "otherworldly_realm", label: "Other Realm", emoji: "◎", category: "element" },
  { id: "knowledge_download", label: "Knowledge Download", emoji: "↓", category: "element" },
  { id: "telepathy", label: "Telepathy", emoji: "◈", category: "element" },
  { id: "life_review", label: "Life Review", emoji: "◎", category: "element" },
  { id: "deceased_relatives", label: "Met Deceased", emoji: "♡", category: "element" },
  { id: "out_of_body", label: "Out-of-Body", emoji: "◇", category: "element" },
  { id: "tunnel", label: "Tunnel", emoji: "◎", category: "element" },
  // Score-based tags
  { id: "life_changing", label: "Life-Changing", emoji: "↻", category: "score" },
  { id: "strong_evidence", label: "Strong Evidence", emoji: "★", category: "score" },
  { id: "intense", label: "Intense", emoji: "↑", category: "score" },
  // Tone-based tags
  { id: "distressing", label: "Distressing", emoji: "⚠", category: "tone" },
];

// Sort presets for quick access buttons
export interface SortPreset {
  id: string;
  label: string;
  emoji: string;
  sort: string;
  dir: "asc" | "desc";
}

export const SORT_PRESETS: SortPreset[] = [
  { id: "most_viewed", label: "Most Viewed", emoji: "↑", sort: "viewCount", dir: "desc" },
  { id: "latest", label: "Latest", emoji: "○", sort: "date", dir: "desc" },
  { id: "top_evidence", label: "Top Evidence", emoji: "★", sort: "rvnde_total_score", dir: "desc" },
  { id: "most_intense", label: "Most Intense", emoji: "↑", sort: "intensity_rating", dir: "desc" },
];

// All available sort fields
export interface SortField {
  value: string;
  label: string;
}

export const SORT_FIELDS: SortField[] = [
  { value: "viewCount", label: "Views" },
  { value: "date", label: "Date Published" },
  { value: "rvnde_total_score", label: "Evidence Strength" },
  { value: "total_greyson_score", label: "Experience Depth" },
  { value: "transformation_score", label: "Transformation" },
  { value: "intensity_rating", label: "Intensity" },
  { value: "experiencerFullName", label: "Experiencer" },
  { value: "channelName", label: "Channel" },
  { value: "title", label: "Title" },
];
