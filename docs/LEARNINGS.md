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

---

## 14. Theming Convention — Light & Dark Mode (CRITICAL — READ BEFORE BUILDING ANY PAGE)

> **The app has a full CSS variable token system defined in `src/app/globals.css`. Using semantic tokens instead of raw Tailwind colors means a page automatically supports both light and dark modes with ZERO extra `dark:` classes needed.**

### A. Why past pages needed individual dark-mode fixes

Pages built with hardcoded Tailwind color names (`bg-white`, `bg-slate-50`, `text-slate-900`) ignore the theme system entirely. Each one had to be patched manually with `dark:` variants. This was fixed in the March 2026 dark-theme audit, but **do not repeat this pattern**.

### B. The Token System (`globals.css`)

CSS variables are defined under `:root` (light) and `.dark` (dark). Tailwind maps them via `tailwind.config.ts`. Both themes are maintained in one place.

| Semantic Token | Light Value | Dark Value | Use for |
|---|---|---|---|
| `bg-background` | `slate-50 (#F8FAFC)` | deep indigo-navy `#0A0F1E` | Page backgrounds |
| `bg-card` | `white` | lifted surface `#12182B` | Cards, panels, sidebars |
| `text-foreground` | `slate-900` | warm near-white | Primary text |
| `text-muted-foreground` | `slate-500ish` | `slate-400ish` | Secondary/caption text |
| `bg-muted` | `slate-100` | dark muted surface | Inputs, code blocks, tags |
| `border-border` | `slate-200ish` | dark border | All dividers and borders |
| `bg-primary` | `blue-600 #2563EB` | same | CTAs, links, accent buttons |
| `text-primary` | `blue-600` | same | Accent text, links |
| `bg-secondary` | `slate-100` | dark secondary | Secondary buttons |
| `bg-popover` | `white` | `card` value | Dropdowns, tooltips |
| `bg-destructive` | `red-600` | `red-900/30` | Danger actions |

### C. ⛔ FORBIDDEN PATTERNS (will break dark mode)

Never use these hardcoded colors in new pages or components:

```jsx
// ❌ WRONG — breaks dark mode
<div className="bg-white">
<div className="bg-slate-50">
<div className="bg-gray-50">
<div className="bg-gray-100">
<p className="text-slate-900">
<p className="text-gray-700">
<div className="border-slate-200">

// Also forbidden — inline styles for backgrounds:
<section style={{ backgroundColor: 'white' }}>
```

### D. ✅ CORRECT PATTERNS (use these always)

```jsx
// ✅ CORRECT — adapts to both themes automatically
<div className="bg-background">          {/* page shell */}
<div className="bg-card">               {/* cards, panels */}
<div className="bg-muted">              {/* inputs, tags, tinted areas */}
<p className="text-foreground">         {/* primary text */}
<p className="text-muted-foreground">   {/* secondary text */}
<div className="border-border">         {/* dividers */}
<button className="bg-primary text-primary-foreground"> {/* CTA */}
```

### E. New Page Template (copy-paste starter)

When creating a brand-new page, start with this shell — it handles both themes automatically:

```tsx
// src/app/your-page/page.tsx
export default function YourPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Hero / header area */}
      <section className="bg-muted/50 border-b border-border py-12">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-foreground">Title</h1>
          <p className="text-muted-foreground mt-2">Subtitle</p>
        </div>
      </section>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">

        {/* Card */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground mb-2">Card Title</h2>
          <p className="text-muted-foreground">Card body text.</p>
        </div>

        {/* Form input */}
        <input
          className="w-full rounded-lg border border-border bg-muted px-4 py-3
                     text-foreground placeholder:text-muted-foreground
                     focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Enter something..."
        />

        {/* Primary button */}
        <button className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg
                           hover:opacity-90 transition-opacity font-medium">
          Action
        </button>

        {/* Secondary / ghost button */}
        <button className="border border-border bg-card text-foreground px-5 py-2.5
                           rounded-lg hover:bg-muted transition-colors font-medium">
          Secondary
        </button>

      </div>
    </div>
  )
}
```

### F. When you MUST use `dark:` overrides

