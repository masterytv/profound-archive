-- ============================================================
-- Book tally research pipeline — bt_* tables, views, RLS, immutability
-- ============================================================
-- Design: scripts/book-tally/SPEC.md (authoritative).
--
-- NOTE: staging and production share one database — running this IS a
-- production change. It only ADDS new bt_* objects and touches no existing
-- table. There are deliberately NO foreign keys from bt_* to nde_vids,
-- nde_questions or experiencer_profiles (they would add RI triggers that block
-- the live app's deletes); video / question / profile ids are validated in
-- code at write time (scripts/book-tally/lib/supabase.ts). FKs among bt_*
-- tables are kept. Tom runs it deliberately.
-- Rollback: supabase/rollbacks/20261118_001_book_tally_rollback.sql
--
-- Access model:
--   * Service role only. RLS is ENABLED on every bt_ table with NO policies,
--     and anon/authenticated privileges are revoked. Views are
--     security_invoker so they cannot be used to read around RLS.
--   * Research data is append-only. A trigger blocks UPDATE, DELETE and
--     TRUNCATE on every bt_ table; the single exception is the bookkeeping
--     columns of bt_runs (status, actual_usage, batch_ids, finished_at).
--     Corrections are made by APPENDING a newer decision/answer row; the
--     views below always resolve to the latest one, so every merge, link
--     acceptance and stance resolution is reversible.
--   * Transcript text is never stored here. Quotes (<= a few sentences the
--     model returned) and model outputs are; raw request bodies are not.
--
-- Id column types match the live tables (verified read-only 2026-11-18):
-- nde_questions.id integer, nde_vids."videoId" text, experiencer_profiles.id bigint.
-- ============================================================

BEGIN;

-- ── Runs ─────────────────────────────────────────────────────
CREATE TABLE public.bt_runs (
    id            text PRIMARY KEY CHECK (id ~ '^[A-Za-z0-9_-]{1,32}$'),   -- embedded in batch custom_id (API: [A-Za-z0-9_-]{1,64})
    job           text NOT NULL CHECK (job IN ('pair_judge','name_extract','stance','other')),
    pass          text CHECK (pass IS NULL OR pass IN ('pilot','first','recheck','arbiter','haiku','sonnet')),
    model         text NOT NULL,
    effort        text CHECK (effort IS NULL OR effort IN ('low','medium','high','xhigh','max')),
    status        text NOT NULL DEFAULT 'estimated'
                  CHECK (status IN ('estimated','submitting','submitted','collecting','completed','failed','canceled')),
    params        jsonb NOT NULL DEFAULT '{}'::jsonb,     -- seed, sample ids, flags
    estimate      jsonb,                                  -- printed pre-spend estimate
    actual_usage  jsonb,                                  -- summed usage + cost, bookkeeping
    batch_ids     text[] NOT NULL DEFAULT '{}',           -- recorded BEFORE polling
    script        text,
    git_sha       text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    finished_at   timestamptz
);
CREATE INDEX bt_runs_job_idx ON public.bt_runs (job, pass, created_at DESC);

-- ── Prompts (rows inserted the first time a prompt is used) ──
CREATE TABLE public.bt_prompts (
    prompt_hash    text PRIMARY KEY CHECK (prompt_hash ~ '^[0-9a-f]{64}$'),
    name           text NOT NULL,              -- e.g. stance-v1
    template       text NOT NULL,              -- prompt template file contents (no transcripts)
    question_list  jsonb,                      -- rendered question list as hashed
    output_schema  jsonb,                      -- JSON schema as hashed
    created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bt_prompts_name_idx ON public.bt_prompts (name);

-- ── Raw batch results (response incl. usage; never the transcript) ──
CREATE TABLE public.bt_raw_responses (
    id            bigserial PRIMARY KEY,
    run_id        text NOT NULL REFERENCES public.bt_runs(id),
    custom_id     text NOT NULL,
    batch_id      text,
    model         text,                         -- requested model
    model_version text,                         -- response.model
    result_type   text NOT NULL CHECK (result_type IN ('succeeded','errored','canceled','expired')),
    response      jsonb NOT NULL,               -- message object (content + usage) or error
    created_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT bt_raw_responses_run_custom_key UNIQUE (run_id, custom_id)
);
CREATE INDEX bt_raw_responses_batch_idx ON public.bt_raw_responses (batch_id);

-- ── Job 1: name extraction from transcripts (self-stated names) ──
CREATE TABLE public.bt_name_extractions (
    id                 bigserial PRIMARY KEY,
    run_id             text NOT NULL REFERENCES public.bt_runs(id),
    video_id           text NOT NULL,
    name               text,                    -- NULL when the speaker never states their own name
    quote              text,
    quote_verified     boolean NOT NULL DEFAULT false,
    name_in_quote      boolean NOT NULL DEFAULT false,  -- name tokens appear inside the quote
    quote_norm_offset  integer,
    transcript_source  text CHECK (transcript_source IS NULL OR transcript_source IN
                                   ('subtitles_punctuated','subtitles_cleaned','subtitles')),
    model              text NOT NULL,
    model_version      text,
    prompt_hash        text NOT NULL REFERENCES public.bt_prompts(prompt_hash),
    raw_response_id    bigint REFERENCES public.bt_raw_responses(id),
    valid              boolean NOT NULL DEFAULT true,
    error              text,
    created_at         timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT bt_name_extractions_name_needs_quote CHECK (name IS NULL OR quote IS NOT NULL)
);
CREATE INDEX bt_name_extractions_video_idx ON public.bt_name_extractions (video_id, id DESC);
CREATE INDEX bt_name_extractions_run_idx   ON public.bt_name_extractions (run_id);

-- ── Job 1: video -> person links and their decisions ─────────
-- person_key: profile:<experiencer_profiles.id> | named:<normalized name> | anon:<videoId>
CREATE TABLE public.bt_person_links (
    id                  bigserial PRIMARY KEY,
    video_id            text NOT NULL,
    person_key          text NOT NULL CHECK (person_key ~ '^(profile|named|anon):.+'),
    profile_id          bigint,                   -- set when person_key is profile:*
    source              text NOT NULL CHECK (source IN
                          ('profile_video_ids','exact_name_match','transcript_self_name','baseline')),
    match_level         text NOT NULL CHECK (match_level IN ('profile','exact','core','self_name','baseline')),
    name_extraction_id  bigint REFERENCES public.bt_name_extractions(id),
    evidence            jsonb NOT NULL DEFAULT '{}'::jsonb,
    run_id              text REFERENCES public.bt_runs(id),
    created_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT bt_person_links_video_person_source_key UNIQUE (video_id, person_key, source),
    CONSTRAINT bt_person_links_profile_consistent CHECK (
        (person_key LIKE 'profile:%') = (profile_id IS NOT NULL)
    )
);
CREATE INDEX bt_person_links_video_idx   ON public.bt_person_links (video_id);
CREATE INDEX bt_person_links_person_idx  ON public.bt_person_links (person_key);
CREATE INDEX bt_person_links_profile_idx ON public.bt_person_links (profile_id);

CREATE TABLE public.bt_link_decisions (
    id          bigserial PRIMARY KEY,
    link_id     bigint NOT NULL REFERENCES public.bt_person_links(id),
    decision    text NOT NULL CHECK (decision IN ('accept','reject','revert')),  -- revert => back to pending
    decided_by  text NOT NULL,              -- 'auto:exact_name', 'auto:baseline', 'human', ...
    note        text,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bt_link_decisions_link_idx ON public.bt_link_decisions (link_id, id DESC);

-- ── Job 1: merge candidates (pairs of person keys), judgments, decisions ──
CREATE TABLE public.bt_merge_candidates (
    id          bigserial PRIMARY KEY,
    key_a       text NOT NULL CHECK (key_a ~ '^(profile|named):.+'),
    key_b       text NOT NULL CHECK (key_b ~ '^(profile|named):.+'),
    rule        text NOT NULL,              -- which candidate rule fired (last+first, first+JW(last), swapped, ...)
    features    jsonb NOT NULL DEFAULT '{}'::jsonb,   -- names, scores, years, channels (no transcripts)
    run_id      text REFERENCES public.bt_runs(id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT bt_merge_candidates_ordered CHECK (key_a < key_b),
    CONSTRAINT bt_merge_candidates_pair_key UNIQUE (key_a, key_b)
);
CREATE INDEX bt_merge_candidates_b_idx ON public.bt_merge_candidates (key_b);

CREATE TABLE public.bt_merge_judgments (
    id               bigserial PRIMARY KEY,
    candidate_id     bigint NOT NULL REFERENCES public.bt_merge_candidates(id),
    judge            text NOT NULL CHECK (judge IN ('haiku','sonnet')),
    verdict          text NOT NULL CHECK (verdict IN ('same','different','unsure')),
    reason           text,
    model            text NOT NULL,
    model_version    text,
    prompt_hash      text NOT NULL REFERENCES public.bt_prompts(prompt_hash),
    run_id           text NOT NULL REFERENCES public.bt_runs(id),
    raw_response_id  bigint REFERENCES public.bt_raw_responses(id),
    created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bt_merge_judgments_cand_idx ON public.bt_merge_judgments (candidate_id, judge, id DESC);

CREATE TABLE public.bt_merge_decisions (
    id            bigserial PRIMARY KEY,
    candidate_id  bigint NOT NULL REFERENCES public.bt_merge_candidates(id),
    decision      text NOT NULL CHECK (decision IN ('merge','keep_separate','revert')),  -- revert => undecided
    decided_by    text NOT NULL,            -- 'auto:haiku+sonnet', 'auto:haiku', 'human'
    note          text,
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bt_merge_decisions_cand_idx ON public.bt_merge_decisions (candidate_id, id DESC);

-- ── Job 2: stance answers ────────────────────────────────────
CREATE TABLE public.bt_stance_answers (
    id                 bigserial PRIMARY KEY,
    run_id             text NOT NULL REFERENCES public.bt_runs(id),
    video_id           text NOT NULL,
    question_id        integer NOT NULL,
    pass               text NOT NULL CHECK (pass IN ('pilot','first','recheck','arbiter')),
    attempt            integer NOT NULL DEFAULT 1 CHECK (attempt >= 1),
    stance             text CHECK (stance IS NULL OR stance IN ('yes','no','mixed','not_addressed')),
    confidence         integer CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 100),
    quote              text,
    quote_verified     boolean NOT NULL DEFAULT false,
    quote_norm_offset  integer,
    start_seconds      numeric,
    model              text NOT NULL,
    model_version      text,
    prompt_hash        text NOT NULL REFERENCES public.bt_prompts(prompt_hash),
    transcript_source  text CHECK (transcript_source IS NULL OR transcript_source IN
                                   ('subtitles_punctuated','subtitles_cleaned','subtitles')),
    raw_response_id    bigint REFERENCES public.bt_raw_responses(id),
    valid              boolean NOT NULL DEFAULT true,   -- false: schema/coverage failure, stance NULL
    error              text,
    -- Lineage: recheck rows point at the first-pass answer that flagged them; arbiter rows
    -- at the first-pass answer and (when one exists) the recheck answer they arbitrate.
    trigger_answer_id  bigint REFERENCES public.bt_stance_answers(id),
    recheck_answer_id  bigint REFERENCES public.bt_stance_answers(id),
    created_at         timestamptz NOT NULL DEFAULT now(),
    -- Silence is never 'no', and no claim without a quote.
    CONSTRAINT bt_stance_answers_claim_needs_quote CHECK (
        stance IS NULL OR stance = 'not_addressed' OR quote IS NOT NULL
    ),
    CONSTRAINT bt_stance_answers_valid_complete CHECK (
        NOT valid OR (stance IS NOT NULL AND confidence IS NOT NULL)
    ),
    CONSTRAINT bt_stance_answers_quote_not_blank CHECK (quote IS NULL OR length(btrim(quote)) > 0),
    CONSTRAINT bt_stance_answers_verified_has_offset CHECK (NOT quote_verified OR quote_norm_offset IS NOT NULL),
    CONSTRAINT bt_stance_answers_lineage_first_pilot CHECK (
        pass NOT IN ('first','pilot') OR (trigger_answer_id IS NULL AND recheck_answer_id IS NULL)
    ),
    CONSTRAINT bt_stance_answers_lineage_recheck CHECK (
        pass <> 'recheck' OR (trigger_answer_id IS NOT NULL AND recheck_answer_id IS NULL)
    ),
    CONSTRAINT bt_stance_answers_lineage_arbiter CHECK (pass <> 'arbiter' OR trigger_answer_id IS NOT NULL),
    CONSTRAINT bt_stance_answers_cell_key UNIQUE (run_id, video_id, question_id, pass, attempt, model)
);
CREATE INDEX bt_stance_answers_cell_idx     ON public.bt_stance_answers (video_id, question_id, pass, id DESC);
CREATE INDEX bt_stance_answers_trigger_idx  ON public.bt_stance_answers (trigger_answer_id, pass, id DESC);
CREATE INDEX bt_stance_answers_run_idx      ON public.bt_stance_answers (run_id);
CREATE INDEX bt_stance_answers_question_idx ON public.bt_stance_answers (question_id);

-- ── Job 2: gold-set human marks ──────────────────────────────
CREATE TABLE public.bt_gold_marks (
    id                   bigserial PRIMARY KEY,
    video_id             text NOT NULL,
    question_id          integer NOT NULL,
    stance_answer_id     bigint REFERENCES public.bt_stance_answers(id),  -- the final answer that was judged
    final_stance         text NOT NULL CHECK (final_stance IN ('yes','no','mixed','not_addressed')),
    correct              boolean NOT NULL,                 -- for not_addressed rows: "not_addressed is right"
    quote_is_experiencer boolean,
    note                 text,
    marked_by            text NOT NULL DEFAULT 'human',
    run_id               text REFERENCES public.bt_runs(id),
    created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bt_gold_marks_cell_idx ON public.bt_gold_marks (video_id, question_id, id DESC);

-- ============================================================
-- Immutability: append-only, except bt_runs bookkeeping columns
-- ============================================================
CREATE FUNCTION public.bt_block_mutation() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $fn$
BEGIN
    RAISE EXCEPTION 'bt_* tables are append-only: % on % is not permitted; append a newer row instead',
        TG_OP, TG_TABLE_NAME
        USING ERRCODE = 'restrict_violation';
END;
$fn$;

CREATE FUNCTION public.bt_runs_guard_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $fn$
BEGIN
    IF (to_jsonb(NEW) - ARRAY['status','actual_usage','batch_ids','finished_at'])
       IS DISTINCT FROM
       (to_jsonb(OLD) - ARRAY['status','actual_usage','batch_ids','finished_at']) THEN
        RAISE EXCEPTION 'bt_runs: only status, actual_usage, batch_ids and finished_at may be updated'
            USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN NEW;
END;
$fn$;

DO $do$
DECLARE
    t   text;
    seq text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'bt_runs','bt_prompts','bt_raw_responses','bt_person_links','bt_link_decisions',
        'bt_merge_candidates','bt_merge_judgments','bt_merge_decisions','bt_name_extractions',
        'bt_stance_answers','bt_gold_marks'
    ] LOOP
        -- RLS on, no policies: only the service role (BYPASSRLS) can touch these.
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
        seq := NULL;
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = t AND column_name = 'id') THEN
            seq := pg_get_serial_sequence(format('public.%I', t), 'id');
        END IF;
        IF seq IS NOT NULL THEN
            EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM anon, authenticated', seq);
        END IF;

        -- DELETE and TRUNCATE are blocked everywhere.
        EXECUTE format(
            'CREATE TRIGGER %I BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bt_block_mutation()',
            t || '_no_delete', t);
        EXECUTE format(
            'CREATE TRIGGER %I BEFORE TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.bt_block_mutation()',
            t || '_no_truncate', t);

        -- UPDATE is blocked everywhere except bt_runs (guarded by column).
        IF t <> 'bt_runs' THEN
            EXECUTE format(
                'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bt_block_mutation()',
                t || '_no_update', t);
        END IF;
    END LOOP;
END
$do$;

CREATE TRIGGER bt_runs_bookkeeping_only
    BEFORE UPDATE ON public.bt_runs
    FOR EACH ROW EXECUTE FUNCTION public.bt_runs_guard_update();

-- ============================================================
-- Views (security_invoker: underlying RLS applies; service role only)
-- "Latest row wins" everywhere => decisions are reversible by appending.
-- ============================================================

CREATE VIEW public.bt_latest_link_decision WITH (security_invoker = true) AS
SELECT DISTINCT ON (link_id) link_id, id AS decision_id, decision, decided_by, note, created_at
FROM public.bt_link_decisions
ORDER BY link_id, id DESC;

CREATE VIEW public.bt_latest_merge_decision WITH (security_invoker = true) AS
SELECT DISTINCT ON (candidate_id) candidate_id, id AS decision_id, decision, decided_by, note, created_at
FROM public.bt_merge_decisions
ORDER BY candidate_id, id DESC;

-- Connected components of the graph whose edges are candidates whose LATEST
-- decision is 'merge' (transitive: A~B and B~C puts A, B, C in one person).
-- canonical_key preference: profile: over named: over anon:, and among profile:
-- keys the lowest NUMERIC id (profile:9 beats profile:100); then lexicographic.
CREATE VIEW public.bt_person_canonical WITH (security_invoker = true) AS
WITH RECURSIVE edges AS (
    SELECT c.key_a AS a, c.key_b AS b
    FROM public.bt_merge_candidates c
    JOIN public.bt_latest_merge_decision d ON d.candidate_id = c.id
    WHERE d.decision = 'merge'
    UNION ALL
    SELECT c.key_b, c.key_a
    FROM public.bt_merge_candidates c
    JOIN public.bt_latest_merge_decision d ON d.candidate_id = c.id
    WHERE d.decision = 'merge'
),
reach(person_key, reached_key) AS (
    SELECT a, a FROM edges
    UNION
    SELECT r.person_key, e.b
    FROM reach r
    JOIN edges e ON e.a = r.reached_key
)
SELECT DISTINCT ON (person_key) person_key, reached_key AS canonical_key
FROM reach
ORDER BY person_key,
         CASE split_part(reached_key, ':', 1) WHEN 'profile' THEN 1 WHEN 'named' THEN 2 ELSE 3 END,
         CASE WHEN reached_key ~ '^profile:[0-9]+$' THEN substr(reached_key, 9)::bigint END NULLS LAST,
         reached_key;

-- video -> person. Only links whose latest decision is 'accept' count
-- ('revert' returns a link to pending; no decision = pending). If a video has
-- several accepted links, precedence is profile_video_ids > exact_name_match >
-- transcript_self_name > baseline, then lowest link id. person_key is the
-- effective person AFTER applying merges; linked_person_key is pre-merge.
CREATE VIEW public.bt_effective_person_map WITH (security_invoker = true) AS
WITH chosen AS (
    SELECT DISTINCT ON (l.video_id)
           l.video_id, l.person_key AS linked_person_key, l.id AS link_id, l.source, l.match_level
    FROM public.bt_person_links l
    JOIN public.bt_latest_link_decision d ON d.link_id = l.id AND d.decision = 'accept'
    ORDER BY l.video_id,
             CASE l.source
                 WHEN 'profile_video_ids'     THEN 1
                 WHEN 'exact_name_match'      THEN 2
                 WHEN 'transcript_self_name'  THEN 3
                 ELSE 4
             END,
             l.id
)
SELECT c.video_id,
       COALESCE(pc.canonical_key, c.linked_person_key) AS person_key,
       c.linked_person_key,
       c.link_id,
       c.source,
       c.match_level
FROM chosen c
LEFT JOIN public.bt_person_canonical pc ON pc.person_key = c.linked_person_key;

-- Unmapped NDE videos: the NDE set (nde_analysis.experience_type = 'nde') minus every
-- video that has an accepted link. The rollup asserts this is empty before tallying.
CREATE VIEW public.bt_unmapped_nde_videos WITH (security_invoker = true) AS
SELECT a.video_id
FROM public.nde_analysis a
WHERE a.experience_type = 'nde'
  AND NOT EXISTS (SELECT 1 FROM public.bt_effective_person_map m WHERE m.video_id = a.video_id);

-- Final stance per (video, question). Lineage, not attempt numbers, ties passes together:
--   f = latest first-pass row (max id) for the cell; every later pass must point at it
--       through trigger_answer_id, so rows belonging to an older first row are ignored.
--   r = latest recheck (max id) with trigger_answer_id = f.id
--   a = latest arbiter (max id) with trigger_answer_id = f.id
-- ok(x) = x is valid AND (stance = not_addressed OR its quote is verified).
-- flagged(f) = f invalid OR stance in (no, mixed) OR confidence < 70 OR NOT ok(f).
--   not flagged                      -> final = f
--   flagged, no recheck              -> pending_recheck
--   recheck agrees (both valid, same stance) and ok(r) -> final = r (recheck preferred)
--                                    and ok(f) only      -> final = f (its verified quote)
--   neither ok / recheck differs / either invalid -> arbiter:
--       no arbiter -> pending_arbiter; ok(a) -> final = a; arbiter invalid -> invalid;
--       arbiter valid but its quote unverified -> unverified (both excluded from tallies).
-- deciding_pass = pass of the row supplying final_answer_id/stance/quote (NULL while pending).
-- Tallies must use status = 'final' only.
CREATE VIEW public.bt_final_stances WITH (security_invoker = true) AS
WITH f AS (
    SELECT DISTINCT ON (x.video_id, x.question_id)
           x.*,
           (   NOT x.valid
            OR x.stance IN ('no','mixed')
            OR x.confidence < 70
            OR (x.stance <> 'not_addressed' AND NOT x.quote_verified)
           ) AS flagged,
           (x.valid AND (x.stance = 'not_addressed' OR x.quote_verified)) AS ok
    FROM public.bt_stance_answers x
    WHERE x.pass = 'first'
    ORDER BY x.video_id, x.question_id, x.id DESC
),
r AS (
    SELECT DISTINCT ON (x.trigger_answer_id)
           x.*, (x.valid AND (x.stance = 'not_addressed' OR x.quote_verified)) AS ok
    FROM public.bt_stance_answers x
    WHERE x.pass = 'recheck'
    ORDER BY x.trigger_answer_id, x.id DESC
),
a AS (
    SELECT DISTINCT ON (x.trigger_answer_id)
           x.*, (x.valid AND (x.stance = 'not_addressed' OR x.quote_verified)) AS ok
    FROM public.bt_stance_answers x
    WHERE x.pass = 'arbiter'
    ORDER BY x.trigger_answer_id, x.id DESC
),
j AS (
    SELECT f.video_id, f.question_id, f.flagged,
           f.id AS first_answer_id, r.id AS recheck_answer_id, a.id AS arbiter_answer_id,
           COALESCE(r.id IS NOT NULL AND r.valid AND f.valid AND r.stance = f.stance, false) AS agree,
           f.ok AS f_ok, r.ok AS r_ok, a.ok AS a_ok, a.valid AS a_valid
    FROM f
    LEFT JOIN r ON r.trigger_answer_id = f.id
    LEFT JOIN a ON a.trigger_answer_id = f.id
),
resolved AS (
    SELECT j.*,
           CASE
               WHEN NOT j.flagged THEN j.first_answer_id
               WHEN j.recheck_answer_id IS NULL THEN NULL
               WHEN j.agree AND j.r_ok THEN j.recheck_answer_id
               WHEN j.agree AND j.f_ok THEN j.first_answer_id
               WHEN j.arbiter_answer_id IS NOT NULL THEN j.arbiter_answer_id
           END AS final_answer_id,
           CASE
               WHEN NOT j.flagged THEN 'final'
               WHEN j.recheck_answer_id IS NULL THEN 'pending_recheck'
               WHEN j.agree AND (j.r_ok OR j.f_ok) THEN 'final'
               WHEN j.arbiter_answer_id IS NULL THEN 'pending_arbiter'
               WHEN j.a_ok THEN 'final'
               WHEN NOT j.a_valid THEN 'invalid'
               ELSE 'unverified'
           END AS status
    FROM j
)
SELECT rs.video_id,
       rs.question_id,
       c.stance,
       c.confidence,
       c.quote,
       c.quote_verified,
       c.quote_norm_offset,
       c.start_seconds,
       c.model            AS deciding_model,
       c.model_version    AS deciding_model_version,
       c.pass             AS deciding_pass,
       rs.flagged,
       rs.first_answer_id,
       rs.recheck_answer_id,
       rs.arbiter_answer_id,
       rs.final_answer_id,
       rs.status
FROM resolved rs
LEFT JOIN public.bt_stance_answers c ON c.id = rs.final_answer_id;

REVOKE ALL ON public.bt_latest_link_decision, public.bt_latest_merge_decision,
              public.bt_person_canonical, public.bt_effective_person_map,
              public.bt_unmapped_nde_videos, public.bt_final_stances
    FROM anon, authenticated;

COMMIT;
