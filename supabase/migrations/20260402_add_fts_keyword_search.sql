-- ============================================================================
-- Migration: Replace Typesense with PostgreSQL Full-Text Search
-- 
-- Adds tsvector column + GIN index to nde_punctuated_embeddings for keyword
-- search, plus two RPC functions: keyword_search_videos and keyword_search_facets.
-- This eliminates the external Typesense server dependency.
-- ============================================================================

-- 1. Add search_vector column to nde_punctuated_embeddings
ALTER TABLE public.nde_punctuated_embeddings
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Backfill existing rows
UPDATE public.nde_punctuated_embeddings
SET search_vector = to_tsvector('english', COALESCE(content, ''))
WHERE search_vector IS NULL;

-- 3. Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_nde_punctuated_embeddings_search_vector
ON public.nde_punctuated_embeddings
USING gin(search_vector);

-- 4. Auto-maintain search_vector on INSERT/UPDATE via trigger
CREATE OR REPLACE FUNCTION public.nde_punctuated_embeddings_search_vector_trigger()
RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nde_punctuated_embeddings_search_vector
ON public.nde_punctuated_embeddings;

CREATE TRIGGER trg_nde_punctuated_embeddings_search_vector
BEFORE INSERT OR UPDATE OF content
ON public.nde_punctuated_embeddings
FOR EACH ROW
EXECUTE FUNCTION public.nde_punctuated_embeddings_search_vector_trigger();


