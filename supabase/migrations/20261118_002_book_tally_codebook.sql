-- ============================================================
-- Book tally, Job 3: codebook coding (replaces Job 2's yes/no-only stance coding)
-- ============================================================
-- Design: scripts/book-tally/codebook/codebook-v1.md (approved by the owner 2026-11-18).
--
-- NOTE: staging and production share one database, so running this IS a production change.
-- It only ADDS two bt_* tables. No existing table, view, function or row is changed.
-- It depends on 20261118_001_book_tally.sql (bt_runs, bt_prompts, bt_raw_responses, and the
-- function public.bt_block_mutation()). The owner runs it deliberately.
-- Rollback: supabase/rollbacks/20261118_002_book_tally_codebook_rollback.sql
--
-- Access model: the same as 001. RLS is on with no policies (service role only), anon and
-- authenticated privileges are revoked, and UPDATE, DELETE and TRUNCATE are blocked by trigger.
-- Corrections are made by appending rows.
--
-- One row per (run, video, codebook item, attempt). An item is a question part ("q38", "q2a") or a
-- per-video fact ("f0".."f6"). kind 'yn' is a yes/no item, 'mc' a multiple-choice item.
--   addressed  NULL = the row is invalid (the model's answer failed a check); see error.
--   yn:  stance yes|no|mixed plus one quote.
--   mc:  choices = JSON array of 1..5 answers, each
--        {code, quote, other_text, quote_verified, quote_norm_offset, quote_check}.
-- quote_verified on an mc row is true only when every answer's quote verified. The rollup counts
-- each answer by its own quote_verified.
-- ============================================================

BEGIN;

CREATE TABLE public.bt_coded_answers (
    id                 bigserial PRIMARY KEY,
    run_id             text NOT NULL REFERENCES public.bt_runs(id),
    video_id           text NOT NULL,
    item_key           text NOT NULL CHECK (item_key ~ '^(q[0-9]{1,3}[a-z]?|f[0-9])$'),
    question_id        integer,                      -- NULL for facts
    kind               text NOT NULL CHECK (kind IN ('yn','mc')),
    attempt            integer NOT NULL DEFAULT 1 CHECK (attempt >= 1),
    addressed          boolean,
    stance             text CHECK (stance IS NULL OR stance IN ('yes','no','mixed')),
    quote              text,
    quote_verified     boolean NOT NULL DEFAULT false,
    quote_norm_offset  integer,
    choices            jsonb,
    confidence         integer CHECK (confidence IS NULL OR (confidence BETWEEN 0 AND 100)),
    transcript_source  text CHECK (transcript_source IS NULL OR transcript_source IN
                                   ('subtitles_punctuated','subtitles_cleaned','subtitles')),
    model              text NOT NULL,
    model_version      text,
    prompt_hash        text NOT NULL REFERENCES public.bt_prompts(prompt_hash),
    codebook_version   text NOT NULL,
    raw_response_id    bigint REFERENCES public.bt_raw_responses(id),
    valid              boolean NOT NULL DEFAULT true,
    error              text,
    created_at         timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT bt_coded_answers_question_matches_key CHECK (
        (item_key LIKE 'f%' AND question_id IS NULL) OR (item_key LIKE 'q%' AND question_id IS NOT NULL)
    ),
    CONSTRAINT bt_coded_answers_valid_complete CHECK (
        NOT valid OR (addressed IS NOT NULL AND confidence IS NOT NULL)
    ),
    CONSTRAINT bt_coded_answers_invalid_empty CHECK (
        valid OR (addressed IS NULL AND stance IS NULL AND quote IS NULL AND choices IS NULL)
    ),
    CONSTRAINT bt_coded_answers_not_addressed_empty CHECK (
        addressed IS DISTINCT FROM false OR (stance IS NULL AND quote IS NULL AND choices IS NULL)
    ),
    CONSTRAINT bt_coded_answers_yn_shape CHECK (
        kind <> 'yn' OR addressed IS DISTINCT FROM true
        OR (stance IS NOT NULL AND quote IS NOT NULL AND length(btrim(quote)) > 0 AND choices IS NULL)
    ),
    CONSTRAINT bt_coded_answers_mc_shape CHECK (
        kind <> 'mc' OR addressed IS DISTINCT FROM true
        OR (stance IS NULL AND quote IS NULL AND jsonb_typeof(choices) = 'array'
            AND jsonb_array_length(choices) BETWEEN 1 AND 5)
    ),
    CONSTRAINT bt_coded_answers_verified_has_offset CHECK (
        kind <> 'yn' OR NOT quote_verified OR quote_norm_offset IS NOT NULL
    ),
    CONSTRAINT bt_coded_answers_cell_key UNIQUE (run_id, video_id, item_key, attempt),
    -- target of the gold marks' composite foreign key (a mark cannot name the wrong video or item)
    CONSTRAINT bt_coded_answers_id_video_item_key UNIQUE (id, video_id, item_key)
);
-- (run_id, video_id) lookups use the leading columns of bt_coded_answers_cell_key.
CREATE INDEX bt_coded_answers_item_idx  ON public.bt_coded_answers (item_key);
CREATE INDEX bt_coded_answers_video_idx ON public.bt_coded_answers (video_id, item_key, id DESC);
CREATE INDEX bt_coded_answers_raw_idx   ON public.bt_coded_answers (raw_response_id);

-- Owner's gold-set marks on coded answers (latest mark per coded answer wins; append to correct).
CREATE TABLE public.bt_coded_gold_marks (
    id                    bigserial PRIMARY KEY,
    coded_answer_id       bigint NOT NULL,
    video_id              text NOT NULL,
    item_key              text NOT NULL,
    addressed_correct     boolean NOT NULL,   -- was "addressed" / "not addressed" right?
    answer_correct        boolean,            -- yn: the stance is right. mc: every listed answer is right. NULL when not addressed
    wrong_choices         text[],             -- mc: codes the owner marked wrong
    missing_answer        text,               -- mc: an answer the person gave that the coding missed (free text)
    quote_is_experiencer  boolean,            -- every quote shown is the experiencer's own words
    note                  text,
    marked_by             text,
    created_at            timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT bt_coded_gold_marks_answer_fk FOREIGN KEY (coded_answer_id, video_id, item_key)
        REFERENCES public.bt_coded_answers (id, video_id, item_key)
);
CREATE INDEX bt_coded_gold_marks_answer_idx ON public.bt_coded_gold_marks (coded_answer_id, id DESC);

DO $do$
DECLARE
    t   text;
BEGIN
    FOREACH t IN ARRAY ARRAY['bt_coded_answers','bt_coded_gold_marks'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
        EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM anon, authenticated', pg_get_serial_sequence(format('public.%I', t), 'id'));
        EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bt_block_mutation()', t || '_no_update', t);
        EXECUTE format('CREATE TRIGGER %I BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bt_block_mutation()', t || '_no_delete', t);
        EXECUTE format('CREATE TRIGGER %I BEFORE TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.bt_block_mutation()', t || '_no_truncate', t);
    END LOOP;
END
$do$;

COMMIT;

-- Verification (read-only), expected: 2 tables, 6 triggers, rls on:
--   SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('bt_coded_answers','bt_coded_gold_marks');
--   SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN
--     ('public.bt_coded_answers'::regclass, 'public.bt_coded_gold_marks'::regclass);
