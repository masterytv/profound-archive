-- Behaviour test for 20261118_001_book_tally.sql, run against a THROWAWAY local
-- Postgres (see run-local-pg.sh). Synthetic data only. Never run against the real DB.
\set ON_ERROR_STOP on

CREATE OR REPLACE FUNCTION pg_temp.expect(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF cond IS NOT TRUE THEN RAISE EXCEPTION 'ASSERT FAILED: %', msg; END IF; END $$;

-- expects the statement to fail with the given SQLSTATE class/name
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

INSERT INTO public.bt_runs (id, job, model) VALUES ('r1','stance','claude-haiku-5-5');
INSERT INTO public.bt_prompts VALUES (repeat('a',64),'stance-v1','tmpl',NULL,NULL);

-- ---------- immutability ----------
DO $$ DECLARE n int; BEGIN
  UPDATE public.bt_runs SET status='submitting', batch_ids=ARRAY['pending:2026-11-18T00:00:00.000Z:2:abcdef012345'] WHERE id='r1';
  PERFORM pg_temp.expect((SELECT status FROM public.bt_runs WHERE id='r1')='submitting','submitting status allowed');
  -- conditional-update shape used by btUpdateRunIf
  WITH u AS (UPDATE public.bt_runs SET status='submitted' WHERE id='r1' AND status='estimated' RETURNING id) SELECT count(*) INTO n FROM u;
  PERFORM pg_temp.expect(n=0,'conditional update with wrong expected status touches 0 rows');
  WITH u AS (UPDATE public.bt_runs SET status='submitted' WHERE id='r1' AND status='submitting' RETURNING id) SELECT count(*) INTO n FROM u;
  PERFORM pg_temp.expect(n=1,'conditional update with right expected status touches 1 row');
  UPDATE public.bt_runs SET status='submitted', batch_ids=ARRAY['b1'], actual_usage='{}'::jsonb, finished_at=now() WHERE id='r1';
  PERFORM pg_temp.expect((SELECT status FROM public.bt_runs WHERE id='r1')='submitted','bookkeeping update allowed');
END $$;
SELECT pg_temp.expect_fail($$UPDATE public.bt_runs SET model='x' WHERE id='r1'$$, '23001', 'bt_runs non-bookkeeping update blocked');
SELECT pg_temp.expect_fail($$UPDATE public.bt_runs SET params='{"a":1}' WHERE id='r1'$$, '23001', 'bt_runs params update blocked');
SELECT pg_temp.expect_fail($$DELETE FROM public.bt_runs WHERE id='r1'$$, '23001', 'bt_runs delete blocked');
SELECT pg_temp.expect_fail($$TRUNCATE public.bt_gold_marks$$, '23001', 'truncate blocked');
SELECT pg_temp.expect_fail($$UPDATE public.bt_prompts SET name='y'$$, '23001', 'bt_prompts update blocked');
SELECT pg_temp.expect_fail($$DELETE FROM public.bt_prompts$$, '23001', 'bt_prompts delete blocked');

-- ---------- stance helper: returns the new row id ----------
CREATE OR REPLACE FUNCTION pg_temp.ans(
  p_vid text, p_q int, p_pass text, p_stance text, p_conf int, p_quote text, p_ver boolean,
  p_trigger bigint DEFAULT NULL, p_valid boolean DEFAULT true, p_attempt int DEFAULT 1, p_recheck bigint DEFAULT NULL
) RETURNS bigint LANGUAGE sql AS $$
 INSERT INTO public.bt_stance_answers
   (run_id,video_id,question_id,pass,attempt,stance,confidence,quote,quote_verified,quote_norm_offset,valid,model,prompt_hash,trigger_answer_id,recheck_answer_id)
 VALUES ('r1',p_vid,p_q,p_pass,p_attempt,p_stance,p_conf,p_quote,p_ver, CASE WHEN p_ver THEN 0 END,p_valid,'m',repeat('a',64),p_trigger,p_recheck)
 RETURNING id $$;

-- ---------- table constraints ----------
SELECT pg_temp.expect_fail($$SELECT pg_temp.ans('c1',1,'first','yes',90,NULL,false)$$, '23514', 'claim needs quote');
SELECT pg_temp.expect_fail($$SELECT pg_temp.ans('c1',1,'first','yes',90,'   ',false)$$, '23514', 'blank quote rejected');
SELECT pg_temp.expect_fail($$INSERT INTO public.bt_stance_answers (run_id,video_id,question_id,pass,stance,confidence,quote,quote_verified,model,prompt_hash)
   VALUES ('r1','c1',1,'first','yes',90,'five words in this quote',true,'m',repeat('a',64))$$, '23514', 'verified needs offset');
DO $$ DECLARE fid bigint; BEGIN
  fid := pg_temp.ans('c2',1,'first','no',80,'there was no tunnel at all',true);
  PERFORM pg_temp.expect(fid IS NOT NULL, 'seed first row');
END $$;
SELECT pg_temp.expect_fail($$SELECT pg_temp.ans('c3',1,'recheck','no',80,'there was no tunnel at all',true,NULL)$$, '23514', 'recheck needs trigger');
SELECT pg_temp.expect_fail($$SELECT pg_temp.ans('c3',1,'arbiter','no',80,'there was no tunnel at all',true,NULL)$$, '23514', 'arbiter needs trigger');
SELECT pg_temp.expect_fail($$SELECT pg_temp.ans('c3',1,'first','no',80,'there was no tunnel at all',true,(SELECT min(id) FROM public.bt_stance_answers))$$, '23514', 'first must have null trigger');
SELECT pg_temp.expect_fail($$SELECT pg_temp.ans('c3',1,'pilot','no',80,'there was no tunnel at all',true,(SELECT min(id) FROM public.bt_stance_answers))$$, '23514', 'pilot must have null trigger');
SELECT pg_temp.expect_fail($$SELECT pg_temp.ans('c3',1,'recheck','no',80,'there was no tunnel at all',true,(SELECT min(id) FROM public.bt_stance_answers),true,1,(SELECT min(id) FROM public.bt_stance_answers))$$, '23514', 'recheck must not carry recheck_answer_id');

-- ---------- final-stance resolution: every branch ----------
-- Each cell (video, question) exercises one branch. Q = 1 throughout.
DO $$ DECLARE f bigint; r bigint; a bigint; f2 bigint; BEGIN
  -- B1 unflagged yes (conf 90, verified) -> final, first
  PERFORM pg_temp.ans('b1',1,'first','yes',90,'i saw a bright light',true);
  -- B2 not_addressed conf 95 -> final, first
  PERFORM pg_temp.ans('b2',1,'first','not_addressed',95,NULL,false);
  -- B3 no verified; recheck no verified -> final, recheck preferred
  f := pg_temp.ans('b3',1,'first','no',80,'there was no tunnel at all',true);
  r := pg_temp.ans('b3',1,'recheck','no',85,'there really was no tunnel',true,f);
  -- B4 Haiku no verified + Sonnet no UNverified -> final using Haiku's row/quote
  f := pg_temp.ans('b4',1,'first','no',80,'there was no tunnel at all',true);
  r := pg_temp.ans('b4',1,'recheck','no',85,'sonnet paraphrase not in transcript',false,f);
  -- B5 Haiku yes unverified (flagged) + Sonnet yes verified -> final, recheck
  f := pg_temp.ans('b5',1,'first','yes',90,'haiku made up quote words',false);
  r := pg_temp.ans('b5',1,'recheck','yes',90,'i saw the light clearly',true,f);
  -- B6 both yes but neither verified; no arbiter -> pending_arbiter
  f := pg_temp.ans('b6',1,'first','yes',90,'made up quote words here',false);
  r := pg_temp.ans('b6',1,'recheck','yes',90,'another made up quote',false,f);
  -- B7 same as B6 plus arbiter verified -> final, arbiter
  f := pg_temp.ans('b7',1,'first','yes',90,'made up quote words here',false);
  r := pg_temp.ans('b7',1,'recheck','yes',90,'another made up quote',false,f);
  a := pg_temp.ans('b7',1,'arbiter','yes',90,'the real quote in the transcript',true,f,true,1,r);
  -- B8 same as B6 plus arbiter unverified -> unverified
  f := pg_temp.ans('b8',1,'first','yes',90,'made up quote words here',false);
  r := pg_temp.ans('b8',1,'recheck','yes',90,'another made up quote',false,f);
  a := pg_temp.ans('b8',1,'arbiter','yes',90,'arbiter invented quote text',false,f,true,1,r);
  -- B9 first mixed, recheck yes (differs), no arbiter -> pending_arbiter
  f := pg_temp.ans('b9',1,'first','mixed',80,'sort of felt it happen',true);
  r := pg_temp.ans('b9',1,'recheck','yes',80,'i did feel it happen',true,f);
  -- B10 same plus arbiter yes verified -> final, arbiter
  f := pg_temp.ans('b10',1,'first','mixed',80,'sort of felt it happen',true);
  r := pg_temp.ans('b10',1,'recheck','yes',80,'i did feel it happen',true,f);
  a := pg_temp.ans('b10',1,'arbiter','yes',80,'i did feel it happen',true,f,true,1,r);
  -- B11 low-confidence not_addressed, recheck agrees not_addressed -> final, recheck
  f := pg_temp.ans('b11',1,'first','not_addressed',50,NULL,false);
  r := pg_temp.ans('b11',1,'recheck','not_addressed',90,NULL,false,f);
  -- B12 flagged (conf 50 yes verified), no recheck yet -> pending_recheck
  PERFORM pg_temp.ans('b12',1,'first','yes',50,'quite a long quote here',true);
  -- B13 invalid first; recheck yes verified; no arbiter -> pending_arbiter (invalid first is a disagreement)
  f := pg_temp.ans('b13',1,'first',NULL,NULL,NULL,false,NULL,false);
  r := pg_temp.ans('b13',1,'recheck','yes',90,'i saw the light clearly',true,f);
  -- B14 invalid first; recheck; arbiter verified -> final, arbiter
  f := pg_temp.ans('b14',1,'first',NULL,NULL,NULL,false,NULL,false);
  r := pg_temp.ans('b14',1,'recheck','yes',90,'i saw the light clearly',true,f);
  a := pg_temp.ans('b14',1,'arbiter','yes',90,'i saw the light clearly',true,f,true,1,r);
  -- B15 first no verified; recheck INVALID -> arbiter path (pending_arbiter, then final with arbiter)
  f := pg_temp.ans('b15',1,'first','no',80,'there was no tunnel at all',true);
  r := pg_temp.ans('b15',1,'recheck',NULL,NULL,NULL,false,f,false);
  f := pg_temp.ans('b16',1,'first','no',80,'there was no tunnel at all',true);
  r := pg_temp.ans('b16',1,'recheck',NULL,NULL,NULL,false,f,false);
  a := pg_temp.ans('b16',1,'arbiter','no',80,'there was no tunnel at all',true,f,true,1,r);
  -- B17 stale arbiter: older first (flagged) + recheck differs + arbiter, then a NEWER first row
  --     (higher id, unflagged) -> final from the new first row; the stale arbiter is ignored
  f := pg_temp.ans('b17',1,'first','mixed',80,'sort of felt it happen',true);
  r := pg_temp.ans('b17',1,'recheck','yes',80,'i did feel it happen',true,f);
  a := pg_temp.ans('b17',1,'arbiter','yes',80,'i did feel it happen',true,f,true,1,r);
  f2 := pg_temp.ans('b17',1,'first','yes',95,'a brand new first pass quote',true,NULL,true,2);
  -- B18 stale lineage: new flagged first row; only the stale recheck/arbiter exist -> pending_recheck
  f := pg_temp.ans('b18',1,'first','mixed',80,'sort of felt it happen',true);
  r := pg_temp.ans('b18',1,'recheck','yes',80,'i did feel it happen',true,f);
  a := pg_temp.ans('b18',1,'arbiter','yes',80,'i did feel it happen',true,f,true,1,r);
  f2 := pg_temp.ans('b18',1,'first','no',80,'there was no tunnel at all',true,NULL,true,2);
  -- B19 latest first is by max(id), not attempt: attempt 2 inserted first (invalid), attempt 1 later (valid, unflagged)
  PERFORM pg_temp.ans('b19',1,'first',NULL,NULL,NULL,false,NULL,false,2);
  PERFORM pg_temp.ans('b19',1,'first','yes',88,'five words in this quote',true,NULL,true,1);
  -- B20 pilot rows never appear
  PERFORM pg_temp.ans('b20',1,'pilot','yes',90,'pilot only quote here ok',true);
  -- B22 first yes unverified; recheck yes unverified; arbiter INVALID -> status invalid (distinct from unverified)
  f := pg_temp.ans('b22',1,'first','yes',90,'made up quote words here',false);
  r := pg_temp.ans('b22',1,'recheck','yes',90,'another made up quote',false,f);
  a := pg_temp.ans('b22',1,'arbiter',NULL,NULL,NULL,false,f,false,1,r);
  -- B23 first mixed; recheck differs; arbiter INVALID -> invalid
  f := pg_temp.ans('b23',1,'first','mixed',80,'sort of felt it happen',true);
  r := pg_temp.ans('b23',1,'recheck','yes',80,'i did feel it happen',true,f);
  a := pg_temp.ans('b23',1,'arbiter',NULL,NULL,NULL,false,f,false,1,r);
  -- B24 arbiter invalid, then a newer valid verified arbiter row for the same first row -> final (latest arbiter wins)
  f := pg_temp.ans('b24',1,'first','mixed',80,'sort of felt it happen',true);
  r := pg_temp.ans('b24',1,'recheck','yes',80,'i did feel it happen',true,f);
  a := pg_temp.ans('b24',1,'arbiter',NULL,NULL,NULL,false,f,false,1,r);
  a := pg_temp.ans('b24',1,'arbiter','yes',80,'i did feel it happen',true,f,true,2,r);
  -- B21 latest recheck by max id per trigger: older recheck disagrees, newer agrees
  f := pg_temp.ans('b21',1,'first','no',80,'there was no tunnel at all',true);
  r := pg_temp.ans('b21',1,'recheck','yes',80,'i did feel it happen',true,f,true,1);
  r := pg_temp.ans('b21',1,'recheck','no',85,'there really was no tunnel',true,f,true,2);
END $$;

CREATE OR REPLACE FUNCTION pg_temp.fs(v text) RETURNS public.bt_final_stances LANGUAGE sql AS
  $$ SELECT * FROM public.bt_final_stances WHERE video_id = v AND question_id = 1 $$;

DO $$ DECLARE x public.bt_final_stances; BEGIN
  x := pg_temp.fs('b1');  PERFORM pg_temp.expect((x.status,x.deciding_pass,x.stance)=('final','first','yes'),'B1');
  x := pg_temp.fs('b2');  PERFORM pg_temp.expect((x.status,x.deciding_pass,x.stance)=('final','first','not_addressed'),'B2');
  x := pg_temp.fs('b3');  PERFORM pg_temp.expect((x.status,x.deciding_pass,x.stance,x.quote)=('final','recheck','no','there really was no tunnel'),'B3 recheck preferred when both verified');
  x := pg_temp.fs('b4');  PERFORM pg_temp.expect((x.status,x.deciding_pass,x.quote)=('final','first','there was no tunnel at all'),'B4 Haiku verified quote used');
  PERFORM pg_temp.expect(x.final_answer_id = x.first_answer_id AND x.recheck_answer_id IS NOT NULL, 'B4 ids');
  x := pg_temp.fs('b5');  PERFORM pg_temp.expect((x.status,x.deciding_pass,x.quote)=('final','recheck','i saw the light clearly'),'B5');
  x := pg_temp.fs('b6');  PERFORM pg_temp.expect(x.status='pending_arbiter' AND x.final_answer_id IS NULL AND x.stance IS NULL,'B6');
  x := pg_temp.fs('b7');  PERFORM pg_temp.expect((x.status,x.deciding_pass)=('final','arbiter'),'B7');
  x := pg_temp.fs('b8');  PERFORM pg_temp.expect((x.status,x.deciding_pass)=('unverified','arbiter'),'B8');
  x := pg_temp.fs('b9');  PERFORM pg_temp.expect(x.status='pending_arbiter','B9');
  x := pg_temp.fs('b10'); PERFORM pg_temp.expect((x.status,x.deciding_pass,x.stance)=('final','arbiter','yes'),'B10');
  x := pg_temp.fs('b11'); PERFORM pg_temp.expect((x.status,x.deciding_pass,x.stance)=('final','recheck','not_addressed'),'B11');
  x := pg_temp.fs('b12'); PERFORM pg_temp.expect(x.status='pending_recheck' AND x.flagged AND x.recheck_answer_id IS NULL,'B12');
  x := pg_temp.fs('b13'); PERFORM pg_temp.expect(x.status='pending_arbiter','B13 invalid first -> arbiter');
  x := pg_temp.fs('b14'); PERFORM pg_temp.expect((x.status,x.deciding_pass)=('final','arbiter'),'B14');
  x := pg_temp.fs('b15'); PERFORM pg_temp.expect(x.status='pending_arbiter','B15 invalid recheck -> arbiter');
  x := pg_temp.fs('b16'); PERFORM pg_temp.expect((x.status,x.deciding_pass,x.stance)=('final','arbiter','no'),'B16');
  x := pg_temp.fs('b17'); PERFORM pg_temp.expect((x.status,x.deciding_pass,x.stance,x.quote)=('final','first','yes','a brand new first pass quote'),'B17 stale arbiter ignored');
  PERFORM pg_temp.expect(x.recheck_answer_id IS NULL AND x.arbiter_answer_id IS NULL,'B17 no stale lineage exposed');
  x := pg_temp.fs('b18'); PERFORM pg_temp.expect(x.status='pending_recheck' AND x.arbiter_answer_id IS NULL,'B18 stale recheck/arbiter ignored');
  x := pg_temp.fs('b19'); PERFORM pg_temp.expect((x.status,x.deciding_pass,x.confidence)=('final','first',88),'B19 max(id) wins, not attempt');
  PERFORM pg_temp.expect(NOT EXISTS (SELECT 1 FROM public.bt_final_stances WHERE video_id='b20'),'B20 pilot excluded');
  x := pg_temp.fs('b22'); PERFORM pg_temp.expect(x.status='invalid' AND x.deciding_pass='arbiter' AND x.stance IS NULL,'B22 invalid arbiter -> invalid');
  x := pg_temp.fs('b23'); PERFORM pg_temp.expect(x.status='invalid' AND x.final_answer_id = x.arbiter_answer_id,'B23 invalid arbiter -> invalid');
  x := pg_temp.fs('b24'); PERFORM pg_temp.expect((x.status,x.deciding_pass,x.stance)=('final','arbiter','yes'),'B24 newer arbiter replaces invalid one');
  PERFORM pg_temp.expect((SELECT status FROM public.bt_final_stances WHERE video_id='b8' AND question_id=1)='unverified','B8 stays unverified (valid arbiter, unverified quote)');
  x := pg_temp.fs('b21'); PERFORM pg_temp.expect((x.status,x.deciding_pass,x.stance)=('final','recheck','no'),'B21 latest recheck by id');
  PERFORM pg_temp.expect((SELECT count(*) FROM public.bt_final_stances WHERE question_id=1)=24,'one row per cell (b1..b19, b21..b24, c2; pilot b20 excluded)');
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
  PERFORM pg_temp.expect((SELECT person_key FROM bt_effective_person_map WHERE video_id='v2')='profile:10','merge maps to lowest profile id');
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

-- canonical preference: lowest NUMERIC profile id (9 beats 100), profile: beats named:
INSERT INTO public.bt_person_links (video_id, person_key, profile_id, source, match_level) VALUES
  ('v5','profile:100',100,'profile_video_ids','profile'),
  ('v6','profile:9',9,'profile_video_ids','profile'),
  ('v7','named:aaron zed',NULL,'baseline','baseline');
INSERT INTO public.bt_link_decisions (link_id, decision, decided_by)
  SELECT id,'accept','auto' FROM public.bt_person_links WHERE video_id IN ('v5','v6','v7');
INSERT INTO public.bt_merge_candidates (key_a,key_b,rule) VALUES ('profile:100','profile:9','t'),('named:aaron zed','profile:100','t');
INSERT INTO public.bt_merge_decisions (candidate_id, decision, decided_by)
  SELECT id,'merge','human' FROM public.bt_merge_candidates WHERE key_a IN ('profile:100','named:aaron zed');
DO $$ BEGIN
  PERFORM pg_temp.expect((SELECT person_key FROM bt_effective_person_map WHERE video_id='v5')='profile:9','numeric id order, not lexicographic');
  PERFORM pg_temp.expect((SELECT person_key FROM bt_effective_person_map WHERE video_id='v7')='profile:9','profile: beats named: in a component');
  PERFORM pg_temp.expect((SELECT count(DISTINCT person_key) FROM bt_effective_person_map WHERE video_id IN ('v5','v6','v7'))=1,'one component');
END $$;
-- named: vs named: falls back to lexicographic
INSERT INTO public.bt_merge_candidates (key_a,key_b,rule) VALUES ('named:amy b','named:amy c','t');
INSERT INTO public.bt_merge_decisions (candidate_id, decision, decided_by) SELECT id,'merge','human' FROM public.bt_merge_candidates WHERE key_a='named:amy b';
DO $$ BEGIN
  PERFORM pg_temp.expect((SELECT canonical_key FROM bt_person_canonical WHERE person_key='named:amy c')='named:amy b','named: lexicographic');
END $$;

-- unmapped NDE videos: nde_analysis nde set minus mapped videos
DO $$ BEGIN
  PERFORM pg_temp.expect((SELECT array_agg(video_id ORDER BY video_id) FROM bt_unmapped_nde_videos)=ARRAY['u1','u2'],'unmapped = u1,u2 (v1..v7 mapped; ste video excluded)');
END $$;
INSERT INTO public.bt_person_links (video_id, person_key, source, match_level) VALUES ('u1','anon:u1','baseline','baseline');
INSERT INTO public.bt_link_decisions (link_id, decision, decided_by) SELECT id,'accept','auto' FROM public.bt_person_links WHERE video_id='u1';
DO $$ BEGIN
  PERFORM pg_temp.expect((SELECT array_agg(video_id) FROM bt_unmapped_nde_videos)=ARRAY['u2'],'u1 now mapped');
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
  PERFORM pg_temp.expect(EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid JOIN pg_class r ON r.oid = c.confrelid
    WHERE c.contype = 'f' AND t.relname = 'bt_stance_answers' AND r.relname = 'bt_stance_answers'),
    'lineage self-FK present');
  -- the live app can still delete from referenced tables even when bt_ rows mention the id
  DELETE FROM public.nde_vids WHERE "videoId" = 'v4';
  DELETE FROM public.nde_questions WHERE id = 5;
  DELETE FROM public.experiencer_profiles WHERE id = 12;
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
DO $$ DECLARE t text; s text; BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relname LIKE 'bt\_%' AND c.relkind='r' LOOP
    PERFORM pg_temp.expect((SELECT relrowsecurity FROM pg_class WHERE relname=t),'RLS on '||t);
    PERFORM pg_temp.expect(NOT has_table_privilege('anon','public.'||t,'SELECT'),'anon no select '||t);
    PERFORM pg_temp.expect(NOT has_table_privilege('authenticated','public.'||t,'INSERT'),'authenticated no insert '||t);
    s := NULL;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='id') THEN
      s := pg_get_serial_sequence('public.'||t, 'id');
    END IF;
    IF s IS NOT NULL THEN
      PERFORM pg_temp.expect(NOT has_sequence_privilege('anon', s, 'USAGE') AND NOT has_sequence_privilege('authenticated', s, 'USAGE')
                             AND NOT has_sequence_privilege('anon', s, 'SELECT'), 'sequence revoked '||s);
    END IF;
  END LOOP;
  FOREACH t IN ARRAY ARRAY['bt_final_stances','bt_effective_person_map','bt_unmapped_nde_videos','bt_person_canonical'] LOOP
    PERFORM pg_temp.expect(NOT has_table_privilege('authenticated','public.'||t,'SELECT'),'view revoked '||t);
  END LOOP;
  PERFORM pg_temp.expect((SELECT count(*) FROM pg_policies WHERE tablename LIKE 'bt\_%')=0,'no policies');
END $$;
SELECT 'ALL SQL BEHAVIOUR ASSERTIONS PASSED' AS result;
