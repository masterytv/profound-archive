-- Migration: Expand get_channel_stats to include NDERF analysis aggregates
-- Adds per-channel averages for intensity, greyson, transformation, veridical scores,
-- tone/experience type distributions for the new list-view /channels page.
--
-- Safe: only REPLACES the RPC return shape (adds columns), never removes any existing ones.
-- Pages that call this RPC (homepage, /channels) will receive the new columns without breaking.

CREATE OR REPLACE FUNCTION public.get_channel_stats()
RETURNS TABLE(
  -- Existing columns (unchanged)
  channel_id          text,
  channel_name        text,
  channel_url         text,
  channel_username    text,
  video_count         bigint,
  total_views         bigint,
  total_likes         bigint,
  subscriber_count    bigint,
  latest_video_date   text,
  sample_thumbnail    text,
  avatar_url          text,
  description         text,
  banner_url          text,
  country             text,
  -- New analysis aggregate columns
  total_analyzed      bigint,
  avg_intensity       numeric,
  avg_greyson_score   numeric,
  avg_transformation_score numeric,
  avg_veridical_score numeric,
  pct_positive_tone   numeric,   -- % of (very_positive + positive) tone videos
  pct_negative_tone   numeric,   -- % of very_negative tone videos
  experience_types    jsonb,     -- { "nde": N, "obe": N, "ste": N, ... }
  tone_distribution   jsonb      -- { "very_positive": N, "positive": N, ... }
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    -- ── Channel identity ──────────────────────────────────────────────────
    v."channelId"                                          AS channel_id,
    MODE() WITHIN GROUP (ORDER BY v."channelName")         AS channel_name,
    MAX(v."channelUrl")                                    AS channel_url,
    MAX(v."channelUsername")                               AS channel_username,

    -- ── Video / engagement stats ──────────────────────────────────────────
    COUNT(*)::BIGINT                                       AS video_count,
    COALESCE(SUM(v."viewCount"),  0)::BIGINT               AS total_views,
    COALESCE(SUM(v."likes"),      0)::BIGINT               AS total_likes,

    -- Prefer enriched subscriber count from channels table
    COALESCE(MAX(c.subscriber_count), MAX(v."numberOfSubscribers"), 0)::BIGINT AS subscriber_count,

    MAX(v."date")                                          AS latest_video_date,

    -- Highest-viewed thumbnail for the channel
    (SELECT v2."thumbnailUrl" FROM nde_vids v2
     WHERE v2."channelId" = v."channelId" AND v2."isNde" = 'clear_nde'
     ORDER BY v2."viewCount" DESC NULLS LAST LIMIT 1)     AS sample_thumbnail,

    -- ── Enriched channel metadata ─────────────────────────────────────────
    MAX(c.avatar_url)                                      AS avatar_url,
    MAX(c.description)                                     AS description,
    MAX(c.banner_url)                                      AS banner_url,
    MAX(c.country)                                         AS country,

    -- ── Analysis aggregates (from nde_analysis + nde_vids) ───────────────
    -- Number of videos that have been NDERF-analysed for this channel
    COALESCE((
      SELECT COUNT(*)
      FROM nde_analysis a
      JOIN nde_vids v2 ON v2."videoId" = a.video_id
      WHERE v2."channelId" = v."channelId"
        AND a.experience_type IS NOT NULL
    ), 0)::BIGINT                                          AS total_analyzed,

    -- Average intensity rating (1-10)
    (
      SELECT ROUND(AVG(a.intensity_rating)::numeric, 1)
      FROM nde_analysis a
      JOIN nde_vids v2 ON v2."videoId" = a.video_id
      WHERE v2."channelId" = v."channelId"
        AND a.intensity_rating IS NOT NULL
    )                                                      AS avg_intensity,

    -- Average Greyson scale score (0-16)
    (
      SELECT ROUND(AVG(a.total_greyson_score)::numeric, 1)
      FROM nde_analysis a
      JOIN nde_vids v2 ON v2."videoId" = a.video_id
      WHERE v2."channelId" = v."channelId"
        AND a.total_greyson_score IS NOT NULL
    )                                                      AS avg_greyson_score,

    -- Average Transformation score (0-50)
    (
      SELECT ROUND(AVG(a.transformation_score)::numeric, 1)
      FROM nde_analysis a
      JOIN nde_vids v2 ON v2."videoId" = a.video_id
      WHERE v2."channelId" = v."channelId"
        AND a.transformation_score IS NOT NULL
    )                                                      AS avg_transformation_score,

    -- Average Veridical score (rvnde_total_score lives on nde_vids directly)
    (
      SELECT ROUND(AVG(v2.rvnde_total_score)::numeric, 1)
      FROM nde_vids v2
      WHERE v2."channelId" = v."channelId"
        AND v2.rvnde_total_score IS NOT NULL
    )                                                      AS avg_veridical_score,

    -- % of analysed videos with positive/very_positive tone
    (
      SELECT ROUND(
        100.0 * COUNT(*) FILTER (WHERE a.overall_tone IN ('very_positive', 'positive'))
        / NULLIF(COUNT(*) FILTER (WHERE a.overall_tone IS NOT NULL), 0),
        1
      )
      FROM nde_analysis a
      JOIN nde_vids v2 ON v2."videoId" = a.video_id
      WHERE v2."channelId" = v."channelId"
        AND a.overall_tone IS NOT NULL
    )                                                      AS pct_positive_tone,

    -- % of analysed videos with very_negative tone
    (
      SELECT ROUND(
        100.0 * COUNT(*) FILTER (WHERE a.overall_tone = 'very_negative')
        / NULLIF(COUNT(*) FILTER (WHERE a.overall_tone IS NOT NULL), 0),
        1
      )
      FROM nde_analysis a
      JOIN nde_vids v2 ON v2."videoId" = a.video_id
      WHERE v2."channelId" = v."channelId"
        AND a.overall_tone IS NOT NULL
    )                                                      AS pct_negative_tone,

    -- Experience types as JSONB object { "nde": 518, "obe": 34, ... }
    COALESCE((
      SELECT jsonb_object_agg(exp_type, cnt)
      FROM (
        SELECT COALESCE(a.experience_type, 'unclassified') AS exp_type, COUNT(*) AS cnt
        FROM nde_analysis a
        JOIN nde_vids v2 ON v2."videoId" = a.video_id
        WHERE v2."channelId" = v."channelId"
          AND a.experience_type IS NOT NULL
        GROUP BY a.experience_type
      ) sub
    ), '{}'::jsonb)                                        AS experience_types,

    -- Tone distribution as JSONB object { "very_positive": 354, "positive": 213, ... }
    COALESCE((
      SELECT jsonb_object_agg(tone_val, cnt)
      FROM (
        SELECT COALESCE(a.overall_tone, 'unknown') AS tone_val, COUNT(*) AS cnt
        FROM nde_analysis a
        JOIN nde_vids v2 ON v2."videoId" = a.video_id
        WHERE v2."channelId" = v."channelId"
          AND a.experience_type IS NOT NULL
        GROUP BY a.overall_tone
      ) sub
    ), '{}'::jsonb)                                        AS tone_distribution

  FROM nde_vids v
  LEFT JOIN channels c ON c.channel_id = v."channelId"
  WHERE v."channelId" IS NOT NULL
    AND v."isNde" = 'clear_nde'
  GROUP BY v."channelId"
  ORDER BY video_count DESC;
$$;
