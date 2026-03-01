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
- **Double Service Account Requirement (CRITICAL):** App Hosting requires the `Secret Manager Secret Accessor` role on **TWO** different service accounts for secrets to work:
  1. The **Runtime** account (`firebase-app-hosting-compute@...`)
  2. The **Build** account (`<project-number>-compute@developer.gserviceaccount.com` aka the "Default compute service account")
- **The Gotcha:** If you only grant access to the runtime account, the cloud deploy will fail during the build step with `PermissionDenied` because the builder can't package the secret.
- **Fix:** In Google Cloud Secret Manager → Permissions tab, click "+ Grant access" and add BOTH service accounts as a `Secret Manager Secret Accessor`. Do NOT try to edit the inherited Editor role on the build account; just explicitly add the new role via "+ Grant access".
- **Project-Level Permissions:** For Secret Manager access, granting permission on the specific secret resource is usually sufficient if both accounts are added.
- **Secret Reference Format:** in `apphosting.yaml`, references to secrets work most reliably using the **Project Number**, not the Project ID.
  - **Good:** `projects/123456789/secrets/MY_SECRET/versions/1`
  - **Bad:** `projects/my-project-id/secrets/MY_SECRET/versions/1`
- **Version Pinning (THE ULTIMATE TRAP - DO NOT IGNORE):** The `Secret Manager Secret Accessor` role **does not** allow resolving `versions/latest`. 
  - The AI has made the mistake of setting `versions/latest` multiple times. **DO NOT EVER DO IT AGAIN.**
  - **Fix:** You *MUST ALWAYS* pin the specific version number (e.g., `versions/1` or `versions/3`) in `apphosting.yaml`. Attempting to use `latest` will result in `PermissionDenied` errors during the cloud build phase because the builder service account cannot resolve the pointer.

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
| `SUPADATA_API_KEY` | YouTube transcript fetching (replaces Apify) | ✅ `projects/432036554831/secrets/SUPADATA_API_KEY/versions/1` |
| `YOUTUBE_API_KEY` | Channel metadata enrichment | ✅ `versions/latest` |
| `CRON_SECRET` | Authenticating automated jobs | ✅ `versions/3` |

> **Note on version pinning:** The `Secret Manager Secret Accessor` role does NOT allow resolving `versions/latest` (see Section 4B). When rotating a key, create a new version in Secret Manager and update the version number in `apphosting.yaml`.

## 14. Apify Caption Fetching — Avoid Long-Poll HTTP (CRITICAL)

> **Context:** In Feb 2026, we discovered videos with valid captions were being flagged as `no_captions`. Apify returned 302 segments correctly in isolation — the failure was infrastructure, not content.

### A. Root Cause: `waitForFinish=N` Long-Poll on Serverless

- **The Problem:** The original implementation called Apify with `?waitForFinish=120` — a single HTTP connection held open for up to 120 seconds. Firebase serverless drops long-lived idle connections before that, so Apify completed successfully but our pipeline never received the response. The connection was silently dropped → `runResponse.ok` was false → `null` returned → `no_captions`.
- **Diagnosis pattern:** If a `no_captions` error appears but Apify confirms the actor SUCCEEDED for that videoId with a non-empty dataset, it's always a connection timeout — never a content issue.

### B. The Fix: Async Polling

- **Never use `waitForFinish=N` for Apify calls on serverless platforms.** Switch to:
  1. `POST /acts/{actor}/runs` — starts the run (non-blocking, **30s** timeout)
  2. Poll `GET /actor-runs/{runId}` every 5s until `status = SUCCEEDED/FAILED` (**15s** timeout per poll)
  3. `GET /datasets/{datasetId}/items` — fetch results (15s timeout)
