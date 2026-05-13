# Environment Variables

> This document lists all environment variables required to run the project.
> For security rules, see [LEARNINGS.md Section 13](./LEARNINGS.md#13-api-key-security--leak-prevention-critical).

## Local Development (`.env.local`)

`.env.local` is **never committed to git** (covered by `.gitignore`). Copy `.env.example` and fill in values.

### Supabase
| Variable | Description | Scope |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | Client + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public/Anon API Key | Client + Server |
| `SUPABASE_SERVICE_KEY` | Service Role Key (Admin access, bypasses RLS) | Server-only |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy alias for `SUPABASE_SERVICE_KEY` | Server-only |

### AI & Analysis
| Variable | Description | Scope |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API Key (GPT-4o-mini, text-embedding-3-small) | Server-only |

### Search
> **Note:** Search is powered by PostgreSQL full-text search via Supabase RPCs (`keyword_search_videos`, `keyword_search_facets`). No external search service env vars are required.

### Intake Pipeline
| Variable | Description | Scope |
|---|---|---|
| `SUPADATA_API_KEY` | Supadata API key for YouTube transcript fetching (replaces Apify, Mar 2026) | Server-only |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key for channel metadata enrichment | Server-only |

### Automation
| Variable | Description | Scope |
|---|---|---|
| `CRON_SECRET` | Bearer token for authenticating internal cron/scheduler calls | Server-only |

### Supabase Vault Secrets (pg_cron scheduler)
The UAP Video Processor runs via `pg_cron` inside Supabase (replaces unreliable GitHub Actions cron — see migration `20260513_001_pg_cron_uap_processor.sql`).

| Vault Secret Name | Description | Managed Via |
|---|---|---|
| `uap_processor_url` | Firebase App Hosting direct URL (same as GHA `APP_DIRECT_URL`) | Supabase Dashboard > SQL Editor |
| `uap_processor_cron_secret` | `CRON_SECRET` value for API auth | Supabase Dashboard > SQL Editor |

**To update:** `SELECT vault.update_secret('uap_processor_url', 'https://new-url');`
**To view cron jobs:** `SELECT * FROM cron.job;`
**To pause:** `SELECT cron.unschedule('uap-video-processor');`
**Full docs:** See migration file `supabase/migrations/20260513_001_pg_cron_uap_processor.sql`


### n8n Webhooks (Legacy — being phased out)
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SEARCH_WEBHOOK_URL` | n8n search webhook (legacy) |
| `NEXT_PUBLIC_CHAT_WEBHOOK_URL` | n8n chat webhook (legacy) |
| `NEXT_PUBLIC_CHAT_2_WEBHOOK_URL` | n8n chat v2 webhook (legacy) |
| `NEXT_PUBLIC_N8N_WEBHOOK_URL` | n8n general webhook (legacy) |
| `NEXT_PUBLIC_CHAT_TEST_WEBHOOK_URL` | n8n test webhook (legacy) |

### Blog Pipeline
| Variable | Description | Scope |
|---|---|---|
| `OPENROUTER_API_KEY` | OpenRouter key (Claude Sonnet 4.5 for article drafting + voice pass) | Server-only |
| `TAVILY_API_KEY` | Tavily Search API key (research + fact-checking, free tier 1K credits/mo) | Server-only |
| `FAL_API_KEY` | fal.ai key for hero image generation (Flux Dev) | Server-only |
| ~~`PERPLEXITY_API_KEY`~~ | **Deprecated May 2026** — quota exhausted, replaced by Tavily | — |

### Debug / Misc
| Variable | Description |
|---|---|
| `IS_DEBUG_MODE` | Set to `true` to bypass auth in local dev intake API |
| `CLAUDE_API` | Anthropic API key (optional, used in early experiments) |

---

## Production (Firebase App Hosting — `apphosting.yaml`)

Production secrets are stored in **Google Cloud Secret Manager** (project `432036554831`).
They are referenced in `apphosting.yaml` using `secret:` references — **never `value:`**.

| Secret Name | Secret Manager Reference | Rotated? |
|---|---|---|
| `OPENAI_API_KEY` | `projects/432036554831/secrets/OPENAI_API_KEY/versions/1` | ✅ Feb 2026 |
| `SUPABASE_SERVICE_KEY` | `projects/432036554831/secrets/SUPABASE_SERVICE_KEY/versions/1` | — |

| `SUPADATA_API_KEY` | `projects/432036554831/secrets/SUPADATA_API_KEY/versions/1` | ✅ Mar 2026 |
| `YOUTUBE_API_KEY` | `projects/432036554831/secrets/YOUTUBE_API_KEY/versions/latest` | — |
| `CRON_SECRET` | `projects/432036554831/secrets/CRON_SECRET/versions/3` | — |

> **When rotating a key:** Create a new version in Secret Manager, then update the `versions/N` number in `apphosting.yaml` and redeploy.

---

## Development Setup

1. Copy the example env file:
   ```bash
   cp .env.example .env.local
   ```
2. Fill in values from your Supabase Dashboard, OpenAI Platform, Supadata Dashboard, etc.
3. Restart the dev server:
   ```bash
   npm run dev
   ```

## ⚠️ Security Rules

See **[LEARNINGS.md Section 13](./LEARNINGS.md#13-api-key-security--leak-prevention-critical)** for the full incident report and permanent rules. TL;DR:
- Never run `git add .` — always inspect `git status` and add files explicitly.
- Never add secret values directly to `apphosting.yaml`. Always use `secret:` references.
- Never commit `.next`, `.next.old*`, or `.env*` files.
