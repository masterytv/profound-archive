-- ============================================================
-- Materialized View for NDE Channel Stats
-- ============================================================
-- Replaces live-aggregation in get_channel_stats() RPC with
-- a pre-computed materialized view, refreshed daily at 6:30 UTC.
--
-- Problem: The old RPC ran 9 correlated subqueries × 53 channels
-- = 477 sequential sub-selects on every page load, taking 17.7s
-- and regularly hitting Supabase's 2-minute statement timeout.
--
-- Fix: Same pattern as uap_channel_stats_mv — precompute once,
-- serve instantly from the matview. Result: 17,667ms → 2.615ms.

CREATE MATERIALIZED VIEW IF NOT EXISTS public.nde_channel_stats_mv AS
SELECT
    v."channelId"                                          AS channel_id,
    MODE() WITHIN GROUP (ORDER BY v."channelName")         AS channel_name,
    MAX(v."channelUrl")                                    AS channel_url,
    MAX(v."channelUsername")                               AS channel_username,
    COUNT(*)::BIGINT                                       AS video_count,
    COALESCE(SUM(v."viewCount"),  0)::BIGINT               AS total_views,
    COALESCE(SUM(v."likes"),      0)::BIGINT               AS total_likes,
    COALESCE(MAX(c.subscriber_count), MAX(v."numberOfSubscribers"), 0)::BIGINT AS subscriber_count,
    MAX(v."date")                                          AS latest_video_date,
    (SELECT v2."thumbnailUrl" FROM nde_vids v2
     WHERE v2."channelId" = v."channelId" AND v2."isNde" = 'clear_nde'
     ORDER BY v2."viewCount" DESC NULLS LAST LIMIT 1)     AS sample_thumbnail,
    MAX(c.avatar_url)                                      AS avatar_url,
    MAX(c.description)                                     AS description,
    MAX(c.banner_url)                                      AS banner_url,
    MAX(c.country)                                         AS country,
    COALESCE((
        SELECT COUNT(*)
        FROM nde_analysis a
        JOIN nde_vids v2 ON v2."videoId" = a.video_id
        WHERE v2."channelId" = v."channelId"
          AND a.experience_type IS NOT NULL
    ), 0)::BIGINT                                          AS total_analyzed,
    (
        SELECT ROUND(AVG(a.intensity_rating)::numeric, 1)
        FROM nde_analysis a
        JOIN nde_vids v2 ON v2."videoId" = a.video_id
        WHERE v2."channelId" = v."channelId"
          AND a.intensity_rating IS NOT NULL
    )                                                      AS avg_intensity,
    (
        SELECT ROUND(AVG(a.total_greyson_score)::numeric, 1)
        FROM nde_analysis a
        JOIN nde_vids v2 ON v2."videoId" = a.video_id
        WHERE v2."channelId" = v."channelId"
          AND a.total_greyson_score IS NOT NULL
    )                                                      AS avg_greyson_score,
    (
        SELECT ROUND(AVG(a.transformation_score)::numeric, 1)
        FROM nde_analysis a
        JOIN nde_vids v2 ON v2."videoId" = a.video_id
        WHERE v2."channelId" = v."channelId"
          AND a.transformation_score IS NOT NULL
    )                                                      AS avg_transformation_score,
    (
        SELECT ROUND(AVG(v2.rvnde_total_score)::numeric, 1)
        FROM nde_vids v2
        WHERE v2."channelId" = v."channelId"
          AND v2.rvnde_total_score IS NOT NULL
    )                                                      AS avg_veridical_score,
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

-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS nde_channel_stats_mv_idx
    ON public.nde_channel_stats_mv (channel_id);

-- Rewrite the RPC to SELECT from the materialized view (sub-millisecond)
CREATE OR REPLACE FUNCTION public.get_channel_stats()
RETURNS TABLE(
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
    total_analyzed      bigint,
    avg_intensity       numeric,
    avg_greyson_score   numeric,
    avg_transformation_score numeric,
    avg_veridical_score numeric,
    pct_positive_tone   numeric,
    pct_negative_tone   numeric,
    experience_types    jsonb,
    tone_distribution   jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM public.nde_channel_stats_mv ORDER BY video_count DESC;
$$;

-- Schedule daily CONCURRENTLY refresh at 6:30 UTC
-- (after uap matview refresh at 6:15, before daily maintenance at 7:00)
SELECT cron.schedule(
    'refresh-nde-channel-stats-mv',
    '30 6 * * *',
    $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.nde_channel_stats_mv$$
);
