-- Migration 007: Add scanner columns to uap_channels
-- Enables automated discovery: scanner toggle, last scan timestamp, uploads playlist ID.

ALTER TABLE uap_channels
  ADD COLUMN IF NOT EXISTS scanner_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS uploads_playlist_id TEXT;

CREATE INDEX IF NOT EXISTS idx_uap_channels_scanner
  ON uap_channels(scanner_enabled, last_scanned_at);
