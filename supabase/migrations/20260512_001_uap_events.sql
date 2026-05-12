-- UAP Events: First-class normalized entity for cross-referencing videos, contactees, and timeline
-- Links experiencers to shared events (e.g., Hill Abduction, Roswell, Phoenix Lights)

CREATE TABLE IF NOT EXISTS uap_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  aliases      TEXT[] DEFAULT '{}',
  event_date   TEXT,                          -- Flexible: "1947-07-08", "1947", "Summer 1952"
  year         SMALLINT,                      -- For sorting/filtering
  location     TEXT,
  country      TEXT,
  description  TEXT,
  event_type   TEXT NOT NULL DEFAULT 'unknown',
  -- event_type enum values: mass_sighting, abduction, crash_retrieval, disclosure,
  -- military_encounter, whistleblower, congressional, radar_visual, contact, unknown
  video_ids    TEXT[] DEFAULT '{}',
  contactee_ids UUID[] DEFAULT '{}',
  witness_count INTEGER,
  source_count  INTEGER GENERATED ALWAYS AS (coalesce(array_length(video_ids, 1), 0)) STORED,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_uap_events_slug ON uap_events(slug);
CREATE INDEX IF NOT EXISTS idx_uap_events_year ON uap_events(year);
CREATE INDEX IF NOT EXISTS idx_uap_events_event_type ON uap_events(event_type);
CREATE INDEX IF NOT EXISTS idx_uap_events_source_count ON uap_events(source_count DESC);

-- RLS
ALTER TABLE uap_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY uap_events_public_read ON uap_events
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY uap_events_service_write ON uap_events
  FOR ALL
  TO public
  USING (auth.role() = 'service_role');

-- Comment
COMMENT ON TABLE uap_events IS 'Normalized UAP events linking videos, contactees, and timeline entries. Source of truth for the timeline page.';
COMMENT ON COLUMN uap_events.aliases IS 'Alternative names for fuzzy matching during intake (e.g., "Roswell Crash", "Roswell UFO Incident")';
COMMENT ON COLUMN uap_events.event_date IS 'Flexible date string for display (can be partial like "1947" or "Summer 1952")';
COMMENT ON COLUMN uap_events.source_count IS 'Auto-computed count of video_ids for sorting by most-referenced events';