- Each individual HTTP call is short and independent. If a poll fails, the next interval retries it. This cannot be silently killed by Firebase.
- **Always use `AbortController`** on every `fetch()` call with an explicit ms timeout. Never rely on the platform's default timeout for external API calls.
- **CRITICAL: Wrap each individual poll in its own `try/catch` inside the while loop.** `fetchWithTimeout` throws `AbortError` when its timeout fires — this throw propagates OUT of the while loop to the outer catch, returning `null` → `no_captions`. The `if (!statusRes.ok)` guard only handles HTTP error status codes, NOT thrown exceptions. Pattern:
  ```typescript
  while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);
      try {
          const res = await fetchWithTimeout(url, opts, timeoutMs);
          // handle res...
      } catch (pollErr) {
          // Single poll timeout — just retry on next interval
          console.warn('Poll error, retrying...');
      }
  }
  ```
- **File:** `src/lib/youtube/subtitles.ts` — see `fetchWithTimeout()` helper.

### C. Apify Response Shape (pintostudio actor)

```json
[{ "data": [{ "start": "0.240", "dur": "7.519", "text": "..." }, ...] }]
```

The confirmed primary key is `data`. The `extractSegments()` function also handles `searchResult`, `transcript`, `captions`, `subtitles` as fallbacks.

## 15. Scanner Queue Architecture (CRITICAL)

> **Context:** In Feb 2026, we built the Channel Scanner with a persistent queue. Several design decisions about queue management and fairness were settled definitively.

### A. Two Data Sources — Never Confuse Them

| Table | Purpose | Data lifetime |
|---|---|---|
| `scan_queue` | Transient processing queue | Items reset on retry → NOT a source of truth |
| `nde_vids.intake_status` | Persistent intake result | Survives retries → source of truth for Queue Inspector |

- **Dashboard stats** (Total Failed, Total Accepted) must read from `nde_vids.intake_status`, never from `scan_runs` aggregate columns. `scan_runs` is an append-only historical log — its `videos_failed` column never decreases when you retry.
- **Queue Inspector** (`/admin/scanner/queue`) reads `nde_vids.intake_status IN ('failed', 'no_captions', 'indexing', 'not_profound')`.
- **Retry action:** Clears `intake_status` in `nde_vids` → upserts back into `scan_queue` as `pending`.

### B. Two-Phase Queue Strategy

**Phase 1 — Discover All (run once):** Use the "Queue All Channels" admin button (`discover_all` API action). Scans all 47 enabled channels and queues up to 50 videos each. Safe to run multiple times — uses `ignoreDuplicates: true` on `video_url` conflict.

