# Book-tally pipeline — design spec (lead-authored; agents implement against this)

Status: design v1, 2026-11-18. The README (for academic reviewers) is derived from this.

## Ground rules
- No foreign keys from `bt_*` to existing tables (they would add RI triggers that block the
  live app from deleting rows in nde_vids / nde_questions / experiencer_profiles). Referential
  checks against existing tables are done in code at write time. FKs among `bt_*` are fine.
- A first-pass answer that is invalid (schema/missing) is treated as a disagreement: Sonnet
  re-checks it and Opus arbitrates. A full run skips (video, question, pass) cells that
  already have a row from the gold or pilot runs only if they are the same pass; pilot rows
  never feed `bt_final_stances`.
- Read-only on every existing table. All writes go to new `bt_*` tables created by
  `supabase/migrations/20261118_001_book_tally.sql` (rollback in `supabase/rollbacks/`).
  The migration is applied by a human after review. Staging and prod share one DB.
- All `bt_*` tables are append-only for research data. The only permitted UPDATE is on
  `bt_runs` status/usage bookkeeping columns. No DELETE anywhere.
- Transcripts never enter an agent's context: scripts read them from the DB and send them
  straight to the Anthropic API. Logs print ids, counts and token totals only.
- No paid API call happens without the human's explicit approval of a printed estimate.
  Every paid script has `--estimate` (no spend; may call the free count_tokens endpoint)
  and refuses to submit unless `--confirm-spend <run_id>` matches the estimate's run id.
- Secrets come from env by name (`ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_KEY`). Never logged.
- Models: `claude-haiku-5-5`, `claude-sonnet-5-5`, `claude-opus-5-5`. All requests via the
  Message Batches API. Sampling parameters (temperature) are rejected by these models with a
  400, so none are sent; this is documented. Effort is set explicitly per role (CLI flag,
  defaults: haiku `medium`, sonnet `medium`, opus `high`). Structured output via
  `output_config.format` (JSON schema). The model_version stored is `response.model`.
- prompt_hash = sha256 of (prompt template file bytes + rendered question list JSON + output
  schema JSON). Every prompt file lives in `scripts/book-tally/prompts/` and is also inserted
  into `bt_prompts` when first used. Never edit a prompt file in place; add `-v2`.

## Transcript selection
`coalesce(nullif(trim(subtitles_punctuated),''), nullif(trim(subtitles_cleaned),''), nullif(trim(subtitles),''))`
from `nde_vids`, keyed by `"videoId"`. Record which column was used (`transcript_source`).
Never truncate. NDE set = `nde_analysis.experience_type = 'nde'` (6,054 at design time).

## Quote verification (shared, `lib/quote.ts`)
normalize(s): Unicode NFKC → strip diacritics (NFKD, drop combining marks) → lowercase →
map curly quotes/dashes to ASCII → replace every char that is not a letter or digit with a
space → collapse whitespace → trim.
A quote verifies iff normalize(quote) is a contiguous substring of normalize(transcript) AND it
has ≥ 5 tokens. No fuzzy matching, no ellipsis joining. Store match char offset in the
normalized transcript. A stance other than not_addressed without a verified quote is never
counted in any tally.

Timestamp: if `raw_timestamped_subtitles` (jsonb [{start,duration,text}]) exists, align by
normalizing the concatenated segment texts with an offset map and searching for the first 6
normalized tokens of the quote; store `start_seconds` or null. This is a convenience for the
review sheet only (punctuated text may differ from raw captions); never used for verification.

## Job 1 — experiencer de-duplication

Person keys: `profile:<experiencer_profiles.id>`, `named:<normalized full name>` (has a name,
no profile), `anon:<videoId>` (no name). Each unresolved anon video is its own person
(conservative; overcount bias is reported as a sensitivity row).

