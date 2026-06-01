-- ============================================================
-- Materialized View for UAP Channel Stats
-- ============================================================
-- Replaces live-aggregation in get_uap_channel_stats() RPC with
-- a pre-computed materialized view, refreshed daily at 6:15 UTC.
--
-- Benefits:
--   - Eliminates AVG/COUNT/GROUP BY on every page load
--   - CONCURRENTLY refresh = zero-downtime reads
--   - Daily freshness is appropriate for channel-level aggregates

CREATE MATERIALIZED VIEW IF NOT EXISTS public.uap_channel_stats_mv AS
SELECT
    c.channel_id,
    c.channel_name,
    c.track,
    c.avatar_url,
    c.subscriber_count,
    c.total_view_count,
    COUNT(v.video_id) FILTER (WHERE v.tier IN (1, 2)) AS video_count,
    ROUND(AVG(s.max_evidence_score)::numeric, 1) AS avg_evidence_score,
    ROUND(AVG(s.max_contact_depth_score)::numeric, 1) AS avg_contact_depth,
    ROUND(AVG(s.max_transformation_score)::numeric, 1) AS avg_transformation_score,
    COUNT(v.video_id) FILTER (WHERE v.tier = 1) AS tier1_count,
    COUNT(v.video_id) FILTER (WHERE v.tier = 2) AS tier2_count,
    COUNT(v.video_id) FILTER (WHERE v.tier = 3) AS tier3_count
FROM public.uap_channels c
LEFT JOIN public.uap_vids v ON c.channel_id = v.channel_id
LEFT JOIN public.uap_video_stats s ON v.video_id = s.video_id
WHERE c.hidden = false
GROUP BY c.channel_id, c.channel_name, c.track, c.avatar_url, c.subscriber_count, c.total_view_count;

-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS uap_channel_stats_mv_idx
  ON public.uap_channel_stats_mv (channel_id);

-- Rewrite the RPC to simply SELECT * from the materialized view
CREATE OR REPLACE FUNCTION get_uap_channel_stats()
RETURNS TABLE (
    channel_id text,
    channel_name text,
    track text,
    avatar_url text,
    subscriber_count bigint,
    total_view_count bigint,
    video_count bigint,
    avg_evidence_score numeric,
    avg_contact_depth numeric,
    avg_transformation_score numeric,
    tier1_count bigint,
    tier2_count bigint,
    tier3_count bigint
) LANGUAGE sql SECURITY DEFINER AS $$
    SELECT * FROM public.uap_channel_stats_mv ORDER BY video_count DESC;
$$;

-- Schedule daily refresh at 6:15 UTC (after channel score recompute)
SELECT cron.schedule(
  'refresh-uap-channel-stats-mv',
  '15 6 * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.uap_channel_stats_mv$$
);
