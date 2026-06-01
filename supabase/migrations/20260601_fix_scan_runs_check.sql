-- Fix: NDE scan_runs CHECK constraint was missing 'discover' and 'process'
-- run_type values that tick.ts uses since the discover/process split.
-- This silently rejected all discover and process log inserts, breaking
-- observability into NDE discovery runs.

ALTER TABLE scan_runs DROP CONSTRAINT IF EXISTS scan_runs_run_type_check;
ALTER TABLE scan_runs ADD CONSTRAINT scan_runs_run_type_check
  CHECK (run_type = ANY (ARRAY['tick', 'audit', 'manual', 'discover', 'process']));