1. Name normalization (`lib/names.ts`): NFKD strip accents, lowercase, drop punctuation,
   drop honorifics/suffixes (dr, rev, reverend, mr, mrs, ms, miss, prof, phd, md, jr, sr, ii,
   iii, iv), collapse whitespace. `first` = first token, `last` = last token, middle tokens and
   single-letter initials ignored for the key. Nickname canonicalization via the checked-in
   `data/nicknames.json` (e.g. bill/will/billy→william, bob/rob/bobby→robert, liz/beth→elizabeth,
   …, documented source). Keys: `exact_key` = normalized full string; `core_key` =
   canonical(first)+' '+last.
2. Link proposals for NDE videos not in any profile's `video_ids` whose `experiencerFullName`
   matches exactly one profile: match_level `exact` (exact_key equal) or `core` (core_key
   equal). Ambiguous (>1 profile) → not linked, listed in review CSV. Written to
   `bt_person_links` (source `exact_name_match`), status decided by `bt_link_decisions`:
   `exact` → auto-accepted (decided_by `auto:exact_name`); `core` → pending human review.
   Profile membership (`video_ids`) links are written with source `profile_video_ids`,
   auto-accepted.
3. Candidate pairs among profiles (and named:* persons): same last name AND (first names
   nickname-equivalent OR Jaro-Winkler(first) ≥ 0.85 OR one is an initial of the other);
   OR same first name AND JW(last) ≥ 0.90 (covers spelling/married-name variants);
   OR first/last swapped. Exclude identical-profile pairs. Report the count (expect ~290).
4. Judging (batch): Haiku sees both names, slug, channels (distinct `channelName` of their
   videos), up to 5 video titles each, first_shared_year, and `summary` (≤ 1,500 chars each).
   Output {verdict: same|different|unsure, reason}. Every `same` or `unsure` → Sonnet, blind
   to Haiku's verdict. Outcome:
   - Haiku same & Sonnet same → decision `merge`, decided_by `auto:haiku+sonnet`.
   - Haiku different → `keep_separate`, decided_by `auto:haiku`.
   - Any disagreement, or Sonnet unsure → **review CSV** (no decision row).
   Merges are rows in `bt_merge_decisions`; a later `revert` row undoes one. The effective
   mapping view applies the latest decision per candidate, so every merge is reversible.
5. Self-stated names for the unnamed NDE videos (~639): Haiku reads the transcript and
   returns a name ONLY if the speaker states their own name ("my name is…", "I'm …, and…"),
   with the verbatim quote; otherwise null. Never guess, never use host introductions.
   Code verifies the quote (rule above) AND that the name's tokens appear inside the quote.
   Stored in `bt_name_extractions`; verified names produce `bt_person_links` proposals
   (source `transcript_self_name`, pending human review) and appear in a review CSV.
6. Outputs: `out/dedup_review_pairs.csv` (pairs for the human), `out/dedup_auto_merges.csv`
   (spot-check), `out/link_proposals_review.csv`, `out/name_extractions_review.csv`.
   `import-decisions.ts` ingests the human's marked CSV into `bt_merge_decisions` /
   `bt_link_decisions` (decided_by `human`).

## Job 2 — stance tally

Stances: `yes | no | mixed | not_addressed`. Silence is never `no`.

1. One request per (video, model, pass). System prompt = instructions + all 81 active
   questions (id, category, consumer_question) — cached with cache_control. User message =
   transcript. Output JSON: `answers: [{question_id, stance, confidence 0-100, quote|null}]`,
   exactly one per question. Prompt must state: answer only from the experiencer's own words;
   if the experiencer does not clearly address it, answer not_addressed; silence is never
   no; quote must be a contiguous verbatim span of ≥ 5 words spoken by the experiencer, not
   the interviewer, no ellipses or paraphrase.
2. Validation in code: schema; one answer per question (missing → treated as invalid →
   re-run); quote verification. Failed quote → `quote_verified=false` and the item is
   queued for the Sonnet re-check.
