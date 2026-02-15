-- Add Phenomenology & Entities columns to nde_analysis for NDERF-compatible analysis
-- Pass C: Detailed Phenomenology & Entity Descriptions

ALTER TABLE nde_analysis
  ADD COLUMN IF NOT EXISTS phenomenology jsonb,
  ADD COLUMN IF NOT EXISTS entities jsonb;

-- RPC: Get unanalyzed videos for Phenomenology & Entities batch processing
CREATE OR REPLACE FUNCTION get_unanalyzed_phenomenology_videos(batch_limit int DEFAULT 3)
RETURNS TABLE("videoId" text, title text, subtitles_punctuated text)
LANGUAGE sql STABLE AS $$
  SELECT v."videoId", v.title, v.subtitles_punctuated
  FROM nde_vids v
  LEFT JOIN nde_analysis a ON v."videoId" = a.video_id
    AND a.phenomenology IS NOT NULL
  WHERE v."isNde" = 'clear_nde'
    AND v.subtitles_punctuated IS NOT NULL
    AND a.video_id IS NULL
  LIMIT batch_limit;
$$;
