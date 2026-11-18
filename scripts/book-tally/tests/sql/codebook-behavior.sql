-- Behaviour test for 20261118_002_book_tally_codebook.sql, run against a THROWAWAY local
-- Postgres (see run-local-pg.sh) after 001 and 002 are applied. Synthetic data only.
\set ON_ERROR_STOP on

CREATE OR REPLACE FUNCTION pg_temp.expect(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF cond IS NOT TRUE THEN RAISE EXCEPTION 'ASSERT FAILED: %', msg; END IF; END $$;

CREATE OR REPLACE FUNCTION pg_temp.expect_fail(stmt text, state text, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = state THEN RETURN; END IF;
    RAISE EXCEPTION 'ASSERT FAILED: % (got SQLSTATE % %)', msg, SQLSTATE, SQLERRM;
  END;
  RAISE EXCEPTION 'ASSERT FAILED: % (statement succeeded)', msg;
END $$;

INSERT INTO public.bt_runs (id, job, pass, model) VALUES ('c1','other','haiku','claude-haiku-5-5');
INSERT INTO public.bt_prompts VALUES (repeat('c',64),'codebook-v1','tmpl',NULL,NULL);

-- shorthand: columns every insert needs
CREATE OR REPLACE FUNCTION pg_temp.ins(item text, qid integer, k text, addr boolean, st text, q text, verified boolean, off integer, ch jsonb, conf integer, ok boolean, att integer DEFAULT 1)
RETURNS void LANGUAGE sql AS $$
  INSERT INTO public.bt_coded_answers (run_id, video_id, item_key, question_id, kind, attempt, addressed, stance, quote, quote_verified, quote_norm_offset, choices, confidence, model, prompt_hash, codebook_version, valid)
  VALUES ('c1','v1',item,qid,k,att,addr,st,q,verified,off,ch,conf,'claude-haiku-5-5',repeat('c',64),'codebook-v1',ok);
$$;

-- ---------- shapes that must be accepted ----------
SELECT pg_temp.ins('q38', 38, 'yn', true, 'yes', 'and I felt a deep calm come over me', true, 120, NULL, 90, true);
SELECT pg_temp.ins('q1', 1, 'yn', false, NULL, NULL, false, NULL, NULL, 80, true);
SELECT pg_temp.ins('q78', 78, 'mc', true, NULL, NULL, true, NULL,
  '[{"code":"love","quote":"we are here to learn how to love","other_text":null,"quote_verified":true,"quote_norm_offset":5,"quote_check":"ok"}]'::jsonb, 85, true);
SELECT pg_temp.ins('f0', NULL, 'mc', true, NULL, NULL, false, NULL,
  '[{"code":"accident","quote":"the car hit the tree at full speed","other_text":null,"quote_verified":false,"quote_norm_offset":null,"quote_check":"not_found"}]'::jsonb, 70, true);
SELECT pg_temp.ins('q2a', 2, 'yn', NULL, NULL, NULL, false, NULL, NULL, NULL, false);   -- an invalid row
SELECT pg_temp.ins('q38', 38, 'yn', true, 'no', 'I was terrified as I was dying there', true, 7, NULL, 60, true, 2);  -- a retry
DO $$ BEGIN PERFORM pg_temp.expect((SELECT count(*) FROM public.bt_coded_answers) = 6, 'six valid shapes inserted'); END $$;

-- ---------- shapes that must be refused (check_violation 23514) ----------
SELECT pg_temp.expect_fail($s$SELECT pg_temp.ins('q5', 5, 'yn', true, 'yes', NULL, false, NULL, NULL, 90, true)$s$, '23514', 'addressed yn without a quote');
SELECT pg_temp.expect_fail($s$SELECT pg_temp.ins('q5', 5, 'yn', true, NULL, 'a quote that is long enough', false, NULL, NULL, 90, true)$s$, '23514', 'addressed yn without a stance');
SELECT pg_temp.expect_fail($s$SELECT pg_temp.ins('q5', 5, 'yn', false, 'yes', NULL, false, NULL, NULL, 90, true)$s$, '23514', 'not addressed with a stance');
SELECT pg_temp.expect_fail($s$SELECT pg_temp.ins('q5', 5, 'yn', NULL, NULL, NULL, false, NULL, NULL, 90, true)$s$, '23514', 'valid row with addressed NULL');
SELECT pg_temp.expect_fail($s$SELECT pg_temp.ins('q5', 5, 'yn', NULL, 'yes', NULL, false, NULL, NULL, NULL, false)$s$, '23514', 'invalid row carrying a stance');
SELECT pg_temp.expect_fail($s$SELECT pg_temp.ins('q5', 5, 'yn', true, 'maybe', 'a quote that is long enough', false, NULL, NULL, 90, true)$s$, '23514', 'unknown stance');
SELECT pg_temp.expect_fail($s$SELECT pg_temp.ins('q5', 5, 'yn', true, 'yes', 'a quote that is long enough', true, NULL, NULL, 90, true)$s$, '23514', 'verified yn quote without offset');
SELECT pg_temp.expect_fail($s$SELECT pg_temp.ins('q6', 6, 'mc', true, NULL, NULL, false, NULL, '[]'::jsonb, 90, true)$s$, '23514', 'addressed mc with no answers');
SELECT pg_temp.expect_fail($s$SELECT pg_temp.ins('q6', 6, 'mc', true, 'yes', NULL, false, NULL, '[{"code":"x"}]'::jsonb, 90, true)$s$, '23514', 'mc with a stance');
SELECT pg_temp.expect_fail($s$SELECT pg_temp.ins('q6', 6, 'mc', true, NULL, NULL, false, NULL, '{"code":"x"}'::jsonb, 90, true)$s$, '23514', 'mc choices not an array');
SELECT pg_temp.expect_fail($s$SELECT pg_temp.ins('f1', 3, 'yn', false, NULL, NULL, false, NULL, NULL, 90, true)$s$, '23514', 'fact with a question_id');
SELECT pg_temp.expect_fail($s$SELECT pg_temp.ins('q7', NULL, 'yn', false, NULL, NULL, false, NULL, NULL, 90, true)$s$, '23514', 'question without question_id');
SELECT pg_temp.expect_fail($s$SELECT pg_temp.ins('x7', NULL, 'yn', false, NULL, NULL, false, NULL, NULL, 90, true)$s$, '23514', 'bad item key');
SELECT pg_temp.expect_fail($s$SELECT pg_temp.ins('q7', 7, 'yn', false, NULL, NULL, false, NULL, NULL, 101, true)$s$, '23514', 'confidence above 100');

-- ---------- uniqueness (unique_violation 23505) ----------
SELECT pg_temp.expect_fail($s$SELECT pg_temp.ins('q38', 38, 'yn', false, NULL, NULL, false, NULL, NULL, 90, true)$s$, '23505', 'same run, video, item and attempt twice');

-- ---------- immutability (restrict_violation 23001) ----------
SELECT pg_temp.expect_fail($s$UPDATE public.bt_coded_answers SET confidence = 1$s$, '23001', 'coded answers cannot be updated');
SELECT pg_temp.expect_fail($s$DELETE FROM public.bt_coded_answers$s$, '23001', 'coded answers cannot be deleted');
SELECT pg_temp.expect_fail($s$TRUNCATE public.bt_coded_answers CASCADE$s$, '23001', 'coded answers cannot be truncated');

INSERT INTO public.bt_coded_gold_marks (coded_answer_id, video_id, item_key, addressed_correct, answer_correct, wrong_choices, quote_is_experiencer)
SELECT id, 'v1', 'q78', true, false, ARRAY['love'], true FROM public.bt_coded_answers WHERE item_key = 'q78';
SELECT pg_temp.expect_fail($s$UPDATE public.bt_coded_gold_marks SET note = 'x'$s$, '23001', 'gold marks cannot be updated');
SELECT pg_temp.expect_fail($s$DELETE FROM public.bt_coded_gold_marks$s$, '23001', 'gold marks cannot be deleted');
SELECT pg_temp.expect_fail($s$INSERT INTO public.bt_coded_gold_marks (coded_answer_id, video_id, item_key, addressed_correct) VALUES (999999, 'v1', 'q1', true)$s$, '23503', 'gold mark must point at a coded answer');
SELECT pg_temp.expect_fail($s$INSERT INTO public.bt_coded_gold_marks (coded_answer_id, video_id, item_key, addressed_correct) SELECT id, 'v1', 'q1', true FROM public.bt_coded_answers WHERE item_key = 'q78'$s$, '23503', 'gold mark must name the same item as its coded answer');
SELECT pg_temp.expect_fail($s$INSERT INTO public.bt_coded_gold_marks (coded_answer_id, video_id, item_key, addressed_correct) SELECT id, 'v2', 'q78', true FROM public.bt_coded_answers WHERE item_key = 'q78'$s$, '23503', 'gold mark must name the same video as its coded answer');

-- ---------- access ----------
DO $$ BEGIN
  PERFORM pg_temp.expect((SELECT bool_and(relrowsecurity) FROM pg_class WHERE relname IN ('bt_coded_answers','bt_coded_gold_marks')), 'RLS on');
  PERFORM pg_temp.expect(NOT has_table_privilege('anon', 'public.bt_coded_answers', 'SELECT'), 'anon cannot read coded answers');
  PERFORM pg_temp.expect(NOT has_table_privilege('authenticated', 'public.bt_coded_gold_marks', 'INSERT'), 'authenticated cannot write gold marks');
  PERFORM pg_temp.expect((SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN
    ('public.bt_coded_answers'::regclass, 'public.bt_coded_gold_marks'::regclass)) = 6, 'six guard triggers');
END $$;

SELECT 'codebook behavior: all assertions passed';