-- ============================================================================
-- 5. keyword_search_videos RPC
--    Replaces Typesense keyword search with PostgreSQL FTS.
--    Searches content chunks + video title, joins metadata + analysis for
--    filtering and enrichment. Returns same shape as the existing semantic
--    search RPC for frontend compatibility.
-- ============================================================================

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
LANGUAGE sql
STABLE
AS $$
    WITH
    -- Parse the search query (handle '*' as browse-all)
    parsed_query AS (
        SELECT
            CASE
                WHEN search_query IS NULL OR search_query = '' OR search_query = '*'
                THEN NULL
                ELSE plainto_tsquery('english', search_query)
            END AS tsq
    ),
    -- Find matching chunks
    matching_chunks AS (
        SELECT
            e.id,
            e.video_id,
            e.content,
            e.start_time,
            CASE
                WHEN (SELECT tsq FROM parsed_query) IS NULL THEN 0
                ELSE ts_rank_cd(e.search_vector, (SELECT tsq FROM parsed_query))
            END AS rank
        FROM
            public.nde_punctuated_embeddings e, parsed_query pq
        WHERE
            pq.tsq IS NULL  -- browse all
            OR e.search_vector @@ pq.tsq  -- FTS match
    ),
    -- Join with video metadata and analysis, apply filters
    filtered AS (
        SELECT
            mc.id,
            mc.content,
            mc.start_time,
            mc.rank,
            v."videoId" AS video_id,
            v.url,
            v.title,
            v."thumbnailUrl",
            v."date",
            v."viewCount",
            v."channelName",
            v.analysis_nde_summary,
            COUNT(*) OVER() AS total_count
        FROM
            matching_chunks mc
        JOIN
            public.nde_vids v ON mc.video_id = v."videoId"
        LEFT JOIN
            public.nde_analysis a ON v."videoId" = a.video_id
        WHERE
            v."isNde"::text != 'not_nde'
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
    SELECT
        f.id,
        f.content,
        f.start_time,
        f.rank,
        f.video_id,
        f.url,
        f.title,
        f."thumbnailUrl",
        f."date",
        f."viewCount",
        f."channelName",
        f.analysis_nde_summary,
        f.total_count
    FROM filtered f
    ORDER BY
        -- Numeric sort columns
        CASE WHEN sort_direction = 'DESC' THEN
            CASE
                WHEN sort_column = 'relevance' THEN f.rank::float
                WHEN sort_column = 'viewCount' THEN f."viewCount"::float
                WHEN sort_column = 'date' THEN EXTRACT(EPOCH FROM f."date")
            END
        END DESC NULLS LAST,
        CASE WHEN sort_direction = 'ASC' THEN
            CASE
                WHEN sort_column = 'relevance' THEN f.rank::float
                WHEN sort_column = 'viewCount' THEN f."viewCount"::float
                WHEN sort_column = 'date' THEN EXTRACT(EPOCH FROM f."date")
            END
        END ASC NULLS LAST,
        -- Text sort columns
        CASE WHEN sort_direction = 'DESC' THEN
            CASE
                WHEN sort_column = 'title' THEN f.title
                WHEN sort_column = 'channelName' THEN f."channelName"
            END
        END DESC NULLS LAST,
        CASE WHEN sort_direction = 'ASC' THEN
            CASE
                WHEN sort_column = 'title' THEN f.title
                WHEN sort_column = 'channelName' THEN f."channelName"
            END
        END ASC NULLS LAST
    LIMIT page_limit
    OFFSET page_offset;
$$;


-- ============================================================================
-- 6. keyword_search_facets RPC
--    Returns facet counts for the filter sidebar. Computes from all
--    NDE videos (not filtered by search query -- matches Typesense behavior
--    where facets show global counts).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.keyword_search_facets()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
    WITH base AS (
        SELECT DISTINCT v."videoId", v."channelName", a.experience_type, a.trigger_category,
               a.overall_tone, a.intensity_rating
        FROM public.nde_vids v
        LEFT JOIN public.nde_analysis a ON v."videoId" = a.video_id
        WHERE v."isNde"::text != 'not_nde'
    ),
    channel_facet AS (
        SELECT jsonb_agg(jsonb_build_object('value', "channelName", 'count', cnt) ORDER BY cnt DESC)
        AS counts
        FROM (SELECT "channelName", COUNT(*) AS cnt FROM base WHERE "channelName" IS NOT NULL GROUP BY "channelName") sub
    ),
    experience_type_facet AS (
        SELECT jsonb_agg(jsonb_build_object('value', experience_type, 'count', cnt) ORDER BY cnt DESC)
        AS counts
        FROM (SELECT experience_type, COUNT(*) AS cnt FROM base WHERE experience_type IS NOT NULL GROUP BY experience_type) sub
    ),
    trigger_facet AS (
        SELECT jsonb_agg(jsonb_build_object('value', trigger_category, 'count', cnt) ORDER BY cnt DESC)
        AS counts
        FROM (SELECT trigger_category, COUNT(*) AS cnt FROM base WHERE trigger_category IS NOT NULL GROUP BY trigger_category) sub
    ),
    tone_facet AS (
        SELECT jsonb_agg(jsonb_build_object('value', overall_tone, 'count', cnt) ORDER BY cnt DESC)
        AS counts
        FROM (SELECT overall_tone, COUNT(*) AS cnt FROM base WHERE overall_tone IS NOT NULL GROUP BY overall_tone) sub
    ),
    intensity_facet AS (
        SELECT jsonb_agg(jsonb_build_object('value', bucket, 'count', cnt) ORDER BY cnt DESC)
        AS counts
        FROM (
            SELECT
                CASE
                    WHEN intensity_rating BETWEEN 1 AND 3 THEN 'Mild'
                    WHEN intensity_rating BETWEEN 4 AND 5 THEN 'Moderate'
                    WHEN intensity_rating BETWEEN 6 AND 7 THEN 'Deep'
                    WHEN intensity_rating BETWEEN 8 AND 10 THEN 'Profound'
                END AS bucket,
                COUNT(*) AS cnt
            FROM base
            WHERE intensity_rating IS NOT NULL
            GROUP BY bucket
        ) sub
        WHERE bucket IS NOT NULL
    )
    SELECT jsonb_build_array(
        jsonb_build_object('field_name', 'channelName', 'counts', COALESCE((SELECT counts FROM channel_facet), '[]'::jsonb)),
        jsonb_build_object('field_name', 'experienceType', 'counts', COALESCE((SELECT counts FROM experience_type_facet), '[]'::jsonb)),
        jsonb_build_object('field_name', 'triggerCategory', 'counts', COALESCE((SELECT counts FROM trigger_facet), '[]'::jsonb)),
        jsonb_build_object('field_name', 'overallTone', 'counts', COALESCE((SELECT counts FROM tone_facet), '[]'::jsonb)),
        jsonb_build_object('field_name', 'intensityBucket', 'counts', COALESCE((SELECT counts FROM intensity_facet), '[]'::jsonb))
    );
$$;
