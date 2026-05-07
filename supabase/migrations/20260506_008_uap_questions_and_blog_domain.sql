-- Migration 008: UAP Questions table + blog_posts domain column
-- Mirrors nde_questions schema for UAP domain isolation
-- Adds domain column to blog_posts for multi-domain content separation

-- ── 1. Create uap_questions table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.uap_questions (
    id              SERIAL PRIMARY KEY,
    slug            TEXT NOT NULL UNIQUE,
    category        TEXT NOT NULL,
    category_label  TEXT NOT NULL,
    consumer_question TEXT NOT NULL,
    ai_query        TEXT NOT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    embedding       vector(1536),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    subcategory     TEXT,
    needs_refresh   BOOLEAN NOT NULL DEFAULT true,
    is_active       BOOLEAN NOT NULL DEFAULT true
);

-- Index for slug lookups (unique constraint already creates one, but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_uap_questions_category ON public.uap_questions (category);
CREATE INDEX IF NOT EXISTS idx_uap_questions_is_active ON public.uap_questions (is_active);

-- ── 2. RLS on uap_questions ────────────────────────────────────────────────────
ALTER TABLE public.uap_questions ENABLE ROW LEVEL SECURITY;

-- Public can read active questions
CREATE POLICY "uap_questions_public_read"
    ON public.uap_questions
    FOR SELECT
    USING (is_active = true);

-- Service role can do everything (pipeline writes)
CREATE POLICY "uap_questions_service_all"
    ON public.uap_questions
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ── 3. Add domain column to blog_posts ─────────────────────────────────────────
-- Default 'nde' preserves backward compatibility for all existing posts
ALTER TABLE public.blog_posts
    ADD COLUMN IF NOT EXISTS domain TEXT NOT NULL DEFAULT 'nde';

-- Index for domain filtering (admin queries, cron idempotency checks)
CREATE INDEX IF NOT EXISTS idx_blog_posts_domain ON public.blog_posts (domain);

-- Composite index for common admin query: domain + status
CREATE INDEX IF NOT EXISTS idx_blog_posts_domain_status ON public.blog_posts (domain, status);
