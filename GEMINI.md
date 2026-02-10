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

### In Progress
- Migrating n8n workflows to native code (See `docs/workflows/OVERVIEW.md`).
- Admin Dashboard enhancements.

## Environment Variables
See [Environment Variables Doc](./docs/ENVIRONMENT.md).

## Quick Reference: Key File Paths
| Purpose | Path |
|---|---|
| Supabase Client Init | `src/lib/supabase/client.ts` |
| Database Types | `src/lib/supabase/database.types.ts` |
| Chat Logic | `src/app/api/chat-compassionate/route.ts` |
| Search Logic | `src/app/api/search/route.ts` |
| UI Components | `src/components/` |