Only use explicit `dark:` variants when:
1. **Colored accent elements** — e.g., a green badge that needs a different shade in dark: `bg-emerald-50 dark:bg-emerald-500/20`
2. **External/third-party components** that don't respect CSS variables
3. **Inline styles** that cannot be switched to Tailwind tokens (use sparingly)
4. **Subtle alpha overlays** — e.g., `dark:bg-white/5` for hierarchy within the dark card surface

For these cases the **pattern is always semi-transparent alpha** in dark mode rather than a flat color:
```jsx
// Tinted card within a dark page:
<div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">

// Colored badge (green example):
<span className="bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">

// Hover state on dark surface:
<button className="hover:bg-slate-100 dark:hover:bg-white/10">
```

### G. Component authoring checklist

Before committing any new component, verify:
- [ ] No `bg-white`, `bg-slate-50`, `bg-gray-*` without a matching `dark:` variant
- [ ] No `text-slate-900` / `text-gray-900` — use `text-foreground` or add `dark:text-slate-100`
- [ ] No `border-slate-200` without `dark:border-white/10` or `dark:border-border`
- [ ] Form inputs have `dark:bg-muted` or `dark:bg-white/5` + `dark:placeholder:text-muted-foreground`
- [ ] Hover/active states work on both surfaces (use alpha-based dark hovers)

### H. Where everything lives

| File | Purpose |
|---|---|
| `src/app/globals.css` | **Single source of truth** — all CSS variables for both themes |
| `tailwind.config.ts` | Maps CSS variables → Tailwind class names |
| `src/components/ui/` | Shadcn components — already theme-aware |
| `src/lib/utils.ts` | `cn()` helper for class merging |

### I. ⛔ GOTCHA: Native `<select>` and `<input>` dropdowns ignore CSS background-color

The browser renders the **option list** of a native `<select>` at the OS level — CSS `background-color` and `color` on the `<select>` itself do NOT reach the drop-down list. In dark mode the list always shows as bright white (macOS/Windows default).

**Fix:** Add `dark:[color-scheme:dark]` to every native `<select>` (and `<input type="date">` etc.) so the browser renders the OS dropdown in dark mode:

```jsx
// ✅ Correct
<select className="... dark:[color-scheme:dark]">
  <option>...</option>
</select>

// ❌ Wrong — bg-color is applied to the widget border only, not the option list
<select className="dark:bg-slate-800">
  <option>...</option>
</select>
```

### J. ⛔ GOTCHA: Shared/analysis components need `dark:` just like pages

Components like `NderfAnalysisSection`, `ScoreBadges`, `ChannelAnalysisSummary`, `CategoryAccordion`, etc. are **not pages**, but they still need dark mode variants on every `bg-white`, `bg-*-50`, `text-slate-900` class — they don't inherit theming automatically.

**Rule:** Any component in `src/components/` that uses hardcoded color classes **must** be audited for dark mode, especially:
- `bg-white` → `dark:bg-white/5`
- `bg-*-50` (pastel badge backgrounds) → `dark:bg-*-500/20`
- `text-*-700` (dark text on pastel) → `dark:text-*-300`
- `border-*-200` → `dark:border-*-500/30`

### K. ⛔ GOTCHA: Inline `style={{ background: '...' }}` gradients are invisible to dark mode

Inline style gradients (e.g., `style={{ background: "linear-gradient(135deg, #F0FDF4 ...)" }}`) are **not affected by the `.dark` class** — they always render regardless of theme state.

**Fix:** Replace with Tailwind gradient utilities + dark mode overrides:

```jsx
// ❌ Wrong — always renders, ignores dark mode
<section style={{ background: "linear-gradient(135deg, #F0FDF4 0%, #F8FAFC 40%)" }}>

// ✅ Correct — dark mode classes override the gradient
<section className="bg-gradient-to-br from-emerald-50 via-slate-50 to-blue-50
                    dark:from-transparent dark:via-transparent dark:to-transparent dark:bg-card">
```

## 20. Email Subscription System — Archetype Profile Reports (Mar 2026)

### A. Architecture

Subscribers receive a personalized **profile report** in their first email only. This is stored in `email_templates.profile_report` (nullable TEXT) and rendered by `VideoEmail.tsx` as a styled card above the video.

