# System Architecture

## High-Level Overview
Project Profound is a modern web application built on the **T3 Stack** principles (Next.js, Tailwind, TypeScript) with **Supabase** as the backend-as-a-service (BaaS). It leverages **OpenAI** for AI-powered analysis and scoring.

## Core Components

### 1. Frontend Client (Next.js)
- **Framework:** Next.js 14+ (App Router).
- **Hosting:** Firebase App Hosting (us-east4).
- **Styling:** Tailwind CSS + Shadcn UI.
- **State:** Server Components + React Query / Hooks.

### 2. Backend Services (Supabase)
- **Database:** PostgreSQL.
- **Auth:** Supabase Auth (Email + Social).
- **Storage:** Supabase Storage (Artifacts, Avatars).
- **Vector Store:** `pgvector` extension for embeddings (`nde_chatbot_chunks`, `nde_punctuated_embeddings`).

### 3. AI & Logic Layer
- **Compassionate Chat:** Native Next.js API route calling OpenAI directly.
- **Search Logic:** Native Supabase RPCs (`search_nde_moments`, `search_uap_encounters`).
- **Video Processing Pipeline:** Oracle VM worker (`pm2` + `rapid-process.ts`) for YouTube discovery, transcript extraction, and AI scoring.
- **Scoring Models:** UAP-ESS (7-28), UAP-CDS (0-32), UAP-CTI, Greyson NDE Scale, NDE Transformation Index, cvNDE.

### 4. Oracle VM Worker
- **Host:** Oracle Cloud ARM instance (`profound-worker`).
- **Process Manager:** pm2 (`profound-worker` service) running `scripts/rapid-process.ts` — UAP batch processor, 80 UAP/day cap, runs overnight then sleeps until UTC midnight.
- **Crontab:** Single source of truth for all scheduled application automation. See §Scheduled Maintenance Pipeline below.
- **Supadata API:** Transcript extraction (3,000 credits/month budget).

## Data Flow

### User Search
1. User types query in Frontend.
2. Request sent to `/api/search3`.
3. Endpoint calls a Supabase RPC — `keyword_search_videos` (Postgres FTS) or the
   semantic vector search, depending on the request's `type`.
4. Results returned to UI.

### Compassionate Chat
1. User sends message.
2. API generates embedding (OpenAI).
3. RPC `nde_chatbot_match` selects relevant video contexts.
4. LLM generates compassionate response using context.
5. Interaction logged to `nde_chat_logs`.

### Chat Popup Widget
- A global `ChatPopup` component is rendered in `src/app/layout.tsx`.
- Reuses the same `/api/chat-compassionate` endpoint as the full-page chat.
- Auto-hides on `/chat-compassionate` via `usePathname()` check.
- Client-side only — no additional server or database requirements.

### Homepage Curated Grid (ISR)
1. Page revalidates every 6 hours (`revalidate = 21600`).
2. Seed = `Math.floor(Date.now() / 21600000)` — deterministic per window.
3. Top 50 videos fetched per score type (Veridical from `nde_vids`, Transformation & Greyson from `nde_analysis`).
4. Seeded shuffle selects 6 per column.
5. CDN caches the result for the entire 6-hour window.

### Explorer Pages (`/explore/*`)
1. Server component reads URL search params (`sort`, `dir`, `filter`, `page`).
2. Supabase query fetches sorted/filtered data with `count: "exact"` for pagination.
3. Video metadata joined from `nde_vids` via a second query.
4. Client `ExplorerControls` component manages sort/filter/pagination via URL params.

## Security Model
- **RLS:** All database access is guarded by Row Level Security.
- **Environment Variables:** Secrets stored in `.env.local` (local) or Firebase/Supabase env configs.
- **Middleware:** `src/middleware.ts` protects admin routes and refreshes tokens.
- **Cron Auth:** All cron endpoints require `CRON_SECRET` (stored in Supabase Vault as `uap_processor_cron_secret`).

---

## Scheduled Maintenance Pipeline

### Architecture

All scheduled application automation runs via **Oracle VM crontab** (`crontab -l` on `profound-worker`). This is the single source of truth — if you move hosting providers, update `.env.local` on Oracle and nothing else changes.

**pg_cron** (Supabase PostgreSQL) is reserved for SQL-only operations that require no knowledge of the application server:

| pg_cron Job | Schedule | What It Does |
|---|---|---|
| `vacuum-nde-vids` | 3:00 UTC | VACUUM ANALYZE `nde_vids` |
| `vacuum-nde-chatbot` | 3:05 UTC | VACUUM ANALYZE `nde_chatbot_chunks` |
| `vacuum-nde-embeddings` | 3:10 UTC | VACUUM ANALYZE `nde_punctuated_embeddings` |
| `vacuum-nde-analysis` | 3:15 UTC | VACUUM ANALYZE `nde_analysis` |
| `refresh-uap-channel-stats-mv` | 6:15 UTC | REFRESH MATERIALIZED VIEW `uap_channel_stats_mv` |
| `refresh-nde-channel-stats-mv` | 6:30 UTC | REFRESH MATERIALIZED VIEW `nde_channel_stats_mv` |
| `cron-cleanup` | Sunday 4:00 UTC | DELETE old `cron.job_run_details` (7-day retention) |

