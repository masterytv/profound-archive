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

## 8. Supabase Client-Side Fetch AbortError (CRITICAL)

> **Context:** In Feb 2026, analysis sections on video and channel pages were silently disappearing after showing a "Loading..." spinner. Root cause: React strict mode + Supabase singleton client.

### A. The Problem
- `createClient()` in `src/lib/supabase/client.ts` returns a **singleton** browser client.
- React 18 strict mode (and Next.js dev Fast Refresh) **double-mounts** components — mount → unmount → mount.
- The Supabase singleton's internal `AbortController` persists across re-renders. When the first mount's RPC call is in-flight during unmount, the second mount **aborts it**.
- Supabase returns the abort as `error.message: "signal is aborted without reason"` (not a thrown exception), which error handlers interpret as a real failure → set data to `null` → component returns `null` → section vanishes.

### B. The Fix
- **Never fetch Supabase data via `useEffect` in client components.** Instead:
  1. Fetch the data in the **server component** (e.g., `page.tsx`) using the server Supabase client.
  2. Pass the fetched data as **props** to the client component.
- This is faster (no loading spinner), more reliable, and completely sidesteps the abort issue.

### C. Pattern
```tsx
// ✅ CORRECT — server component fetches, client component renders
// page.tsx (server component)
const { data } = await supabase.rpc('my_function', { ... });
return <MyComponent data={data} />;

// ❌ WRONG — client component fetches (AbortError-prone)
// MyComponent.tsx ("use client")
useEffect(() => {
  const supabase = createClient(); // singleton!
  supabase.rpc('my_function', { ... }).then(...)
}, []);
```

### D. Affected Components (Fixed)
- `ChannelAnalysisSummary.tsx` — stats fetched in `channel/[channelId]/page.tsx`
- `SimilarExperiences.tsx` — results fetched in `video/[id]/page.tsx`

## 9. YouTube Video Scraping (CRITICAL)

> **Context:** In Feb 2026, we built the native intake pipeline to replace n8n. Several YouTube-related gotchas surfaced during development.

