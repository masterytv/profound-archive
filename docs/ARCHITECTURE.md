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
- **Process Manager:** pm2 (`profound-worker` service).
- **Processor:** `scripts/rapid-process.ts` — video intake with daily credit caps (80 UAP + 19 NDE = 99/day). Handles backfill and large processing runs.
- **Supadata API:** Transcript extraction (3,000 credits/month budget).
- **Note:** Day-to-day discovery and processing is now fully handled by pg_cron → Firebase. The Oracle worker is used for large batch runs and backfill only.

## Data Flow

### User Search
1. User types query in Frontend.
2. Request sent to `/api/search` (or `/api/search3`).
3. Endpoint proxies to n8n OR calls Supabase `search_nde_moments` RPC.
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

All scheduled jobs run via **pg_cron** inside Supabase PostgreSQL. Jobs that require application logic call Next.js API routes on **Firebase App Hosting** via `net.http_post()`. Auth is via `CRON_SECRET` from Supabase Vault.

### Daily Pipeline (UTC)

| Time | Job | Type | What It Does |
|---|---|---|---|
| 3:00 | VACUUM nde_vids | SQL-only | Table maintenance |
| 3:05 | VACUUM nde_chatbot_chunks | SQL-only | Table maintenance |
| 3:10 | VACUUM nde_punctuated_embeddings | SQL-only | Table maintenance |
| 3:15 | VACUUM nde_analysis | SQL-only | Table maintenance |
| 5:00 | `trigger_normalize_entities()` | HTTP → Firebase | Dedup canonical persons/orgs/programs |
| 5:30 | `trigger_recompute_channel_scores()` | HTTP → Firebase | Refresh `uap_channel_scores` from encounters |
| 6:00 | `trigger_rebuild_viz_caches()` | HTTP → Firebase | Rebuild all 7 `viz_graph_cache` entries |
| 6:15 | `REFRESH MATERIALIZED VIEW uap_channel_stats_mv` | SQL-only | Refresh UAP channel stats materialized view |
| 6:30 | `REFRESH MATERIALIZED VIEW nde_channel_stats_mv` | SQL-only | Refresh NDE channel stats materialized view |
| 7:00 | `trigger_nde_channel_discovery_all()` | HTTP → Firebase | Scan all NDE channels, queue new videos |
| 10:00 | `trigger_email_dispatch()` | HTTP → Firebase | Send queued behavioral emails |
| 16:00 | `trigger_nde_blog_questions()` | HTTP → Firebase | Generate NDE blog Q&A |
| 17:00 | `trigger_uap_blog_questions()` | HTTP → Firebase | Generate UAP blog Q&A |
| 18:00 | `trigger_nde_blog_stories()` | HTTP → Firebase | Generate NDE blog stories |

### NDE Video Pipeline (daily cycle)

| Time (UTC) | Job | What It Does |
|---|---|---|
| 7:00 | `trigger_nde_channel_discovery_all()` | Scan **all** NDE channels at once → queue new videos |
| :00,:10,...,:50 (every 10 min) | `trigger_nde_video_processor()` | Process 1 queued NDE video through full intake pipeline |

**Daily flow:** Discovery at 7am UTC (3am ET) finds all new videos from the previous day across all 47 channels and queues them. The every-10-min processor drains the queue — 30 videos ≈ done by 9am ET.

### UAP Video Pipeline (unchanged)

| Schedule | Job | What It Does |
|---|---|---|
| Every 10 min (:05,:15,...) | `trigger_uap_video_processor()` | Process queued UAP videos |
| Hourly :30 | `trigger_uap_channel_discovery()` | Scan one UAP channel per hour for new uploads |

### Weekly

| Schedule | Job | What It Does |
|---|---|---|
| Sunday 4:00 | Cron cleanup | Prune `cron.job_run_details` older than 7 days |
| Monday 9:00 | `trigger_feedback_digest()` | Send weekly feedback digest to admin |

### GitHub Actions (active schedules)

All automation has been migrated to pg_cron. Only one scheduled GitHub Actions workflow remains:

| Workflow | Schedule | What It Does |
|---|---|---|
| `channel-score-snapshot.yml` | 1st of month, 7:00 UTC | Snapshot UAP channel scores to history table |

All other workflow files in `.github/workflows/` retain `workflow_dispatch:` for manual triggering but have no active cron schedules.

### Vault Secrets Used

| Secret Name | Purpose |
|---|---|
| `uap_processor_url` | Firebase App Hosting URL (base for all `/api/cron/*` calls) |
| `uap_processor_cron_secret` | Shared secret for cron endpoint auth |

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
