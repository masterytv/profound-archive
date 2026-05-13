-- ============================================================================
-- Migration: pg_cron UAP Video Processor
-- Date: 2026-05-13
-- Purpose: Replace unreliable GitHub Actions cron (10-min schedule frequently
--          skipped by GHA load balancing) with Supabase pg_cron + pg_net.
--
-- HISTORY:
--   2026-05-13  Initial setup — replaces uap-scanner-process.yml GHA cron
--               GHA was running ~6 times/day instead of expected 144.
--               pg_cron fires reliably every 10 minutes from within Postgres.
--
-- HOW IT WORKS:
--   1. pg_cron fires a job every 10 minutes
--   2. The job uses pg_net to send an async HTTP POST to the API route
--   3. The API route processes 1 video from the uap_scan_queue
--   4. pg_net is fire-and-forget — it doesn't wait for the 5-9min pipeline
--
-- SECRETS:
--   The API URL and CRON_SECRET are stored in Supabase Vault (encrypted).
--   To update secrets, use the Supabase Dashboard > SQL Editor:
--     SELECT vault.update_secret('uap_processor_url', 'https://new-url.com');
--     SELECT vault.update_secret('uap_processor_cron_secret', 'new-secret');
--
-- MANAGING THE CRON JOB:
--   View:    SELECT * FROM cron.job WHERE jobname = 'uap-video-processor';
--   Pause:   SELECT cron.unschedule('uap-video-processor');
--   Resume:  Re-run the cron.schedule() call below.
--   History: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
--
-- GITHUB ACTIONS CLEANUP:
--   After verifying pg_cron works for 24h, disable the GHA workflow:
--   1. Go to repo > Actions > "UAP Video Processor (10m, :05 offset)"
--   2. Click "..." menu > "Disable workflow"
--   3. Do NOT delete the .yml file — keep it as a backup/reference
-- ============================================================================

-- Step 1: Ensure extensions are enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Step 2: Store secrets in Vault (encrypted at rest)
-- NOTE: You MUST replace these placeholder values via Supabase Dashboard SQL Editor.
-- The actual secrets should never appear in migration files committed to git.
--
-- Run these in the Supabase SQL Editor (Dashboard > SQL Editor):
--
--   SELECT vault.create_secret(
--     'https://YOUR_APP_DIRECT_URL_HERE',
--     'uap_processor_url',
--     'Firebase App Hosting direct URL for UAP processor API'
--   );
--
--   SELECT vault.create_secret(
--     'YOUR_CRON_SECRET_HERE',
--     'uap_processor_cron_secret',
--     'CRON_SECRET for authenticating pipeline API calls'
--   );

-- Step 3: Create the wrapper function that reads secrets from Vault
-- This function is called by pg_cron every 10 minutes.
CREATE OR REPLACE FUNCTION public.trigger_uap_video_processor()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _url text;
  _secret text;
BEGIN
  -- Read secrets from Vault
  SELECT decrypted_secret INTO _url
    FROM vault.decrypted_secrets
    WHERE name = 'uap_processor_url';

  SELECT decrypted_secret INTO _secret
    FROM vault.decrypted_secrets
    WHERE name = 'uap_processor_cron_secret';

  IF _url IS NULL OR _secret IS NULL THEN
    RAISE WARNING '[UAP pg_cron] Vault secrets not configured. Run vault.create_secret() first.';
    RETURN;
  END IF;

  -- Fire async HTTP POST via pg_net (fire-and-forget)
  PERFORM net.http_post(
    url := _url || '/api/uap/scanner/process',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'secret', _secret,
      'videosPerTick', 1
    )
  );
END;
$$;

-- Step 4: Schedule the cron job — every 10 minutes
-- Uses the same offset (:05) as the GHA to maintain timing consistency
SELECT cron.schedule(
  'uap-video-processor',          -- job name (used for unschedule/lookup)
  '5,15,25,35,45,55 * * * *',    -- every 10 min, offset by 5
  'SELECT public.trigger_uap_video_processor()'
);

-- Step 5: Verify setup
-- SELECT * FROM cron.job WHERE jobname = 'uap-video-processor';
