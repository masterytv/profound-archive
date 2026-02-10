# 🧠 AI Learnings & Known Issues

> **CRITICAL FOR AI:** Read this file to avoid repeating past mistakes.
> This file documents non-obvious patterns, workarounds for outdated training data, and specific project constraints.

## 1. Outdated Commands / Syntax Fixes
| Issue | Incorrect Command/Pattern | Correct Solution |
|---|---|---|
| **Supabase CLI** | `supabase db push` (Standard) | Use `supabase db reset` for local dev or migration files for prod. |
| **Next.js Images** | `<img />` | Always use `<Image />` from `next/image`. |
| **Shadcn** | `npx shadcn-ui@latest add` | Use `npx shadcn@latest add` (v2 CLI syntax). |

## 2. Project-Specific constraints
- **No Em Dashes:** The chatbot must NEVER use em dashes (—). Use parentheses or commas instead.
- **Strict RLS:** Never use `service_role` in `src/app` (client/server components) unless explicitly building an admin API route.
- **Server Actions:** We prefer API routes (`src/app/api/...`) over Server Actions for complex logic to keep frontend/backend separation cleaner for potential migration.

## 3. Persistent Bugs to Watch Out For
- **Auth State:** `SupabaseAuthContext` generally handles state, checking `supabase.auth.getUser()` in generic layouts can be flaky.
