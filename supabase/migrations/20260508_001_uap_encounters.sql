-- Per-encounter analysis (child of uap_vids)
-- Each video can have 0-N encounter rows, each with its own phenomenology and triad
CREATE TABLE IF NOT EXISTS uap_encounters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id text NOT NULL REFERENCES uap_vids(video_id) ON DELETE CASCADE,
  
  -- Encounter identification
  experiencer_name text,
  source_type text NOT NULL DEFAULT 'direct_experiencer'
    CHECK (source_type IN ('direct_experiencer', 'interview_with_experiencer', 'retold_encounter')),
  encounter_label text,
  encounter_index smallint NOT NULL DEFAULT 0,
  
  -- Transcript segment
  segment_start_char integer,
  segment_end_char integer,
  segment_text text,
  
  -- Phenomenology analysis
  phenomenology_breakdown jsonb,
  encounter_context jsonb,
  
  -- Triad scores (only for direct_experiencer / interview_with_experiencer)
  evidence_score smallint,
  evidence_breakdown jsonb,
  contact_depth_score smallint,
  contact_depth_breakdown jsonb,
  transformation_score integer,
  transformation_breakdown jsonb,
  
  -- Classification context
  hynek_type text,
  vallee_type text,
  
  -- Metadata
  analysis_model text,
  analyzed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_uap_encounters_video_id ON uap_encounters(video_id);
CREATE INDEX idx_uap_encounters_experiencer ON uap_encounters(experiencer_name);
CREATE INDEX idx_uap_encounters_source_type ON uap_encounters(source_type);

ALTER TABLE uap_encounters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read uap_encounters" ON uap_encounters FOR SELECT USING (true);
CREATE POLICY "Service role write uap_encounters" ON uap_encounters FOR ALL USING (
  (SELECT auth.role()) = 'service_role'
);

-- Add source_type to uap_vids for quick filtering
ALTER TABLE uap_vids ADD COLUMN IF NOT EXISTS source_type text;
