-- Migration 010: Create uap_jobs
-- Async job tracking for single-video intake from admin UI.

CREATE TABLE IF NOT EXISTS uap_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_url TEXT NOT NULL,
  video_title TEXT,
  video_id TEXT,
  status TEXT NOT NULL DEFAULT 'processing',
  error_message TEXT,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uap_jobs_status ON uap_jobs(status);
