-- Add enrichment columns to uap_contactee_profiles
-- Mirrors the data-derivation fields from NDE experiencer_profiles
-- that the enrichment pipeline (contactee-profile.ts) will populate.

ALTER TABLE uap_contactee_profiles
  ADD COLUMN IF NOT EXISTS highlight_quote TEXT,
  ADD COLUMN IF NOT EXISTS highlight_quote_source TEXT,
  ADD COLUMN IF NOT EXISTS channel_appearances JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS first_shared_year INTEGER,
  ADD COLUMN IF NOT EXISTS total_views BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contribution_label TEXT;