3. Passes (all rows kept in `bt_stance_answers`, distinguished by `pass`):
   - `first`: Haiku, all 81 questions.
   - `recheck`: Sonnet, blind (does not see Haiku's answer), only the flagged questions for
     that video: stance in (no, mixed) OR confidence < 70 OR quote failed OR invalid.
   - `arbiter`: Opus, for (video, question) where Haiku and Sonnet stances differ. Sees the
     transcript and both prior answers (anonymized as Reader A / Reader B) and returns its
     own answer with its own verbatim quote.
   Final stance (view `bt_final_stances`): unflagged first-pass answer; else agreeing
   recheck; else arbiter. If the final non-not_addressed answer's quote is unverified →
   status `unverified`, excluded from tallies and counted in the `n_excluded` column.
4. Pilot (`--pilot`): 100 videos by seeded random sample (seed recorded in bt_runs.params),
   all 81 questions, Haiku AND Sonnet independently (both `pass='pilot'`). Report: overall
   and per-question % agreement and Cohen's kappa (4 categories; also the 2×2 addressed/
   not-addressed kappa), quote failure rate per model, confusion matrix, actual token usage
   and cost per model, and the projected full-run cost from pilot actuals.
5. Gold set: 25 videos, seeded, disjoint from the pilot, run through the full
   first→recheck→arbiter pipeline. Review sheet `out/gold_review.csv` (+ Google-Sheet-friendly):
   video_id, title, question_id, category, question, final_stance, confidence, quote,
   youtube link with `&t=<start_seconds>s` when available, deciding model, and blank columns
   `correct (Y/N)`, `quote_is_experiencer (Y/N)`, `note`. Contains every non-not_addressed
   final answer plus 3 random not_addressed rows per video (seeded) for a recall check.
   `import-gold.ts` loads marks into `bt_gold_marks`; `gold-report.ts` reports precision per
   stance with Wilson 95% CI and n. No figure is published before this.
6. Table `bt_stance_answers` columns include exactly the requested ones: question_id,
   video_id, stance, confidence, quote, quote_verified, model, model_version, prompt_hash,
   run_id, created_at — plus id, pass, attempt, transcript_source, quote_norm_offset,
   start_seconds, valid, error.
7. Person rollup (`rollup.ts`): effective video→person map from Job 1 (view
   `bt_effective_person_map`). Per person per question, combine the person's verified final
   stances: ignore not_addressed; none addressed → not_addressed; all addressed equal → that;
   any conflict or any mixed → mixed. Each person counts once. CSV `out/tally_by_question.csv`,
   one row per question: question_id, category, consumer_question, n_persons,
   n_yes, pct_yes, n_no, pct_no, n_mixed, pct_mixed, n_not_addressed, pct_not_addressed,
   n_excluded_unverified, and among-addressed shares with n and Wilson 95% CI. A sensitivity
   CSV repeats this counting each video as its own person.

## Statistics (`lib/stats.ts`)
Cohen's kappa κ = (p_o − p_e)/(1 − p_e) over the 4 categories; κ undefined (report "n/a")
when p_e = 1. Wilson score interval for proportions. Unit-tested against hand-computed values.

## Layout
```
scripts/book-tally/
  README.md  SPEC.md
  prompts/   stance-v1.md  stance-arbiter-v1.md  pair-judge-v1.md  name-extract-v1.md
  data/      nicknames.json
  lib/       env.ts supabase.ts transcript.ts quote.ts names.ts batch.ts cost.ts stats.ts prompts.ts
  job1/      build-links.ts find-pairs.ts judge-pairs.ts extract-names.ts export-review.ts import-decisions.ts
  job2/      run-stance.ts (--pilot|--gold|--full, --pass first|recheck|arbiter) pilot-report.ts
             gold-sheet.ts import-gold.ts gold-report.ts rollup.ts
  tests/     *.test.ts (synthetic fixtures only)
  out/       (gitignored)
```
Batch state: each submitted batch id is recorded in `bt_runs.batch_ids` before polling, so a
crashed run resumes by collecting results; results are keyed by custom_id
(`<run>_<key>_<pass>_<attempt>`, matching the API's `^[A-Za-z0-9_-]{1,64}$`), never by position. errored/expired requests are
re-submitted in a new batch (same run, attempt+1).
