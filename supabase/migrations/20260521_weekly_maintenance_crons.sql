-- ============================================================
-- Weekly Data Maintenance Crons
-- ============================================================
-- Two weekly jobs that keep channel scores and entity data fresh:
--   1. Entity normalization (5:00 UTC Sunday) — dedup canonical records
--   2. Channel score recomputation (5:30 UTC Sunday) — refresh all scores
--
-- Both reuse existing Vault secrets: uap_processor_url, uap_processor_cron_secret

-- ── Trigger: Entity Normalization ────────────────────────────

CREATE OR REPLACE FUNCTION public.trigger_normalize_entities()
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
    RAISE WARNING '[normalize-entities pg_cron] Vault secrets not configured.';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := _url || '/api/cron/normalize-entities',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'secret', _secret,
      'dryRun', false
    )
  );
END;
$$;

-- ── Trigger: Channel Score Recomputation ─────────────────────

CREATE OR REPLACE FUNCTION public.trigger_recompute_channel_scores()
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
    RAISE WARNING '[channel-scores pg_cron] Vault secrets not configured.';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := _url || '/api/cron/recompute-channel-scores',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'secret', _secret
    )
  );
END;
$$;

-- ── Schedule: Weekly Sundays ─────────────────────────────────
-- Entities normalize first so channel scores compute against clean data

SELECT cron.schedule(
  'normalize-entities-weekly',
  '0 5 * * 0',
  $$SELECT public.trigger_normalize_entities()$$
);

SELECT cron.schedule(
  'recompute-channel-scores-weekly',
  '30 5 * * 0',
  $$SELECT public.trigger_recompute_channel_scores()$$
);
