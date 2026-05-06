-- Migration 005: Create uap_punctuated_embeddings table
-- Stores punctuated transcript chunks with vector embeddings for semantic search.
-- Separate from uap_embeddings (raw/unpunctuated) per ADR-002.
-- Includes search_vector (tsvector) for keyword search, matching NDE pattern.

CREATE TABLE IF NOT EXISTS uap_punctuated_embeddings (
  id BIGSERIAL PRIMARY KEY,
  video_id TEXT REFERENCES uap_vids(video_id),
  content TEXT,
  embedding vector(1536),
  start_time REAL,
  search_vector tsvector,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- HNSW index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_uap_punct_embed_vec ON uap_punctuated_embeddings
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- B-tree index for video_id lookups
CREATE INDEX IF NOT EXISTS idx_uap_punct_embed_video ON uap_punctuated_embeddings(video_id);

-- GIN index for full-text keyword search (per LEARNINGS.md: PL/pgSQL + GIN)
CREATE INDEX IF NOT EXISTS idx_uap_punct_embed_fts ON uap_punctuated_embeddings USING gin(search_vector);

-- Auto-generate search_vector from content on INSERT/UPDATE
CREATE OR REPLACE FUNCTION uap_punct_embed_search_vector_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_uap_punct_embed_search_vector ON uap_punctuated_embeddings;
CREATE TRIGGER trg_uap_punct_embed_search_vector
  BEFORE INSERT OR UPDATE OF content ON uap_punctuated_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION uap_punct_embed_search_vector_trigger();
