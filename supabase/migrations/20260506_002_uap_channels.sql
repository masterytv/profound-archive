-- Migration 002: Create uap_channels table
-- Stores metadata for YouTube channels that produce UAP content.
-- Mirrors the NDE channel pattern but with UAP-specific track field.

CREATE TABLE IF NOT EXISTS uap_channels (
  channel_id TEXT PRIMARY KEY,
  channel_name TEXT NOT NULL,
  track TEXT NOT NULL DEFAULT 'mixed',  -- encounters, program, mixed
  description TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  custom_url TEXT,
  subscriber_count BIGINT,
  total_video_count BIGINT,
  total_view_count BIGINT,
  video_count INTEGER DEFAULT 0,       -- UAP videos we have ingested
  hidden BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for listing visible channels
CREATE INDEX IF NOT EXISTS idx_uap_channels_hidden ON uap_channels(hidden);
