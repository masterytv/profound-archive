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

## 17. nde_questions Table — Source of Truth & Architecture (2026-03-09)

### A. The Two Question Sources Problem

The `/questions` page previously had **two independent question lists** that drifted out of sync:
1. A hardcoded array of strings in `src/app/questions/page.tsx` (consumer-facing, emotionally resonant)
2. The `nde_questions` database table (researcher-style interview questions — completely different content)

The page used an inline `toSlug()` function to convert hardcoded strings into URL slugs — the DB table was never used for the index page, only for the semantic search RPC.

### B. Resolution: DB as Single Source of Truth

- Truncated `nde_questions` and reseeded with 81 consumer-facing questions + HyDE `ai_query` passages from `nde_questions_hyde.md`.
- **LESSON:** When reseeding `nde_questions`, you MUST truncate `question_answers` first (foreign key):
  ```sql
  TRUNCATE TABLE public.question_answers, public.nde_questions RESTART IDENTITY CASCADE;
  ```
- The `/questions` page is now an async Server Component fetching from the DB — no `toSlug()` conversion, slugs come directly from `nde_questions.slug`.

### C. HyDE Passages — Pre-Written, Not Generated

`nde_questions.ai_query` stores a pre-written first-person "ideal answer" passage per question. Used by `nde_questions_match` RPC as the embedding query instead of calling GPT on every request.

### D. nde_questions_match RPC — Key Facts

- Queries `nde_punctuated_embeddings` (NOT `nde_chatbot_chunks`) — critical because only `nde_punctuated_embeddings` has `start_time`.
- Returns: `chunk_id`, `video_id`, `content`, `start_time`, `similarity`, `title`, `thumbnail_url`, `view_count_formatted`, `channel_title`, `date`, `greyson_score`.
- Changing the return type requires DROP + recreate — Postgres does not allow ALTER FUNCTION to change return types.

### E. Questions Page Architecture (Final)

```
nde_questions table
  └─ slug, category, category_label, consumer_question, ai_query, sort_order, is_active

/questions (page.tsx) — Server Component, revalidate: 86400
  └─ Fetches all active questions, groups by CATEGORY_ORDER
  └─ Part navigation cards (3 clickable anchors: Part I / II / III)
  └─ Left-justified category headers with coloured left-border accent

/questions/[slug] (page.tsx) → /api/questions/[slug]
  └─ Embeds ai_query → search_punctuated_embeddings_filtered RPC (0.50 threshold)
  └─ GPT-4o synthesises shortAnswer + 3 paragraphs, cached 24h
```

---

## 12. HyDE Generation — Prompt Design

### A. Model & Parameters
- Use **`gpt-4o`** (not `gpt-4o-mini`) for HyDE generation. Mini produces repetitive, templated output.
- Temperature **0.85** — gives creative variance without hallucination.

### B. Voice: Testimonial, Not Literary
The most important lesson: the prompt must produce **spoken NDE testimony**, not creative fiction.

**WRONG frame:** "Write as an NDE experiencer describing a scene"
→ Produces: *"The shimmering expanse of color was interrupted by a familiar, yet complicated face..."*

**RIGHT frame:** "Write 3-4 sentences that sound like they were ACTUALLY SPOKEN by a regular person in a casual YouTube interview or podcast"
→ Produces: *"my dad was there. he wasn't the same person. i forgave him instantly."*

Key constraints to include in the prompt:
- Short sentences, 8-18 words each
- No compound sentences, no em dashes
- Ban list: "shimmering", "ethereal", "luminous", "expanse", "radiant", "enveloped", "profound"
- Lowercase is acceptable
- Include a BAD vs GOOD example directly in the prompt

### C. Batch Regeneration via Edge Function
To regenerate all 81 `ai_query` values without hitting the 150s Edge Function timeout:
1. Deploy the function with `from_id` and `to_id` query params
2. Pass OpenAI API key via `x-openai-key` request header (avoids Supabase Secrets setup)
3. Run 3 sequential curl calls: IDs 1-27, 28-54, 55-81
4. Add 1500ms delay between rows to avoid OpenAI rate limits

