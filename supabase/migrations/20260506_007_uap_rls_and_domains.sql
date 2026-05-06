-- Migration 007: RLS policies for all new UAP tables + domain columns on shared tables
-- Pattern: public SELECT, service_role ALL (matches NDE RLS)

-- ═══════════════════════════════════════════════════════════════
-- RLS for uap_analysis
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE uap_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uap_analysis_public_read"
  ON uap_analysis FOR SELECT
  USING (true);

CREATE POLICY "uap_analysis_service_write"
  ON uap_analysis FOR ALL
  USING (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════════
-- RLS for uap_channels
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE uap_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uap_channels_public_read"
  ON uap_channels FOR SELECT
  USING (true);

CREATE POLICY "uap_channels_service_write"
  ON uap_channels FOR ALL
  USING (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════════
-- RLS for uap_contactee_profiles
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE uap_contactee_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uap_contactee_profiles_public_read"
  ON uap_contactee_profiles FOR SELECT
  USING (true);

CREATE POLICY "uap_contactee_profiles_service_write"
  ON uap_contactee_profiles FOR ALL
  USING (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════════
-- RLS for uap_punctuated_embeddings
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE uap_punctuated_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uap_punct_embeddings_public_read"
  ON uap_punctuated_embeddings FOR SELECT
  USING (true);

CREATE POLICY "uap_punct_embeddings_service_write"
  ON uap_punctuated_embeddings FOR ALL
  USING (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════════
-- RLS for uap_chatbot_chunks
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE uap_chatbot_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uap_chatbot_chunks_public_read"
  ON uap_chatbot_chunks FOR SELECT
  USING (true);

CREATE POLICY "uap_chatbot_chunks_service_write"
  ON uap_chatbot_chunks FOR ALL
  USING (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════════
-- Domain columns on shared tables
-- Default 'nde' ensures existing NDE data is unaffected
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE favorites
  ADD COLUMN IF NOT EXISTS domain TEXT DEFAULT 'nde';

ALTER TABLE saved_searches
  ADD COLUMN IF NOT EXISTS domain TEXT DEFAULT 'nde';
