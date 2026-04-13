# Technical Debt Tracker

Known issues that are accepted for now but should be addressed in a future sprint.

---

## TD-001: Re-chunked rows have inaccurate timestamps
- **Added:** 2026-04-13
- **Severity:** Medium
- **Affected:** ~43,663 rows in `nde_punctuated_embeddings` where `embedding IS NULL`
- **Description:** The SQL re-chunking migration (2026-04-13) split oversized content into ~500-char chunks but could not interpolate per-chunk `start_time` values. All sub-chunks inherited the parent row's single timestamp. For ~227 chunks across 32 videos, this is `start_time = 0`. For the rest, it's the correct *region* but not the exact position.
- **Impact:** Users clicking a search result timestamp may land at the wrong point in the video. The content itself is correct.
- **Fix:** Re-run native intake (`generateEmbeddings` in `src/lib/pipeline/intake.ts`) on the ~350 affected videos. This would re-download transcripts with per-segment timestamps, re-chunk correctly, and regenerate embeddings. Query to find affected videos:
  ```sql
  SELECT DISTINCT video_id FROM nde_punctuated_embeddings WHERE embedding IS NULL;
  ```
- **Bonus:** This would also restore the `embedding` (vector) column, improving semantic/vector search quality for these videos.

## TD-002: Re-chunked rows lack vector embeddings
- **Added:** 2026-04-13
- **Severity:** Low
- **Affected:** Same ~43,663 rows (`embedding IS NULL`)
- **Description:** The SQL re-chunking intentionally set `embedding = NULL` to avoid API costs. Keyword FTS search works because the trigger auto-populates `search_vector`, but these chunks are invisible to semantic/vector similarity search.
- **Impact:** Vector search may miss relevant content from ~350 legacy-ingested videos. Keyword search is unaffected.
- **Fix:** Same as TD-001 — re-run native intake on affected videos.
