-- ============================================================================
-- Migration: Soft-delete defunct "Life After Life NDE" YouTube channel
-- Channel ID: UC6G-0YOhL4dNkex8Vw5pqWw
-- Date: 2026-04-13
--
-- STRATEGY:
-- 1. Mark channel as hidden (frontend 404s + scanner disabled)
-- 2. Delete searchable data (embeddings, analysis, chatbot chunks)
-- 3. Keep nde_vids rows as archive (titles, transcripts, metadata)
-- 4. Clean experiencer profiles (remove dead video references)
-- 5. Rewrite keyword_search_videos as PL/pgSQL to use GIN index
--
-- WHY PL/pgSQL: The original SQL function used
--   `WHERE tsq IS NULL OR search_vector @@ tsq`
-- which prevented PostgreSQL from ever using the GIN index (it planned
-- for the worst case — full table scan of 800K+ rows). PL/pgSQL with
-- conditional branching lets the planner see a clean `WHERE @@ tsq`
-- and use the GIN index. Result: 3,000ms → 105ms.
-- ============================================================================


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1: Channel table updates
-- ═══════════════════════════════════════════════════════════════════════════

-- Add hidden flag to channels table (soft-delete marker)
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false;

-- Mark the defunct channel
UPDATE public.channels
SET hidden = true, scanner_enabled = false
WHERE channel_id = 'UC6G-0YOhL4dNkex8Vw5pqWw';


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2: Delete searchable data (keep nde_vids archive)
-- ═══════════════════════════════════════════════════════════════════════════

-- Delete FTS embeddings (what keyword search scans)
DELETE FROM public.nde_punctuated_embeddings
WHERE video_id IN (
    SELECT "videoId" FROM public.nde_vids
    WHERE "channelId" = 'UC6G-0YOhL4dNkex8Vw5pqWw'
);

-- Delete analysis rows (powers similarity + stats)
DELETE FROM public.nde_analysis
WHERE video_id IN (
    SELECT "videoId" FROM public.nde_vids
    WHERE "channelId" = 'UC6G-0YOhL4dNkex8Vw5pqWw'
);

-- Delete chatbot RAG chunks
DELETE FROM public.nde_chatbot_chunks
WHERE video_id IN (
    SELECT "videoId" FROM public.nde_vids
    WHERE "channelId" = 'UC6G-0YOhL4dNkex8Vw5pqWw'
);


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 3: Clean experiencer profiles
-- ═══════════════════════════════════════════════════════════════════════════

-- Remove hidden-channel video IDs from experiencer profiles
UPDATE public.experiencer_profiles
SET video_ids = (
    SELECT ARRAY(
        SELECT unnest(video_ids)
        EXCEPT
        SELECT "videoId" FROM public.nde_vids
        WHERE "channelId" = 'UC6G-0YOhL4dNkex8Vw5pqWw'
    )
)
WHERE video_ids && (
    SELECT ARRAY_AGG("videoId") FROM public.nde_vids
    WHERE "channelId" = 'UC6G-0YOhL4dNkex8Vw5pqWw'
);

-- Remove hidden-channel entries from channel_appearances JSONB
UPDATE public.experiencer_profiles
SET channel_appearances = channel_appearances - 'UC6G-0YOhL4dNkex8Vw5pqWw'
WHERE channel_appearances ? 'UC6G-0YOhL4dNkex8Vw5pqWw';

-- Unpublish profiles with no remaining videos
UPDATE public.experiencer_profiles
SET is_published = false
WHERE video_ids IS NULL OR array_length(video_ids, 1) IS NULL OR array_length(video_ids, 1) = 0;

-- Fix profile photos pointing to dead channel videos
UPDATE public.experiencer_profiles ep
SET photo_url = (
    SELECT v."thumbnailUrl"
    FROM public.nde_vids v
    LEFT JOIN public.channels c ON c.channel_id = v."channelId" AND c.hidden = true
    WHERE v."videoId" = ANY(ep.video_ids)
      AND c.channel_id IS NULL
      AND v."thumbnailUrl" IS NOT NULL
    ORDER BY v."viewCount" DESC NULLS LAST
    LIMIT 1
)
WHERE photo_url IS NOT NULL
  AND photo_url LIKE '%i.ytimg.com%'
  AND EXISTS (
    SELECT 1 FROM public.nde_vids v
    WHERE v."channelId" = 'UC6G-0YOhL4dNkex8Vw5pqWw'
      AND photo_url LIKE '%' || v."videoId" || '%'
  );

