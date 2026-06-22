-- Operations & Cost Control (admin /admin/operations).
-- OWNER-RUN: staging shares the production database, so apply this deliberately
-- via the Supabase SQL Editor — do not auto-run from app code.
--
-- Self-contained + idempotent. The earlier 20260611_api_usage_log.sql was never
-- applied to the live DB, so this migration (the one actually run, 2026-06-22)
-- creates api_usage_log itself if missing, with the quota columns built in, then
-- adds the service_switches pause kill-switches. Safe to run more than once.

-- ── 1. api_usage_log: one row per external AI/API call, attributed to an operation ──
-- Token services fill prompt/completion/total_tokens; quota services (YouTube
-- units, Supadata credits, Tavily queries, fal images, Resend emails) fill
-- quantity + unit instead. cost_usd is the common denominator across both.
CREATE TABLE IF NOT EXISTS public.api_usage_log (
    id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at        timestamptz NOT NULL DEFAULT now(),
    provider          text NOT NULL,                 -- 'openrouter' | 'openai' | 'youtube' | 'supadata' | 'tavily' | 'fal' | 'resend'
    model             text,
    operation         text NOT NULL,                 -- feature attribution, e.g. 'youtube.playlistItems'
    prompt_tokens     integer,
    completion_tokens integer,
    total_tokens      integer,
    cost_usd          numeric(10, 6) NOT NULL DEFAULT 0,  -- estimated unless provider returns actual
    cost_is_estimate  boolean NOT NULL DEFAULT true,
    status            text NOT NULL DEFAULT 'success',    -- 'success' | 'error'
    metadata          jsonb,
    created_date      date GENERATED ALWAYS AS ((created_at AT TIME ZONE 'UTC')::date) STORED,
    quantity          numeric,                        -- units / credits / images / emails (non-token)
    unit              text                            -- 'units' | 'credits' | 'images' | 'emails'
);

-- If the table pre-existed (e.g. from 20260611) without the quota columns, add them.
ALTER TABLE public.api_usage_log
    ADD COLUMN IF NOT EXISTS quantity numeric,
    ADD COLUMN IF NOT EXISTS unit     text;

CREATE INDEX IF NOT EXISTS api_usage_log_created_at_idx   ON public.api_usage_log (created_at DESC);
CREATE INDEX IF NOT EXISTS api_usage_log_created_date_idx ON public.api_usage_log (created_date);
CREATE INDEX IF NOT EXISTS api_usage_log_operation_idx    ON public.api_usage_log (operation);
CREATE INDEX IF NOT EXISTS api_usage_log_provider_idx     ON public.api_usage_log (provider);

COMMENT ON COLUMN public.api_usage_log.quantity IS
    'Non-token metering amount (YouTube quota units, Supadata credits, fal images, Resend emails). Null for pure token calls.';

-- RLS: service-role writes from server routes/scripts; admin reads go through the
-- service-role client (already gated by isAdminUser()). No anon/auth policy.
ALTER TABLE public.api_usage_log ENABLE ROW LEVEL SECURITY;

-- ── 2. service_switches: pause kill-switches ──
CREATE TABLE IF NOT EXISTS public.service_switches (
    key        text PRIMARY KEY,                 -- 'master' | 'video_ingestion' | ...
    paused     boolean NOT NULL DEFAULT false,
    label      text,
    note       text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by text
);

COMMENT ON TABLE public.service_switches IS
    'Pause kill-switches read by src/lib/ops/switches.ts. master pauses all paid work; the rest gate one process group each. Never gates chat/search/page-serving.';

-- Seed the switch rows (idempotent). All default to running (paused=false).
INSERT INTO public.service_switches (key, label, note) VALUES
    ('master',           'All paid processing', NULL),
    ('video_ingestion',  'Video discovery / scrape (YouTube API)', NULL),
    ('video_analysis',   'Video analysis (Supadata + OpenAI)', NULL),
    ('blog_generation',  'Blog generation (Claude + Tavily)', NULL),
    ('image_generation', 'Image generation (fal.ai)', NULL),
    ('email',            'Email sending (Resend)', NULL)
ON CONFLICT (key) DO NOTHING;

-- RLS: service-role only (admin reads/writes go through the service-role client
-- in /api/admin/operations, already gated by isAdminUser()). No public access.
ALTER TABLE public.service_switches ENABLE ROW LEVEL SECURITY;
