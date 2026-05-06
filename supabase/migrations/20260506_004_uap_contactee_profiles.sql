-- Migration 004: Create uap_contactee_profiles table
-- Aggregated profiles for UAP contactees/experiencers.
-- Links to multiple videos and stores computed average scores.

CREATE TABLE IF NOT EXISTS uap_contactee_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  summary TEXT,
  bio TEXT,
  photo_url TEXT,
  video_ids TEXT[] NOT NULL DEFAULT '{}',
  channel_ids TEXT[] DEFAULT '{}',
  experience_type TEXT,                -- contact, abduction, CE-5, ongoing, mixed
  entity_types TEXT[] DEFAULT '{}',
  recurrence TEXT,                     -- one-time, periodic, ongoing
  core_themes TEXT[] DEFAULT '{}',
  avg_evidence_score NUMERIC(5,2),
  avg_contact_depth NUMERIC(5,2),
  avg_transformation_score NUMERIC(5,2),
  social_links JSONB DEFAULT '{}',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uap_contactee_slug ON uap_contactee_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_uap_contactee_experience ON uap_contactee_profiles(experience_type);
