CREATE OR REPLACE FUNCTION public.search_punctuated_embeddings_filtered(
    query_embedding vector,
    similarity_threshold double precision,
    sort_column text,
    sort_direction text,
    page_limit integer,
    page_offset integer,
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
    similarity double precision,
    video_id text,
    url text,
    title text,
    "thumbnailUrl" text,
    date timestamp with time zone,
    "viewCount" bigint,
    "channelName" text,
    analysis_nde_summary text
)
LANGUAGE sql
STABLE
AS $$
    WITH candidates AS (
        SELECT
            e.id,
            e.video_id,
            e.content,
            e.start_time,
            1 - (e.embedding <=> query_embedding) AS similarity
        FROM
            public.nde_punctuated_embeddings e
        WHERE
            1 - (e.embedding <=> query_embedding) >= similarity_threshold
        ORDER BY
            e.embedding <=> query_embedding
        LIMIT 2000
    )
    SELECT
        c.id,
        c.content,
        c.start_time,
        c.similarity,
        v."videoId" as video_id,
        v.url,
        v.title,
        v."thumbnailUrl",
        v."date",
        v."viewCount",
        v."channelName",
        v.analysis_nde_summary
    FROM
        candidates c
    JOIN
        public.nde_vids v ON c.video_id = v."videoId"
    LEFT JOIN
        public.nde_analysis a ON v."videoId" = a.video_id
    WHERE
        v."isNde"::text != 'not_nde'
        AND (filter_experience_type IS NULL OR a.experience_type = ANY(filter_experience_type))
        AND (filter_trigger_category IS NULL OR a.trigger_category = ANY(filter_trigger_category))
        AND (filter_overall_tone IS NULL OR a.overall_tone = ANY(filter_overall_tone))
        AND (filter_intensity_min IS NULL OR COALESCE(a.intensity_rating, 0) >= filter_intensity_min)
        AND (filter_intensity_max IS NULL OR COALESCE(a.intensity_rating, 0) <= filter_intensity_max)
        AND (filter_greyson_min IS NULL OR filter_greyson_min = 0 OR COALESCE(a.total_greyson_score, 0) >= filter_greyson_min)
        AND (filter_transformation_min IS NULL OR filter_transformation_min = 0 OR COALESCE(a.transformation_score, 0) >= filter_transformation_min)
        AND (filter_veridical_min IS NULL OR filter_veridical_min = 0 OR COALESCE(v.rvnde_total_score, 0) >= filter_veridical_min)
    ORDER BY
        CASE WHEN sort_direction = 'DESC' THEN
            CASE
                WHEN sort_column = 'similarity' THEN c.similarity
                WHEN sort_column = 'viewCount' THEN v."viewCount"::float
                WHEN sort_column = 'date' THEN EXTRACT(EPOCH FROM v."date")
            END
        END DESC NULLS LAST,
        CASE WHEN sort_direction = 'ASC' THEN
            CASE
                WHEN sort_column = 'similarity' THEN c.similarity
                WHEN sort_column = 'viewCount' THEN v."viewCount"::float
                WHEN sort_column = 'date' THEN EXTRACT(EPOCH FROM v."date")
            END
        END ASC NULLS LAST,
        CASE WHEN sort_direction = 'DESC' THEN
            CASE
                WHEN sort_column = 'title' THEN v.title
                WHEN sort_column = 'channelName' THEN v."channelName"
            END
        END DESC NULLS LAST,
        CASE WHEN sort_direction = 'ASC' THEN
            CASE
                WHEN sort_column = 'title' THEN v.title
                WHEN sort_column = 'channelName' THEN v."channelName"
            END
        END ASC NULLS LAST
    LIMIT
        page_limit
    OFFSET
        page_offset;
$$;
