-- Backfill Script: Copy channel metadata from videos that have channelId to those that don't
-- Run date: 2026-02-17
-- Result: 1,369 of 1,397 null channelIds backfilled. 28 remain (no matching channelName).
-- Fields backfilled: channelId, channelUrl, channelUsername, numberOfSubscribers

-- The CTE creates a lookup from channelName -> channel fields using DISTINCT ON
-- Then we UPDATE only rows where channelId IS NULL and channelName matches

-- Example: Split into batches of ~11 channels to avoid Supabase API timeout
-- Batch template:
WITH channel_map AS (
  SELECT DISTINCT ON ("channelName") 
    "channelName", "channelId", "channelUrl", "channelUsername", "numberOfSubscribers"
  FROM nde_vids
  WHERE "channelId" IS NOT NULL AND "channelName" IS NOT NULL
  ORDER BY "channelName", "videoId"
)
UPDATE nde_vids v
SET 
  "channelId" = COALESCE(v."channelId", m."channelId"),
  "channelUrl" = COALESCE(v."channelUrl", m."channelUrl"),
  "channelUsername" = COALESCE(v."channelUsername", m."channelUsername"),
  "numberOfSubscribers" = COALESCE(v."numberOfSubscribers", m."numberOfSubscribers")
FROM channel_map m
WHERE v."channelName" = m."channelName"
  AND v."channelId" IS NULL
  AND v."channelName" IN (
    -- Replace with batch of channel names
    'Channel Name 1', 'Channel Name 2'
  );
