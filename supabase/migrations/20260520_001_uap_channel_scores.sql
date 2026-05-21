-- Sprint 13: Channel Analytics & Identity
-- Creates uap_channel_scores table for computed channel-level metrics

CREATE TABLE IF NOT EXISTS public.uap_channel_scores (
  channel_id TEXT PRIMARY KEY REFERENCES uap_channels(channel_id),
  -- Universe Map axes (0-100)
  intelligence_value NUMERIC(5,1),
  credibility_score NUMERIC(5,1),
  -- Scorecard axes (0-100)
  encounter_depth NUMERIC(5,1),
  impact_score NUMERIC(5,1),
  -- Composite grade
  authority_score NUMERIC(5,1),
  letter_grade TEXT,
  -- Archetype classification
  archetype_primary TEXT,
  archetype_secondary TEXT,
  archetype_tertiary TEXT,
  -- Personality code
  personality_code CHAR(3),
  -- Rankings
  archive_rank INTEGER,
  views_rank INTEGER,
  engagement_rate NUMERIC(8,4),
  volume_intensity NUMERIC(5,2),
  views_per_video NUMERIC(12,1),
  -- Comparison ratios
  engagement_vs_avg NUMERIC(5,2),
  views_per_video_vs_avg NUMERIC(5,2),
  -- Diversity
  diversity_index NUMERIC(4,3),
  diversity_rank INTEGER,
  -- Content stats for charts
  content_type_distribution JSONB DEFAULT '{}',
  avg_video_duration_seconds INTEGER,
  posting_cadence TEXT,
  months_active INTEGER,
  first_video_date TIMESTAMPTZ,
  -- Focus scores (normalized ratio vs archive avg; 1.0 = average)
  encounter_score NUMERIC(5,2),   -- (encounter_depth + impact_score) / 2 ÷ avg
  research_score NUMERIC(5,2),    -- (intelligence_value + credibility_score) / 2 ÷ avg
  -- Metadata
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.uap_channel_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY uap_channel_scores_public_read ON public.uap_channel_scores
  FOR SELECT USING (true);

GRANT SELECT ON public.uap_channel_scores TO anon;
GRANT SELECT ON public.uap_channel_scores TO authenticated;
GRANT ALL ON public.uap_channel_scores TO service_role;