### Oracle Crontab (full schedule)

| Time (UTC) | Job | What It Does |
|---|---|---|
| 7:00 daily | `scanner-discover.ts --domain nde --all` | Scan all 47 NDE channels, queue new videos |
| :01,:11,...,:51 every 10 min | `scanner-process.ts` | Process 1 queued NDE video through full intake pipeline |
| :30 hourly | `scanner-discover.ts --domain uap` | Scan one UAP channel for new uploads (round-robin) |
| 3:00 every 3h | `nde-batch-analysis.ts --pipeline greyson` | Run Greyson NDE Scale analysis batch |
| 3:20 every 3h | `nde-batch-analysis.ts --pipeline core-elements` | Run Core Elements analysis batch |
| 3:30 every 3h | `nde-batch-analysis.ts --pipeline journey-flow` | Run Journey Flow analysis batch |
| 3:40 every 3h | `nde-batch-analysis.ts --pipeline phenomenology` | Run Phenomenology analysis batch |
| 5:00 daily | `curl /api/cron/normalize-entities` | Dedup canonical persons/orgs/programs |
| 5:30 daily | `curl /api/cron/recompute-channel-scores` | Refresh `uap_channel_scores` from encounters |
| 5:00 Sunday | `weekly-maintenance.ts` | Prune old logs and scan_runs |
| 6:00 daily | `curl /api/cron/rebuild-viz-caches` | Rebuild all 7 `viz_graph_cache` entries |
| 6:00 Sunday | `uap-batch-triad.ts` | UAP Triad batch analysis (weekly) |
| 8:00 Sunday | `uap-knowledge-batch.ts` | UAP knowledge base batch (weekly) |
| 9:00 Monday | `curl /api/email/feedback-digest` | Send weekly feedback digest to admin |
| 10:00 daily | `curl /api/email/cron` | Send queued behavioral emails |
| 16:00 daily | `blog-generate.ts --domain nde --type question` | Generate NDE blog Q&A |
| 17:00 daily | `blog-generate.ts --domain uap --type question` | Generate UAP blog Q&A |
| 18:00 daily | `blog-generate.ts --domain nde --type story` | Generate NDE blog stories |

**UAP video processing** is handled by pm2 `profound-worker` running `scripts/rapid-process.ts` — a nightly batch that processes up to 80 UAP videos, then sleeps until UTC midnight. It also checks the NDE queue at midnight as a safety net if the 10-min tick missed anything.

### NDE Daily Flow

7:00 UTC — discovery scans all 47 channels → queues new videos  
7:01 UTC onward — every 10 min tick processes 1 video → typically done within 90 minutes (7 videos = done by ~8:30 UTC)

### GitHub Actions (active schedules)

All automation runs on Oracle or pg_cron. Only one scheduled GitHub Actions workflow remains:

| Workflow | Schedule | What It Does |
|---|---|---|
| `channel-score-snapshot.yml` | 1st of month, 7:00 UTC | Snapshot UAP channel scores to history table |

All other workflow files in `.github/workflows/` retain `workflow_dispatch:` for manual triggering but have no active cron schedules.

### Portability Note

If you move from Firebase App Hosting to another provider (Vercel, Fly.io, self-hosted), only two things change:
1. Update `BASE_URL` / `APP_URL` in Oracle's `.env.local`
2. The pg_cron SQL-only jobs have zero coupling to the app server — they don't change

---

## Caching Strategy

### ISR (Incremental Static Regeneration)

All public pages use Next.js ISR via `export const revalidate = N` (seconds). Pages are server-rendered once, then served from CDN cache until the revalidation timer expires.

| Revalidate | Pages | Examples |
|---|---|---|
| 86400 (24h) | 39 pages | Channel listings, video detail, experiencers, persons, orgs, events |
| 10800 (3h) | 1 page | `/nde` (NDE hub — heavier traffic) |
| 3600 (1h) | 3 pages | `/blog`, `/research/cross-domain`, viz API routes |

### Pre-Computed Data

| Cache Layer | Data | Refresh |
|---|---|---|
| `uap_channel_stats_mv` (materialized view) | Channel-level AVG scores, video counts | Daily 6:15 UTC |
| `uap_channel_scores` (table) | Per-channel composite scores | Daily 5:30 UTC |
| `viz_graph_cache` (table) | 7 pre-computed visualization graphs | Daily 6:00 UTC |
| `uap_video_stats` (table) | Per-video MAX scores from encounters | Updated on intake |
| `uap_canonical_*` (tables) | Normalized persons/orgs/programs/events | Daily 5:00 UTC |
| `experiencer_profiles` / `uap_contactee_profiles` | Pre-computed experiencer summaries | Updated on intake |

### On-Demand Cache Busting

`POST /api/admin/revalidate` allows admin to force-refresh specific pages after pipeline runs:

```bash
curl -X POST https://projectprofound.org/api/admin/revalidate \
  -H 'Content-Type: application/json' \
  -d '{"secret": "<CRON_SECRET>", "paths": ["/uap/channels", "/uap/intelligence"]}'
```
