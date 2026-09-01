# External API Integrations

> This document lists third-party services integrated into the project.

## OpenAI
- **Service:** OpenAI API (Models & Embeddings)
- **Purpose:** Generates embeddings for search/RAG and powers the Compassionate Chatbot.
- **Auth:** API Key (`OPENAI_API_KEY` env var).
- **Models Used:**
  - Chat: `gpt-5-chat-latest` (override with `COMPASSIONATE_CHAT_MODEL`), retried once on
    `gpt-4o-mini` (`COMPASSIONATE_CHAT_FALLBACK_MODEL`) if the primary call fails
  - Embeddings: `text-embedding-3-small`
- **Key Locations:**
  - `src/app/api/chat-compassionate/route.ts`

## Supabase
- **Service:** Supabase (Database, Auth, Vector Store)
- **Purpose:** Primary backend.
- **Auth:**
  - Public: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Admin/Server: `SUPABASE_SERVICE_KEY` (Used in API routes for privileged actions).
- **Key Locations:**
  - `src/lib/supabase/client.ts`
  - `src/lib/supabase/server.ts`
