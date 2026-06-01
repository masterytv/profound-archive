-- Fix: Switch get_uap_channel_stats() from uap_analysis to uap_video_stats
-- 
-- Problem: The old RPC joined uap_analysis which only has 1,003 scored videos (14.7%),
-- causing wildly inaccurate averages (e.g., Weird World showed 100% ESS from 1 scored video).
-- 
-- Fix: Join uap_video_stats instead, which has 2,749 scored videos (40%) with
-- properly aggregated max_evidence_score and max_contact_depth_score from encounters.

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
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
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
    GROUP BY c.channel_id, c.channel_name, c.track, c.avatar_url, c.subscriber_count, c.total_view_count
    ORDER BY video_count DESC;
END;
$$;
