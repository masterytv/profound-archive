-- Sprint 8, Story 8.1.1: Add priority + source tracking to uap_scan_queue
-- Priority: 1 = highest (playlists, manual), 5 = default (channels)
-- Source tracking: trace where each video was discovered from

ALTER TABLE public.uap_scan_queue
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'channel',
  ADD COLUMN IF NOT EXISTS source_id TEXT;

-- Composite index for priority-aware queue processing
CREATE INDEX IF NOT EXISTS idx_uap_scan_queue_priority_status
  ON public.uap_scan_queue (status, priority ASC, created_at ASC)
  WHERE status = 'pending';

COMMENT ON COLUMN public.uap_scan_queue.priority IS '1=highest (manual/playlist), 5=default (channel). Lower number = processed first.';
COMMENT ON COLUMN public.uap_scan_queue.source_type IS 'Origin: channel, playlist, keyword_monitor, manual';
COMMENT ON COLUMN public.uap_scan_queue.source_id IS 'ID of the source (channel_id, playlist_id, keyword_monitor_id)';
