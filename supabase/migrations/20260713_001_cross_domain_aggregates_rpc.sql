-- ============================================================
-- cross_domain_aggregates() RPC
-- ============================================================
-- Status: NOT YET APPLIED — staging/prod share one database, so this is a
-- production schema change. To be run manually by a human (Supabase SQL
-- editor or MCP apply_migration), not by an agent.
--
-- Why: /research/cross-domain aggregated nde_analysis (6.6k rows) and
-- uap_encounters (6.5k rows) in JS, but PostgREST caps every response at
-- 1,000 rows, so all stats came from a 1k-row sample. This function does the
-- aggregation in Postgres and returns one small jsonb of count maps — only
-- aggregates cross the wire, sparing the Micro tier's disk IO budget.
--
-- The app (src/lib/research/cross-domain-data.ts) calls this RPC first and
-- falls back to a paginated full scan while this migration is unapplied.
-- Raw labels are returned un-normalized; label normalization stays in
-- src/lib/research/cross-domain-normalize.ts so there is one source of truth.
--
-- The SELECT body was validated against production data on 2026-07-13:
-- nde_total=6660, uap_rows=6516, uap_video_total=3884.

CREATE OR REPLACE FUNCTION public.cross_domain_aggregates()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
WITH nde AS (
  SELECT entities, core_elements
  FROM nde_analysis
  WHERE entities IS NOT NULL
),
nde_enc AS (
  SELECT e
  FROM nde, LATERAL jsonb_array_elements(entities->'encounters') AS e
  WHERE jsonb_typeof(entities->'encounters') = 'array'
),
nde_entity AS (
  SELECT COALESCE(jsonb_object_agg(k, n), '{}'::jsonb) AS j FROM (
    SELECT e->>'entity_type' AS k, count(*) AS n
    FROM nde_enc WHERE COALESCE(e->>'entity_type', '') <> '' GROUP BY 1
  ) t
),
nde_comm AS (
  SELECT COALESCE(jsonb_object_agg(k, n), '{}'::jsonb) AS j FROM (
    SELECT e->>'communication_method' AS k, count(*) AS n
    FROM nde_enc WHERE COALESCE(e->>'communication_method', '') <> '' GROUP BY 1
  ) t
),
nde_emotion AS (
  SELECT COALESCE(jsonb_object_agg(k, n), '{}'::jsonb) AS j FROM (
    SELECT e->>'emotional_quality' AS k, count(*) AS n
    FROM nde_enc WHERE COALESCE(e->>'emotional_quality', '') <> '' GROUP BY 1
  ) t
),
nde_core AS (
  SELECT COALESCE(jsonb_object_agg(k, n), '{}'::jsonb) AS j FROM (
    SELECT elem->>'name' AS k, count(*) AS n
    FROM nde, LATERAL jsonb_array_elements(core_elements) AS elem
    WHERE jsonb_typeof(core_elements) = 'array'
      AND jsonb_typeof(elem->'present') = 'boolean'
      AND (elem->>'present')::boolean
      AND COALESCE(elem->>'name', '') <> ''
    GROUP BY 1
  ) t
),
uap AS (
  SELECT video_id, phenomenology_breakdown AS pb
  FROM uap_encounters
  WHERE phenomenology_breakdown IS NOT NULL
),
uap_enc AS (
  SELECT e
  FROM uap, LATERAL jsonb_array_elements(pb->'entities') AS e
  WHERE jsonb_typeof(pb->'entities') = 'array'
),
uap_entity AS (
  SELECT COALESCE(jsonb_object_agg(k, n), '{}'::jsonb) AS j FROM (
    SELECT e->>'entity_type' AS k, count(*) AS n
    FROM uap_enc WHERE COALESCE(e->>'entity_type', '') <> '' GROUP BY 1
  ) t
),
uap_comm AS (
  SELECT COALESCE(jsonb_object_agg(k, n), '{}'::jsonb) AS j FROM (
    SELECT e->>'communication_method' AS k, count(*) AS n
    FROM uap_enc WHERE COALESCE(e->>'communication_method', '') <> '' GROUP BY 1
  ) t
),
uap_emotion AS (
  SELECT COALESCE(jsonb_object_agg(k, n), '{}'::jsonb) AS j FROM (
    SELECT pb->>'dominant_emotion' AS k, count(*) AS n
    FROM uap WHERE COALESCE(pb->>'dominant_emotion', '') <> '' GROUP BY 1
  ) t
),
uap_physical AS (
  SELECT COALESCE(jsonb_object_agg(k, n), '{}'::jsonb) AS j FROM (
    SELECT effect.value AS k, count(*) AS n
    FROM uap, LATERAL jsonb_array_elements_text(pb->'physical_effects'->'witness_physiological') AS effect
    WHERE jsonb_typeof(pb->'physical_effects'->'witness_physiological') = 'array'
    GROUP BY 1
  ) t
),
uap_state AS (
  SELECT COALESCE(jsonb_object_agg(k, n), '{}'::jsonb) AS j FROM (
    SELECT pb->'consciousness_alteration'->>'state_of_consciousness' AS k, count(*) AS n
    FROM uap WHERE COALESCE(pb->'consciousness_alteration'->>'state_of_consciousness', '') <> '' GROUP BY 1
  ) t
),
uap_flags AS (
  SELECT
    count(*) FILTER (WHERE pb->'consciousness_alteration'->>'time_perception' = 'dilated') AS time_dilated,
    count(*) FILTER (WHERE jsonb_typeof(pb->'sensory_channels'->'kinesthetic'->'active') = 'boolean'
      AND (pb->'sensory_channels'->'kinesthetic'->>'active')::boolean
      AND jsonb_typeof(pb->'sensory_channels'->'kinesthetic'->'extraordinary') = 'boolean'
      AND (pb->'sensory_channels'->'kinesthetic'->>'extraordinary')::boolean) AS kinesthetic_extraordinary,
    count(*) FILTER (WHERE jsonb_typeof(pb->'sensory_channels'->'visual'->'active') = 'boolean'
      AND (pb->'sensory_channels'->'visual'->>'active')::boolean
      AND jsonb_typeof(pb->'sensory_channels'->'visual'->'extraordinary') = 'boolean'
      AND (pb->'sensory_channels'->'visual'->>'extraordinary')::boolean) AS visual_extraordinary,
    count(*) FILTER (WHERE jsonb_typeof(pb->'sensory_channels'->'noetic'->'active') = 'boolean'
      AND (pb->'sensory_channels'->'noetic'->>'active')::boolean) AS noetic_active,
    count(*) FILTER (WHERE jsonb_typeof(pb->'consciousness_alteration'->'ontological_shock_rating') = 'number'
      AND (pb->'consciousness_alteration'->>'ontological_shock_rating')::numeric >= 7) AS shock_high
  FROM uap
)
SELECT jsonb_build_object(
  'nde_total', (SELECT count(*) FROM nde_analysis),
  'nde_core_total', (SELECT count(*) FROM nde WHERE jsonb_typeof(core_elements) = 'array'),
  'uap_rows', (SELECT count(*) FROM uap),
  'uap_video_total', (SELECT count(DISTINCT video_id) FROM uap),
  'nde_entity_counts', (SELECT j FROM nde_entity),
  'nde_comm_counts', (SELECT j FROM nde_comm),
  'nde_emotion_counts', (SELECT j FROM nde_emotion),
  'nde_core_elements', (SELECT j FROM nde_core),
  'uap_entity_counts', (SELECT j FROM uap_entity),
  'uap_comm_counts', (SELECT j FROM uap_comm),
  'uap_emotion_counts', (SELECT j FROM uap_emotion),
  'uap_physical_counts', (SELECT j FROM uap_physical),
  'uap_state_counts', (SELECT j FROM uap_state),
  'uap_time_dilated', (SELECT time_dilated FROM uap_flags),
  'uap_kinesthetic_extraordinary', (SELECT kinesthetic_extraordinary FROM uap_flags),
  'uap_visual_extraordinary', (SELECT visual_extraordinary FROM uap_flags),
  'uap_noetic_active', (SELECT noetic_active FROM uap_flags),
  'uap_shock_high', (SELECT shock_high FROM uap_flags)
);
$$;

-- Server-only: called with the service key from Next.js. Keep the heavy scan
-- out of reach of anonymous PostgREST clients.
REVOKE EXECUTE ON FUNCTION public.cross_domain_aggregates() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cross_domain_aggregates() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cross_domain_aggregates() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cross_domain_aggregates() TO service_role;
