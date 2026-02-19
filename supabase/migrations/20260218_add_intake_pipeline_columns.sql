-- Add intake pipeline tracking columns to nde_vids
-- These columns track the state of video processing through the intake pipeline

ALTER TABLE nde_vids
ADD COLUMN IF NOT EXISTS intake_status text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS intake_submitted_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS intake_completed_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS intake_error text DEFAULT NULL;

-- Add a comment explaining the possible intake_status values
COMMENT ON COLUMN nde_vids.intake_status IS 'Intake pipeline state: scraping, classifying, analyzing, indexing, complete, failed, not_profound, no_captions, already_exists';

-- Index on intake_status for efficient filtering in admin views
CREATE INDEX IF NOT EXISTS idx_nde_vids_intake_status ON nde_vids (intake_status)
WHERE intake_status IS NOT NULL;

-- Add isNdeJustification column for storing the AI classification reasoning
ALTER TABLE nde_vids
ADD COLUMN IF NOT EXISTS "isNdeJustification" text DEFAULT NULL;

COMMENT ON COLUMN nde_vids."isNdeJustification" IS 'AI-generated justification for the isNde classification';
