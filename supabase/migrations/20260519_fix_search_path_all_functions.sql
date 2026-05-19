-- Fix: Restore search_path on all public functions
-- Date: 2026-05-19
-- 
-- Root Cause: Sprint 12 security audit set search_path="" on ALL 67 functions.
-- This broke every RPC because none of the SQL uses schema-qualified table names
-- (e.g., public.uap_vids). Setting search_path="" means the function can't find
-- ANY tables, causing "relation does not exist" errors.
--
-- Fix: Set search_path = 'public' on all affected functions.
-- This is still secure — it prevents search_path injection attacks while
-- allowing the functions to resolve table names in the public schema.
--
-- Affected pages: /uap/video-explore (0 results), /uap/channels (0 results),
-- NDE search, NDE explore, chatbot, and all other RPC-backed pages.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
    AND p.proconfig @> ARRAY['search_path=""']
  LOOP
    EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = ''public''', r.proname, r.args);
  END LOOP;
END $$;
