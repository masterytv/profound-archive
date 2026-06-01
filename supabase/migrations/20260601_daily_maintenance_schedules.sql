-- ============================================================
-- Move maintenance crons from weekly to daily
-- ============================================================
-- Channel scores and entity data change daily as the pipeline
-- processes new videos, so weekly refresh caused stale data.

-- Entity normalization: weekly Sunday → daily 5:00 UTC
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE command LIKE '%trigger_normalize_entities%'),
  schedule := '0 5 * * *'
);

-- Channel score recompute: weekly Sunday → daily 5:30 UTC
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE command LIKE '%trigger_recompute_channel_scores%'),
  schedule := '30 5 * * *'
);

-- Viz cache rebuild: weekly Sunday → daily 6:00 UTC
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE command LIKE '%trigger_rebuild_viz_caches%'),
  schedule := '0 6 * * *'
);
