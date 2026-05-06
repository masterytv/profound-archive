-- Migration 006: Create uap_chatbot_chunks table
-- Stores chat-sized transcript chunks with embeddings for RAG chat retrieval.
-- Smaller chunks (256 tokens) optimized for chat context windows.

CREATE TABLE IF NOT EXISTS uap_chatbot_chunks (
  id BIGSERIAL PRIMARY KEY,
  video_id TEXT REFERENCES uap_vids(video_id),
  content TEXT,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- HNSW index for vector similarity search in chat
CREATE INDEX IF NOT EXISTS idx_uap_chatbot_vec ON uap_chatbot_chunks
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- B-tree index for video_id lookups
CREATE INDEX IF NOT EXISTS idx_uap_chatbot_video ON uap_chatbot_chunks(video_id);
