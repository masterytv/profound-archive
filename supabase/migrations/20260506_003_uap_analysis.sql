-- Migration 003: Create uap_analysis table
-- Stores deep AI analysis results for UAP videos.
-- Content_type, tier, and track live in uap_vids ONLY (single source of truth).
-- This table stores analysis OUTPUT. JOIN to uap_vids for classification data.

CREATE TABLE IF NOT EXISTS uap_analysis (
  video_id TEXT PRIMARY KEY REFERENCES uap_vids(video_id),

  -- Triad Axis 1: Evidence (Tier 1 only, UAP-ESS 0-28)
  evidence_score SMALLINT,
  evidence_breakdown JSONB,

  -- Triad Axis 2: Experience (Tier 1 only)
  hynek_type TEXT,                     -- CE1, CE2, CE3, CE4, CE5, NL, DD
  vallee_type TEXT,                    -- AN1-5, MA1-5, FB1-3
  contact_depth_score SMALLINT,        -- 0-28
  contact_depth_breakdown JSONB,

  -- Triad Axis 3: Impact (same NDE-TI, 0-50)
  transformation_score INTEGER,
  transformation_breakdown JSONB,

  -- Phenomenological dimensions (Tier 1)
  experience_type TEXT,
  phenomenology JSONB,
  entities JSONB,
  overall_tone TEXT,
  physical_effects JSONB,
  technology_described JSONB,
  message_content JSONB,
  recurrence_pattern TEXT,             -- one-time, periodic, ongoing
  witness_count INTEGER,
  evidence_types TEXT[],               -- photo, video, radar, physical_trace

  -- Track 2 fields (Tier 2 program/disclosure)
  people_mentioned JSONB,
  programs_mentioned JSONB,
  claims JSONB,
  consciousness_connections JSONB,
  timeline_events JSONB,

  -- Safety + fingerprint
  content_safety JSONB,
  experience_fingerprint vector(1536),

  -- Metadata
  analysis_model TEXT,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_uap_analysis_hynek ON uap_analysis(hynek_type);
CREATE INDEX IF NOT EXISTS idx_uap_analysis_evidence ON uap_analysis(evidence_score);
CREATE INDEX IF NOT EXISTS idx_uap_analysis_transformation ON uap_analysis(transformation_score);
CREATE INDEX IF NOT EXISTS idx_uap_analysis_experience_type ON uap_analysis(experience_type);