### A. Caption Fetching — Don't Use `innertube`
- **The Problem:** The npm `innertube` package (YouTube's internal API client) is unstable, heavy (~20MB), and frequently breaks with YouTube API changes.
- **The Fix:** Fetch captions directly via YouTube's `timedtext` API:
  1. Fetch the video page HTML
  2. Parse `captionTracks` from the `ytInitialPlayerResponse` JSON blob
  3. Hit the `timedtext` URL with `&fmt=json3` for structured JSON
- **Key Detail:** The default `timedtext` response is **XML**. You MUST append `&fmt=json3` to the URL to get JSON with proper timestamps.
- **Fallback Chain:** `en` manual → `en` auto-generated (ASR) → first available language

### B. Caption Parsing — Event Structure
- YouTube's `json3` format uses `events[]` where each event has:
  - `tStartMs` — start time in milliseconds
  - `segs[]` — array of text segments, each with `utf8` content
- Events without `segs` are timing markers — skip them.
- Some segments contain only `\n` — filter these out.

### C. Transcript Chunking Strategy
- **Search chunks** (25 chunks): Fixed-count chunking with timestamps, stored in `nde_punctuated_embeddings` for semantic/concept search.
- **Chat chunks** (15 chunks): Larger, timestamp-free chunks stored in `nde_chatbot_chunks` for conversational AI context.
- Both chunk types are generated from the same raw transcript but optimized for different use cases.

### D. Video Metadata — Scraping Without API Key
- Video metadata (title, description, publish date, view count, duration) can be scraped from the video page HTML by parsing the `ytInitialPlayerResponse` and `ytInitialData` JSON objects embedded in `<script>` tags.
- Channel metadata requires the YouTube Data API v3 (API key needed) for subscriber count and custom URLs.

## 10. Supabase pgvector Gotchas (CRITICAL)

### A. Insert Timeout with Large Vectors
- **The Problem:** Inserting 25 rows each containing a 1536-dimension float vector (`text-embedding-3-small`) in a single `.insert()` call exceeds Supabase's default statement timeout. Each vector is ~12KB serialized, so 25 rows ≈ 300KB of vector data per statement.
- **The Fix:** Batch inserts into **groups of 5 rows**. This keeps each statement under 60KB and well within the timeout.
- **Pattern:**
  ```typescript
  const BATCH_SIZE = 5;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('table').insert(batch);
      if (error) throw new Error(`Batch ${i}: ${error.message}`);
  }
  ```

### B. Re-Processing Embeddings — Delete-Before-Insert
- **The Problem:** Using `.insert()` on re-processed videos fails silently (or throws a unique constraint error) because embedding rows already exist from the first run. Using `.upsert()` requires a unique constraint on `(video_id, content)` which is impractical for text columns.
- **The Fix:** Delete existing rows first, then insert fresh ones:
  ```typescript
  await supabase.from('nde_punctuated_embeddings').delete().eq('video_id', videoId);
  await supabase.from('nde_chatbot_chunks').delete().eq('video_id', videoId);
  // Then insert new rows...
  ```
- **Rule:** Any pipeline step that writes to a table without a natural primary key must use delete-before-insert for re-processing safety.

### C. Silent Errors vs Thrown Errors
- **The Problem:** The original embedding code used `console.error()` on failure, which logs the error but allows the pipeline to continue and mark the video as "complete" — even though embeddings were never created. The video appears in the DB but not in search results.
- **The Fix:** Always `throw new Error()` on embedding/indexing failures so the pipeline status reflects the actual state. This surfaces the error in the admin UI step log.

## 11. Intake Pipeline Architecture

### A. Pipeline Step Order (14 Steps)
1. Parse URL → videoId
2. Check Database (new vs re-process)
3. Scrape video + channel metadata
4. Enrich channel (YouTube Data API)
5. Fetch + process captions
6. Insert initial video record
7. Classify experience (lightweight AI gate)
8. Run 7 analysis passes in parallel (Greyson, Transformation, Core Elements, Phenomenology, Journey Flow, cvNDE, NDE Summary)
9. Save analysis results
10. Generate embeddings (search + chat)
11. Sync to Typesense (keyword search index)
12. Generate experience fingerprint (pgvector similarity)
13. Mark complete

### B. Classification Gate Pattern
- The classification step costs ~$0.001 and takes ~2s. It determines if the video contains a genuine profound experience before running the full 7-pass analysis suite (~$0.02-0.05, ~20-30s).
- Gate outcomes: `clear_nde`, `possible_nde`, `not_nde`, `insufficient_info`
- Videos classified as `not_nde` skip the expensive analysis passes entirely but are still recorded in the database.

### C. Experiencer Name Extraction Rules
- Added to the classification step (not a separate AI call) to extract the experiencer's full name.
- **Critical rules in the prompt:**
  - Extract ONLY the person who experienced the NDE
  - DO NOT return the host, interviewer, narrator, podcaster, or commentator name
  - DO NOT return names from secondhand accounts ("my mother had an NDE...")
  - Return `null` if no name is identifiable
- Uses video title + description + transcript for maximum context.

### D. Typesense Auto-Indexing
- After embedding generation, the pipeline automatically syncs search chunks to Typesense for keyword search.
- **Graceful degradation:** If `TYPESENSE_HOST` or `TYPESENSE_API_KEY` env vars are not set, the step is silently skipped.
- **Non-fatal:** Typesense indexing errors are caught and logged but don't fail the pipeline.
- Uses `upsert` action so re-processing updates existing documents.

## 12. Admin UI Patterns

### A. Brand Consistency in Admin Pages
- Admin pages MUST NOT use their own dark theme (`bg-gray-950`). The admin layout (`admin/layout.tsx`) provides a light `#F8FAFC` background and white sidebar.
- Follow the established patterns from `BRAND.md` Section 10:
  - Cards: `rounded-2xl border border-slate-200/60 bg-white`
  - Headings: Crimson Pro serif with blue icon badge
  - Icons: Lucide React, never emojis
  - Inputs: `rounded-xl` with slate-200 borders and blue focus rings

### B. Processing Step Display
- Use SVG status icons (CheckCircle2, XCircle, Loader2) instead of emoji (✅, ❌, 🔄)
- Step name colors by status: success → `text-slate-900`, failed → `text-red-600`, running → `text-blue-600`, skipped → `text-slate-400`
- Duration displayed in `font-mono text-xs text-slate-300`

### C. Result Link Visibility
- The "See Video and Analysis" link should only appear when `result.status === 'complete' || result.status === 'already_exists'`
- For failed, not_profound, or error results, hide the link to avoid linking to incomplete data.

## 13. API Key Security & Leak Prevention (CRITICAL)

> **Context:** In Feb 2026, we received leak notifications from OpenAI and Apify via GitHub Secret Scanning. Both keys were traced to the same root cause: the `.next.old` build cache directory was accidentally committed to git.

### A. Root Cause: `.next.old` Build Cache in Git

- **What happened:** Next.js dev server creates a `.next.old.*` directory when it rotates build caches. During a `git add .` operation, this directory (containing thousands of compiled binary files) was committed and pushed to GitHub.
- **Why it causes a leak:** Next.js **embeds the values of environment variables from `.env.local` into compiled bundle and cache files**. This means secrets like `OPENAI_API_KEY`, `APIFY_API_TOKEN`, etc. were embedded inside binary `.sst` files in the cache. GitHub Secret Scanning detected them and notified the affected API providers.
- **Which keys were leaked:** OpenAI (`sk-proj-...l4A`) and Apify (`apify_api_...6AXuC`)
- **Key that was NOT leaked from this repo:** The Typesense API key was hardcoded in `apphosting.yaml` (tracked by git) — a separate vulnerability fixed at the same time.

### B. Remediation Steps Taken (2026-02-22)

1. **Rotated all exposed keys** — New keys generated in OpenAI and Apify dashboards. Old keys were immediately invalidated.
2. **Updated `.env.local`** with the new OpenAI and Apify API keys.
3. **Removed `.next.old` from git tracking** (`git rm -r --cached .next.old.1771712071249`) and pushed.
4. **Confirmed `.gitignore` already had the rule** (`/.next.old*/`) — the issue was the directory was committed once before this rule existed. `git rm --cached` fixed the outstanding tracking.
5. **Moved Typesense API key to Secret Manager** — Removed `value: <key>` from `apphosting.yaml`, replaced with `secret: TYPESENSE_API_KEY`. Also updated Firebase Google Cloud Secret Manager with the new value.
6. **Added `APIFY_API_TOKEN` to `apphosting.yaml`** via Secret Manager — it was missing entirely, meaning intake requests from projectprofound.org would have silently failed.
7. **Updated Firebase Secret Manager** with new OpenAI and Apify keys via `firebase apphosting:secrets:set`.

### C. Permanent Rules Going Forward

- **NEVER run `git add .` without inspecting `git status` first.** The `.next`, `.next.old*` directories are huge and must never be committed. Use `git add -p` (patch mode) or explicitly name files.
- **ALL secrets in `apphosting.yaml` must use `secret:` references**, never `value:` for sensitive keys. Webhook URLs are okay as `value:` since they are not credentials.
- **Always rotate a key immediately** when a leak notification is received. Even if you remove it from git history (which is impractical), the key itself is what needs to change.
- **`.env.local` is never committed.** It is in `.gitignore` as `.env*`. This is correct and must stay this way.
- **New intake pipeline env vars must be added to `apphosting.yaml`** at the same time as they are added to `.env.local`. Otherwise local dev works but production silently fails.

### D. Current Secret Manager Inventory (all production secrets)

| Secret Name | Purpose | In `apphosting.yaml`? |
|---|---|---|
| `OPENAI_API_KEY` | AI analysis & embeddings | ✅ `versions/1` → update version on rotation |
| `SUPABASE_SERVICE_KEY` | Admin DB access | ✅ `versions/1` |
| `TYPESENSE_API_KEY` | Keyword search | ✅ `TYPESENSE_API_KEY` |
| `APIFY_API_TOKEN` | YouTube transcript scraping | ✅ `APIFY_API_TOKEN` |
| `YOUTUBE_API_KEY` | Channel metadata enrichment | ✅ `versions/latest` |
| `CRON_SECRET` | Authenticating automated jobs | ✅ `versions/3` |

> **Note on version pinning:** The `Secret Manager Secret Accessor` role does NOT allow resolving `versions/latest` (see Section 4B). When rotating a key, create a new version in Secret Manager and update the version number in `apphosting.yaml`.