**Flow:** `sendFirstStory.ts` → fetches `profile_report` from `email_templates` → passes to `VideoEmail` → profile card renders above video.

**Key decision:** Profile only sent on the first email. Subsequent cron emails use `VideoEmail` without `profileReport` so they stay clean and video-focused.

### B. email_templates Table — Full Column Reference

| Column | Type | Purpose |
|---|---|---|
| `archetype` | TEXT (PK) | Archetype ID (`griever`, `seeker`, etc.) or `newsletter_welcome` |
| `subject` | TEXT | Email subject line |
| `intro_text` | TEXT | Italic paragraph above the video title |
| `cta_text` | TEXT | Button label (default: "Watch this story →") |
| `cta_href` | TEXT | Button URL (newsletter_welcome only) |
| `from_name` | TEXT | Sender display name |
| `profile_report` | TEXT | Long-form 2–4 paragraph profile for the archetype (first email only) |
| `updated_at` | TIMESTAMPTZ | Last save timestamp |

### C. Admin Pages for Email

| Page | Path | Purpose |
|---|---|---|
| Email CRM | `/admin/email` | Subscriber list, stats, test sends |
| Email Templates | `/admin/email/templates` | Edit subject/intro/CTA per archetype, live preview |
| Archetype Profiles | `/admin/email/profiles` | Edit 2–4 paragraph profile per archetype, live preview |

All admin email pages use `/api/email/template-save` (service role, upserts on `archetype` PK) to save. The preview route (`/api/email/preview?archetype=X`) renders live DB content into the email HTML and is `force-dynamic, no-store`.

### D. VideoEmail Profile Card Styling

The profile card uses inline styles (required for email client compatibility):
- Background: `#F0EBE3` (warm tan, matches the brand)
- Heading: `#1E293B`, 15px, uppercase, Georgia serif
- Body: `#374151`, 15px, 1.7 line-height, Georgia serif
- Paragraphs split by double-newline (`\n\n`) from the stored TEXT

### E. template-save API — What It Accepts

