-- Behaviour test for 20261118_001_book_tally.sql, run against a THROWAWAY local
-- Postgres (see run-local-pg.sh). Synthetic data only. Never run against the real DB.
\set ON_ERROR_STOP on
CREATE TEMP TABLE _assert_log(ok boolean, msg text);

CREATE OR REPLACE FUNCTION pg_temp.expect(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF cond IS NOT TRUE THEN RAISE EXCEPTION 'ASSERT FAILED: %', msg; END IF; END $$;

INSERT INTO public.bt_runs (id, job, model) VALUES ('r1','stance','claude-haiku-5-5');
INSERT INTO public.bt_prompts VALUES (repeat('a',64),'stance-v1','tmpl',NULL,NULL);

-- ---------- immutability ----------
DO $$ BEGIN
  UPDATE public.bt_runs SET status='submitted', batch_ids=ARRAY['b1'], actual_usage='{}'::jsonb, finished_at=now() WHERE id='r1';
  PERFORM pg_temp.expect((SELECT status FROM public.bt_runs WHERE id='r1')='submitted','bookkeeping update allowed');
  BEGIN UPDATE public.bt_runs SET model='x' WHERE id='r1'; RAISE EXCEPTION 'should fail';
  EXCEPTION WHEN restrict_violation THEN NULL; END;
  BEGIN UPDATE public.bt_runs SET params='{"a":1}' WHERE id='r1'; RAISE EXCEPTION 'should fail';
  EXCEPTION WHEN restrict_violation THEN NULL; END;
  BEGIN DELETE FROM public.bt_runs WHERE id='r1'; RAISE EXCEPTION 'should fail';
  EXCEPTION WHEN restrict_violation THEN NULL; END;
  BEGIN TRUNCATE public.bt_gold_marks; RAISE EXCEPTION 'should fail';
  EXCEPTION WHEN restrict_violation THEN NULL; END;
  BEGIN UPDATE public.bt_prompts SET name='y'; RAISE EXCEPTION 'should fail';
  EXCEPTION WHEN restrict_violation THEN NULL; END;
END $$;

-- ---------- quote constraint ----------
DO $$ BEGIN
  BEGIN
    INSERT INTO public.bt_stance_answers (run_id,video_id,question_id,pass,stance,confidence,quote,model,prompt_hash)
    VALUES ('r1','v1',1,'first','yes',90,NULL,'m',repeat('a',64));
    RAISE EXCEPTION 'should fail';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

-- ---------- stance resolution ----------
-- helper to insert answers
CREATE OR REPLACE FUNCTION pg_temp.ans(p_vid text, p_q int, p_pass text, p_stance text, p_conf int, p_quote text, p_ver boolean, p_valid boolean DEFAULT true, p_model text DEFAULT 'm')
RETURNS void LANGUAGE sql AS $$
 INSERT INTO public.bt_stance_answers (run_id,video_id,question_id,pass,stance,confidence,quote,quote_verified,valid,model,prompt_hash)
 VALUES ('r1',p_vid,p_q,p_pass,p_stance,p_conf,p_quote,p_ver,p_valid,p_model,repeat('a',64)) $$;

-- q1: unflagged yes (conf 90, verified) -> first, final
SELECT pg_temp.ans('v1',1,'first','yes',90,'i saw a bright light',true);
-- q2: not_addressed conf 95 -> first, final
SELECT pg_temp.ans('v1',2,'first','not_addressed',95,NULL,false);
-- q3: no -> flagged; recheck agrees -> recheck, final
SELECT pg_temp.ans('v1',3,'first','no',80,'there was no tunnel at all',true);
SELECT pg_temp.ans('v1',3,'recheck','no',85,'there was no tunnel at all',true);
-- q4: mixed -> flagged; recheck differs; arbiter -> arbiter
SELECT pg_temp.ans('v1',4,'first','mixed',80,'sort of felt it happen',true);
SELECT pg_temp.ans('v1',4,'recheck','yes',80,'i did feel it happen',true);
SELECT pg_temp.ans('v1',4,'arbiter','yes',80,'i did feel it happen',true);
-- q5: yes, low confidence, no recheck yet -> pending_recheck
SELECT pg_temp.ans('v1',5,'first','yes',50,'quite a long quote here',true);
-- v2 q1: yes with unverified quote -> flagged; recheck agrees yes but unverified -> unverified
SELECT pg_temp.ans('v2',1,'first','yes',90,'made up quote words here',false);
SELECT pg_temp.ans('v2',1,'recheck','yes',90,'another made up quote',false);
-- v2 q2: no; recheck says yes; no arbiter -> pending_arbiter
SELECT pg_temp.ans('v2',2,'first','no',90,'i did not see it ever',true);
SELECT pg_temp.ans('v2',2,'recheck','yes',90,'i did see it ever',true);
-- v2 q3: invalid first (stance NULL), recheck yes verified, arbiter yes verified -> arbiter
SELECT pg_temp.ans('v2',3,'first',NULL,NULL,NULL,false,false);
SELECT pg_temp.ans('v2',3,'recheck','yes',90,'i saw the light clearly',true);
SELECT pg_temp.ans('v2',3,'arbiter','yes',90,'i saw the light clearly',true);
-- v2 q4: pilot row only -> not in view
SELECT pg_temp.ans('v2',4,'pilot','yes',90,'pilot only quote here ok',true);
-- v3 q1: attempt 1 invalid, attempt 2 valid unflagged -> latest attempt wins
INSERT INTO public.bt_stance_answers (run_id,video_id,question_id,pass,attempt,stance,confidence,valid,model,prompt_hash)
 VALUES ('r1','v3',1,'first',1,NULL,NULL,false,'m',repeat('a',64));
INSERT INTO public.bt_stance_answers (run_id,video_id,question_id,pass,attempt,stance,confidence,quote,quote_verified,model,prompt_hash)
 VALUES ('r1','v3',1,'first',2,'yes',88,'five words in this quote',true,'m',repeat('a',64));

DO $$ DECLARE r record; BEGIN
  PERFORM pg_temp.expect((SELECT (resolved_by,status)=('first','final') FROM bt_final_stances WHERE video_id='v1' AND question_id=1),'q1 first final');
  PERFORM pg_temp.expect((SELECT (resolved_by,status,stance)=('first','final','not_addressed') FROM bt_final_stances WHERE video_id='v1' AND question_id=2),'q2');
  PERFORM pg_temp.expect((SELECT (resolved_by,status,stance)=('recheck','final','no') FROM bt_final_stances WHERE video_id='v1' AND question_id=3),'q3 recheck agrees');
  PERFORM pg_temp.expect((SELECT (resolved_by,status,stance)=('arbiter','final','yes') FROM bt_final_stances WHERE video_id='v1' AND question_id=4),'q4 arbiter');
  PERFORM pg_temp.expect((SELECT (resolved_by IS NULL AND status='pending_recheck') FROM bt_final_stances WHERE video_id='v1' AND question_id=5),'q5 pending_recheck');
  PERFORM pg_temp.expect((SELECT status='unverified' FROM bt_final_stances WHERE video_id='v2' AND question_id=1),'v2q1 unverified');
  PERFORM pg_temp.expect((SELECT status='pending_arbiter' FROM bt_final_stances WHERE video_id='v2' AND question_id=2),'v2q2 pending_arbiter');
  PERFORM pg_temp.expect((SELECT (resolved_by,status)=('arbiter','final') FROM bt_final_stances WHERE video_id='v2' AND question_id=3),'v2q3 invalid first -> arbiter');
  PERFORM pg_temp.expect(NOT EXISTS (SELECT 1 FROM bt_final_stances WHERE video_id='v2' AND question_id=4),'pilot excluded');
  PERFORM pg_temp.expect((SELECT (resolved_by,status)=('first','final') FROM bt_final_stances WHERE video_id='v3' AND question_id=1),'latest attempt wins');
END $$;

-- ---------- person map / merges / reversibility ----------
INSERT INTO public.bt_person_links (video_id, person_key, profile_id, source, match_level) VALUES
  ('v1','profile:10',10,'profile_video_ids','profile'),
  ('v2','profile:11',11,'profile_video_ids','profile'),
  ('v3','anon:v3',NULL,'baseline','baseline'),
  ('v4','profile:12',12,'exact_name_match','core'),     -- pending (no decision)
  ('v4','anon:v4',NULL,'baseline','baseline');
INSERT INTO public.bt_link_decisions (link_id, decision, decided_by)
  SELECT id,'accept','auto' FROM public.bt_person_links WHERE person_key <> 'profile:12';

DO $$ BEGIN
  PERFORM pg_temp.expect((SELECT person_key FROM bt_effective_person_map WHERE video_id='v4')='anon:v4','pending core link not used');
END $$;
INSERT INTO public.bt_link_decisions (link_id, decision, decided_by)
  SELECT id,'accept','human' FROM public.bt_person_links WHERE person_key='profile:12';
DO $$ BEGIN
  PERFORM pg_temp.expect((SELECT person_key FROM bt_effective_person_map WHERE video_id='v4')='profile:12','accepted exact/core beats baseline');
END $$;
INSERT INTO public.bt_link_decisions (link_id, decision, decided_by)
  SELECT id,'revert','human' FROM public.bt_person_links WHERE person_key='profile:12';
DO $$ BEGIN
  PERFORM pg_temp.expect((SELECT person_key FROM bt_effective_person_map WHERE video_id='v4')='anon:v4','revert returns link to pending');
END $$;

INSERT INTO public.bt_merge_candidates (key_a,key_b,rule) VALUES ('profile:10','profile:11','t'),('profile:11','profile:12','t');
DO $$ BEGIN
  PERFORM pg_temp.expect((SELECT count(DISTINCT person_key) FROM bt_effective_person_map)=4,'no merges yet: 4 persons');
END $$;
INSERT INTO public.bt_merge_decisions (candidate_id, decision, decided_by) SELECT id,'merge','human' FROM public.bt_merge_candidates WHERE key_a='profile:10';
DO $$ BEGIN
  PERFORM pg_temp.expect((SELECT person_key FROM bt_effective_person_map WHERE video_id='v2')='profile:10','merge maps to smallest key');
  PERFORM pg_temp.expect((SELECT count(DISTINCT person_key) FROM bt_effective_person_map)=3,'3 persons after merge');
END $$;
INSERT INTO public.bt_merge_decisions (candidate_id, decision, decided_by) SELECT id,'merge','human' FROM public.bt_merge_candidates WHERE key_a='profile:11';
INSERT INTO public.bt_link_decisions (link_id, decision, decided_by) SELECT id,'accept','human' FROM public.bt_person_links WHERE person_key='profile:12';
DO $$ BEGIN
  PERFORM pg_temp.expect((SELECT person_key FROM bt_effective_person_map WHERE video_id='v4')='profile:10','transitive merge');
END $$;
INSERT INTO public.bt_merge_decisions (candidate_id, decision, decided_by) SELECT id,'revert','human' FROM public.bt_merge_candidates WHERE key_a='profile:10';
DO $$ BEGIN
  PERFORM pg_temp.expect((SELECT person_key FROM bt_effective_person_map WHERE video_id='v1')='profile:10','v1 alone after revert');
  PERFORM pg_temp.expect((SELECT person_key FROM bt_effective_person_map WHERE video_id='v2')='profile:11','revert undoes merge (v2 back to 11)');
  PERFORM pg_temp.expect((SELECT person_key FROM bt_effective_person_map WHERE video_id='v4')='profile:11','11~12 still merged');
END $$;

-- ---------- no foreign keys to existing tables ----------
DO $$ BEGIN
  PERFORM pg_temp.expect(NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid JOIN pg_class r ON r.oid = c.confrelid
    WHERE c.contype = 'f' AND t.relname LIKE 'bt\_%' AND r.relname NOT LIKE 'bt\_%'),
    'no FK from bt_* to a non-bt_ table');
  PERFORM pg_temp.expect(EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid JOIN pg_class r ON r.oid = c.confrelid
    WHERE c.contype = 'f' AND t.relname = 'bt_stance_answers' AND r.relname = 'bt_prompts'),
    'FKs among bt_* tables are kept');
  -- the live app can still delete from referenced tables even when bt_ rows mention the id
  DELETE FROM public.nde_vids WHERE "videoId" = 'v4';
  DELETE FROM public.nde_questions WHERE id = 5;
  DELETE FROM public.experiencer_profiles WHERE id = 12;
  -- and no RI triggers were added to the existing tables
  PERFORM pg_temp.expect(NOT EXISTS (
    SELECT 1 FROM pg_trigger tg JOIN pg_class t ON t.oid = tg.tgrelid
    WHERE t.relname IN ('nde_vids','nde_questions','experiencer_profiles') AND NOT tg.tgisinternal),
    'no user triggers on existing tables');
  PERFORM pg_temp.expect(NOT EXISTS (
    SELECT 1 FROM pg_trigger tg JOIN pg_class t ON t.oid = tg.tgrelid
    WHERE t.relname IN ('nde_vids','nde_questions','experiencer_profiles')
      AND tg.tgconstraint <> 0 AND tg.tgisinternal AND tg.tgconstrrelid <> t.oid
      AND EXISTS (SELECT 1 FROM pg_class o WHERE o.oid = tg.tgconstrrelid AND o.relname LIKE 'bt\_%')),
    'no RI triggers on existing tables from bt_* FKs');
END $$;

-- ---------- RLS / privileges ----------
DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relname LIKE 'bt\_%' AND c.relkind='r' LOOP
    PERFORM pg_temp.expect((SELECT relrowsecurity FROM pg_class WHERE relname=t),'RLS on '||t);
    PERFORM pg_temp.expect(NOT has_table_privilege('anon','public.'||t,'SELECT'),'anon no select '||t);
  END LOOP;
  PERFORM pg_temp.expect(NOT has_table_privilege('authenticated','public.bt_final_stances','SELECT'),'view revoked');
  PERFORM pg_temp.expect((SELECT count(*) FROM pg_policies WHERE tablename LIKE 'bt\_%')=0,'no policies');
END $$;
SELECT 'ALL SQL BEHAVIOUR ASSERTIONS PASSED' AS result;
