-- Add NDE Transformation Index (NDE-TI) columns to nde_analysis
ALTER TABLE nde_analysis
  ADD COLUMN IF NOT EXISTS transformation_score integer,
  ADD COLUMN IF NOT EXISTS transformation_classification text,
  ADD COLUMN IF NOT EXISTS transformation_breakdown jsonb;

-- RPC function to get unanalyzed videos for transformation batch processing
-- Mirrors get_unanalyzed_greyson_videos but checks transformation_score IS NULL
CREATE OR REPLACE FUNCTION get_unanalyzed_transformation_videos(batch_limit int DEFAULT 3)
RETURNS TABLE("videoId" text, title text, subtitles_punctuated text)
LANGUAGE sql STABLE AS $$
  SELECT v."videoId", v.title, v.subtitles_punctuated
  FROM nde_vids v
  LEFT JOIN nde_analysis a ON v."videoId" = a.video_id
    AND a.transformation_score IS NOT NULL
  WHERE v."isNde" = 'clear_nde'
    AND v.subtitles_punctuated IS NOT NULL
    AND a.video_id IS NULL
  LIMIT batch_limit;
$$;
