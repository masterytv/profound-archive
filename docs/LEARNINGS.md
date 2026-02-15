# 🧠 AI Learnings & Known Issues

> **CRITICAL FOR AI:** Read this file to avoid repeating past mistakes.
> This file documents non-obvious patterns, workarounds for outdated training data, and specific project constraints.

## 1. Outdated Commands / Syntax Fixes
| Issue | Incorrect Command/Pattern | Correct Solution |
|---|---|---|
| **Supabase CLI** | `supabase db push` (Standard) | Use `supabase db reset` for local dev or migration files for prod. |
| **Next.js Images** | `<img />` | Always use `<Image />` from `next/image`. See **Section 7** for full rules. |
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
### B. Supabase Default Row Limit (Silent 1000-Row Cap)
- **The Problem:** Supabase client queries **silently cap results at 1,000 rows** when no `.range()` or `.limit()` is specified. This caused the Greyson batch to stall after processing ~766 videos — it kept re-fetching the same 1,000-row window and finding them all already processed.
- **The Fix:** For batch workflows that iterate over large datasets, use a **database RPC function** (e.g., `get_unanalyzed_greyson_videos`) with a proper SQL `LEFT JOIN` to find unprocessed rows. This avoids both the row limit and the N+1 query pattern of checking each row individually.
- **Rule of Thumb:** If your query could return more than 1,000 rows, always use `.range()`, pagination, or an RPC.
### C. Secrets Management for Automated Workflows
- **Cron Secrets:** When calling internal API endpoints from GitHub Actions or cron jobs, ensure the `CRON_SECRET` env var is set and the endpoint validates it.
### D. Completed & Disabled Workflows (DO NOT RE-ENABLE)
- **Greyson Analysis Cron** (`greyson-cron.yml`): **DISABLED via GitHub Actions UI on 2026-02-14.** All videos have been fully analyzed. Do NOT re-enable unless explicitly instructed by a human.
- To re-enable: GitHub repo → Actions tab → select workflow in sidebar → click "Enable workflow."

## 6. Local Development Environment
### A. npm Permissions (EPERM Errors)
- **Root-Owned Cache:** Running `npm install` with `sudo` (even accidentally) can leave root-owned files in `~/.npm`. This causes persistent `EPERM` errors.
  - **Fix:** `sudo chown -R $(whoami) ~/.npm` and `sudo chown -R $(whoami) .` in the project directory.
- **macOS Quarantine (esbuild Error -88):** After a fresh `npm install`, macOS Gatekeeper may quarantine downloaded binaries (like `esbuild`), causing `Unknown system error -88`.
  - **Fix:** 
    1. `npm install --ignore-scripts`
    2. `xattr -dr com.apple.quarantine node_modules/esbuild node_modules/@esbuild`
    3. `node node_modules/esbuild/install.js`
- **Nuclear Option:** If permissions are hopelessly broken, delete the entire cache: `sudo rm -rf ~/.npm` then `rm -rf node_modules package-lock.json && npm install`.

## 7. Image & Video Memory Optimization (CRITICAL)

> **Context:** In Feb 2026, we traced a severe browser memory leak (GPU exhaustion, tab rendering corruption, tabs failing to close) to unoptimized images and eager YouTube iframe loading. The fixes below are **mandatory** for all future development.

### A. Never Use Raw `<img>` for Thumbnails
- **Rule:** Every thumbnail in the app MUST use Next.js `<Image>` from `next/image`, never `<img>`.
- **Why:** `<Image>` automatically converts to WebP (~70% smaller), respects `sizes` for responsive loading, and handles lazy loading via the framework. Raw `<img>` loads full-resolution JPEG files into GPU memory with no optimization.
- **Pattern:**
  ```tsx
  import Image from "next/image";
  
  <Image
    src={thumbnailUrl.replace("maxresdefault", "hqdefault")}
    alt={title}
    fill
    sizes="(max-width: 768px) 100vw, 33vw"
    className="object-cover"
  />
  ```
- **Key details:**
  - Always use `hqdefault` (480×360) instead of `maxresdefault` (1280×720) for card-sized thumbnails.
  - Always include a `sizes` attribute that matches the component's actual rendered size.
  - The parent container MUST have `position: relative` and a defined aspect ratio (e.g., `aspect-video`).

### B. Never Auto-Play YouTube Embeds
- **Rule:** YouTube videos MUST use the click-to-play `<YouTubePlayer>` component (`src/components/video/YouTubePlayer.tsx`), never a raw `<iframe>` with `autoplay=1`.
- **Why:** Each YouTube iframe consumes ~150MB of GPU memory. During extended browsing, these accumulate and crash the browser's compositor.
- **Pattern:** `<YouTubePlayer videoId={id} title={title} />`

### C. `next.config.ts` — Remote Image Domains
- If you add images from a new domain, you MUST add it to `remotePatterns` in `next.config.ts`.
- Currently configured: `placehold.co`, `images.unsplash.com`, `picsum.photos`, `i.ytimg.com`.

### D. Third-Party Scripts
- **Rule:** All third-party scripts in `layout.tsx` MUST use `strategy="lazyOnload"` unless they are critical for first render.
- **Why:** Eager scripts attach DOM observers and timers that persist across Next.js client-side navigations, accumulating memory.

### E. Page Size Limits
- **Rule:** Grid pages (explorers, search results) should display **≤12 image cards** per page.
- **Why:** 24 cards × 200KB = ~4.8MB of images per page load. With WebP and hqdefault, 12 cards ≈ 850KB.

### F. Audit Checklist (run before any PR that adds images/video)
1. `grep -r '<img' src/` — Should return ZERO hits (except `admin/users/user-row.tsx` avatar).
2. `grep -r 'autoplay=1' src/` — Should return ZERO hits.
3. `grep -r 'maxresdefault' src/` — Should return ZERO hits in component code.
4. Check `next.config.ts` `remotePatterns` includes any new image domains.

