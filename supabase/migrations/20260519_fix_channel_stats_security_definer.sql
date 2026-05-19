-- Fix: get_uap_channel_stats must be SECURITY DEFINER to match the other
-- UAP read-only RPCs (uap_video_explore_grid, uap_explore_facets).
--
-- Root cause: The Sprint 12 security audit set this function to SECURITY INVOKER.
-- As INVOKER, the anon role hits an RLS policy on uap_vids that subqueries the
-- profiles table — which anon cannot read — causing a permission denied error
-- and silently returning no channels on the /uap/channels page.
--
-- The video explore RPCs (uap_video_explore_grid, uap_explore_facets) remained
-- SECURITY DEFINER and continued working, which is why videos showed but
-- channels did not.

CREATE OR REPLACE FUNCTION public.get_uap_channel_stats()
RETURNS TABLE(
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
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        c.channel_id,
        c.channel_name,
        c.track,
        c.avatar_url,
        c.subscriber_count,
        c.total_view_count,
        COUNT(v.video_id) AS video_count,
        ROUND(AVG(a.evidence_score)::numeric, 1) AS avg_evidence_score,
        ROUND(AVG(a.contact_depth_score)::numeric, 1) AS avg_contact_depth,
        ROUND(AVG(a.transformation_score)::numeric, 1) AS avg_transformation_score,
        COUNT(v.video_id) FILTER (WHERE v.tier = 1) AS tier1_count,
        COUNT(v.video_id) FILTER (WHERE v.tier = 2) AS tier2_count,
        COUNT(v.video_id) FILTER (WHERE v.tier = 3) AS tier3_count
    FROM public.uap_channels c
    LEFT JOIN public.uap_vids v ON c.channel_id = v.channel_id
    LEFT JOIN public.uap_analysis a ON v.video_id = a.video_id
    WHERE c.hidden = false
    GROUP BY c.channel_id, c.channel_name, c.track, c.avatar_url, c.subscriber_count, c.total_view_count
    ORDER BY video_count DESC;
END;
$function$;
