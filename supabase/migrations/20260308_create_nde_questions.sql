-- ============================================================
-- Migration: 20260308_create_nde_questions.sql
-- Purpose:   Curated Q&A system for NDEs.
--
-- nde_questions  — admin-curated questions with a single cached
--                  AI answer, refreshed nightly by a cron job.
--
-- user_questions — user-submitted questions, deduplicated against
--                  nde_questions so no duplicate curation work.
-- ============================================================

-- ── 1. nde_questions ─────────────────────────────────────────
-- Stores the curated question bank. Each row is a canonical question
-- that has been (or will be) answered by an AI pass over the NDE corpus.
-- The answer is cached in `cached_answer` and refreshed by a nightly
-- cron that sets `needs_refresh = TRUE` after the corpus has grown.

CREATE TABLE IF NOT EXISTS public.nde_questions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The question itself (normalized lower-case for dedup lookups)
  question        text        NOT NULL,
  question_normalized text    GENERATED ALWAYS AS (lower(trim(question))) STORED,

  -- Cached AI answer (NULL until first generation run)
  cached_answer   text,

  -- Tracks whether the answer should be re-generated on next cron run.
  -- Set to TRUE automatically when videos are added (see trigger below),
  -- or manually for forced refreshes.
  needs_refresh   boolean     NOT NULL DEFAULT TRUE,

  -- Admin can hide low-quality or off-topic questions without deleting them.
  is_active       boolean     NOT NULL DEFAULT TRUE,

  -- Admin-curated category + subcategory (e.g. category="reunion", subcategory="Seeing Our Loved Ones Again")
  category        text,
  subcategory     text,

  -- HyDE (Hypothetical Document Embedding) passage.
  -- A first-person NDE narrative written to match the register of transcript chunks.
  -- This is embedded at query time and matched against nde_punctuated_embeddings.
  -- NULL until admin fills it in; search falls back to embedding the question itself.
  ai_query        text,

  -- Metadata
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Ensure the raw question text is unique (case-insensitive via index)
  CONSTRAINT nde_questions_question_key UNIQUE (question_normalized)
);

-- Trigram index for fast question text search
CREATE INDEX IF NOT EXISTS idx_nde_questions_question_trgm
  ON public.nde_questions
  USING GIN (question_normalized gin_trgm_ops);

-- Index for the nightly cron query: WHERE needs_refresh = TRUE AND is_active = TRUE
CREATE INDEX IF NOT EXISTS idx_nde_questions_refresh
  ON public.nde_questions (needs_refresh, is_active);

-- Keep updated_at current automatically
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'nde_questions_set_updated_at'
  ) THEN
    CREATE TRIGGER nde_questions_set_updated_at
      BEFORE UPDATE ON public.nde_questions
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;


-- ── 2. user_questions ────────────────────────────────────────
-- Stores individual user-submitted questions.
-- On submission (via API route), we check whether a matching
-- nde_questions row already exists (by question_normalized) and
-- set `canonical_question_id` if so. This avoids redundant AI work
-- and lets us surface the cached answer immediately.
--
-- Deduplication logic lives in the API route, NOT a DB trigger,
-- so we can normalise text in TypeScript before comparison.

CREATE TABLE IF NOT EXISTS public.user_questions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The question exactly as the user typed it
  question_raw            text        NOT NULL,

  -- Link to the canonical curated question if a match was found.
  -- NULL means "not yet matched" - the nightly cron or an admin
  -- can back-fill this later.
  canonical_question_id   uuid        REFERENCES public.nde_questions(id)
                                      ON DELETE SET NULL,

  -- Who asked (NULL for anonymous / unauthenticated questions)
  user_id                 uuid        REFERENCES auth.users(id)
                                      ON DELETE SET NULL,

  -- Quick session fingerprint for rate-limiting anonymous users.
  -- We store a hashed value (SHA-256 hex of IP + user-agent) — never the raw IP.
  session_fingerprint     text,

  -- Admin review workflow
  -- pending → approved (question enters nde_questions) or rejected
  status                  text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'rejected', 'duplicate')),

  -- Optional admin note explaining a rejection / duplicate decision
  admin_note              text,

  -- Path the user was on when they asked (for context / analytics)
  source_path             text,

  created_at              timestamptz NOT NULL DEFAULT now()
);

-- Index for admin review queue: all pending questions newest-first
CREATE INDEX IF NOT EXISTS idx_user_questions_status_created
  ON public.user_questions (status, created_at DESC);

-- Index to quickly find all submissions for a given user
CREATE INDEX IF NOT EXISTS idx_user_questions_user_id
  ON public.user_questions (user_id)
  WHERE user_id IS NOT NULL;

-- Index to find all user submissions that resolved to the same canonical question
-- (useful for understanding demand for a given question)
CREATE INDEX IF NOT EXISTS idx_user_questions_canonical
  ON public.user_questions (canonical_question_id)
  WHERE canonical_question_id IS NOT NULL;


-- ── 3. Row Level Security ─────────────────────────────────────

-- nde_questions:
--   Public: anyone can SELECT active questions + their cached answers.
--   Write:  service_role only (admin API routes use service_role key).

ALTER TABLE public.nde_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active nde_questions"
  ON public.nde_questions
  FOR SELECT
  USING (is_active = TRUE);

-- Admins write via API routes that use the Supabase service key,
-- which bypasses RLS entirely — no separate INSERT/UPDATE policy needed.


-- user_questions:
--   INSERT: authenticated users can submit their own questions.
--           Anonymous users submit via API route (service_role bypass).
--   SELECT: users can only read their own questions.
--           Admins read all via service_role in API route.
--   UPDATE/DELETE: blocked for regular users (admin API route only).

ALTER TABLE public.user_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own questions"
  ON public.user_questions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR user_id IS NULL  -- anonymous submissions routed through API
  );

CREATE POLICY "Users can read their own questions"
  ON public.user_questions
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR user_id IS NULL  -- anonymous questions are not surfaced to other users
  );


-- ── 4. Helper RPC: get_questions_for_refresh ─────────────────
-- Called by the nightly cron API route to fetch the batch of
-- questions that need an AI answer re-generated.
-- Returns only `is_active = TRUE AND needs_refresh = TRUE`,
-- ordered oldest-updated first so the queue drains evenly.
-- The cron route calls this, runs the AI pass, then UPSERTs
-- cached_answer + sets needs_refresh = FALSE.

CREATE OR REPLACE FUNCTION public.get_questions_for_refresh(batch_limit int DEFAULT 20)
RETURNS TABLE (
  id              uuid,
  question        text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id, question
  FROM   public.nde_questions
  WHERE  is_active = TRUE
    AND  needs_refresh = TRUE
  ORDER BY updated_at ASC
  LIMIT  batch_limit;
$$;

-- Grant execute to the anon / authenticated roles so the API route
-- can call it using the anon key in server-side code.
-- (The actual AI work happens server-side, so this is safe.)
GRANT EXECUTE ON FUNCTION public.get_questions_for_refresh(int) TO anon, authenticated;
