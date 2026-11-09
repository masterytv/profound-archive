-- ============================================================
-- Channels & Contacts (admin CRM for YouTube channels)
-- ============================================================
-- One row per channel Tom manages: who runs it and how to reach them, the
-- outreach status, and notes. Channels already on PP (NDE `channels` /
-- `uap_channels`) are listed automatically by the admin page; a row here is
-- created the first time someone edits a channel (or adds one by hand, or
-- imports the contact CSV). Contact details are personal data: they live only
-- here, never in the public repo, and only admins (service role) can read them.
--
-- NOTE: shared staging/production database — this IS a production change.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.channel_contacts (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id       text NOT NULL UNIQUE,   -- YouTube channel ID (UC…) or @handle
    channel_name     text NOT NULL,
    channel_url      text,
    channel_type     text NOT NULL DEFAULT 'other' CHECK (channel_type IN ('nde','uap','both','other')),
    contact_name     text,                   -- host or producer
    contact_role     text CHECK (contact_role IS NULL OR contact_role IN ('host','producer','agency','network','other')),
    email            text,
    phone            text,
    contact_form_url text,
    website          text,
    social           text,
    outreach_status  text NOT NULL DEFAULT 'not_contacted'
                     CHECK (outreach_status IN ('not_contacted','contacted','interested','declined','member')),
    notes            text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.channel_contacts ENABLE ROW LEVEL SECURITY;
-- No policies: admins reach it through server code with the service role only.
REVOKE ALL ON public.channel_contacts FROM anon, authenticated;

DROP TRIGGER IF EXISTS channel_contacts_touch ON public.channel_contacts;
CREATE TRIGGER channel_contacts_touch BEFORE UPDATE ON public.channel_contacts
    FOR EACH ROW EXECUTE FUNCTION public.share_touch_updated_at();

-- Verify:
-- SELECT relrowsecurity FROM pg_class WHERE relname = 'channel_contacts';  -- true