### D. Dummy Data Anti-Pattern (DO NOT USE)
Never keep a `DUMMY_ANSWERS` object in a Server Component page that short-circuits the API:
```typescript
// NEVER DO THIS — it shadows live data permanently for those slugs
if (DUMMY_ANSWERS[slug]) return DUMMY_ANSWERS[slug];
```
This caused Rick Astley thumbnails to appear on a production question page for weeks.

---

## 13. Crisis Safety Banner

Any page that could be visited by someone in distress needs a 988 Lifeline banner.

### Pattern
```tsx
// src/lib/questions/crisis-detection.ts
export function isCrisisTopic(text: string): boolean { ... }

// In page.tsx
{isCrisisTopic(data.question) && <CrisisBanner />}
```

### Detection Coverage
- `suicid*`, `self-harm`, `self-injury`, `kill myself`, `kills their own life`
- `end my life`, `take my life`, `overdos*`, `hurting myself`, `cutting myself`
- Normalise slug hyphens to spaces before matching

### Banner Content
- Link to `https://988lifeline.org/`
- Clickable `tel:988` for mobile tap-to-call
- Rose/red colour palette (warm, not alarming red)
- Text: "If you or someone you know is in crisis, please reach out."

---

## 14. Internal Video Routing with Timestamps

When linking to specific moments in a video, use internal `/video/[id]?t=N` paths — not YouTube URLs.

### Flow
1. `SearchResultCardV4` builds `linkUrl = /video/${video_id}?t=${seconds}`
2. `/video/[id]/page.tsx` reads `searchParams.t`, parses to int, passes as `startTime` to `<YouTubePlayer>`
3. `YouTubePlayer` appends `&start=N` to the embed src when user clicks play

