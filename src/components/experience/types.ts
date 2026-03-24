/**
 * NDE Experience Engine — Core Types
 *
 * These types define the contract between configs (data) and renderers (components).
 * Configs are pure data. Renderers are pure visual. The engine wires them together.
 */

// ─── Phase Types ──────────────────────────────────────────────────────────────

export type PhaseType = 'scene' | 'canvas' | 'memory';

export type TransitionType = 'fade' | 'elevate' | 'push_through' | 'dissolve';

export type NarrativePosition = 'bottom-center' | 'center' | 'top-left';

// ─── Phase Config ─────────────────────────────────────────────────────────────

export interface PhaseConfig {
  /** Which renderer to use */
  type: PhaseType;

  /** Human-readable label (e.g., "OBE", "Tunnel") */
  label: string;

  /** Narrative text overlay */
  narrative: {
    /** Direct quote from experiencer — never fabricated */
    text: string;
    /** Source attribution */
    attribution?: string;
    /** Position of the text overlay on the viewport */
    position: NarrativePosition;
  };

  /** Background image layer */
  background: {
    /** Registry key for background image */
    asset_key: string;
    /** CSS color for blend overlay */
    color_overlay?: string;
    /** CSS mix-blend-mode value */
    blend_mode?: string;
  };

  /** Optional foreground parallax layers */
  foreground_layers?: ForegroundLayer[];

  /** Transition animation to use when entering this phase */
  transition: TransitionType;

  /** Optional ambient audio cue for this phase */
  audio_cue?: {
    /** Asset registry key for audio file */
    asset_key: string;
    /** Volume 0.0–1.0 */
    volume: number;
    /** Whether to loop (default: true) */
    loop?: boolean;
  };

  /** Optional secondary ambient layer (plays simultaneously with audio_cue) */
  secondary_audio_cue?: {
    /** Asset registry key for audio file */
    asset_key: string;
    /** Volume 0.0–1.0 */
    volume: number;
    /** Whether to loop (default: true) */
    loop?: boolean;
  };

  /** Optional voiced being that speaks during this phase */
  voice_line?: {
    /** Direct quote from transcript — the being's spoken words */
    text: string;
    /** ElevenLabs voice ID used for generation */
    voice_id: string;
    /** Asset registry key for pre-generated TTS audio */
    asset_key: string;
    /** Delay before playing (ms). Default: 1000 */
    delay_ms?: number;
  };

  /** Memory cards (for MemoryPhase type only) */
  memory_cards?: MemoryCard[];
}

export interface ForegroundLayer {
  /** Asset registry key */
  asset_key: string;
  /** Parallax movement multiplier (0.01–0.04 typical) */
  parallax_multiplier: number;
  /** CSS position */
  position: { x: string; y: string };
}

export interface MemoryCard {
  /** Quote text */
  text: string;
  /** Optional subtext / context */
  subtext?: string;
}

// ─── Experience Config ────────────────────────────────────────────────────────

export interface ExperienceConfig {
  meta: ExperienceMeta;
  phases: PhaseConfig[];
  /** Global ambient audio (plays across all phases unless overridden) */
  audio?: {
    ambient_key: string;
    volume: number;
  };
}

export interface ExperienceMeta {
  /** URL-safe slug, e.g., "penny-anaphylaxis" */
  slug: string;
  /** Display title */
  title: string;
  /** Name of the experiencer */
  experiencer_name: string;
  /** FK to nde_vids.videoId */
  source_video_id: string;
  /** Type of NDE: cardiac_arrest, drowning, anaphylaxis, etc. */
  nde_type: string;
  /** Estimated read/experience time */
  duration_estimate: string;
  /** Optional content warning shown before experience starts */
  content_warning?: string;
  /** Publication status */
  status: 'draft' | 'review' | 'published';
}

// ─── Transition Function Signature ────────────────────────────────────────────

/** Pure function that animates between two phase DOM elements */
export type TransitionFn = (
  outEl: HTMLElement,
  inEl: HTMLElement,
  onComplete: () => void,
) => { kill: () => void };
