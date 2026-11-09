-- ============================================================
-- Share Your Experience — allow video when the full name isn't shared
-- ============================================================
-- Tom, 2026-11-09: "Don't share my full name publicly" hides the name only;
-- people can still share video (and their own voice). The original table
-- blocked display_mode = 'anonymous' with media_kind = 'video'.
--
-- NOTE: shared staging/production database — this IS a production change.
-- ============================================================

ALTER TABLE public.share_stories DROP CONSTRAINT IF EXISTS share_anonymous_no_video;

-- Verify (expect no rows):
-- SELECT conname FROM pg_constraint WHERE conname = 'share_anonymous_no_video';