```tsx
// YouTubePlayer.tsx
const startParam = startTime && startTime > 0 ? `&start=${Math.floor(startTime)}` : "";
src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0${startParam}`}
```

### Note on `searchParams` in Next.js 14+ App Router
`searchParams` must be typed as `Promise<{ t?: string }>` and awaited:
```tsx
interface VideoPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}
export default async function Page({ params, searchParams }: VideoPageProps) {
  const { t } = await searchParams;
  const startTime = t ? parseInt(t, 10) : undefined;
}
```

---

## 15. OpenRouter / Claude Integration

### A. Why OpenRouter
OpenRouter is a proxy that routes to any LLM provider (Anthropic, OpenAI, Google, etc.) via a single OpenAI-compatible API. Useful for switching models without SDK changes.

### B. Client Setup
The OpenAI SDK works with OpenRouter by changing `apiKey` and `baseURL`:
```typescript
const getOpenRouter = () => new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY!,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
        'HTTP-Referer': 'https://projectprofound.org', // Required by OpenRouter
        'X-Title': 'Project Profound',
    },
});
```

### C. Model Names on OpenRouter
Use the provider-prefixed format:
- `anthropic/claude-sonnet-4-5` — recommended (< $0.01/call for NDE synthesis)
- `anthropic/claude-opus-4-5` — higher quality, ~5-10x more expensive
- `openai/gpt-4o` — fallback if needed

### D. Claude JSON Compliance — The ONLY Reliable Fix: Assistant Prefill (CRITICAL — READ FIRST)

**The problem:** Claude regularly ignores JSON format instructions in the system prompt and returns plain prose, regardless of how emphatic the instruction is. Simply saying "Return ONLY a valid JSON object" does not work. Even the brace-anchored extraction (`rawContent.indexOf('{')`) fails when there is no `{` at all.

**Terminal evidence:** The server logs show `[Questions API] No JSON object found in response. Raw (500 chars): Those who die suddenly often receive...` — Claude is returning full prose paragraphs with no JSON structure.

**Why fence-stripping is NOT enough:** Previous advice (§17D original) said to strip markdown fences. This handles Claude wrapping JSON in ` ```json ``` ` blocks, but does not handle Claude ignoring JSON entirely and returning prose.

**The definitive fix — Assistant Prefill:**
Add a final `{ role: 'assistant', content: '{' }` message to the messages array. This starts the assistant's turn with `{`, and because Claude continues an existing turn rather than starting fresh, it is physically constrained to complete a valid JSON object.

```typescript
messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Question: ${question}\n\nNDE Accounts:\n\n${context}` },
    // Prefill forces Claude to continue a JSON object — the ONLY reliable method.
    { role: 'assistant', content: '{' },
],
```

**Parsing adjustment required:** The model response now starts mid-JSON (no opening brace), so prepend `'{'` before parsing:
```typescript
// The prefill sent '{'; the response is the remainder. Reconstruct before parsing.
const rawContent = '{' + (gptResponse.choices[0].message.content ?? '');
const firstBrace = rawContent.indexOf('{');
const lastBrace  = rawContent.lastIndexOf('}');
const jsonStr    = rawContent.slice(firstBrace, lastBrace + 1);
const parsed     = JSON.parse(jsonStr);
```

**Do NOT rely on system prompt alone.** The prefill is the authoritative solution.

### E. Secret Manager Setup
Add to `.env.local` for local dev. For Firebase App Hosting:
1. Create secret in Google Secret Manager: `OPENROUTER_API_KEY`
2. Version will be `/versions/1` — use this in `apphosting.yaml` (never `latest`)
3. Project-level IAM is inherited automatically — no per-secret grants needed if the service accounts already have project-level `Secret Manager Secret Accessor`
4. Reference in `apphosting.yaml`:
```yaml
- variable: OPENROUTER_API_KEY
  secret: projects/432036554831/secrets/OPENROUTER_API_KEY/versions/1
```

### F. Supabase Browser Client — Turbopack HMR Singleton (CRITICAL)

**The Problem:** Storing the Supabase browser client in a module-level variable (`let client = null`) does NOT work in development with Turbopack. Turbopack re-executes the module on every HMR file save, resetting `client` to `null`. This causes a new `GoTrueClient` to be created, which tries to acquire `navigator.lock` — but the old client still holds the lock, resulting in `AbortError: signal is aborted without reason` flooding the console. In React Strict Mode, this doubles (mount → unmount → remount), making it much worse.

**Cascading effect:** Even `useMemo` in components that call `createClient()` doesn't help, because the singleton they cache is itself reset on HMR.

**The Fix — globalThis Singleton:**
```typescript
// src/lib/supabase/client.ts
declare global {
  var __supabaseBrowserClient: ReturnType<typeof createBrowserClient> | undefined;
}

export function createClient() {
  if (globalThis.__supabaseBrowserClient) return globalThis.__supabaseBrowserClient;
  globalThis.__supabaseBrowserClient = createBrowserClient(url, key);
  return globalThis.__supabaseBrowserClient;
}
```

`globalThis` maps to the browser's `window` object, which only resets on full page refresh — not HMR. This guarantees exactly one `GoTrueClient` instance per browser session.

**Residual noise — AbortError in card components:** Even with a singleton client, React Strict Mode double-mounts every component. Components that call `supabase.auth.getSession()` in a `useEffect` will generate `AbortError` noise from concurrent lock acquisitions. Silently swallow these in catch blocks:
```typescript
} catch (error) {
  // AbortError = navigator.lock contention from Strict Mode double-mount; harmless noise.
  if (error instanceof Error && error.name === 'AbortError') return;
  console.error('Real error:', error);
}
```
This only affects dev (`Strict Mode` is disabled in production builds).

---

## 18. Questions Page — Synthesis Prompt Design (Mar 2026)

### A. Versioned Prompts — Always Save Before Switching
Before changing the `systemPrompt` in `src/app/api/questions/[slug]/route.ts`, save the current version to `docs/prompts/`. Follow the naming pattern:
- `questions-synthesis-v1-academic.md` — original evidence-based researcher voice
- `questions-synthesis-v2-compassionate-friend.md` — active as of Mar 2026

### B. Current Voice (v2) — Key Requirements
- Style: Malcolm Gladwell as your best friend. Concrete, specific, vivid.
- Reading level: 8th grade. No jargon.
- 3 paragraphs, each 3-5 sentences.
- **P1 structure (two-beat rule):** One framing sentence first (what NDErs say about this topic, or why the question matters) — then one specific vivid moment from the accounts. **Never start cold with "One man/woman...".**
- **P2:** Find the consistent pattern across accounts.
- **P3:** Speak directly to the person asking. Human, grounded, never preachy.

### C. P1 Anti-Patterns — What Breaks It

| Anti-pattern | Cause | Fix |
|---|---|---|
| Starts with `"You are asking if..."` | Instruction said "acknowledge what they're really asking" — Claude restates literally | Tell Claude NOT to paraphrase the question. Never say "you are asking" |
| Starts cold with `"One man who..."` | Few-shot examples ended with a story opener that Claude pattern-matched on | Remove examples; use clear two-beat rule instead |
| Skips framing sentence entirely | Examples compete with the instruction | Remove examples, make the rule explicit: "framing sentence first, story follows" |

### D. Claude Timeout — Increase to 90s for Long Context
Claude Sonnet on OpenRouter is ~2-3x slower than GPT-4o. With 4 referenced videos × 2 chunks each, the 55s AbortSignal fired intermittently. Set to `90_000` ms. If still hitting timeout, switch to `claude-haiku-3-5` which is faster for structured JSON tasks.

### E. Citation System — Numbered Markers, Not Titles
The LLM uses `[1]`, `[2]` markers, not video titles. The page's `renderWithCitations()` function maps numbers to real `/video/[id]` links. This prevents hallucinated titles/URLs entirely. The mapping comes from `referencedVideos` which is populated by pgvector search — the LLM cannot invent a citation outside that list.

### F. More Relevant Videos — Card Layout (not table)
The `moreVideos` section was redesigned from a table to a card-per-row layout in Mar 2026. Each card includes the top matching DB chunk as a `<blockquote>` with a timestamped link to `/video/[id]?t=[seconds]`. The DB chunk is guaranteed non-hallucinated — it comes from `nde_punctuated_embeddings` via pgvector search. See `src/app/questions/[slug]/page.tsx`.

## 15. Questions Pages — SEO & Persistence Architecture (Mar 2026)

### A. question_synthesis Table — Caching Layer
Synthesised Claude answers are stored in `question_synthesis` (not `question_answers` which is for video clip matches). Schema:
`id, question_id (unique FK), short_answer, paragraphs (text[3]), cited_video_ids (text[]), answered_at`

- Cache-read happens **before** every Claude call in `route.ts`. If a valid 3-paragraph row exists, Claude is skipped.
- Cache-write happens after a successful synthesis. **Both curated and user questions are now cached.**
- **Admin regeneration:** Delete the row to force re-synthesis on next load. Use `POST /api/admin/questions/regenerate` with `{ slug }`.
- **user_question_id column (Mar 2026):** `question_synthesis` has a nullable `user_question_id BIGINT FK → user_questions(id) ON DELETE CASCADE`. Exactly one of `question_id` OR `user_question_id` is non-null per row. The `question_id` column is now nullable to support user-only rows. Unique constraint and index on `user_question_id`.

### B. cited_video_ids — Citation Pinning
`[1]`–`[4]` markers map positionally to `referencedVids`. If vector search ranking shifts or a video is deleted, citations could silently point to wrong sources.

**Fix:** `cited_video_ids text[]` stores the exact video_id order at synthesis time. On cache-read, `route.ts` reorders `referencedVids` to match the stored order. Deleted videos are silently dropped.

### C. generateStaticParams / generateMetadata — Use Service Client, Not Cookie Client
`createClient()` from `src/lib/supabase/server.ts` calls `cookies()` internally. **This throws outside a request scope** — during `next build` pre-rendering.

**Fix:** Use `getServiceClient()` (a plain `createSupabaseClient()` with service key) in `generateStaticParams` and `generateMetadata`. The main page component still uses `await createClient()` (auth-aware) since it runs inside a real request.

### D. Warm-Up Script — Pre-Populate Before First Deploy
`scripts/warm-questions.ts` pre-populates `question_synthesis` for all active questions. Run before deploying so the build pre-renders from DB (no live Claude calls at build time).
```bash
npm run warm          # against localhost:3000
npm run warm:prod     # against projectprofound.org
npm run warm -- --dry-run
```
Idempotent — skips already-cached rows. ~81 questions × ~14s average ≈ ~19 minutes.

### E. Firebase App Hosting + ISR
`revalidate = 86400` works on Firebase App Hosting (Cloud Run + Firebase CDN). It is **not Vercel** — do not write "Vercel CDN" in docs. Stale-while-revalidate behaviour is equivalent.
## 16. Navigation — Option A Restructure (Mar 2026)

### A. Final Nav Shape
```
Logo | Questions | Channels | Research ▼ | 🔍 Search | Chat ▼ | About ▼ | Newsletter | Contribute | [Auth]
```
- **Questions** and **Channels** are direct top-level links (no dropdown) — they are the site's highest-traffic destinations and primary SEO anchor pages.
- **Research ▼** dropdown → Veridical Perception, Greyson Scale, Transformation Index. These are the three scoring-based research lenses; they go together.
- **Chat ▼** dropdown → Compassionate Chat, Research Chat. No other items.
- The previous **Explore** and **Ask** dropdowns were removed. Both had "Big Questions" as a duplicate item across two menus, which confused the IA and split crawl priority.

### B. Key Design Principle
Navigate by *user intent*, not internal taxonomy. Users are either seeking answers (Questions → Chat) or researching (Research ▼). Do not put the same destination in two menus.

### C. Mobile Nav
Mirrors desktop exactly. Questions and Channels are direct links at top of sheet. Research is a collapsible accordion with the 3 research pages. Chat is a collapsible accordion with 2 chat modes.

### D. RSC Icon Serialization — Always Pass Strings, Not Components
When a Server Component passes props to a `"use client"` Client Component, **React only allows plain-JSON-serializable values**. Lucide icon components are functions/objects with methods — passing them crosses the RSC boundary and throws:
```
Error: Only plain objects can be passed to Client Components from Server Components.
```
**Pattern:** Pass an `iconName: string` from the server, resolve it to the component inside the client using a local `ICON_MAP`. Example:
```ts
// Server Component (page.tsx):
<CategoryAccordion iconName="Heart" ... />

// Client Component (category-accordion.tsx):
const ICON_MAP = { Heart, Sparkles, Baby, ... };
const Icon = ICON_MAP[iconName] ?? HelpCircle;
```
This pattern applies to **any** React component (Lucide, heroicons, etc.) passed as a prop across the server/client boundary.

## 17. Questions Page — Accordion Category Sections (Mar 2026)

### A. Architecture
The questions page (`src/app/questions/page.tsx`) is a Server Component. The old `CategorySection` function was a static server component — converting it to an accordion required client-side `useState`, but Server Components can't use hooks.

**Solution:** Extract a `"use client"` wrapper: `src/components/questions/category-accordion.tsx`. The server page passes plain-serializable props (strings, arrays of plain objects) and the client component owns all toggle state.

### B. Default-Open Behaviour
The first category in each Part (`reunion`, `dying-process`, `identity`) defaults to `open = true` so users see content immediately rather than a fully-collapsed wall. All other categories default to closed.

### C. Info Density on Headers
Each accordion header shows: icon · category title · subtitle · `"X questions"` count · chevron. This lets users understand the scope of a section before expanding it — they can scan all 12 categories at a glance.

## 18. User Question Moderation (Mar 2026)

### A. Table Separation
- `nde_questions` — the 81 curated editorial questions. These are the only questions shown on `/questions`. User questions never appear there.
- `user_questions` — visitor-submitted questions. They only live at `/questions/[slug]` if navigated to directly (or via shared URL).
- `question_answers` — legacy table, never read by current code. Pre-dates pgvector approach. Can be ignored.
- `question_synthesis` — Claude answer cache for **both** curated and user questions. Uses `question_id` (curated) or `user_question_id` (user) — exactly one is non-null per row.

### B. Soft Delete with is_active
`user_questions.is_active BOOLEAN DEFAULT true` — setting it to `false` hides the question without deleting it.
- Route `/api/questions/[slug]` returns 404 if `is_active = false`.
- Admin can restore by setting back to `true` via `POST /api/admin/questions/hide-user` with `{ slug, restore: true }`.
- Hiding also deletes the `question_synthesis` cache row so a stale answer isn't served if restored.

### C. Admin Moderation UI
- `/admin/questions` — client-side list page with All/Active/Hidden filter tabs, inline Hide/Restore toggle, synthesis cache status, and external link to the question page.
- `RegenerateBar` (on individual question pages) shows a **Hide question** button for user questions (not curated). One confirm click required. Curated questions only show "Regenerate answer".
- Admin dashboard (`/admin`) has a Moderation section card linking there.

### D. Supabase Nested Select with Multiple FKs — Use Explicit Join
If a table has two FKs to different parent tables (e.g., `question_synthesis` has `question_id → nde_questions` AND `user_question_id → user_questions`), Supabase's nested select syntax `table_name(col, col)` is **ambiguous** — it may join on the wrong FK silently.

**Fix:** Do two explicit queries and merge in JS:
```ts
const { data: questions } = await supabase.from('user_questions').select('id, ...');
const ids = questions.map(q => q.id);
const { data: syntheses } = await supabase
  .from('question_synthesis')
  .select('user_question_id, short_answer')
  .in('user_question_id', ids);
const synthMap = new Map(syntheses.map(s => [s.user_question_id, s]));
const merged = questions.map(q => ({ ...q, synthesis: synthMap.get(q.id) ?? null }));
```

---

## 18. Video Page v2 Redesign — Patterns & Gotchas (2026-03-11)

### A. Route Promotion
- **Old design:** `src/app/video-2025/[id]` → `/video-2025/[id]`
- **New design:** `src/app/video/[id]` → `/video/[id]`
- All existing `/video/` hrefs site-wide automatically point to the new page after the directory rename. No mass link updates required.

### B. `raw_timestamped_subtitles` Shape — Use Runtime Parser
Supabase returns `raw_timestamped_subtitles` (JSONB) typed as `Json`. The data is stored as `{ data: TimestampedSegment[] }` but a bare TypeScript cast gives NO runtime guarantee.

**Wrong pattern (breaks silently):**
```ts
const rawTs = video.raw_timestamped_subtitles as { data: TimestampedSegment[] } | null;
const segments = rawTs?.data; // undefined if shape differs
```

**Correct pattern — use the safe parser in `video/[id]/page.tsx`:**
```ts
function getTimestampedSegments(raw: unknown): TimestampedSegment[] | null {
    // handles { data: [] }, plain [], and double-encoded strings
}
const rawSegments = getTimestampedSegments(video.raw_timestamped_subtitles);
```

### C. Timestamp Links → Seek + Autoplay Pattern
Transcript `[0:45]` links must **not** use `<Link href="?t=45">` (page reload resets play state).
Use `seekYouTubePlayer(seconds)` from `YouTubePlayer.tsx` which dispatches a `"yt-seek"` `CustomEvent` on `window`. The player listens, seeks, and autoplays — no navigation.

**Client wrapper:** `src/components/video/TimestampLink.tsx`  
**Event dispatcher:** `seekYouTubePlayer()` exported from `YouTubePlayer.tsx`

### D. Sticky Sidebar Independent Scroll — Avoid
Tailwind classes `lg:sticky lg:top-14 lg:self-start lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto` on a sidebar container create two independent scroll contexts. Users experience content cutoff and disorientation. **Prefer normal document flow** (both columns scroll together) unless the sidebar content is independently navigable and short enough not to cause overflow.

### E. New video Components (session output)
| Component | Path | Purpose |
|---|---|---|
| `EvidenceStrengthCard` | `src/components/video/EvidenceStrengthCard.tsx` | Evidence/RVNDE score card matching Greyson/Transformation design |
| `TimestampLink` | `src/components/video/TimestampLink.tsx` | Client button that fires `yt-seek` event |
| `SocialShareButton` | `src/components/video/ShareButton.tsx` | Share sheet (copy URL, social links) |
