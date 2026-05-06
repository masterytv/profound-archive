-- Migration 001: Add classification + pipeline columns to uap_vids
-- These columns enable the content classifier, punctuation pipeline, and analysis tracking.
-- uap_vids already exists with base YouTube metadata; this adds the domain-specific fields.

ALTER TABLE uap_vids
  ADD COLUMN IF NOT EXISTS content_type TEXT,
  ADD COLUMN IF NOT EXISTS tier SMALLINT DEFAULT 2,
  ADD COLUMN IF NOT EXISTS track TEXT DEFAULT 'program',
  ADD COLUMN IF NOT EXISTS subtitles_punctuated TEXT,
  ADD COLUMN IF NOT EXISTS subtitles_cleaned TEXT,
  ADD COLUMN IF NOT EXISTS experiencer_name TEXT,
  ADD COLUMN IF NOT EXISTS intake_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS analysis_uap_summary TEXT,
  ADD COLUMN IF NOT EXISTS classified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS classifier_model TEXT;

-- Full-text search vector for keyword search (mirrors nde_punctuated_embeddings pattern,
-- but lives on uap_vids for pre-embedding search; will also be on uap_punctuated_embeddings)
-- Not adding search_vector here because keyword search operates on uap_punctuated_embeddings

-- Index on tier for fast filtering (Tier 3 guard in RPCs)
CREATE INDEX IF NOT EXISTS idx_uap_vids_tier ON uap_vids(tier);
CREATE INDEX IF NOT EXISTS idx_uap_vids_intake_status ON uap_vids(intake_status);
CREATE INDEX IF NOT EXISTS idx_uap_vids_track ON uap_vids(track);
CREATE INDEX IF NOT EXISTS idx_uap_vids_channel_id ON uap_vids(channel_id);
