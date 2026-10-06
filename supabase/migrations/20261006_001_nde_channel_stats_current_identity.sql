-- ============================================================
-- NDE channel stats: current channel name + permanent YouTube link
-- ============================================================
-- Problem: nde_channel_stats_mv took channel_name as the most common
-- per-video nde_vids."channelName" snapshot and channel_url as MAX of the
-- per-video URLs. When a channel renames itself or changes its @handle
-- (e.g. "About Freedom Show" @AboutFreedomShow → "Sergei Davidoff"
-- @Sergei_Davidoff) the /channels list kept showing the old name, and
-- handle-based URLs broke.
--
-- Fix: channel_name / channel_username come from the channels table first
-- (refreshed daily from the YouTube API by the discover-all scan), and
-- channel_url is always built from the permanent channel ID.
--
-- Columns, order and types are unchanged, so get_channel_stats()
-- (SELECT * FROM the view) needs no change. It is LANGUAGE sql without
-- BEGIN ATOMIC, so it does not block the DROP. The refresh cron job refers
-- to the view by name and keeps working.
--
-- NOTE: staging and production share one database — running this IS a
-- production change. Run deliberately; the view is briefly absent between
-- DROP and CREATE inside the transaction (readers wait on the lock).

BEGIN;

DROP MATERIALIZED VIEW IF EXISTS public.nde_channel_stats_mv;

CREATE MATERIALIZED VIEW public.nde_channel_stats_mv AS
SELECT
    v."channelId"                                          AS channel_id,
    -- Prefer the channels table (kept current by the daily identity refresh) over
    -- per-video snapshots, which go stale when a channel renames itself.
    COALESCE(MAX(c.name), MODE() WITHIN GROUP (ORDER BY v."channelName")) AS channel_name,
    -- Link by channel ID: permanent, unlike @handles.
    'https://www.youtube.com/channel/' || v."channelId"   AS channel_url,
    COALESCE(MAX(c.custom_url), MAX(v."channelUsername"))  AS channel_username,
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

CREATE UNIQUE INDEX nde_channel_stats_mv_idx
    ON public.nde_channel_stats_mv (channel_id);

COMMIT;
