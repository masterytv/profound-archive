# Channel Removal SOP

Standard Operating Procedure for removing a YouTube channel from all search results and displays.

## Key Principle

> **Never delete video records from `nde_vids`.** Keep them tagged `isNde = 'not_nde'`. This prevents re-ingestion during future video imports — the ingest pipeline skips videos that already exist in the database. Deleting records would cause them to be re-scraped and re-analyzed needlessly.

Only delete **child data** (embeddings, chatbot chunks) to reclaim storage. The parent `nde_vids` row stays as a permanent exclusion marker.

## Prerequisites
- Channel username (e.g. `@ChannelName`)
- Supabase access (via MCP or dashboard)

## Step 1: Audit the Channel

```sql
SELECT "channelUsername", "channelName", "isNde", COUNT(*) as video_count 
FROM nde_vids 
WHERE "channelUsername" = '@ChannelName'
GROUP BY "channelUsername", "channelName", "isNde";
```

## Step 2: Mark Videos as `not_nde`

```sql
UPDATE nde_vids 
SET "isNde" = 'not_nde', 
    "isNdeJustification" = 'Channel blocked — not genuine NDE content'
WHERE "channelUsername" = '@ChannelName' 
  AND "isNde" != 'not_nde';
```

## Step 3: Delete Child Data Only (order matters)

```sql
-- 3a: Delete analysis rows (if any)
DELETE FROM nde_analysis 
WHERE video_id IN (SELECT "videoId" FROM nde_vids WHERE "channelUsername" = '@ChannelName');

-- 3b: Delete chatbot chunks
DELETE FROM nde_chatbot_chunks 
WHERE video_id IN (SELECT "videoId" FROM nde_vids WHERE "channelUsername" = '@ChannelName');

-- 3c: Delete embeddings
DELETE FROM nde_punctuated_embeddings 
WHERE video_id IN (SELECT "videoId" FROM nde_vids WHERE "channelUsername" = '@ChannelName');
```

**Do NOT delete from `nde_vids`.** Those rows stay permanently.

## Step 4: Verify

```sql
-- Should show all videos still present but tagged not_nde
SELECT COUNT(*), "isNde" FROM nde_vids 
WHERE "channelUsername" = '@ChannelName' 
GROUP BY "isNde";

-- Should show 0 child data remaining
SELECT 
  (SELECT COUNT(*) FROM nde_analysis WHERE video_id IN 
    (SELECT "videoId" FROM nde_vids WHERE "channelUsername" = '@ChannelName')) as analysis_rows,
  (SELECT COUNT(*) FROM nde_chatbot_chunks WHERE video_id IN 
    (SELECT "videoId" FROM nde_vids WHERE "channelUsername" = '@ChannelName')) as chunk_rows,
  (SELECT COUNT(*) FROM nde_punctuated_embeddings WHERE video_id IN 
    (SELECT "videoId" FROM nde_vids WHERE "channelUsername" = '@ChannelName')) as embedding_rows;
```

## Why This Works

| Layer | Mechanism |
|-------|-----------|
| **Supabase RPCs** | `search_punctuated_embeddings` and `nde_chatbot_match` filter by `isNde = 'clear_nde'` |
| **Homepage** | Veridical column uses `.eq("isNde", "clear_nde")`. Greyson/Transformation query `nde_analysis` (no rows = no display) |
| **Explorer Pages** | Veridical uses `.eq("isNde", "clear_nde")`. Greyson queries `nde_analysis` directly |
| **Keyword Search** | Typesense `filter_by` includes `isNde:!=not_nde` |
| **Future Ingests** | Video already exists in `nde_vids` → skipped by ingest pipeline |

## Channels Removed

| Channel | Date | Videos Blocked |
|---------|------|---------------|
| `@NearDeathExperience-US` | 2026-02-17 | 24 (rows deleted — pre-SOP) |
