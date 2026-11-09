-- ============================================================
-- Share Your Experience — tables, RLS
-- ============================================================
-- See directives/ARCHITECTURE-SHARE-YOUR-EXPERIENCE.md §2.
--
-- NOTE: staging and production share one database — running this IS a
-- production change. Tom runs it deliberately. Rollback:
-- supabase/rollbacks/20261109_share_rollback.sql
--
-- Access model:
--   * All writes go through server code using the service role.
--   * RLS lets a signed-in user read ONLY their own rows (drafts, agreements,
--     contacts, memberships). Public pages read published stories through
--     server code with an explicit column whitelist (src/lib/share/public.ts),
--     never with the anon key.
--   * Contact details exist only in auth.users (email) and share_contacts.
-- ============================================================

BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.share_anon_number_seq START 101;

CREATE TABLE IF NOT EXISTS public.share_stories (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    slug                    text NOT NULL UNIQUE,
    status                  text NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','processing','reviewing','held','published','removed')),
    display_mode            text NOT NULL DEFAULT 'anonymous'
                            CHECK (display_mode IN ('named','anonymous')),
    display_name            text,
    anon_number             bigint NOT NULL DEFAULT nextval('public.share_anon_number_seq'),
    experience_type         text NOT NULL DEFAULT 'nde'
                            CHECK (experience_type IN ('nde','ste','uap','obe','adc','other')),
    title                   text,
    year_approx             integer CHECK (year_approx IS NULL OR (year_approx BETWEEN 1900 AND 2100)),
    country                 text,
    region                  text,
    language                text NOT NULL DEFAULT 'en',
    appearance_pref         text NOT NULL DEFAULT 'none'
                            CHECK (appearance_pref IN ('camera','audio_only','none')),
    media_kind              text NOT NULL DEFAULT 'text'
                            CHECK (media_kind IN ('text','audio','video','file')),
    media_path              text,          -- story-media bucket; original upload / recording
    media_mime              text,
    original_text           text,          -- typed text, extracted file text, or transcript
    transcript_id           text,          -- AssemblyAI job id
    body_text               text,          -- the published (edited) text
    summary                 text,          -- 2–3 sentences, for the channel directory
    narration_path          text,          -- story-media bucket; synthetic narration mp3
    image_url               text,          -- AI image (public media bucket)
    crisis_flag             boolean NOT NULL DEFAULT false,
    intro_mode              text NOT NULL DEFAULT 'none'
                            CHECK (intro_mode IN ('none','all','selected')),
    agreement_version       text NOT NULL,
    experiencer_profile_id  bigint,        -- named stories only (experiencer_profiles.id)
    is_test                 boolean NOT NULL DEFAULT false,
    published_at            timestamptz,
    youtube_status          text NOT NULL DEFAULT 'pending'
                            CHECK (youtube_status IN ('pending','uploaded','failed','skipped')),
    youtube_video_id        text,
    youtube_error           text,
    processing_error        text,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT share_named_needs_name CHECK (display_mode = 'anonymous' OR display_name IS NOT NULL),
    CONSTRAINT share_anonymous_no_video CHECK (display_mode = 'named' OR media_kind <> 'video')
);

