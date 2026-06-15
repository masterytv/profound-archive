-- Add "Date Added (PP)" sort option to the UAP video explore grid.
--
-- Two minimal, backward-compatible changes to uap_video_explore_grid:
--   1. Expose v.created_at (when the row was added to Project Profound) in the
--      result set so it can be used as an ORDER BY column.
--   2. Add a 'added' branch to the sort whitelist -> ORDER BY created_at.
--
-- Everything else is identical to the live function (captured via
-- pg_get_functiondef on 2026-06-15). Existing callers are unaffected: the new
-- sort value is opt-in and the extra returned column is ignored by the page.
--
-- SHARED DATABASE: staging and production share one DB, so running this is a
-- production change. Run deliberately (Supabase MCP apply_migration or console).

CREATE OR REPLACE FUNCTION public.uap_video_explore_grid(
  p_query text DEFAULT ''::text,
  p_tier integer DEFAULT 0,
  p_content_types text[] DEFAULT '{}'::text[],
  p_experience_types text[] DEFAULT '{}'::text[],
  p_tones text[] DEFAULT '{}'::text[],
  p_min_evidence integer DEFAULT 0,
  p_min_contact_depth integer DEFAULT 0,
  p_min_transformation integer DEFAULT 0,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 12,
  p_sort text DEFAULT 'date'::text,
  p_direction text DEFAULT 'desc'::text,
  p_video_tones text[] DEFAULT '{}'::text[],
  p_hynek_types text[] DEFAULT '{}'::text[],
  p_min_intelligence integer DEFAULT 0,
  p_has_oath boolean DEFAULT NULL::boolean,
  p_has_psi boolean DEFAULT NULL::boolean,
  p_decade text DEFAULT ''::text,
  p_channel text DEFAULT ''::text,
  p_recurrence text DEFAULT ''::text,
  p_entity_types text[] DEFAULT '{}'::text[],
  p_craft_shapes text[] DEFAULT '{}'::text[],
  p_five_observables text[] DEFAULT '{}'::text[],
  p_primary_topics text[] DEFAULT '{}'::text[],
  p_has_craft boolean DEFAULT NULL::boolean,
  p_has_biologics boolean DEFAULT NULL::boolean,
  p_has_crash boolean DEFAULT NULL::boolean,
  p_min_credibility integer DEFAULT 0
)
 RETURNS SETOF json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_offset int;
  v_order_col text;
  v_order_dir text;
  v_decade_start int;
  v_decade_end int;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  IF p_direction NOT IN ('asc', 'desc') THEN
    v_order_dir := 'desc';
  ELSE
    v_order_dir := p_direction;
  END IF;

  -- Decade now refers to encounter EVENT year
  IF p_decade != '' THEN
    v_decade_start := CASE p_decade
      WHEN '2020s' THEN 2020
      WHEN '2010s' THEN 2010
      WHEN '2000s' THEN 2000
      WHEN '1990s' THEN 1990
      WHEN '1980s' THEN 1980
      WHEN '1970s' THEN 1970
      WHEN '1960s' THEN 1960
      WHEN '1950s' THEN 1950
      WHEN '1940s' THEN 1940
      WHEN 'pre-1940' THEN 0
      ELSE 0
    END;
    v_decade_end := CASE p_decade
      WHEN '2020s' THEN 2029
      WHEN '2010s' THEN 2019
      WHEN '2000s' THEN 2009
      WHEN '1990s' THEN 1999
      WHEN '1980s' THEN 1989
      WHEN '1970s' THEN 1979
      WHEN '1960s' THEN 1969
      WHEN '1950s' THEN 1959
      WHEN '1940s' THEN 1949
      WHEN 'pre-1940' THEN 1939
      ELSE 9999
    END;
  ELSE
    v_decade_start := 0;
    v_decade_end := 9999;
  END IF;

  v_order_col := CASE p_sort
    WHEN 'view_count' THEN 'view_count'
    WHEN 'date' THEN 'date'
    WHEN 'added' THEN 'created_at'          -- NEW: Date Added (PP)
    WHEN 'title' THEN 'title'
    WHEN 'channel_name' THEN 'channel_name'
    WHEN 'evidence_score' THEN 'evidence_score'
    WHEN 'contact_depth_score' THEN 'contact_depth_score'
    WHEN 'transformation_score' THEN 'transformation_score'
    WHEN 'intelligence_value' THEN 'intelligence_value'
    ELSE 'date'
  END;

  RETURN QUERY EXECUTE format(
    $SQL$
    WITH filtered AS (
      SELECT
        v.video_id, v.title, v.thumbnail_url, v.channel_name, v.date,
        v.created_at,                       -- NEW: exposed for 'added' sort
        v.view_count, v.tier, v.track, v.content_type, v.experiencer_name,
        a.evidence_score, a.contact_depth_score, a.transformation_score,
        a.experience_type, a.overall_tone, a.hynek_type,
        s.video_tone, s.intelligence_value, s.has_psi_content,
        s.has_under_oath_claims, s.dominant_entity_type,
        LEFT(v.analysis_uap_summary, 200) AS summary_snippet
      FROM uap_vids v
      LEFT JOIN uap_analysis a ON v.video_id = a.video_id
      LEFT JOIN uap_video_stats s ON v.video_id = s.video_id
      WHERE v.intake_status = 'complete'
        AND v.tier IN (1, 2)
        AND (
          $1 = ''
          OR v.title ILIKE '%%' || $1 || '%%'
          OR v.channel_name ILIKE '%%' || $1 || '%%'
          OR v.experiencer_name ILIKE '%%' || $1 || '%%'
        )
        AND ($2 = 0 OR v.tier = $2)
        AND (cardinality($3::text[]) = 0 OR v.content_type = ANY($3::text[]))
        AND (cardinality($4::text[]) = 0 OR a.experience_type = ANY($4::text[]))
        AND (cardinality($5::text[]) = 0 OR a.overall_tone = ANY($5::text[]))
        AND ($6 = 0 OR COALESCE(a.evidence_score, 0) >= $6)
        AND ($7 = 0 OR COALESCE(a.contact_depth_score, 0) >= $7)
        AND ($8 = 0 OR COALESCE(a.transformation_score, 0) >= $8)
        AND (cardinality($11::text[]) = 0 OR s.video_tone = ANY($11::text[]))
        AND (
          cardinality($12::text[]) = 0
          OR EXISTS (
            SELECT 1 FROM uap_encounters e
            WHERE e.video_id = v.video_id
            AND e.phenomenology_breakdown->>'hynek_classification' = ANY($12::text[])
          )
        )
        AND ($13 = 0 OR COALESCE(s.intelligence_value, 0) >= $13)
        AND ($14::boolean IS NULL OR s.has_under_oath_claims = $14)
        AND ($15::boolean IS NULL OR s.has_psi_content = $15)
        -- Decade filter now uses encounter event_year
        AND (
          $16 = 0 AND $17 = 9999
          OR EXISTS (
            SELECT 1 FROM uap_encounters e
            WHERE e.video_id = v.video_id
            AND e.encounter_context->>'event_year' IS NOT NULL
            AND (e.encounter_context->>'event_year')::int BETWEEN $16 AND $17
          )
        )
        AND ($18 = '' OR v.channel_name ILIKE '%%' || $18 || '%%')
        AND (
          $19 = ''
          OR EXISTS (
            SELECT 1 FROM uap_encounters e
            WHERE e.video_id = v.video_id
            AND e.phenomenology_breakdown->>'recurrence_pattern' = $19
          )
        )
        AND (
          cardinality($20::text[]) = 0
          OR EXISTS (
            SELECT 1 FROM uap_encounters e
            WHERE e.video_id = v.video_id
            AND e.phenomenology_breakdown IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM jsonb_array_elements(
                COALESCE(e.phenomenology_breakdown->'entities', '[]'::jsonb)
              ) ent
              WHERE ent->>'entity_type' = ANY($20::text[])
            )
          )
        )
        AND (
          cardinality($21::text[]) = 0
          OR EXISTS (
            SELECT 1 FROM uap_encounters e
            WHERE e.video_id = v.video_id
            AND e.phenomenology_breakdown IS NOT NULL
            AND e.phenomenology_breakdown->'craft_observation'->>'shape' = ANY($21::text[])
          )
        )
        AND (
          cardinality($22::text[]) = 0
          OR EXISTS (
            SELECT 1 FROM uap_encounters e
            WHERE e.video_id = v.video_id
            AND e.phenomenology_breakdown IS NOT NULL
            AND e.phenomenology_breakdown->'craft_observation'->'five_observables' IS NOT NULL
            AND (
              SELECT bool_or(
                e.phenomenology_breakdown->'craft_observation'->'five_observables'->>obs = 'true'
              )
              FROM unnest($22::text[]) obs
            )
          )
        )
        AND (
          cardinality($23::text[]) = 0
          OR a.program_intel_breakdown->>'primary_topic' = ANY($23::text[])
        )
        AND ($24::boolean IS NULL OR s.has_craft_observation = $24)
        AND ($25::boolean IS NULL OR s.has_biologics_claim = $25)
        AND ($26::boolean IS NULL OR s.has_crash_retrieval_claim = $26)
        -- Min credibility filter: avg credibility of persons in this video >= threshold
        AND (
          $27 = 0
          OR EXISTS (
            SELECT 1
            FROM (
              SELECT ROUND(AVG((p->>'credibility_score')::numeric))::int as avg_cred
              FROM jsonb_array_elements(a.program_intel_breakdown->'persons') p
              WHERE (p->>'credibility_score') IS NOT NULL AND (p->>'credibility_score')::int > 0
            ) cred
            WHERE cred.avg_cred >= $27
          )
        )
    ),
    counted AS (
      SELECT *, count(*) OVER() AS total_count
      FROM filtered
    )
    SELECT row_to_json(counted.*) FROM counted
    ORDER BY %I %s NULLS LAST
    LIMIT $9 OFFSET $10
    $SQL$,
    v_order_col, v_order_dir
  )
  USING
    p_query,             -- $1
    p_tier,              -- $2
    p_content_types,     -- $3
    p_experience_types,  -- $4
    p_tones,             -- $5
    p_min_evidence,      -- $6
    p_min_contact_depth, -- $7
    p_min_transformation,-- $8
    p_page_size,         -- $9
    v_offset,            -- $10
    p_video_tones,       -- $11
    p_hynek_types,       -- $12
    p_min_intelligence,  -- $13
    p_has_oath,          -- $14
    p_has_psi,           -- $15
    v_decade_start,      -- $16
    v_decade_end,        -- $17
    p_channel,           -- $18
    p_recurrence,        -- $19
    p_entity_types,      -- $20
    p_craft_shapes,      -- $21
    p_five_observables,  -- $22
    p_primary_topics,    -- $23
    p_has_craft,         -- $24
    p_has_biologics,     -- $25
    p_has_crash,         -- $26
    p_min_credibility;   -- $27
END;
$function$;
