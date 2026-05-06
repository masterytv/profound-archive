-- Migration 009: Create uap_scan_runs
-- Operational log for scanner ticks and discovery runs.

CREATE TABLE IF NOT EXISTS uap_scan_runs (
  id SERIAL PRIMARY KEY,
  channel_id TEXT,
  run_type TEXT NOT NULL DEFAULT 'tick',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  videos_discovered INTEGER DEFAULT 0,
  videos_processed INTEGER DEFAULT 0,
  videos_accepted INTEGER DEFAULT 0,
  videos_rejected INTEGER DEFAULT 0,
  videos_failed INTEGER DEFAULT 0,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_uap_scan_runs_started ON uap_scan_runs(started_at DESC);
