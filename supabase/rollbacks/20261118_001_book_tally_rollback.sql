-- Rollback for 20261118_001_book_tally.sql.
-- DESTRUCTIVE: deletes every bt_* research row (runs, raw responses, judgments,
-- decisions, stance answers, gold marks). Touches only bt_* objects; existing
-- tables are untouched.
-- Export anything worth keeping first.

BEGIN;
DROP VIEW IF EXISTS public.bt_final_stances;
DROP VIEW IF EXISTS public.bt_unmapped_nde_videos;
DROP VIEW IF EXISTS public.bt_effective_person_map;
DROP VIEW IF EXISTS public.bt_person_canonical;
DROP VIEW IF EXISTS public.bt_latest_merge_decision;
DROP VIEW IF EXISTS public.bt_latest_link_decision;

DROP TABLE IF EXISTS public.bt_gold_marks;
DROP TABLE IF EXISTS public.bt_stance_answers;
DROP TABLE IF EXISTS public.bt_merge_decisions;
DROP TABLE IF EXISTS public.bt_merge_judgments;
DROP TABLE IF EXISTS public.bt_merge_candidates;
DROP TABLE IF EXISTS public.bt_link_decisions;
DROP TABLE IF EXISTS public.bt_person_links;
DROP TABLE IF EXISTS public.bt_name_extractions;
DROP TABLE IF EXISTS public.bt_raw_responses;
DROP TABLE IF EXISTS public.bt_prompts;
DROP TABLE IF EXISTS public.bt_runs;

DROP FUNCTION IF EXISTS public.bt_runs_guard_update();
DROP FUNCTION IF EXISTS public.bt_block_mutation();
COMMIT;
