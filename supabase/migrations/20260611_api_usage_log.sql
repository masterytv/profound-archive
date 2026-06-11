-- API usage tracking (admin cost dashboard + budget guardrail).
-- OWNER-RUN: staging shares the production database, so apply this deliberately
-- via `supabase db push` (or the SQL editor) — do not auto-run from app code.
--
-- One row per external AI/API call, tagged with the OPERATION that made it
-- (e.g. 'blog-story.draft', 'questions-autogen') so spend can be attributed to
-- a feature, which no provider dashboard can do.

CREATE TABLE IF NOT EXISTS public.api_usage_log (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at      timestamptz NOT NULL DEFAULT now(),
    provider        text NOT NULL,                 -- 'openrouter' | 'openai' | 'tavily' | 'fal' | 'resend'
    model           text,                          -- e.g. 'anthropic/claude-sonnet-4-5'
    operation       text NOT NULL,                 -- feature attribution, e.g. 'blog-story.draft'
    prompt_tokens   integer,
    completion_tokens integer,
    total_tokens    integer,
    cost_usd        numeric(10, 6) NOT NULL DEFAULT 0,  -- estimated unless provider returns actual
    cost_is_estimate boolean NOT NULL DEFAULT true,
    status          text NOT NULL DEFAULT 'success',    -- 'success' | 'error'
    metadata        jsonb,                         -- { slug, requestId, ... }
    created_date    date GENERATED ALWAYS AS ((created_at AT TIME ZONE 'UTC')::date) STORED
);

-- Dashboard reads: group by day / provider / operation, recent-first.
CREATE INDEX IF NOT EXISTS api_usage_log_created_at_idx ON public.api_usage_log (created_at DESC);
CREATE INDEX IF NOT EXISTS api_usage_log_created_date_idx ON public.api_usage_log (created_date);
CREATE INDEX IF NOT EXISTS api_usage_log_operation_idx ON public.api_usage_log (operation);
CREATE INDEX IF NOT EXISTS api_usage_log_provider_idx ON public.api_usage_log (provider);

-- RLS: service-role writes from server routes/scripts; no public access.
-- Admin reads go through the service-role client in the admin API route,
-- which is already gated by isAdminUser(), so no anon/auth policy is granted.
ALTER TABLE public.api_usage_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.api_usage_log IS
    'One row per external AI/API call, attributed to the originating operation. Written by src/lib/ai/usage-tracker.ts; read by /admin/usage.';
