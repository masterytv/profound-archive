-- ============================================================
-- Share Your Experience — link experiencer profiles to accounts
-- ============================================================
-- experiencer_profiles is matched by NAME for video-based profiles
-- (src/lib/pipeline/experiencer-sync.ts). Shared stories must never attach
-- to a stranger's profile with the same name, so a named submitter gets a
-- new profile tied to their account via this column. Merging with an
-- existing video-based profile is a manual admin action.
--
-- NOTE: shared staging/production database — this IS a production change.
-- ============================================================

ALTER TABLE public.experiencer_profiles
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS experiencer_profiles_user_id_key
    ON public.experiencer_profiles (user_id) WHERE user_id IS NOT NULL;

-- Verify:
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'experiencer_profiles' AND column_name = 'user_id';
