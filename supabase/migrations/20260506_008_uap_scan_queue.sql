-- Migration 008: Create uap_scan_queue
-- Queues videos discovered by the scanner before intake processing.

CREATE TABLE IF NOT EXISTS uap_scan_queue (
  id SERIAL PRIMARY KEY,
  video_url TEXT NOT NULL,
  video_id TEXT,
  channel_id TEXT,
  title TEXT,
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  intake_result TEXT,
  error TEXT,
  UNIQUE(video_url)
);

CREATE INDEX IF NOT EXISTS idx_uap_scan_queue_status ON uap_scan_queue(status);
CREATE INDEX IF NOT EXISTS idx_uap_scan_queue_channel ON uap_scan_queue(channel_id, status);
