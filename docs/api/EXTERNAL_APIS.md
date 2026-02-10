# External API Integrations

> This document lists third-party services integrated into the project.

## OpenAI
- **Service:** OpenAI API (Models & Embeddings)
- **Purpose:** Generates embeddings for search/RAG and powers the Compassionate Chatbot.
- **Auth:** API Key (`OPENAI_API_KEY` env var).
- **Models Used:**
  - Chat: `gpt-5-chat-latest`
  - Embeddings: `text-embedding-3-small`
- **Key Locations:**
  - `src/app/api/chat-compassionate/route.ts`

## n8n (Awetomatic)
- **Service:** n8n Workflow Automation
- **Purpose:** Handles complex search logic (currently being migrated to native code).
- **Auth:** URL-based webhook (no explicit auth header in current proxy).
- **Webhooks:**
  - Search: `https://n8n.awetomatic.com/webhook/4e993b0f-a3be-42ba-925d-4c5f78b3381c`
- **Key Locations:**
  - `src/app/api/search/route.ts`

## Supabase
- **Service:** Supabase (Database, Auth, Vector Store)
- **Purpose:** Primary backend.
- **Auth:**
  - Public: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Admin/Server: `SUPABASE_SERVICE_KEY` (Used in API routes for privileged actions).
- **Key Locations:**
  - `src/lib/supabase/client.ts`
  - `src/lib/supabase/server.ts`
