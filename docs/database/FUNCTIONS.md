# Database Functions

> This document lists the custom PostgreSQL functions and stored procedures available in the database.
> Source: `src/lib/supabase/database.types.ts`

## Semantic Search & Matching

### `nde_chatbot_match`
- **Purpose:** Finds relevant video chunks for the chatbot using vector similarity.
- **Args:**
  - `query_embedding` (vector): The embedding of the user's chat input.
  - `match_count` (int): Number of chunks to return.
  - `filter` (json): Metadata filters.
- **Returns:** List of text chunks with metadata and similarity scores.

### `match_nde_moments_semantic`
- **Purpose:** Semantic search for NDE moments.
- **Args:** `query_embedding`, `p_match_threshold`, `p_page_number`, `p_page_size`.
- **Returns:** Paginated video moments with similarity scores.

### `search_nde_moments` / `_paginated` / `_optimized`
- **Purpose:** variations of search logic to find specific moments in NDE videos based on text/embeddings.

### `uap_semantic_search`
- **Purpose:** Similar to `nde_chatbot_match` but for the UAP (UFO) video collection.

## Utility Functions

### `clean_subtitles` / `clean_subtitle_data`
- **Purpose:** Cleans raw subtitle JSON/text to remove timestamps/artifacts for better embedding generation.
- **Input:** Raw JSON/Text.
- **Output:** Cleaned Text.

### `get_all_subtitles_text`
- **Purpose:** Concatenates all subtitle lines into a single string.

### `analyze_term_in_clear_ndes`
- **Purpose:** Statistical analysis tool. Calculate what percentage of "Clear NDEs" mention a specific term.
- **Args:** `p_search_term` (string).
- **Returns:** Stats object (`percentage_with_term`, `total_term_mentions`, etc.).

### `debug_reverse_search`
- **Purpose:** Debugging tool to check what a specific subtitle ID resolves to.

### `populate_nde_vids_tsvector_batch`
- **Purpose:** Maintenance function to update Full Text Search (FTS) vectors in batches.

## Batch Processing Functions

### `get_unanalyzed_greyson_videos`
- **Purpose:** Returns `clear_nde` videos with transcripts that have NOT yet been analyzed with the Greyson Scale. Uses a LEFT JOIN to efficiently bypass the Supabase client's default 1,000-row limit.
- **Args:** `batch_limit` (int, default 3): Number of videos to return.
- **Returns:** List of `{ videoId, title, subtitles_punctuated }`.
- **Called by:** `/api/run-greyson-batch`

## Usage
Call these functions via the Supabase client:
```typescript
const { data, error } = await supabase.rpc('nde_chatbot_match', {
  query_embedding: embedding,
  match_count: 5,
  filter: {}
});
```
