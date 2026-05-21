-- Sprint 14: Channel Engagement & Shareability
-- Epic 14.1: Historical score snapshots for trajectory arrows
-- Stores monthly snapshots of channel scores to track movement over time

CREATE TABLE IF NOT EXISTS public.uap_channel_score_history (
  id SERIAL PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES uap_channels(channel_id) ON DELETE CASCADE,
  snapshot_month DATE NOT NULL, -- first of month, e.g. '2026-05-01'
  -- Universe Map axes
  intelligence_value NUMERIC(5,1),
  credibility_score NUMERIC(5,1),
  -- Scorecard axes
  encounter_depth NUMERIC(5,1),
  impact_score NUMERIC(5,1),
  -- Composite
  authority_score NUMERIC(5,1),
  letter_grade TEXT,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- One snapshot per channel per month
  CONSTRAINT uap_score_history_unique UNIQUE (channel_id, snapshot_month)
);

-- Index for efficient lookups by channel + time range
CREATE INDEX idx_uap_score_history_channel_month
  ON public.uap_channel_score_history (channel_id, snapshot_month DESC);

-- RLS: public read, service_role write
ALTER TABLE public.uap_channel_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY uap_score_history_public_read ON public.uap_channel_score_history
  FOR SELECT USING (true);

GRANT SELECT ON public.uap_channel_score_history TO anon;
GRANT SELECT ON public.uap_channel_score_history TO authenticated;
GRANT ALL ON public.uap_channel_score_history TO service_role;

-- Grant sequence usage for the SERIAL PK
GRANT USAGE, SELECT ON SEQUENCE uap_channel_score_history_id_seq TO service_role;

SET search_path = 'public';
