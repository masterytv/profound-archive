-- ═══════════════════════════════════════════════════════════
-- Add phenomenology-powered filters to UAP search
-- 1. Update facets RPC with experience_type, entity_type, evidence_type, recurrence
-- 2. Update keyword search RPC with new filter params
-- 3. Update semantic search RPC with new filter params
-- ═══════════════════════════════════════════════════════════

-- 1. Facets
CREATE OR REPLACE FUNCTION public.uap_search_facets()
RETURNS JSONB
LANGUAGE plpgsql STABLE
AS $$
DECLARE result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'content_types', (SELECT COALESCE(jsonb_agg(DISTINCT v.content_type ORDER BY v.content_type), '[]'::jsonb) FROM public.uap_vids v WHERE v.tier != 3 AND v.content_type IS NOT NULL),
        'tiers', (SELECT COALESCE(jsonb_agg(DISTINCT v.tier ORDER BY v.tier), '[]'::jsonb) FROM public.uap_vids v WHERE v.tier != 3),
        'tracks', (SELECT COALESCE(jsonb_agg(DISTINCT v.track ORDER BY v.track), '[]'::jsonb) FROM public.uap_vids v WHERE v.tier != 3 AND v.track IS NOT NULL),
        'hynek_types', (SELECT COALESCE(jsonb_agg(DISTINCT a.hynek_type ORDER BY a.hynek_type), '[]'::jsonb) FROM public.uap_analysis a JOIN public.uap_vids v ON a.video_id = v.video_id WHERE v.tier != 3 AND a.hynek_type IS NOT NULL),
        'channel_names', (SELECT COALESCE(jsonb_agg(DISTINCT v.channel_name ORDER BY v.channel_name), '[]'::jsonb) FROM public.uap_vids v WHERE v.tier != 3 AND v.channel_name IS NOT NULL),
        'experience_types', (SELECT COALESCE(jsonb_agg(DISTINCT a.experience_type ORDER BY a.experience_type), '[]'::jsonb) FROM public.uap_analysis a JOIN public.uap_vids v ON a.video_id = v.video_id WHERE v.tier != 3 AND a.experience_type IS NOT NULL),
        'recurrence_patterns', (SELECT COALESCE(jsonb_agg(DISTINCT a.recurrence_pattern ORDER BY a.recurrence_pattern), '[]'::jsonb) FROM public.uap_analysis a JOIN public.uap_vids v ON a.video_id = v.video_id WHERE v.tier != 3 AND a.recurrence_pattern IS NOT NULL),
        'entity_types', (
            SELECT COALESCE(jsonb_agg(DISTINCT et ORDER BY et), '[]'::jsonb) 
            FROM public.uap_analysis a
            JOIN public.uap_vids v ON a.video_id = v.video_id,
            LATERAL jsonb_array_elements(COALESCE(a.entities, '[]'::jsonb)) AS ent,
            LATERAL (SELECT ent->>'type' AS et) sub
            WHERE v.tier != 3 AND ent->>'type' IS NOT NULL
        ),
        'evidence_type_values', (
            SELECT COALESCE(jsonb_agg(DISTINCT val ORDER BY val), '[]'::jsonb)
            FROM public.uap_analysis a
            JOIN public.uap_vids v ON a.video_id = v.video_id,
            LATERAL unnest(COALESCE(a.evidence_types, ARRAY[]::text[])) AS val
            WHERE v.tier != 3
        )
    ) INTO result;
    RETURN result;
END;
$$;

