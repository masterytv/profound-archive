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

## 4. Deployment & Build Gotchas (Firebase App Hosting)
### A. Build-Time vs Run-Time Errors
- **Lazy Initialization Required:** Next.js tries to execute top-level code in API routes during the build process (static analysis). If you have `const openai = new OpenAI(...)` at the top level, the build will **FAIL** because secrets like `OPENAI_API_KEY` are not available in the build environment.
  - **Fix:** Always initialize clients *inside* the handler function or use a lazy getter: `const getOpenAI = () => new OpenAI(...)`.

### B. Secrets & IAM Permissions
- **Service Account Confusion:** App Hosting builds run as `firebase-app-hosting-compute@...`, **NOT** the default compute service account. Always check the build logs for the exact email.
- **Project-Level Permissions:** For Secret Manager access, granting permission on the specific secret resource is sometimes insufficient for the build process to "discover" the secret.
  - **Fix:** Grant `Secret Manager Secret Accessor` at the **Project Level** (IAM Page), not just on the Secret itself.
- **Secret Reference Format:** in `apphosting.yaml`, references to secrets work most reliably using the **Project Number**, not the Project ID.
  - **Good:** `projects/123456789/secrets/MY_SECRET/versions/1`
  - **Bad:** `projects/my-project-id/secrets/MY_SECRET/versions/1`
- **Version Pinning (Critical):** The `Secret Manager Secret Accessor` role **does not** allow resolving `versions/latest`.
  - **Fix:** You *MUST* pin the specific version number (e.g., `versions/1` or `versions/3`) in `apphosting.yaml`. attempting to use `latest` will result in `PermissionDenied` errors during build.

## 5. Video Processing & Batch Workflows
### A. Timeouts (Cloudflare / Vercel / Firebase)
- **The Limit:** Most serverless environments have a strict timeout (often 60s default, max 300s).
- **The Problem:** Sequential processing of long videos (e.g., 20-50s per analysis) will quickly exceed this limit even with small batch sizes (e.g., 10 videos * 20s = 200s).
- **The Fix:**
  1.  **Parallel Processing:** Always use `Promise.all()` to process batch items concurrently. This changes the total duration from `sum(video_times)` to `max(video_time)`.
  2.  **Small Batches:** Reduce batch size (e.g., to 3-5) and run more frequently, rather than trying to process large chunks at once.