-- Null out photo for profiles with no remaining videos
UPDATE public.experiencer_profiles
SET photo_url = NULL
WHERE photo_url IS NOT NULL
  AND (video_ids IS NULL OR array_length(video_ids, 1) IS NULL OR array_length(video_ids, 1) = 0);


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 4: Rewrite keyword_search_videos as PL/pgSQL (GIN index fix)
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.keyword_search_videos(text,text,text,integer,integer,text[],text[],text[],text[],integer,integer,integer,integer,integer);

CREATE OR REPLACE FUNCTION public.keyword_search_videos(
    search_query text,
    sort_column text DEFAULT 'relevance',
    sort_direction text DEFAULT 'DESC',
    page_limit integer DEFAULT 12,
    page_offset integer DEFAULT 0,
    filter_channel_name text[] DEFAULT NULL,
    filter_experience_type text[] DEFAULT NULL,
    filter_trigger_category text[] DEFAULT NULL,
    filter_overall_tone text[] DEFAULT NULL,
    filter_intensity_min integer DEFAULT NULL,
    filter_intensity_max integer DEFAULT NULL,
    filter_greyson_min integer DEFAULT NULL,
    filter_transformation_min integer DEFAULT NULL,
    filter_veridical_min integer DEFAULT NULL
)
RETURNS TABLE (
    id bigint,
    content text,
    start_time real,
    rank real,
    video_id text,
    url text,
    title text,
    "thumbnailUrl" text,
    date timestamp with time zone,
    "viewCount" bigint,
    "channelName" text,
    analysis_nde_summary text,
    total_count bigint
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    tsq tsquery;
BEGIN
    -- Parse search query outside the main query so PG knows at plan time
    -- whether to use the GIN index or do a full scan
    IF search_query IS NULL OR search_query = '' OR search_query = '*' THEN
        tsq := NULL;
    ELSE
        tsq := plainto_tsquery('english', search_query);
    END IF;

    IF tsq IS NOT NULL THEN
        -- SEARCH MODE: GIN index on search_vector will be used
        RETURN QUERY
        WITH matching_chunks AS (
            SELECT
                e.id,
                e.video_id,
                e.content,
                e.start_time,
                ts_rank_cd(e.search_vector, tsq) AS rank
            FROM public.nde_punctuated_embeddings e
            WHERE e.search_vector @@ tsq
        ),
        filtered AS (
            SELECT
                mc.id, mc.content, mc.start_time, mc.rank,
                v."videoId" AS video_id, v.url, v.title, v."thumbnailUrl",
                v."date", v."viewCount", v."channelName", v.analysis_nde_summary,
                COUNT(*) OVER() AS total_count
            FROM matching_chunks mc
            JOIN public.nde_vids v ON mc.video_id = v."videoId"
            LEFT JOIN public.nde_analysis a ON v."videoId" = a.video_id
            WHERE v."isNde"::text != 'not_nde'
                AND (filter_channel_name IS NULL OR v."channelName" = ANY(filter_channel_name))
                AND (filter_experience_type IS NULL OR a.experience_type = ANY(filter_experience_type))
                AND (filter_trigger_category IS NULL OR a.trigger_category = ANY(filter_trigger_category))
                AND (filter_overall_tone IS NULL OR a.overall_tone = ANY(filter_overall_tone))
                AND (filter_intensity_min IS NULL OR COALESCE(a.intensity_rating, 0) >= filter_intensity_min)
                AND (filter_intensity_max IS NULL OR COALESCE(a.intensity_rating, 0) <= filter_intensity_max)
                AND (filter_greyson_min IS NULL OR filter_greyson_min = 0 OR COALESCE(a.total_greyson_score, 0) >= filter_greyson_min)
                AND (filter_transformation_min IS NULL OR filter_transformation_min = 0 OR COALESCE(a.transformation_score, 0) >= filter_transformation_min)
                AND (filter_veridical_min IS NULL OR filter_veridical_min = 0 OR COALESCE(v.rvnde_total_score, 0) >= filter_veridical_min)
        )
        SELECT f.id, f.content, f.start_time, f.rank, f.video_id, f.url, f.title,
               f."thumbnailUrl", f."date", f."viewCount", f."channelName",
               f.analysis_nde_summary, f.total_count
        FROM filtered f
        ORDER BY
            CASE WHEN sort_direction = 'DESC' THEN
                CASE WHEN sort_column = 'relevance' THEN f.rank::float
                     WHEN sort_column = 'viewCount' THEN f."viewCount"::float
                     WHEN sort_column = 'date' THEN EXTRACT(EPOCH FROM f."date") END
            END DESC NULLS LAST,
            CASE WHEN sort_direction = 'ASC' THEN
                CASE WHEN sort_column = 'relevance' THEN f.rank::float
                     WHEN sort_column = 'viewCount' THEN f."viewCount"::float
                     WHEN sort_column = 'date' THEN EXTRACT(EPOCH FROM f."date") END
            END ASC NULLS LAST,
            CASE WHEN sort_direction = 'DESC' THEN
                CASE WHEN sort_column = 'title' THEN f.title
                     WHEN sort_column = 'channelName' THEN f."channelName" END
            END DESC NULLS LAST,
            CASE WHEN sort_direction = 'ASC' THEN
                CASE WHEN sort_column = 'title' THEN f.title
                     WHEN sort_column = 'channelName' THEN f."channelName" END
            END ASC NULLS LAST
        LIMIT page_limit OFFSET page_offset;

    ELSE
        -- BROWSE MODE: No search term, full scan ordered by sort column
        RETURN QUERY
        WITH filtered AS (
            SELECT
                e.id, e.content, e.start_time, 0::real AS rank,
                v."videoId" AS video_id, v.url, v.title, v."thumbnailUrl",
                v."date", v."viewCount", v."channelName", v.analysis_nde_summary,
                COUNT(*) OVER() AS total_count
            FROM public.nde_punctuated_embeddings e
            JOIN public.nde_vids v ON e.video_id = v."videoId"
            LEFT JOIN public.nde_analysis a ON v."videoId" = a.video_id
            WHERE v."isNde"::text != 'not_nde'
                AND (filter_channel_name IS NULL OR v."channelName" = ANY(filter_channel_name))
                AND (filter_experience_type IS NULL OR a.experience_type = ANY(filter_experience_type))
                AND (filter_trigger_category IS NULL OR a.trigger_category = ANY(filter_trigger_category))
                AND (filter_overall_tone IS NULL OR a.overall_tone = ANY(filter_overall_tone))
                AND (filter_intensity_min IS NULL OR COALESCE(a.intensity_rating, 0) >= filter_intensity_min)
                AND (filter_intensity_max IS NULL OR COALESCE(a.intensity_rating, 0) <= filter_intensity_max)
                AND (filter_greyson_min IS NULL OR filter_greyson_min = 0 OR COALESCE(a.total_greyson_score, 0) >= filter_greyson_min)
                AND (filter_transformation_min IS NULL OR filter_transformation_min = 0 OR COALESCE(a.transformation_score, 0) >= filter_transformation_min)
                AND (filter_veridical_min IS NULL OR filter_veridical_min = 0 OR COALESCE(v.rvnde_total_score, 0) >= filter_veridical_min)
        )
        SELECT f.id, f.content, f.start_time, f.rank, f.video_id, f.url, f.title,
               f."thumbnailUrl", f."date", f."viewCount", f."channelName",
               f.analysis_nde_summary, f.total_count
        FROM filtered f
        ORDER BY
            CASE WHEN sort_direction = 'DESC' THEN
                CASE WHEN sort_column = 'relevance' THEN f.rank::float
                     WHEN sort_column = 'viewCount' THEN f."viewCount"::float
                     WHEN sort_column = 'date' THEN EXTRACT(EPOCH FROM f."date") END
            END DESC NULLS LAST,
            CASE WHEN sort_direction = 'ASC' THEN
                CASE WHEN sort_column = 'relevance' THEN f.rank::float
                     WHEN sort_column = 'viewCount' THEN f."viewCount"::float
                     WHEN sort_column = 'date' THEN EXTRACT(EPOCH FROM f."date") END
            END ASC NULLS LAST,
            CASE WHEN sort_direction = 'DESC' THEN
                CASE WHEN sort_column = 'title' THEN f.title
                     WHEN sort_column = 'channelName' THEN f."channelName" END
            END DESC NULLS LAST,
            CASE WHEN sort_direction = 'ASC' THEN
                CASE WHEN sort_column = 'title' THEN f.title
                     WHEN sort_column = 'channelName' THEN f."channelName" END
            END ASC NULLS LAST
        LIMIT page_limit OFFSET page_offset;
    END IF;
END;
$$;
