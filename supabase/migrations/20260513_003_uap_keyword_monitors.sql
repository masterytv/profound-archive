-- Sprint 8, Story 8.3.1: Create uap_keyword_monitors table
-- UI shell built but disabled by default. Uses expensive search.list API.

CREATE TABLE IF NOT EXISTS public.uap_keyword_monitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    search_terms TEXT[] NOT NULL DEFAULT '{}',
    scanner_enabled BOOLEAN NOT NULL DEFAULT false,
    last_scanned_at TIMESTAMPTZ,
    priority INTEGER NOT NULL DEFAULT 2,
    videos_found INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.uap_keyword_monitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uap_keyword_monitors_public_read"
  ON public.uap_keyword_monitors FOR SELECT
  USING (true);

CREATE POLICY "uap_keyword_monitors_service_write"
  ON public.uap_keyword_monitors FOR ALL
  USING ((SELECT auth.role()) = 'service_role');

COMMENT ON TABLE public.uap_keyword_monitors IS 'Keyword-monitored channels for sparse content discovery. Disabled by default - uses expensive YouTube search.list API (100 units/call).';
COMMENT ON COLUMN public.uap_keyword_monitors.scanner_enabled IS 'Disabled by default. Enable only after channel/playlist scans slow down to conserve API quota.';
