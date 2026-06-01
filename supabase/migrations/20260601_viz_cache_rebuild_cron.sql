-- ============================================================
-- Add viz cache rebuild to weekly maintenance crons
-- ============================================================
-- Runs AFTER channel score recompute (5:30 UTC) so viz graphs
-- reflect freshly recomputed scores.

-- ── Trigger: Rebuild Viz Caches ──────────────────────────────

CREATE OR REPLACE FUNCTION public.trigger_rebuild_viz_caches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _url text;
  _secret text;
BEGIN
  SELECT decrypted_secret INTO _url
    FROM vault.decrypted_secrets
    WHERE name = 'uap_processor_url';

  SELECT decrypted_secret INTO _secret
    FROM vault.decrypted_secrets
    WHERE name = 'uap_processor_cron_secret';

  IF _url IS NULL OR _secret IS NULL THEN
    RAISE WARNING '[rebuild-viz-caches pg_cron] Vault secrets not configured.';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := _url || '/api/cron/rebuild-viz-caches',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'secret', _secret
    )
  );
END;
$$;

-- Schedule: Weekly Sunday 6:00 AM UTC (after channel scores at 5:30)
SELECT cron.schedule(
  'rebuild-viz-caches-weekly',
  '0 6 * * 0',
  $$SELECT public.trigger_rebuild_viz_caches()$$
);