-- 2. Keyword search with phenomenology filters
CREATE OR REPLACE FUNCTION public.keyword_search_uap_videos(
    search_query TEXT,
    sort_column TEXT DEFAULT 'relevance',
    sort_direction TEXT DEFAULT 'DESC',
    page_limit INT DEFAULT 12,
    page_offset INT DEFAULT 0,
    filter_tier SMALLINT DEFAULT NULL,
    filter_track TEXT DEFAULT NULL,
    filter_channel_name TEXT[] DEFAULT NULL,
    filter_hynek_type TEXT[] DEFAULT NULL,
    filter_content_type TEXT DEFAULT NULL,
    filter_experience_type TEXT DEFAULT NULL,
    filter_entity_type TEXT DEFAULT NULL,
    filter_evidence_type TEXT DEFAULT NULL,
    filter_recurrence TEXT DEFAULT NULL
)
RETURNS TABLE (
    id BIGINT, content TEXT, start_time REAL, relevance REAL,
    video_id TEXT, url TEXT, title TEXT, thumbnail_url TEXT,
    date TIMESTAMPTZ, view_count BIGINT, channel_name TEXT,
    analysis_uap_summary TEXT, tier SMALLINT, track TEXT, total_count BIGINT
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE tsq tsquery;
BEGIN
    IF search_query IS NULL OR search_query = '' OR search_query = '*' THEN tsq := NULL;
    ELSE tsq := plainto_tsquery('english', search_query); END IF;

    IF tsq IS NOT NULL THEN
        RETURN QUERY
        WITH matching_chunks AS (
            SELECT e.id AS eid, e.video_id AS evid, e.content AS econtent, e.start_time AS estart,
                   ts_rank_cd(e.search_vector, tsq) AS erank
            FROM public.uap_punctuated_embeddings e WHERE e.search_vector @@ tsq
        ),
        filtered AS (
            SELECT mc.eid, mc.econtent, mc.estart, mc.erank, v.video_id AS vvid, v.url AS vurl,
                   v.title AS vtitle, v.thumbnail_url AS vthumb, v.date AS vdate, v.view_count AS vviews,
                   v.channel_name AS vchannel, v.analysis_uap_summary AS vsummary, v.tier AS vtier,
                   v.track AS vtrack, COUNT(*) OVER() AS vtotal
            FROM matching_chunks mc
            JOIN public.uap_vids v ON mc.evid = v.video_id
            LEFT JOIN public.uap_analysis a ON v.video_id = a.video_id
            WHERE v.tier != 3 AND v.intake_status != 'out_of_scope'
                AND (filter_tier IS NULL OR v.tier = filter_tier)
                AND (filter_track IS NULL OR v.track = filter_track)
                AND (filter_channel_name IS NULL OR v.channel_name = ANY(filter_channel_name))
                AND (filter_hynek_type IS NULL OR a.hynek_type = ANY(filter_hynek_type))
                AND (filter_content_type IS NULL OR v.content_type = filter_content_type)
                AND (filter_experience_type IS NULL OR a.experience_type = filter_experience_type)
                AND (filter_entity_type IS NULL OR a.entities @> ('[{"type":"' || filter_entity_type || '"}]')::jsonb)
                AND (filter_evidence_type IS NULL OR filter_evidence_type = ANY(a.evidence_types))
                AND (filter_recurrence IS NULL OR a.recurrence_pattern = filter_recurrence)
        )
        SELECT f.eid, f.econtent, f.estart, f.erank, f.vvid, f.vurl, f.vtitle,
               f.vthumb, f.vdate, f.vviews, f.vchannel, f.vsummary, f.vtier, f.vtrack, f.vtotal
        FROM filtered f
        ORDER BY
            CASE WHEN sort_direction = 'DESC' THEN CASE WHEN sort_column = 'relevance' THEN f.erank::float WHEN sort_column = 'viewCount' THEN f.vviews::float WHEN sort_column = 'date' THEN EXTRACT(EPOCH FROM f.vdate) END END DESC NULLS LAST,
            CASE WHEN sort_direction = 'ASC' THEN CASE WHEN sort_column = 'relevance' THEN f.erank::float WHEN sort_column = 'viewCount' THEN f.vviews::float WHEN sort_column = 'date' THEN EXTRACT(EPOCH FROM f.vdate) END END ASC NULLS LAST,
            CASE WHEN sort_direction = 'DESC' THEN CASE WHEN sort_column = 'title' THEN f.vtitle WHEN sort_column = 'channelName' THEN f.vchannel END END DESC NULLS LAST,
            CASE WHEN sort_direction = 'ASC' THEN CASE WHEN sort_column = 'title' THEN f.vtitle WHEN sort_column = 'channelName' THEN f.vchannel END END ASC NULLS LAST
        LIMIT page_limit OFFSET page_offset;
    ELSE
        RETURN QUERY
        WITH filtered AS (
            SELECT e.id AS eid, e.content AS econtent, e.start_time AS estart, 0::real AS erank,
                   v.video_id AS vvid, v.url AS vurl, v.title AS vtitle, v.thumbnail_url AS vthumb,
                   v.date AS vdate, v.view_count AS vviews, v.channel_name AS vchannel,
                   v.analysis_uap_summary AS vsummary, v.tier AS vtier, v.track AS vtrack, COUNT(*) OVER() AS vtotal
            FROM public.uap_punctuated_embeddings e
            JOIN public.uap_vids v ON e.video_id = v.video_id
            LEFT JOIN public.uap_analysis a ON v.video_id = a.video_id
            WHERE v.tier != 3 AND v.intake_status != 'out_of_scope'
                AND (filter_tier IS NULL OR v.tier = filter_tier)
                AND (filter_track IS NULL OR v.track = filter_track)
                AND (filter_channel_name IS NULL OR v.channel_name = ANY(filter_channel_name))
                AND (filter_hynek_type IS NULL OR a.hynek_type = ANY(filter_hynek_type))
                AND (filter_content_type IS NULL OR v.content_type = filter_content_type)
                AND (filter_experience_type IS NULL OR a.experience_type = filter_experience_type)
                AND (filter_entity_type IS NULL OR a.entities @> ('[{"type":"' || filter_entity_type || '"}]')::jsonb)
                AND (filter_evidence_type IS NULL OR filter_evidence_type = ANY(a.evidence_types))
                AND (filter_recurrence IS NULL OR a.recurrence_pattern = filter_recurrence)
        )
        SELECT f.eid, f.econtent, f.estart, f.erank, f.vvid, f.vurl, f.vtitle,
               f.vthumb, f.vdate, f.vviews, f.vchannel, f.vsummary, f.vtier, f.vtrack, f.vtotal
        FROM filtered f
        ORDER BY
            CASE WHEN sort_direction = 'DESC' THEN CASE WHEN sort_column = 'relevance' THEN f.erank::float WHEN sort_column = 'viewCount' THEN f.vviews::float WHEN sort_column = 'date' THEN EXTRACT(EPOCH FROM f.vdate) END END DESC NULLS LAST,
            CASE WHEN sort_direction = 'ASC' THEN CASE WHEN sort_column = 'relevance' THEN f.erank::float WHEN sort_column = 'viewCount' THEN f.vviews::float WHEN sort_column = 'date' THEN EXTRACT(EPOCH FROM f.vdate) END END ASC NULLS LAST,
            CASE WHEN sort_direction = 'DESC' THEN CASE WHEN sort_column = 'title' THEN f.vtitle WHEN sort_column = 'channelName' THEN f.vchannel END END DESC NULLS LAST,
            CASE WHEN sort_direction = 'ASC' THEN CASE WHEN sort_column = 'title' THEN f.vtitle WHEN sort_column = 'channelName' THEN f.vchannel END END ASC NULLS LAST
        LIMIT page_limit OFFSET page_offset;
    END IF;
END;
$$;

-- 3. Semantic search with phenomenology filters
CREATE OR REPLACE FUNCTION public.search_uap_punctuated_embeddings(
    query_embedding VECTOR,
    similarity_threshold FLOAT8 DEFAULT 0.50,
    sort_column TEXT DEFAULT 'similarity',
    sort_direction TEXT DEFAULT 'DESC',
    page_limit INT DEFAULT 12,
    page_offset INT DEFAULT 0,
    filter_tier SMALLINT DEFAULT NULL,
    filter_track TEXT DEFAULT NULL,
    filter_content_type TEXT DEFAULT NULL,
    filter_experience_type TEXT DEFAULT NULL,
    filter_entity_type TEXT DEFAULT NULL,
    filter_evidence_type TEXT DEFAULT NULL,
    filter_recurrence TEXT DEFAULT NULL
)
RETURNS TABLE (
    id BIGINT, content TEXT, start_time REAL, similarity FLOAT8,
    video_id TEXT, url TEXT, title TEXT, thumbnail_url TEXT,
    date TIMESTAMPTZ, view_count BIGINT, channel_name TEXT,
    analysis_uap_summary TEXT, tier SMALLINT, track TEXT
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
    RETURN QUERY
    WITH candidates AS (
        SELECT e.id AS eid, e.video_id AS evid, e.content AS econtent, e.start_time AS estart,
               (1 - (e.embedding <=> query_embedding))::FLOAT AS esim
        FROM public.uap_punctuated_embeddings e
        WHERE 1 - (e.embedding <=> query_embedding) >= similarity_threshold
        ORDER BY e.embedding <=> query_embedding LIMIT 2000
    )
    SELECT c.eid, c.econtent, c.estart, c.esim, v.video_id, v.url, v.title, v.thumbnail_url,
           v.date, v.view_count, v.channel_name, v.analysis_uap_summary, v.tier, v.track
    FROM candidates c
    JOIN public.uap_vids v ON c.evid = v.video_id
    LEFT JOIN public.uap_analysis a ON v.video_id = a.video_id
    WHERE v.tier != 3 AND v.intake_status != 'out_of_scope'
        AND (filter_tier IS NULL OR v.tier = filter_tier)
        AND (filter_track IS NULL OR v.track = filter_track)
        AND (filter_content_type IS NULL OR v.content_type = filter_content_type)
        AND (filter_experience_type IS NULL OR a.experience_type = filter_experience_type)
        AND (filter_entity_type IS NULL OR a.entities @> ('[{"type":"' || filter_entity_type || '"}]')::jsonb)
        AND (filter_evidence_type IS NULL OR filter_evidence_type = ANY(a.evidence_types))
        AND (filter_recurrence IS NULL OR a.recurrence_pattern = filter_recurrence)
    ORDER BY
        CASE WHEN sort_direction = 'DESC' THEN CASE WHEN sort_column = 'similarity' THEN c.esim WHEN sort_column = 'viewCount' THEN v.view_count::float WHEN sort_column = 'date' THEN EXTRACT(EPOCH FROM v.date) END END DESC NULLS LAST,
        CASE WHEN sort_direction = 'ASC' THEN CASE WHEN sort_column = 'similarity' THEN c.esim WHEN sort_column = 'viewCount' THEN v.view_count::float WHEN sort_column = 'date' THEN EXTRACT(EPOCH FROM v.date) END END ASC NULLS LAST
    LIMIT page_limit OFFSET page_offset;
END;
$$;
