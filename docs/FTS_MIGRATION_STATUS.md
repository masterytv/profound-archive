# Full-Text Search Migration: Typesense → PostgreSQL

> **Status:** ✅ COMPLETE — Migrated April 4, 2026

## Summary

Full-text search has been migrated from a self-hosted Typesense server to native PostgreSQL `tsvector` + GIN index on Supabase. All 891,421 rows in `nde_punctuated_embeddings` now have a populated `search_vector` column with a GIN index for fast lookups.

## What Changed

### Schema
- Added `search_vector tsvector` column to `public.nde_punctuated_embeddings`
- Created trigger `nde_punctuated_embeddings_search_vector_trigger` to auto-populate on INSERT/UPDATE
- Content truncated to 10,000 chars for FTS indexing: `LEFT(content, 10000)`
- GIN index `idx_nde_pe_search_vector` created on `search_vector`

### RPC Functions (Production)
- `keyword_search_videos(search_query, sort_column, sort_direction, page_limit, page_offset, filter_*)` — Main search RPC
- `keyword_search_facets()` — Facet/filter counts for sidebar

### API Routes
- `/api/search3/route.ts` — Calls Supabase RPCs (active)
- `/api/search/` and `/api/search2/` — Deleted (were Typesense routes)
- `/search` and `/search2` — Redirect to `/search3`

### Removed
- `typesense` npm package
- Typesense env vars from `apphosting.yaml` and `.env.local`
- Legacy Typesense scripts: `scripts/index-data.ts`, `scripts/index-data.js`, `scripts/check_schema.ts`
- `backfill-search-vector` Edge Function
- Backfill temp objects: `backfill_search_vector_batch()`, `backfill_sv_cron_batch()`, `_backfill_progress` table, `idx_nde_pe_null_search_vector` partial index

### Decommissioned
- Typesense server at `5.161.239.93` (Hetzner/Coolify) — shut down

## Backfill Details (Historical)

- **Total rows:** 891,421
- **Method:** pg_cron job running `backfill_sv_cron_batch()` in range-based batches
- **Duration:** ~36 hours (bottlenecked by Micro instance IO budget, resolved by upgrading to XL)
- **Completed:** April 4, 2026 ~1:00 AM ET

## Supabase Project
- **Project ID:** `vnycavclrndjwmpaugju`