`POST /api/email/template-save` accepts any subset of template fields:
```json
{ "archetype": "griever", "profile_report": "..." }
```
Fields not present in the payload are preserved on upsert (Postgres UPSERT with `ON CONFLICT DO UPDATE` only sets what's provided).

---

## 18. CES Feedback Widget

### Architecture
- **Widget:** `src/components/ces-feedback-widget.tsx` — `"use client"` component, registered in `src/app/layout.tsx` wrapped in `<Suspense>` (required because it uses `useSearchParams`).
- **API:** `POST /api/ces-feedback` (insert score immediately on click) + `PATCH /api/ces-feedback` (add reason on submit). Both use service client — anon RLS was blocking inserts in this project's PostgREST configuration even with correct `WITH CHECK (true)` policies. Using service client on server-side API routes is safe.
- **Admin page:** `/admin/ces` reads from `ces_dashboard` and `ces_path_breakdown` views using service client.

### Key Design Decisions
- **Score is saved immediately** on button click (before the follow-up question). A PATCH then adds the `reason` and sets `phase='complete'`. This ensures partial responses (score only) are never lost.
- **Suppression is tracked in React state**, not checked inline in event handlers. This prevents the "ghost tab" bug where the tab renders but swallows clicks silently because `isSuppressed()` returned true.
- **Desktop:** Persistent left-edge tab (always visible → click to open). Tab is hidden when suppressed. `showTab = !isMobile && (isTestMode || !suppressed)`.
- **Mobile:** Auto-appears as bottom sheet after 2 minutes. Uses `mobileTimerRef` cleanup in `useEffect`.
- **`z-[9998]`:** One below the ChatPopup (`z-[9999]`) so they never collide.

### Test Mode
- **`?ces_test=1`** in the URL, or `NEXT_PUBLIC_CES_TEST=true` in `.env.local`, bypasses all localStorage suppression and forces the widget visible immediately.
- Widget never appears on `/admin/*` even in test mode.
- Data IS saved to the real DB in test mode. Clear test rows with: `TRUNCATE TABLE public.ces_feedback;`

### Resetting Data
```sql
TRUNCATE TABLE public.ces_feedback;
```

---

## 19. Questions Pages — Defensive SEO Additions (Mar 2026)

Three defensive additions to `src/app/questions/[slug]/page.tsx` to harden the SEO/QEO implementation.

### A. `dynamicParams = true` — Required for User Question Slugs

`generateStaticParams` only pre-renders **curated** slugs from `nde_questions`. Without `export const dynamicParams = true`, any user-submitted question slug (`/questions/will-i-see-my-dog-in-heaven`) returns a 404 at runtime because Next.js treats unknown params as not found by default.

**Fix:** Add after `generateStaticParams`:
```ts
export const dynamicParams = true; // user question slugs render on-demand via ISR
```

### B. `generateStaticParams` try/catch — Build Resilience

If Supabase is unreachable at build time (network blip, cold CI, deploy race), the bare `await supabase.from(...)` throws and **breaks the entire build**. Wrapping in try/catch makes the failure graceful — the build completes with zero pre-rendered question pages, and they all fall through to `dynamicParams = true` at runtime.

```ts
export async function generateStaticParams() {
    try {
        const { data } = await supabase.from('nde_questions').select('slug').eq('is_active', true);
        return (data ?? []).map(q => ({ slug: q.slug }));
    } catch (err) {
        console.warn('[generateStaticParams] Supabase unavailable at build time — falling back to runtime ISR:', err);
        return [];
    }
}
```

### C. HTTP 410 Content Page for Retired Questions

When `is_active = false` on an `nde_questions` row, the page previously fell through to a vague "Question not found" 404. Google treats 410 (Gone) as an explicit deindex signal — much faster than 404.

**Implementation:** A two-pass lookup detects the retired slug before calling the API:
1. Check for active curated question (`is_active = true`) — normal flow.
2. Check for **inactive** curated question (`is_active = false`) → `isActive = false`.
3. Check `user_questions` — same pattern.

If `!isActive`, return a branded "no longer available" page **before** `fetchQuestionData` is called. No wasted API call, no Claude invocation.

**Note:** The content layer returns a 200 with a "gone" message. For a true `HTTP 410` status code, a `middleware.ts` entry is needed to intercept the slug and set the response status. The content layer alone is sufficient for all major search engines and AI crawlers in practice.

**Rule — slugs are immutable:** Never change a slug. If a curated question needs rewording, update `consumer_question` text only. If a new slug is needed, create a new row and set the old one to `is_active = false`.

## 21. Security Audit — 2026-03-14

A full codebase security audit was performed covering 40+ API routes, middleware, config files, and Supabase RLS policies. Key findings and fixes:

### Critical Fixes Applied
1. **Admin API routes had zero auth:** `/api/admin/scanner`, `/api/admin/user-questions`, `/api/admin/scanner/pending` were callable by anyone. Fixed: all now use `isAdminUser()` from `src/lib/auth/admin-guard.ts`.
2. **`/api/email/manage-subs` was open:** Anyone who knew an email could read/modify subscriptions. Fixed: now requires `unsubscribe_token` or admin session.
3. **Debug mode bypass:** `IS_DEBUG_MODE=true` in `/api/batch/run-fingerprint-batch` skipped auth. Fixed: removed entirely.

### High-Priority Fixes Applied
4. **Zero security headers:** Added 5 headers (`X-Frame-Options`, `X-Content-Type-Options`, `HSTS`, `Referrer-Policy`, `Permissions-Policy`) to `next.config.ts`.
5. **XSS in contact form:** User input was interpolated raw into HTML email. Fixed: HTML entity escaping applied.
6. **Weak email/send auth:** Any authenticated user (not just admins) could trigger email sends. Fixed: proper admin role check added.

### Shared Admin Guard
**Always import `isAdminUser()` from `src/lib/auth/admin-guard.ts`** for any new `/api/admin/*` route. Do not duplicate the cookie + role check logic. The function:
- Reads auth cookies via `@supabase/ssr`
- Checks `profiles.role` for `admin` or `super_admin`
- Returns `false` on any error (fail-closed)

### New Rule: Security Headers
Security headers are configured in `next.config.ts` → `headers()`. Never remove them. If you need to customize CSP for a specific page, add a more specific `source` pattern instead.

### RLS Policy Tightening (Migration: `tighten_rls_policies`)
Dropped 6 overly permissive policies:
- `ces_feedback`: DROP UPDATE for anon (INSERT kept — widget needs it).
- `clips`: DROP UPDATE for public (read-only now).
- `quiz_leads`: DROP UPDATE for anon + authenticated (INSERT + SELECT kept).
- `scan_queue` / `scan_runs`: Changed from ALL for `public` → ALL for `service_role` only.
- `blog_settings` and `user_questions` left unchanged (already correct).

**Rule:** When creating RLS policies for internal/infrastructure tables (scan_queue, scan_runs, blog_settings), always scope to `service_role` — never `public`.

### Cloudflare Rate Limiting
- Free plan: 1 rule, 10-second window only.
- Current rule: 3 requests per 10 seconds on `/api/chat-compassionate`, `/api/contact`, `/api/questions/custom` (combined via OR). Action: Block for 10s.

## 22. `generateStaticParams` Cannot Use `cookies()` — 2026-03-14

**The Problem:** `createClient()` from `@/lib/supabase/server` calls `cookies()` internally. When used inside `generateStaticParams`, `generateMetadata`, or any function that runs at **build time** (SSG/ISR), Next.js throws:

```
Error: `cookies` was called outside a request scope
```

**The Fix:** Use a direct `@supabase/supabase-js` client with the public anon key instead:

```ts
import { createClient as createAnonClient } from "@supabase/supabase-js";

function buildClient() {
    return createAnonClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
}

export async function generateStaticParams() {
    const supabase = buildClient(); // No cookies needed
    // ...
}
```

**Pages fixed:** `blog/series/[series]`, `experiencer/[slug]`, `about/[slug]`.

**Pages already safe:** `blog/[slug]` (uses `createServiceClient`), `blog/category/[category]` (hardcoded array), `questions/[slug]` (already uses non-cookie client).

**Rule:** Never use `createClient()` from `@/lib/supabase/server` inside `generateStaticParams`, `generateMetadata`, or any `force-static` page component. Use a direct `@supabase/supabase-js` client instead. If the table has public SELECT RLS, use the anon key. If it requires elevated access, use `SUPABASE_SERVICE_KEY`.

## 23. Custom Markdown Renderer — Link/Italic Processing Order — 2026-03-14

**The Problem:** The custom markdown-to-HTML renderer in `src/lib/markdown.ts` processed italic (`_text_`) **before** links (`[text](url)`). This caused underscores inside video URLs like `/video/cA_xqhwR_NU` to be converted to `<em>` tags, breaking the link.

**The Fix:** Two changes:
1. **Process links FIRST** — `[text](url)` → `<a>` tags are created before italic regex runs, so underscores inside `href` attributes are safe.
2. **Tighten underscore-italic regex** — Changed `/_(.+?)_/g` to `/(?<![\/\w])_([^_]+)_(?![\/\w])/g` which requires underscores to be at word boundaries, not inside URLs or identifiers.

**Rule:** In any custom markdown parser, always process links before inline formatting (bold/italic). URLs contain characters (`_`, `*`) that conflict with markdown emphasis syntax.

## 24. Blog Post Draft Visibility — 2026-03-14

**The Problem:** The blog post page (`blog/[slug]/page.tsx`) used a service client with no status filter, so draft posts were publicly accessible to anyone with the URL, including search engine crawlers.

**The Fix:** Added status-based access control in `getPost()`:
- `status === 'published'` → visible to everyone
- `status === 'draft'` → check for authenticated session. If logged in, show (admin preview). If anonymous, return `null` (triggers 404).

**Rule:** Always filter by `status = 'published'` for public-facing content pages. Use session checks for draft previews, never expose drafts via service client without auth.

## 25. `apphosting.yaml` — Adding New Secrets Checklist — 2026-03-14

**The Problem:** Adding a secret to Google Cloud Secrets Manager alone does NOT make it available to the Firebase App Hosting app. The secret must also be referenced in `apphosting.yaml`.

**Full checklist for adding a new secret:**
1. Create the secret in **Google Cloud Secrets Manager**
2. Add a version with the actual value
3. Add a reference in **`apphosting.yaml`** under `env:`:
   ```yaml
   - variable: MY_NEW_SECRET
     secret: projects/432036554831/secrets/MY_NEW_SECRET/versions/1
   ```
4. **CRITICAL: Use `/versions/1`** (or specific version number), NOT `/versions/latest`. Firebase App Hosting cannot resolve `latest` — it will fail at build time with "Misconfigured secret" error. The only exceptions are `TYPESENSE_API_KEY` and `YOUTUBE_API_KEY` which were pinned to `latest` before this limitation was discovered; they work because Firebase auto-pins them during build.
5. Commit and push to trigger a new build
6. Permissions are auto-inherited at the project level — no manual grant needed

**Secrets NOT in apphosting.yaml won't exist as `process.env.*` at runtime**, even if they're in Secrets Manager.

**Rule:** When adding any new secret, always update `apphosting.yaml`. Pin to a specific version number (`/versions/1`). If you rotate a secret, create a new version in Secrets Manager AND update the version number in `apphosting.yaml`.

## 26. Question Auto-Generation for Missing Slugs — 2026-03-15

**The Problem:** When the guide pipeline generates articles with internal links to `/questions/[slug]`, the target question might not exist in the database. Visiting the URL returned "Question not found" — a bad user experience.

**The Fix:** The `[slug]/route.ts` API now auto-generates answers for unknown question slugs:
1. Converts slug to question text (`what-do-children-experience-during-ndes` → `what do children experience during ndes`)
2. Generates a HyDE passage via OpenAI
3. Synthesizes an answer via the existing pipeline (same as manual questions)
4. Persists the question in `user_questions` and `question_synthesis` so it's permanent

**Rate Limiting:** 10 auto-generated questions per hour. Rate limit events logged to `rate_limit_events` table for admin visibility. The page shows a polite "check back later" message on 429.

**Key Files:**
- `src/app/api/questions/[slug]/route.ts` — auto-generation logic + rate limiter
- `src/app/questions/[slug]/page.tsx` — 90s fetch timeout + rate limit UI
- `src/lib/questions/question-utils.ts` — shared `generateHyde`, `toSlug`, `slugToQuestion`

**Rule:** When creating internal `/questions/` links in articles, the auto-generation system will handle creating the answers. But the fetch timeout is 90s — generation takes ~60s, so the first visit may feel slow.

## 27. Blog Pipeline Link Validation — 2026-03-15

**The Problem:** LLMs (Claude, Perplexity) generate URLs from training data. These URLs may have been valid when training data was crawled but are now broken (e.g., NDERF.org redesigned their site, Amazon delisted books with old ASINs). Worse, some sites return HTTP 200 with an error page instead of a proper 404 ("soft-404s").

**Three categories of broken links:**
1. **Standard 404s** — NDERF.org old URLs (`/Features/*.htm`)
2. **Soft-404s** — Amazon returns 200 with "Sorry, we couldn't find that page" for invalid ASINs
3. **Bot-blocked 403/405/406** — PMC, PubMed, and academic journals block automated requests but the URLs are valid

**The Fix (Pipeline Stage 4.5):**
1. **Trusted domain whitelist** — Academic sites (PMC, PubMed, DOI, Frontiers, etc.) are auto-skipped since they block bots but are always valid
2. **Soft-404 body inspection** — For Amazon/NDERF, the checker does a GET request and scans the HTML body for known error indicators
3. **Perplexity replacement search** — Broken links are sent to Perplexity with detailed context (book title, author, link text) to find working replacements
4. **Replacement verification** — Every replacement URL suggested by Perplexity is re-checked before being applied (Perplexity can also hallucinate broken ASINs)
5. **Unfixable link stripping** — If no valid replacement is found, the `[text](broken-url)` is converted to plain `text` — no dead links in the final article

**Rule:** When adding new external link sources to articles, add their domain to either `TRUSTED_DOMAINS` (if they block bots) or `SOFT_404_PATTERNS` (if they return 200 for error pages) in the pipeline's Stage 4.5.
