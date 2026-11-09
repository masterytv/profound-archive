-- Rollback for the Share Your Experience migrations (20261109_001..005).
-- DESTRUCTIVE: deletes every shared story, agreement, invite and intro.
-- Empty the story-media bucket first (Storage UI or API); SQL can't delete
-- the stored files themselves.

BEGIN;
DROP POLICY IF EXISTS "story-media owner insert" ON storage.objects;
DROP POLICY IF EXISTS "story-media owner select" ON storage.objects;
DROP POLICY IF EXISTS "story-media owner update" ON storage.objects;
DROP POLICY IF EXISTS "story-media owner delete" ON storage.objects;
DELETE FROM storage.buckets WHERE id = 'story-media';

DROP INDEX IF EXISTS public.experiencer_profiles_user_id_key;
ALTER TABLE public.experiencer_profiles DROP COLUMN IF EXISTS user_id;

DROP TABLE IF EXISTS public.channel_contacts;
DROP TABLE IF EXISTS public.share_youtube_removals;
DROP TABLE IF EXISTS public.share_intro_requests;
DROP TABLE IF EXISTS public.share_channel_invites;
DROP TABLE IF EXISTS public.share_channel_members;
DROP TABLE IF EXISTS public.share_agreements;
DROP TABLE IF EXISTS public.share_contacts;
DROP TABLE IF EXISTS public.share_intro_channels;
DROP TABLE IF EXISTS public.share_edit_suggestions;
DROP TABLE IF EXISTS public.share_story_versions;
DROP TABLE IF EXISTS public.share_stories;
DROP FUNCTION IF EXISTS public.share_touch_updated_at();
DROP SEQUENCE IF EXISTS public.share_anon_number_seq;
COMMIT;
