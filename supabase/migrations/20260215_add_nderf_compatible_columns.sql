-- Add NDERF-compatible columns to nde_analysis for cross-database comparison
-- Pass A: Core Elements & Classification
ALTER TABLE nde_analysis
  ADD COLUMN IF NOT EXISTS experience_type text,
  ADD COLUMN IF NOT EXISTS experience_type_confidence smallint,
  ADD COLUMN IF NOT EXISTS core_elements jsonb,
  ADD COLUMN IF NOT EXISTS trigger_category text,
  ADD COLUMN IF NOT EXISTS trigger_description text,
  ADD COLUMN IF NOT EXISTS overall_tone text,
  ADD COLUMN IF NOT EXISTS intensity_rating smallint,
  ADD COLUMN IF NOT EXISTS content_safety jsonb;

-- Pass B: Journey Flow
ALTER TABLE nde_analysis
  ADD COLUMN IF NOT EXISTS journey_valid boolean,
  ADD COLUMN IF NOT EXISTS journey_nde_type text,
  ADD COLUMN IF NOT EXISTS journey_sequence jsonb,
  ADD COLUMN IF NOT EXISTS journey_notes text;

-- RPC: Get unanalyzed videos for Core Elements batch processing
-- Returns clear_nde videos that have a transcript but no core_elements analysis yet
CREATE OR REPLACE FUNCTION get_unanalyzed_core_elements_videos(batch_limit int DEFAULT 3)
RETURNS TABLE("videoId" text, title text, subtitles_punctuated text)
LANGUAGE sql STABLE AS $$
  SELECT v."videoId", v.title, v.subtitles_punctuated
  FROM nde_vids v
  LEFT JOIN nde_analysis a ON v."videoId" = a.video_id
    AND a.experience_type IS NOT NULL
  WHERE v."isNde" = 'clear_nde'
    AND v.subtitles_punctuated IS NOT NULL
    AND a.video_id IS NULL
  LIMIT batch_limit;
$$;

-- RPC: Get unanalyzed videos for Journey Flow batch processing
-- Returns clear_nde videos that have a transcript but no journey_sequence analysis yet
CREATE OR REPLACE FUNCTION get_unanalyzed_journey_flow_videos(batch_limit int DEFAULT 3)
RETURNS TABLE("videoId" text, title text, subtitles_punctuated text)
LANGUAGE sql STABLE AS $$
  SELECT v."videoId", v.title, v.subtitles_punctuated
  FROM nde_vids v
  LEFT JOIN nde_analysis a ON v."videoId" = a.video_id
    AND a.journey_valid IS NOT NULL
  WHERE v."isNde" = 'clear_nde'
    AND v.subtitles_punctuated IS NOT NULL
    AND a.video_id IS NULL
  LIMIT batch_limit;
$$;