CREATE INDEX IF NOT EXISTS share_stories_user_idx      ON public.share_stories (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS share_stories_published_idx ON public.share_stories (status, is_test, published_at DESC);
CREATE INDEX IF NOT EXISTS share_stories_profile_idx   ON public.share_stories (experiencer_profile_id);
CREATE INDEX IF NOT EXISTS share_stories_transcript_idx ON public.share_stories (transcript_id);

CREATE TABLE IF NOT EXISTS public.share_story_versions (
    id          bigserial PRIMARY KEY,
    story_id    uuid NOT NULL REFERENCES public.share_stories(id) ON DELETE CASCADE,
    body_text   text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS share_story_versions_story_idx ON public.share_story_versions (story_id);

CREATE TABLE IF NOT EXISTS public.share_edit_suggestions (
    id              bigserial PRIMARY KEY,
    story_id        uuid NOT NULL REFERENCES public.share_stories(id) ON DELETE CASCADE,
    section_index   integer NOT NULL,
    original        text NOT NULL,
    suggested       text NOT NULL,
    reason          text,
    kind            text NOT NULL DEFAULT 'style' CHECK (kind IN ('style','crisis')),
    status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
    model           text,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS share_edit_suggestions_story_idx ON public.share_edit_suggestions (story_id, kind);

CREATE TABLE IF NOT EXISTS public.share_intro_channels (
    story_id    uuid NOT NULL REFERENCES public.share_stories(id) ON DELETE CASCADE,
    channel_id  text NOT NULL,   -- channels.channel_id or uap_channels.channel_id (YouTube ID)
    PRIMARY KEY (story_id, channel_id)
);

CREATE TABLE IF NOT EXISTS public.share_contacts (
    user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone       text,
    website     text,
    other       text,
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.share_agreements (
    id              bigserial PRIMARY KEY,
    user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kind            text NOT NULL CHECK (kind IN ('experiencer','channel_conduct')),
    version         text NOT NULL,
    age_confirmed   boolean NOT NULL DEFAULT false,
    accepted_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, kind, version)
);

CREATE TABLE IF NOT EXISTS public.share_channel_members (
    id          bigserial PRIMARY KEY,
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel_id  text NOT NULL,
    channel_name text,
    granted_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    granted_at  timestamptz NOT NULL DEFAULT now(),
    revoked_at  timestamptz,
    UNIQUE (user_id, channel_id)
);
CREATE INDEX IF NOT EXISTS share_channel_members_user_idx ON public.share_channel_members (user_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.share_channel_invites (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email       text NOT NULL,
    channels    jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{channel_id, channel_name}]
    token_hash  text NOT NULL UNIQUE,
    expires_at  timestamptz NOT NULL,
    used_at     timestamptz,
    used_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    revoked_at  timestamptz,
    created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    is_test     boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.share_intro_requests (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id            uuid NOT NULL REFERENCES public.share_stories(id) ON DELETE CASCADE,
    member_user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel_id          text NOT NULL,
    channel_name        text,
    note                text NOT NULL,
    status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','accepted','declined','expired')),
    response_token_hash text NOT NULL UNIQUE,
    resend_message_id   text,
    opened_at           timestamptz,
    responded_at        timestamptz,
    is_test             boolean NOT NULL DEFAULT false,
    created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS share_intro_requests_member_idx ON public.share_intro_requests (member_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS share_intro_requests_message_idx ON public.share_intro_requests (resend_message_id);

-- YouTube videos to delete after a story was deleted (the story row is gone).
CREATE TABLE IF NOT EXISTS public.share_youtube_removals (
    youtube_video_id  text PRIMARY KEY,
    requested_at      timestamptz NOT NULL DEFAULT now(),
    done_at           timestamptz,
    error             text
);

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.share_stories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_story_versions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_edit_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_intro_channels   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_contacts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_agreements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_channel_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_channel_invites  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_intro_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_youtube_removals ENABLE ROW LEVEL SECURITY;

-- Owners may read their own rows. No insert/update/delete policies: every
-- write goes through server code with the service role, which checks
-- ownership itself. Invites, intro requests and removals have no policies at
-- all (service role only).
CREATE POLICY share_stories_owner_select ON public.share_stories
    FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY share_story_versions_owner_select ON public.share_story_versions
    FOR SELECT TO authenticated USING (EXISTS (
        SELECT 1 FROM public.share_stories s WHERE s.id = story_id AND s.user_id = auth.uid()));
CREATE POLICY share_edit_suggestions_owner_select ON public.share_edit_suggestions
    FOR SELECT TO authenticated USING (kind = 'style' AND EXISTS (
        SELECT 1 FROM public.share_stories s WHERE s.id = story_id AND s.user_id = auth.uid()));
CREATE POLICY share_intro_channels_owner_select ON public.share_intro_channels
    FOR SELECT TO authenticated USING (EXISTS (
        SELECT 1 FROM public.share_stories s WHERE s.id = story_id AND s.user_id = auth.uid()));
CREATE POLICY share_contacts_owner_select ON public.share_contacts
    FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY share_agreements_owner_select ON public.share_agreements
    FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY share_channel_members_owner_select ON public.share_channel_members
    FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Explicitly deny the anon role anything on these tables.
REVOKE ALL ON public.share_stories, public.share_story_versions, public.share_edit_suggestions,
    public.share_intro_channels, public.share_contacts, public.share_agreements,
    public.share_channel_members, public.share_channel_invites, public.share_intro_requests,
    public.share_youtube_removals FROM anon;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.share_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS share_stories_touch ON public.share_stories;
CREATE TRIGGER share_stories_touch BEFORE UPDATE ON public.share_stories
    FOR EACH ROW EXECUTE FUNCTION public.share_touch_updated_at();

COMMIT;

-- ── Verify (run after) ────────────────────────────────────────────────────
-- SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'share_%' ORDER BY 1;  -- expect 10
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename LIKE 'share_%';               -- all true
