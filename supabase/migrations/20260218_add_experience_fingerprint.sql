-- Phase 11: Experience Fingerprint for "Similar Experiences" feature
-- Uses pgvector to store a 27-dimension vector encoding the experiential structure
-- Dimensions: 15 core elements (binary) + intensity (1) + tone (3) + experience type (5) + trigger (3)

-- Ensure pgvector extension is available
CREATE EXTENSION IF NOT EXISTS vector;

-- Add the fingerprint column
ALTER TABLE nde_analysis
  ADD COLUMN IF NOT EXISTS experience_fingerprint vector(27);

-- Create an IVFFlat index for efficient similarity search
CREATE INDEX IF NOT EXISTS idx_experience_fingerprint
  ON nde_analysis
  USING ivfflat (experience_fingerprint vector_cosine_ops)
  WITH (lists = 10);

-- RPC: Find similar experiences based on fingerprint cosine similarity
CREATE OR REPLACE FUNCTION find_similar_experiences(
  target_video_id text,
  match_count int DEFAULT 6,
  similarity_threshold float DEFAULT 0.7
)
RETURNS TABLE(
  video_id text,
  title text,
  "thumbnailUrl" text,
  experience_type text,
  tone text,
  intensity_rating smallint,
  similarity float
)
LANGUAGE sql STABLE AS $$
  WITH target AS (
    SELECT experience_fingerprint
    FROM nde_analysis
    WHERE video_id = target_video_id
      AND experience_fingerprint IS NOT NULL
  )
  SELECT
    a.video_id,
    v.title,
    v."thumbnailUrl",
    a.experience_type,
    a.overall_tone AS tone,
    a.intensity_rating,
    1 - (a.experience_fingerprint <=> t.experience_fingerprint) AS similarity
  FROM nde_analysis a
  CROSS JOIN target t
  JOIN nde_vids v ON v."videoId" = a.video_id
  WHERE a.video_id != target_video_id
    AND a.experience_fingerprint IS NOT NULL
    AND v."isNde" = 'clear_nde'
    AND 1 - (a.experience_fingerprint <=> t.experience_fingerprint) >= similarity_threshold
  ORDER BY a.experience_fingerprint <=> t.experience_fingerprint
  LIMIT match_count;
$$;

-- RPC: Get channel-level NDERF aggregated stats
CREATE OR REPLACE FUNCTION get_channel_nderf_stats(target_channel_id text)
RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'total_analyzed', (
      SELECT COUNT(*)
      FROM nde_analysis a
      JOIN nde_vids v ON v."videoId" = a.video_id
      WHERE v."channelId" = target_channel_id
        AND a.experience_type IS NOT NULL
    ),
    'experience_types', COALESCE((
      SELECT jsonb_object_agg(exp_type, cnt)
      FROM (
        SELECT COALESCE(a.experience_type, 'unclassified') AS exp_type, COUNT(*) AS cnt
        FROM nde_analysis a
        JOIN nde_vids v ON v."videoId" = a.video_id
        WHERE v."channelId" = target_channel_id
          AND a.experience_type IS NOT NULL
        GROUP BY a.experience_type
      ) sub
    ), '{}'::jsonb),
    'avg_intensity', (
      SELECT ROUND(AVG(a.intensity_rating)::numeric, 1)
      FROM nde_analysis a
      JOIN nde_vids v ON v."videoId" = a.video_id
      WHERE v."channelId" = target_channel_id
        AND a.intensity_rating IS NOT NULL
    ),
    'tone_distribution', COALESCE((
      SELECT jsonb_object_agg(tone_val, cnt)
      FROM (
        SELECT COALESCE(a.overall_tone, 'unknown') AS tone_val, COUNT(*) AS cnt
        FROM nde_analysis a
        JOIN nde_vids v ON v."videoId" = a.video_id
        WHERE v."channelId" = target_channel_id
          AND a.experience_type IS NOT NULL
        GROUP BY a.overall_tone
      ) sub
    ), '{}'::jsonb),
    'trigger_distribution', COALESCE((
      SELECT jsonb_object_agg(trig_val, cnt)
      FROM (
        SELECT COALESCE(a.trigger_category, 'unknown') AS trig_val, COUNT(*) AS cnt
        FROM nde_analysis a
        JOIN nde_vids v ON v."videoId" = a.video_id
        WHERE v."channelId" = target_channel_id
          AND a.experience_type IS NOT NULL
        GROUP BY a.trigger_category
      ) sub
    ), '{}'::jsonb)
  );
$$;
