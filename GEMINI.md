# GEMINI.md — AI Context File

> This file provides Gemini with the context it needs to assist with development on this project. Always read this file and the linked documentation before generating code.

## Project Overview
Project Profound is a Next.js application designed to explore Near-Death Experiences (NDEs) through analysis, semantic search, and compassionate AI interaction. It serves as a repository of 5000+ first-person accounts.

## Tech Stack
- **Frontend:** Next.js 14+ (App Router), Tailwind CSS, Shadcn UI.
- **Backend/API:** Next.js API Routes (`src/app/api/*`), Supabase (PostgreSQL, Auth, Vector).
- **Database:** Supabase - see [Database Schema](./docs/database/SCHEMA.md).
- **Auth:** Supabase Auth (via `@supabase/ssr`).
- **Styling:** Tailwind CSS + CSS Variables (`globals.css`).
- **AI Dev Environment:** Google Antigravity.

## Architecture Summary
The app uses a hybrid architecture:
1. **Client:** Next.js for UI.
2. **Server:** Supabase for persistent data and Auth.
3. **Logic:** Next.js API routes for lightweight logic; n8n (being migrated) for heavy workflows.
See [Architecture Doc](./docs/ARCHITECTURE.md) for full details.

## Documentation Index
All detailed documentation lives in the `/docs` folder. Start here:
- 📋 [Documentation Index](./docs/INDEX.md)
- 🧠 [AI Learnings & Known Issues](./docs/LEARNINGS.md) (Read this to avoid common mistakes!)

## Key Conventions & Patterns
### File Organization
- `src/app`: Page routes and API routes.
- `src/components`: UI components.
- `src/lib`: Utilities, database clients, and service wrappers.

### Code Patterns
- **Supabase Client:** Use `createClient` from `src/lib/supabase/client.ts` (browser) or `src/lib/supabase/server.ts` (server).
- **Environment Variables:** Access via `process.env`. See `docs/ENVIRONMENT.md`.
- **Styling:** Use `cn()` for class merging.

### Error Handling
- Use `try/catch` blocks in API routes.
- Return structured JSON errors: `{ error: string, details?: any }`.

## Important Rules for AI Code Generation
1. **Always use the existing patterns** found in the codebase.
2. **Respect RLS:** Never use `service_role` key in client-side code.
3. **Database Changes:** Always ask to create a migration file in `supabase/migrations/`.
4. **New API Integrations:** Follow [New API Integration Guide](./docs/guides/NEW_API_INTEGRATION.md).
5. **Types:** Use `src/lib/supabase/database.types.ts` for DB types.
6. **Documentation Maintenance:** You represent the "Documentation Architect". After any significant code, schema, or API change, you MUST update the corresponding file in `/docs`. Do not wait for the user to ask.
7. **Continuous Learning:** Always check `docs/LEARNINGS.md` before generating code to see if there are specific patterns or "gotchas" you need to be aware of.

## Current Development Status
### Completed
- Core NDE search and display (Search3/Native).
- Compassionate Chat (Hybrid native/Supabase).
- User Auth & Profiles.
- Homepage curated video grid (ISR 6h rotation) with 3 score columns.
- Explorer pages: `/explore/transformation`, `/explore/veridical`, `/explore/greyson`.
- Scale info pages: `/scale/greyson`, `/scale/cvnde`, `/scale/transformation`.
- Site-wide Chat Popup widget (`ChatPopup`) — floating "Chat with NDEs" on all pages.
- Channel pages: `/channels` directory with logo-centric cards, `/channel/[channelId]` detail pages.
- YouTube channel metadata enrichment via `scripts/enrich-channels.ts` → `channels` table.
- NDERF analysis visualization: video-level analysis (phenomenology, entities, journey flow, core elements), channel-level aggregate stats, similar experiences (pgvector).
- Experience fingerprint generation + pgvector similarity search (`find_similar_experiences` RPC).
- Resources page: `/resources` — NDE research ecosystem directory with 7 sections (orgs, academic, research, accounts, intro, books, support).
- Alt1 design system redesign: profile, dashboard, admin pages, chat popup (light theme), and new logo.
- Merged Home/Search experiences: Hero section now features a comprehensive search bar gateway.
- Advanced Search Filters (`/search3`): Integrated Greyson, Transformation, and Veridical sliding score filters across Keyword and Concept (formerly Semantic) search modes correctly updating URL params, Typesense Schema, and pgvector RPCs (resolved candidate function overloading conflicts).
- **Native video intake pipeline** (`src/lib/pipeline/`) — replaces n8n: scrape → classify → 7-pass analysis → embeddings → Typesense index → fingerprint.
- Admin intake page (`/admin/intake`) — branded UI for single-video processing with real-time step progress.

### In Progress
- Migrating remaining n8n batch workflows to native code (See `docs/workflows/OVERVIEW.md`).

## Environment Variables
See [Environment Variables Doc](./docs/ENVIRONMENT.md).

## Quick Reference: Key File Paths
| Purpose | Path |
|---|---|
| Supabase Client Init | `src/lib/supabase/client.ts` |
| Database Types | `src/lib/supabase/database.types.ts` |
| Chat Logic | `src/app/api/chat-compassionate/route.ts` |
| Chat Popup Widget | `src/components/chat-popup.tsx` |
| Search Logic | `src/app/api/search/route.ts` |
| UI Components | `src/components/` |
| Channel Components | `src/components/channels/` |
| Channel Directory | `src/app/channels/page.tsx` |
| Channel Detail | `src/app/channel/[channelId]/page.tsx` |
| Channel Enrichment | `scripts/enrich-channels.ts` |
| Analysis Components | `src/components/analysis/` |
| Batch API Routes | `src/app/api/batch/` |
| Resources Page | `src/app/resources/page.tsx` |
| Brand Guidelines | `docs/BRAND.md` |
| Logo (transparent) | `public/logo-transparent.png` |
| Intake Pipeline | `src/lib/pipeline/intake.ts` |
| Pipeline Modules | `src/lib/pipeline/` (scraper, classifier, embeddings, etc.) |
| Admin Intake Page | `src/app/admin/intake/page.tsx` |
| Intake API Route | `src/app/api/intake/route.ts` |
