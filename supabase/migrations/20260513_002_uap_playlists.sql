-- Sprint 8, Story 8.2.1: Create uap_playlists table
-- Standalone playlist sources. Parent channel does NOT need to be in uap_channels.

CREATE TABLE IF NOT EXISTS public.uap_playlists (
    playlist_id TEXT PRIMARY KEY,
    playlist_title TEXT NOT NULL,
    channel_id TEXT,
    channel_name TEXT,
    track TEXT NOT NULL DEFAULT 'mixed',
    priority INTEGER NOT NULL DEFAULT 1,
    scanner_enabled BOOLEAN NOT NULL DEFAULT true,
    last_scanned_at TIMESTAMPTZ,
    video_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: public read, service_role write
ALTER TABLE public.uap_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uap_playlists_public_read"
  ON public.uap_playlists FOR SELECT
  USING (true);

CREATE POLICY "uap_playlists_service_write"
  ON public.uap_playlists FOR ALL
  USING ((SELECT auth.role()) = 'service_role');

COMMENT ON TABLE public.uap_playlists IS 'Standalone YouTube playlists for targeted scanning. Parent channel does not need to be in uap_channels.';
COMMENT ON COLUMN public.uap_playlists.priority IS 'Processing priority for videos discovered from this playlist. 1=highest, 5=default.';
