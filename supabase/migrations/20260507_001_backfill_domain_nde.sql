-- Backfill domain column for multi-domain dashboard
-- All existing rows are NDE content; new UAP rows will insert with domain = 'uap'
UPDATE saved_searches SET domain = 'nde' WHERE domain IS NULL;
UPDATE favorites SET domain = 'nde' WHERE domain IS NULL;
