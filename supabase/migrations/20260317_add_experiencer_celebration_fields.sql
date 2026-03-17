-- Migration: Add celebration features to experiencer_profiles
-- Part of the Experiencer Profile Pages redesign
-- Adds columns for: photos, social links, courage recognition,
-- highlighted quotes, channel appearances, themes, and admin-editable fields.

-- ─── Photo & Bio ────────────────────────────────────────────────────────────
ALTER TABLE experiencer_profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE experiencer_profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- ─── Social & Offerings ────────────────────────────────────────────────────
-- social_links: { website?, linkedin?, twitter?, instagram?, youtube?, facebook? }
ALTER TABLE experiencer_profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';
-- offerings: [{ type: "book"|"course"|"service"|"speaking", title, url, image_url? }]
ALTER TABLE experiencer_profiles ADD COLUMN IF NOT EXISTS offerings JSONB DEFAULT '[]';

-- ─── Courage Recognition ───────────────────────────────────────────────────
-- Non-competitive, editorially chosen label
ALTER TABLE experiencer_profiles ADD COLUMN IF NOT EXISTS contribution_label TEXT DEFAULT 'Courageous Storyteller';

-- ─── Highlighted Content (pipeline-populated) ──────────────────────────────
-- Best quote from their transcripts
ALTER TABLE experiencer_profiles ADD COLUMN IF NOT EXISTS highlight_quote TEXT;
-- Source attribution for the highlight quote
ALTER TABLE experiencer_profiles ADD COLUMN IF NOT EXISTS highlight_quote_source TEXT;
-- Top NDE elements with their verbatim quotes
-- [{name, quote, confidence, video_id, element_label}]
ALTER TABLE experiencer_profiles ADD COLUMN IF NOT EXISTS highlight_elements JSONB;
-- Channels they appeared on
-- [{channel_id, name, avatar_url, video_count}]
ALTER TABLE experiencer_profiles ADD COLUMN IF NOT EXISTS channel_appearances JSONB;
-- Recurring themes derived from their elements
ALTER TABLE experiencer_profiles ADD COLUMN IF NOT EXISTS core_themes TEXT[];

-- ─── Experience Metadata (pipeline-populated) ──────────────────────────────
ALTER TABLE experiencer_profiles ADD COLUMN IF NOT EXISTS first_shared_year INTEGER;
ALTER TABLE experiencer_profiles ADD COLUMN IF NOT EXISTS experience_type TEXT;
ALTER TABLE experiencer_profiles ADD COLUMN IF NOT EXISTS trigger_category TEXT;

-- ─── RLS Policies ──────────────────────────────────────────────────────────
-- Public read access for published profiles (if not already set)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'experiencer_profiles'
    AND policyname = 'Public can read published profiles'
  ) THEN
    ALTER TABLE experiencer_profiles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Public can read published profiles"
      ON experiencer_profiles FOR SELECT
      USING (published_at IS NOT NULL);
  END IF;
END $$;
