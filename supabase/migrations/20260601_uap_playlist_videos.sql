-- Junction table mapping YouTube playlist membership to video IDs
-- Populated during playlist discovery scans
-- Enables accurate processed/archive counts for playlists regardless of
-- how the video entered the system (channel, backfill, or playlist source)

CREATE TABLE IF NOT EXISTS uap_playlist_videos (
  playlist_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (playlist_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_uap_playlist_videos_video ON uap_playlist_videos(video_id);

COMMENT ON TABLE uap_playlist_videos IS 'Junction table mapping YouTube playlist membership to video IDs. Populated during playlist discovery. Used to compute accurate processed/archive counts for playlists regardless of how the video entered the system.';

-- RPC to get playlist stats in a single query (replaces 75 individual queries)
CREATE OR REPLACE FUNCTION get_uap_playlist_video_stats()
RETURNS TABLE (
  playlist_id TEXT,
  pending_count BIGINT,
  processed_count BIGINT,
  in_archive_count BIGINT
)
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
  SELECT
    pv.playlist_id,
    COALESCE(SUM(CASE WHEN sq.status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_count,
    COALESCE(SUM(CASE WHEN sq.status IS NOT NULL AND sq.status != 'pending' THEN 1 ELSE 0 END), 0) AS processed_count,
    COALESCE(SUM(CASE WHEN sq.intake_result = 'complete' THEN 1 ELSE 0 END), 0) AS in_archive_count
  FROM uap_playlist_videos pv
  LEFT JOIN uap_scan_queue sq ON sq.video_id = pv.video_id
  GROUP BY pv.playlist_id;
$$;