**Phase 2 — Process with Round-Robin (ongoing cron):** The tick picks from the queue using random channel selection:
1. Sample 500 pending rows, extract unique `channel_id`s
2. Exclude channels already touched this tick (`touchedChannelIds` Set)
3. Pick a random channel from the untouched pool
4. Grab that channel's oldest pending video → process
5. If the picked channel has no pending items, `continue` (don't `break`) — try another channel

- **Key gotcha:** When a channel is depleted mid-tick, use `continue` not `break` — the overall queue may not be exhausted, just that specific channel.

### C. Cron Architecture — Two Separate Workflows (updated Feb 2026)

The scanner was split into two independent GitHub Actions workflows to fix Cloudflare 524 timeout errors. The original single `scanner-cron.yml` was processing multiple videos per call and routinely exceeded Cloudflare's 100-second connection limit.

| Workflow | File | Schedule | Endpoint | What it does | Typical duration |
|---|---|---|---|---|---|
| **Channel Discovery** | `scanner-discover.yml` | Every hour (`0 * * * *`) | `/api/scanner/discover` | Scans 1 channel, queues new videos | ~5–10s |
| **Video Processor** | `scanner-process.yml` | Every 10 min (`*/10 * * * *`) | `/api/scanner/process` | Processes 1 video from the queue | ~60–90s |

- **Throughput:** ~144 videos/day (1 video × 6 per hour × 24h)
- **Cloudflare safe:** Each call handles 1 unit of work, well under the 100s timeout
- **`videosPerTick` cap:** Do NOT increase above 1 for the process workflow — each video takes 30–90s through the 14-step AI pipeline
- **Legacy endpoint:** `/api/scanner/tick` and the admin panel manual trigger still work unchanged (calls both discover + process in sequence via `runScannerTick`)

### D. Cloudflare Bypass for Long-Running Cron Jobs (CRITICAL)

The intake pipeline (Apify caption fetch up to 100s + 7 AI analysis passes) takes **140–180s per video**, always exceeding Cloudflare's hard **100-second** connection cutoff. Fire-and-forget was tried but failed because Cloud Run throttles CPU after the response is sent, stalling the background promise.

**The fix:** GitHub Actions calls the **Firebase App Hosting direct URL** (`APP_DIRECT_URL` secret) instead of the Cloudflare-proxied domain (`projectprofound.org`). This bypasses Cloudflare entirely.

- **Direct URL format:** `https://profound-archive--studio-XXXXXXX.us-east4.hosted.app`
- **`--max-time 280`** in curl — safely under Cloud Run's `timeoutSeconds: 300`
- **DO NOT** call `/api/scanner/process` via `projectprofound.org` from automated jobs — Cloudflare will cut the connection at 100s
- **DO NOT** use fire-and-forget on this endpoint — Cloud Run throttles CPU after the response, stalling the event loop
- The `/api/scanner/discover` endpoint is fast (~10s) and safe to call via either URL

## 16. Supadata Transcript API — Rate Limits (CRITICAL)

> **Context:** In Mar 2026, we switched from Apify pintostudio to Supadata for YouTube transcript fetching. Apify was IP-blocked by YouTube returning empty data silently. Supadata uses its own rotating proxies and is not blocked.

### A. Rate Limit Tiers

| Plan | Credits/month | Rate limit | Auto-recharge |
|---|---|---|---|
| Free | 100 | 1 req/s | No |
| Basic ($5/mo) | 300 | 10 req/s | $10/1,000 |
| Pro ($17/mo) | 3,000 | 10 req/s | $10/1,000 |

- **1 transcript = 1 credit.** At ~144 videos/day if all need captions, that's ~4,320/month — requires a paid plan with auto-recharge.
- **Auto-recharge rate:** $10 per 1,000 extra credits = $0.01/video.

### B. Response Codes & Log Tags

All errors are handled distinctly in `src/lib/youtube/subtitles.ts`. Search these tags in Firebase logs:

| HTTP | Meaning | Firebase log tag | Action |
|---|---|---|---|
| 200 | Success | `[Supadata] ✅` | — |
| 401 | Invalid API key | `[Supadata] INVALID API KEY` | Check `SUPADATA_API_KEY` in Secret Manager |
| 402 | Out of credits | `[Supadata] PAYMENT REQUIRED` | Add credits at [dash.supadata.ai](https://dash.supadata.ai) |
| 404 | No captions on video | `[Supadata] No captions available` | Expected — video genuinely has no captions |
| 429 | Rate limit exceeded | `[Supadata] RATE LIMITED` | Burst: wait; Monthly: add credits or upgrade plan |
| 5xx | Supadata server error | `[Supadata] SERVER ERROR` | Transient — retry later |

**What happens to the video on any error:** Returns `null` → pipeline marks it `no_captions` → appears in Queue Inspector for manual retry later.

### C. If Rate Limiting Becomes Frequent

1. **Check Supadata dashboard** at [dash.supadata.ai](https://dash.supadata.ai) — confirms whether it's a monthly credit exhaustion or burst rate limit.
2. **Monthly credits:** Upgrade plan or enable auto-recharge in the dashboard.
3. **Burst rate (1 req/s on free):** The scanner processes 1 video per run (every 10 min) — well under burst limits. Only an issue if manually retrying many videos at once.
4. **Fallback:** `APIFY_API_TOKEN` is still available in `apphosting.yaml` — code in `subtitles.ts` could be updated to fall back to Apify if Supadata returns 429.

### D. Response Shape (for future reference)

```json
{
  "lang": "en",
  "availableLangs": ["en"],
  "content": [
    { "text": "...", "offset": 0, "duration": 5000, "lang": "en" }
  ]
}
```

Note: `offset` and `duration` are in **milliseconds** — divide by 1000 for seconds.
