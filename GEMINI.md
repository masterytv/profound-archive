# GEMINI.md — AI Context & Routing File

> **🚨 CRITICAL PRE-FLIGHT CHECK:** Before you execute ANY instructions or write ANY code, you MUST use the `view_file` tool to read `docs/LEARNINGS.md`. This contains active, immutable architectural rules. 
> **DO NOT** read `docs/LEARNINGS_ARCHIVE.md` unless the user explicitly instructs you to research a historical bug.

## 1. Project Overview & Tech Stack
Project Profound is a Next.js application designed to explore Near-Death Experiences (NDEs) through analysis, semantic search, and compassionate AI interaction.
- **Frontend:** Next.js 14+ (App Router), Tailwind CSS, Shadcn UI.
- **Backend/API:** Next.js API Routes (`src/app/api/*`), Supabase (PostgreSQL, Auth, Vector).
- **Database:** Supabase - see `docs/database/SCHEMA.md`.
- **Styling:** Tailwind CSS + CSS Variables (`globals.css`).

## 2. Architecture Summary
1. **Client:** Next.js for UI.
2. **Server:** Supabase for persistent data and Auth.
3. **Logic:** Next.js API routes for lightweight logic; native pipeline for scraping/analysis.
See `docs/ARCHITECTURE.md` for full details.

## 3. Key Conventions & File Organization
- `src/app`: Page routes and API routes.
- `src/components`: UI components.
- `src/lib`: Utilities, database clients, and service wrappers.
- **Supabase Client:** Use `createClient` from `src/lib/supabase/client.ts` (browser) or `src/lib/supabase/server.ts` (server).
- **Styling:** Use `cn()` for class merging.

## 4. Documentation Index (Your Knowledge Base)
Do not guess how this app works. Read these files when touching related systems:
- 📋 `docs/INDEX.md` (Start here for general routing)
- 🧠 `docs/LEARNINGS.md` (Active constraints - READ BEFORE CODING)
- 🗄️ `docs/LEARNINGS_ARCHIVE.md` (Historical bugs/pipelines - DO NOT READ by default)
- 🔐 `docs/ENVIRONMENT.md` (Env var definitions)
- 🎨 `docs/BRAND.md` (Design guidelines)

## 5. Important Rules for AI Code Generation
1. **Use Existing Patterns:** Look at sibling files before generating new code.
2. **Respect RLS:** Never use `service_role` key in client-side code.
3. **Database Changes:** Always ask to create a migration file in `supabase/migrations/`.
4. **Documentation Architect:** After any significant code, schema, or API change, you MUST update the corresponding file in `/docs`. Do not wait for the user to ask.
5. **Strict Security:** Adhere to the security and auth routing rules defined in `docs/LEARNINGS.md`.
6. **LEARNINGS.md Hygiene (MANDATORY):** `docs/LEARNINGS.md` is read every session — it must stay lean.
   - **Cap: 30 active rules max.** Count only bullet points that state a constraint, not headers or whitespace.
   - **What belongs:** Project-wide constraints that will break production if a future session forgets them (e.g., auth patterns, CSS token rules, API timeouts, deployment gotchas).
   - **What does NOT belong:** One-off bug fixes, single-route implementation details, library API notes, or anything that only matters for one file.
   - **Prune-on-write:** Before adding a new rule, review the existing list. Move any resolved, outdated, or narrowly-scoped rules to `docs/LEARNINGS_ARCHIVE.md` with a date stamp.
   - **If you exceed 30 rules after your edit, you MUST archive the least-critical entries before finishing.**
7. **Sprint Progress Tracking (MANDATORY):** `directives/SPRINT.md` is the **single source of truth** for task completion across conversations.
   - **Read SPRINT.md at session start** to determine what's done (`[x]`) and what's next (`[ ]`).
   - **Update `- [ ]` → `- [x]`** in SPRINT.md immediately when you complete a task. Do NOT defer this.
   - **Update the Sprint Status table** at the top when a sprint is fully complete.
   - **Never rely solely on brain artifacts** (walkthroughs, task.md) for cross-conversation state — they are conversation-scoped and may not be read by the next session.
   - If the next task to work on is ambiguous, read the Sprint Status table first, then scan for the first unchecked `- [ ]` in the current sprint.

## 6. Current Development Focus
- **Active Task:** UAP Vertical — Sprint 2 (Pipeline). See `directives/SPRINT.md` Sprint Status table.
- **Previous:** n8n batch workflow migration (complete). UAP Sprint 1: Foundation (complete 2026-05-06).
- *(For a history of completed features, see `docs/LEARNINGS_ARCHIVE.md`)*

## 7. Skills Archive
- **Active skills (~65):** `~/.gemini/antigravity/skills/` — curated for Project Profound's stack.
- **Archived skills (~1,199):** `~/.gemini/antigravity/skills-archive/` — available on demand.
- If a task requires a skill not in the active set, check the archive before building from scratch.
- To restore: `mv ~/.gemini/antigravity/skills-archive/<skill-name> ~/.gemini/antigravity/skills/`
- See `skills_keep_list.md` in the brain artifacts for the full rationale.