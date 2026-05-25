-- Fix UAP video count inconsistencies
-- 1. New aggregate RPCs to avoid Supabase 1000-row truncation
-- 2. Update get_uap_channel_stats to filter tier IN (1, 2) for consumer pages
-- 3. Backfill 1,871 stuck pipeline videos into scan queue

-- ═══════════════════════════════════════════════════════════════════════
-- RPC 1: get_uap_intake_stats
-- Returns aggregate intake counts (replaces raw row fetch that was truncated at 1000)
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_uap_intake_stats()
RETURNS TABLE (
    accepted bigint,
    rejected bigint,
    failed bigint
)
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
    SELECT
        COUNT(*) FILTER (WHERE intake_status = 'complete') AS accepted,
        COUNT(*) FILTER (WHERE intake_status = 'out_of_scope') AS rejected,
        COUNT(*) FILTER (WHERE intake_status IN ('failed', 'no_captions', 'drm_protected', 'embedding')) AS failed
    FROM uap_vids
    WHERE intake_status IS NOT NULL;
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- RPC 2: get_uap_channel_added_counts
-- Returns per-channel count of videos with intake_status = 'complete'
-- (replaces client-side Map built from truncated raw rows)
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_uap_channel_added_counts()
RETURNS TABLE (
    channel_id text,
    added_count bigint
)
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
    SELECT
        v.channel_id,
        COUNT(*) AS added_count
    FROM uap_vids v
    WHERE v.intake_status = 'complete'
    AND v.channel_id IS NOT NULL
    GROUP BY v.channel_id;
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- Fix 2: Update get_uap_channel_stats to filter tier IN (1, 2)
-- Consumer-facing pages should not count tier 3 (out-of-scope) videos
-- ═══════════════════════════════════════════════════════════════════════

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
)
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
AS $$
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
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- Fix 4: Backfill stuck pipeline videos into scan queue
-- 1,871 videos with intake_status IN ('punctuated', 'classified')
-- that have NO scan_queue entry
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO uap_scan_queue (video_id, video_url, channel_id, status, source_type)
SELECT
    v.video_id,
    v.url,
    v.channel_id,
    'pending',
    'backfill'
FROM uap_vids v
WHERE v.intake_status IN ('punctuated', 'classified')
AND v.video_id NOT IN (
    SELECT sq.video_id FROM uap_scan_queue sq WHERE sq.video_id IS NOT NULL
)
ON CONFLICT (video_url) DO NOTHING;
