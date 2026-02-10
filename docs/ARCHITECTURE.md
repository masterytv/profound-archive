# System Architecture

## High-Level Overview
Project Profound is a modern web application built on the **T3 Stack** principles (Next.js, Tailwind, TypeScript) with **Supabase** as the backend-as-a-service (BaaS). It leverages **OpenAI** for AI features and **n8n** for complex background workflows.

## Core Components

### 1. Frontend Client (Next.js)
- **Framework:** Next.js 14+ (App Router).
- **Hosting:** Vercel / Firebase Hosting (Configuration seen for both).
- **Styling:** Tailwind CSS + Shadcn UI.
- **State:** Server Components + React Query / Hooks.

### 2. Backend Services (Supabase)
- **Database:** PostgreSQL.
- **Auth:** Supabase Auth (Email + Social).
- **Storage:** Supabase Storage (Artifacts, Avatars).
- **Vector Store:** `pgvector` extension for embeddings (`nde_chatbot_chunks`, `nde_punctuated_embeddings`).

### 3. AI & Logic Layer
- **Compassionate Chat:** Native Next.js API route calling OpenAI directly.
- **Search Logic:** Proxies to n8n (Transitioning to native Supabase RPCs).
- **Background Jobs:** n8n Workflows (ETL, Video Processing).

## Data Flow

### User Search
1. User types query in Frontend.
2. Request sent to `/api/search` (or `/api/search3`).
3. Endpoint proxies to n8n OR calls Supabase `search_nde_moments` RPC.
4. Results returned to UI.

### Compassionate Chat
1. User sends message.
2. API generates embedding (OpenAI).
3. RPC `nde_chatbot_match` selects relevant video contexts.
4. LLM generates compassionate response using context.
5. Interaction logged to `nde_chat_logs`.

## Security Model
- **RLS:** All database access is guarded by Row Level Security.
- **Environment Variables:** Secrets stored in `.env.local` (local) or Vercel/Supabase env configs.
- **Middleware:** `src/middleware.ts` protects admin routes and refreshes tokens.
