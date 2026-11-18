-- Rollback for 20261118_002_book_tally_codebook.sql.
-- DESTRUCTIVE: deletes every coded answer and coded gold mark. Touches only these two bt_* tables;
-- everything from 20261118_001 (runs, raw responses, stance answers, ...) is left as it is.
-- Export anything worth keeping first.

BEGIN;
DROP TABLE IF EXISTS public.bt_coded_gold_marks;
DROP TABLE IF EXISTS public.bt_coded_answers;
COMMIT;
