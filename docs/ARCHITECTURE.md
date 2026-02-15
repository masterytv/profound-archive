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

### Chat Popup Widget
- A global `ChatPopup` component is rendered in `src/app/layout.tsx`.
- Reuses the same `/api/chat-compassionate` endpoint as the full-page chat.
- Auto-hides on `/chat-compassionate` via `usePathname()` check.
- Client-side only — no additional server or database requirements.

### Homepage Curated Grid (ISR)
1. Page revalidates every 6 hours (`revalidate = 21600`).
2. Seed = `Math.floor(Date.now() / 21600000)` — deterministic per window.
3. Top 50 videos fetched per score type (Veridical from `nde_vids`, Transformation & Greyson from `nde_analysis`).
4. Seeded shuffle selects 6 per column.
5. CDN caches the result for the entire 6-hour window.

### Explorer Pages (`/explore/*`)
1. Server component reads URL search params (`sort`, `dir`, `filter`, `page`).
2. Supabase query fetches sorted/filtered data with `count: "exact"` for pagination.
3. Video metadata joined from `nde_vids` via a second query.
4. Client `ExplorerControls` component manages sort/filter/pagination via URL params.

## Security Model
- **RLS:** All database access is guarded by Row Level Security.
- **Environment Variables:** Secrets stored in `.env.local` (local) or Vercel/Supabase env configs.
- **Middleware:** `src/middleware.ts` protects admin routes and refreshes tokens.
