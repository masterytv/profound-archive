-- ============================================================================
-- Migration: Hide defunct YouTube channels (soft-delete)
--
-- Adds a `hidden` boolean to the `channels` table so removed/defunct channels
-- can be excluded from all public-facing queries without deleting the underlying
-- analysis data. Also cleans up RAG chatbot chunks, experiencer profiles, and
-- all public-facing RPCs.
--
-- Target: Life After Life NDE (UC6G-0YOhL4dNkex8Vw5pqWw) — removed from YouTube
-- ============================================================================


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │  1. Schema: Add `hidden` column to channels                            │
-- └──────────────────────────────────────────────────────────────────────────┘

ALTER TABLE public.channels
ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false;

-- Mark the defunct channel
UPDATE public.channels
SET hidden = true, scanner_enabled = false
WHERE channel_id = 'UC6G-0YOhL4dNkex8Vw5pqWw';


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │  2. Delete RAG chatbot chunks for hidden channel videos                │
-- │     (User decision: remove so chatbot never cites unreachable content) │
-- └──────────────────────────────────────────────────────────────────────────┘

DELETE FROM public.nde_chatbot_chunks
WHERE video_id IN (
    SELECT "videoId" FROM public.nde_vids
    WHERE "channelId" = 'UC6G-0YOhL4dNkex8Vw5pqWw'
);


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │  3. RPC: get_channel_stats() — exclude hidden channels                 │
-- └──────────────────────────────────────────────────────────────────────────┘

DROP FUNCTION IF EXISTS public.get_channel_stats();
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
AS $$
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
    -- *** NEW: exclude hidden channels ***
    AND NOT COALESCE(c.hidden, false)
  GROUP BY v."channelId"
  ORDER BY video_count DESC;
$$;


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │  4. RPC: keyword_search_videos() — exclude hidden channel videos       │
-- └──────────────────────────────────────────────────────────────────────────┘

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
LANGUAGE sql
STABLE
AS $$
    WITH
    parsed_query AS (
        SELECT
            CASE
                WHEN search_query IS NULL OR search_query = '' OR search_query = '*'
                THEN NULL
                ELSE plainto_tsquery('english', search_query)
            END AS tsq
    ),
    -- Precompute hidden channel IDs for subquery filtering
    hidden_channels AS (
        SELECT channel_id FROM public.channels WHERE hidden = true
    ),
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
            pq.tsq IS NULL
            OR e.search_vector @@ pq.tsq
    ),
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
            -- *** NEW: exclude hidden channels ***
            AND v."channelId" NOT IN (SELECT channel_id FROM hidden_channels)
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


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │  5. RPC: keyword_search_facets() — exclude hidden channel from facets  │
-- └──────────────────────────────────────────────────────────────────────────┘

DROP FUNCTION IF EXISTS public.keyword_search_facets();
CREATE OR REPLACE FUNCTION public.keyword_search_facets()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
    WITH
    hidden_channels AS (
        SELECT channel_id FROM public.channels WHERE hidden = true
    ),
    base AS (
        SELECT DISTINCT v."videoId", v."channelName", a.experience_type, a.trigger_category,
               a.overall_tone, a.intensity_rating
        FROM public.nde_vids v
        LEFT JOIN public.nde_analysis a ON v."videoId" = a.video_id
        WHERE v."isNde"::text != 'not_nde'
          -- *** NEW: exclude hidden channels ***
          AND v."channelId" NOT IN (SELECT channel_id FROM hidden_channels)
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


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │  6. RPC: find_similar_experiences() — exclude hidden channel videos    │
-- └──────────────────────────────────────────────────────────────────────────┘

DROP FUNCTION IF EXISTS find_similar_experiences(text,int,float);
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
  ),
  hidden_channels AS (
    SELECT channel_id FROM public.channels WHERE hidden = true
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
    -- *** NEW: exclude hidden channels ***
    AND v."channelId" NOT IN (SELECT channel_id FROM hidden_channels)
    AND 1 - (a.experience_fingerprint <=> t.experience_fingerprint) >= similarity_threshold
  ORDER BY a.experience_fingerprint <=> t.experience_fingerprint
  LIMIT match_count;
$$;


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │  7. Experiencer profile cleanup                                        │
-- │     Remove hidden-channel videos from profiles, unpublish empties      │
-- └──────────────────────────────────────────────────────────────────────────┘

-- 7a. Remove dead video_ids from experiencer_profiles
-- (video_ids is a text[] column; filter out any that belong to the hidden channel)
UPDATE public.experiencer_profiles
SET video_ids = ARRAY(
    SELECT unnest(video_ids)
    EXCEPT
    SELECT "videoId" FROM public.nde_vids WHERE "channelId" = 'UC6G-0YOhL4dNkex8Vw5pqWw'
)
WHERE video_ids && ARRAY(
    SELECT "videoId" FROM public.nde_vids WHERE "channelId" = 'UC6G-0YOhL4dNkex8Vw5pqWw'
);

-- 7b. Remove the hidden channel from channel_appearances JSON array
-- (channel_appearances is a JSONB array of {channel_id, name, avatar_url, video_count})
UPDATE public.experiencer_profiles
SET channel_appearances = (
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
    FROM jsonb_array_elements(channel_appearances) AS elem
    WHERE elem->>'channel_id' != 'UC6G-0YOhL4dNkex8Vw5pqWw'
)
WHERE channel_appearances IS NOT NULL
  AND channel_appearances::text LIKE '%UC6G-0YOhL4dNkex8Vw5pqWw%';

-- 7c. Unpublish profiles that now have zero video_ids
-- (They'll auto re-appear if a future video is discovered on another channel)
UPDATE public.experiencer_profiles
SET published_at = NULL
WHERE published_at IS NOT NULL
  AND (video_ids IS NULL OR array_length(video_ids, 1) IS NULL OR array_length(video_ids, 1) = 0);
