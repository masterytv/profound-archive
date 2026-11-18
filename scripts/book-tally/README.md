# Book tally: method, models and validation

This folder holds the code behind two research datasets used in *The Accidental Mystic* and in
material shared with academic reviewers:

1. **Experiencer de-duplication (Job 1).** Each person is counted once, even when they appear
   in several videos or under several spellings of their name.
2. **Stance tally (Job 2).** For each of 81 research questions, the share of near-death
   experiencers whose own words answer *yes*, *no*, *mixed*, or don't address the question.

The design rule throughout: **every number traces back to a verbatim quote in a transcript**.
The full design spec is [`SPEC.md`](SPEC.md). This README explains it for a reviewer.

---

## 1. Data

| Source | What it is | Used for |
|---|---|---|
| `nde_analysis` | One row per analysed video. Sample = rows with `experience_type = 'nde'` (6,054 videos on 2026-11-18). | Defines the video sample |
| `nde_vids` | Video metadata and transcripts (auto-generated YouTube captions). The punctuated transcript is used, falling back to the cleaned one, then the raw one. The column used is recorded per answer. | Transcript text, title, channel, caption timestamps |
| `experiencer_profiles` | ~2,890 curated person profiles, each listing their videos. | Person identity |
| `nde_questions` | The 81 active research questions in 12 categories (`consumer_question`). | Question wording |

The pipeline is **read-only** on all of these tables. Its output goes only to new `bt_*` tables,
created by `supabase/migrations/20261118_001_book_tally.sql`. Those tables are **append-only**:
a database trigger rejects UPDATE and DELETE, so every model answer, decision and reversal stays
on record. The one exception is the status bookkeeping columns of `bt_runs`.

Transcripts are full captions and are never truncated. They have **no speaker labels**, which
limits what the code can check (see §5).

## 2. Models and settings

| Role | Model | Why |
|---|---|---|
| First pass (all answers) | Claude Haiku 5.5 (`claude-haiku-5-5`) | Inexpensive enough to read every full transcript |
| Second opinion | Claude Sonnet 5.5 (`claude-sonnet-5-5`) | Stronger reader; re-checks the answers most likely to be wrong |
| Arbiter | Claude Opus 5.5 (`claude-opus-5-5`) | Strongest model; decides only where the first two disagree |

- All calls go through Anthropic's **Message Batches API**.
- **Temperature.** The protocol asked for temperature 0, but these models reject any non-default
  sampling parameter (the API returns an error). So no temperature is sent and outputs are not
  bit-for-bit reproducible.
- **Reproducibility.** Instead, the pipeline stores the exact prompt (as a SHA-256 `prompt_hash`
  plus the full text in `bt_prompts` and in `prompts/`), the exact model version reported by the
  API, the run id and its parameters (including random seeds), and every raw model response
  (`bt_raw_responses`).
- **Effort and output format.** The reasoning-effort setting is fixed per role and recorded. The
  output must match a JSON schema (`prompts/*.schema.json`).
- **Prompt versions.** Prompts are versioned files and are never edited in place. A change
  creates `-v2`, which gets a new hash.

## 3. Job 1: who is the same person?

**Person keys.** A video belongs to one of three kinds of person:
- a curated profile (`profile:<id>`);
- a named person with no profile (`named:<normalised name>`);
- an anonymous speaker (`anon:<video>`).

Each anonymous video counts as its own person. This is conservative: it may overcount people,
never undercount them. A sensitivity table shows how much it matters.

1. **Name normalisation, in code.** Names are reduced to a comparable form by:
   - removing accents, letter case and punctuation;
   - removing titles and suffixes (Dr, Rev, Jr, III…);
   - ignoring middle names and initials;
   - mapping common nicknames to one form (Bill → William) from a checked-in list.
2. **Linking unlinked videos.** A video that is in no profile is matched by its recorded speaker
   name:
   - **exact** match to exactly one profile: linked automatically;
   - match only on nickname or middle name: proposed for human review;
   - several matching profiles: not linked, listed for review.
3. **Candidate duplicate profiles.** A pair of profiles becomes a candidate when it has:
   - the same last name and a similar first name (nickname-equivalent, an initial, or
     Jaro-Winkler ≥ 0.85); or
   - the same first name and a similar last name (Jaro-Winkler ≥ 0.90); or
   - first and last names swapped.
4. **Two-model judgement.**
   - Haiku judges every pair as *same / different / unsure* from names, channels, video titles,
     year and profile summary, and gives a reason.
   - Every *same* and *unsure* goes to Sonnet, which does not see Haiku's verdict.
   - Both say *same*: merged.
   - Haiku says *different*: kept separate.
   - Every disagreement, and every pair Sonnet calls *unsure*, goes to a human review list.
   - **Every merge is a recorded decision and can be reversed** by adding a `revert` decision.
     The person mapping always uses the latest decision.
   Notes on the rules:
   - Generational suffixes (Jr, Sr, II…) are kept for exact matching, so "John Smith Jr." never
     exactly matches "John Smith Sr.".
   - The "same first name" rule compares nickname-folded first names, so William and Bill count
     as the same first name.
   - A name with only one usable token ("John", "John Jr.", "Dr. John") never identifies a
     person.
   - A pair is flagged for review if a chain of merges would join two profiles that a human or
     the models marked as different people.
5. **Self-stated names for unnamed videos.** For videos with no recorded speaker name:
   - A model reports a name only if the experiencer states their own name in the transcript, and
     gives the quote.
   - Code checks that the quote is in the transcript and that the name is inside the quote.
   - Host introductions and guesses are never used.
   - Code also requires a first-person introducer ("my name is", "I'm", "I am", "call me")
     immediately before the name in the quote.
   - Very short introductions under 5 words ("I'm Jane Smith") fail the quote-length rule.
     This is conservative.
   - Every extracted name goes to human review before it is linked.

## 4. Job 2: stance coding

**One request per video.** The model gets the full transcript and all 81 questions. For each
question it returns:
- a stance: `yes`, `no`, `mixed` or `not_addressed`;
- a confidence from 0 to 100;
- for any stance other than `not_addressed`, a **verbatim quote spoken by the experiencer**.

The prompt states: *"If the experiencer doesn't clearly address the question, answer
not_addressed. Silence is never a no."* Full prompts are in [`prompts/`](prompts/).

**Validation in code.** Every answer is checked against:
- the JSON schema;
- exactly one answer per question;
- a confidence between 0 and 100;
- **quote verification**: after normalising both texts (Unicode, accents, case, punctuation,
  whitespace), the quote must appear as one contiguous run of whole words in that video's
  transcript, at least 5 words long. Ellipses and joined fragments fail. There is no fuzzy
  matching.

An answer whose quote fails is marked `quote_verified = false` and sent to the Sonnet re-check. **An answer is never
counted without a matching quote.**

**Escalation.**

```
Haiku (all 81 questions)
   │  flagged if: stance is no or mixed, OR confidence < 70, OR quote failed, OR invalid
   ▼
Sonnet re-check (flagged questions only, blind to Haiku's answer)
   │  agrees with Haiku → final, using whichever agreeing quote verified
   │  disagrees, Haiku answer invalid, or neither agreeing quote verified
   ▼
Opus arbiter (sees both earlier answers as "Reader A / Reader B", order randomised)
   → final, with its own quote
```

- All three answers are kept. The final answer is chosen by the database view
  `bt_final_stances`.
- A final non-`not_addressed` answer with an unverified quote is **excluded** from tallies. It is
  counted in the `n_excluded_unverified_cells` column, which is broken down into unverified, invalid and pending.
- A Haiku answer that is not flagged (`yes` or `not_addressed`, confidence ≥ 70, quote verified)
  is not re-checked. **The checking is therefore asymmetric.** Every `no` and `mixed` gets a
  second reading, but a confident `yes` does not. The gold set (below) reports precision per
  stance so that this asymmetry can be judged. The pilot (both models on every answer) shows how
  often Sonnet would have disagreed with confident Haiku `yes` answers.

**Pilot (before any full run).** 100 random videos (seeded) are coded independently by Haiku and
by Sonnet. The pilot report gives:
- per-question and overall agreement and **Cohen's kappa**, κ = (pₒ − pₑ)/(1 − pₑ), over the
  four categories, plus a 2×2 addressed / not-addressed kappa;
- the quote-failure rate for each model;
- actual cost, and a full-run cost projected from the pilot's real token usage.

**Gold set (before anything is published).** 25 more random videos (seeded, none from the pilot)
go through the full pipeline.
- A human marks each answer right or wrong, and whether the quote is the experiencer's own words.
  The review sheet links to the moment in the video where caption timestamps exist.
- The sheet has every non-`not_addressed` answer, plus 3 random `not_addressed` answers per video
  as a check on missed answers.
- From those marks the pipeline reports **precision per stance with Wilson 95% intervals and n**.

**Counting people, not videos.**
- Each person's verified final answers are combined across all their videos:
  - `not_addressed` is ignored when another video addresses the question;
  - answers that all agree keep that stance;
  - any conflict between videos, or any `mixed`, gives `mixed`.
- Each person counts once.
- The output has one row per question with counts and shares of yes / no / mixed /
  not addressed. Every percentage has its **n** beside it, and the share among people who
  addressed the question has a Wilson 95% interval.
- A sensitivity table counts each video separately.

## Haiku-only results (current scope)

**What was run.** Because of the budget, every NDE video was coded once, by the smallest and
cheapest model (Haiku). The second reading by a larger model (Sonnet re-check) and the third
opinion for disagreements (Opus arbiter) were **not run**. They may be added later if funding
allows. The code that would run them is unchanged, and the full-corpus run of either pass needs
an extra, deliberately long flag (`--i-understand-this-is-the-expensive-pass`) on top of the
usual spend confirmation, so it cannot be started by accident. The pilot (100 videos coded by
both Haiku and Sonnet) may still be run and measures how often the two models agree.

**What is checked.**
- Every answer is validated in code against the output format, and answers must cover every question.
- Every answer other than `not_addressed` must carry a quote that is found word for word in the
  transcript (after normalising case, punctuation and whitespace). An answer whose quote is not
  found is **left out** and reported as `unverified_quote`. A malformed or incomplete answer is
  left out and reported as `invalid`. The tally files show both counts per question.
- Humans review a 25-video gold set. That produces precision per stance (how often a counted
  answer was right) with 95% intervals.

**What is not checked.** No answer was independently re-checked by a second model. In the full
design every `no`, every `mixed` and every answer with confidence below 70 would have been sent
for a second and, when the readers disagreed, a third reading. In the Haiku-only mode those
answers are **counted anyway**, so that the tally is not biased toward `yes`. (Counting only
what survives the full pipeline would silently drop most `no` and `mixed` answers.) The cost is
that their accuracy rests on Haiku alone. The files therefore show, per question, how many
counted answers *would have been* flagged for a re-check:
`n_unchecked_flagged_cells` (video-level) and `n_persons_with_unchecked_flagged`
(person-level). Read a question with a large share of such answers as less certain.

Answers left out because their quote was not found are broken down by the model's original
stance (`n_excl_unverified_yes`, `_no`, `_mixed`, per question), and the report compares the
quote-failure rate by stance with 95% intervals; if the rate differs by stance, the exclusion
itself tilts the tally toward one answer, so check that table before reading shares.

**How to read the numbers.** Every CSV row carries `resolution = haiku_first_pass_unchecked`
and every file name ends in `_haiku_only`. The gold report (`gold_report_haiku_only.md`) gives
the evidence for how far the numbers can be trusted:
- precision for `yes`, `no` and `mixed`, each with Wilson 95% interval and n;
- precision split by `would_be_flagged` (Y/N), to show how much worse the answers that would
  normally have been re-checked are;
- precision by confidence band (below 70, 70 to 89, 90 and above);
- how often a sampled `not_addressed` answer was right (missed answers).

Do not publish a per-question figure that the gold set cannot support: with 25 videos the
intervals are wide.

**Gold set in this mode.** 25 videos are chosen by the same seeded sampler as before, disjoint
from the pilot, from videos that already have a complete first-pass row set. Building the
sheet therefore costs nothing after the full first pass (`run-stance --gold
--resolution haiku-first-pass` reports "NO SPEND NEEDED"; if any sampled video lacks first-pass
rows it plans only the Haiku first pass for those, through the normal estimate and confirm gate,
and never plans a re-check). The sheet holds every counted non-`not_addressed` answer plus up
to 3 random `not_addressed` answers per video, with confidence, quote, a link to the moment in
the video and `would_be_flagged`. Build the final sheet only after the full first pass has
finished: while some videos are still missing the sample can change.

```bash
R="npx ts-node --transpile-only --project scripts/tsconfig.json scripts/book-tally/job2"
$R/rollup.ts --resolution haiku-first-pass          # out/tally_by_question_haiku_only.csv, *_sensitivity_per_video_haiku_only.csv, tally_report_haiku_only.md
$R/gold-sheet.ts --resolution haiku-first-pass      # out/gold_review_haiku_only.csv
$R/import-gold.ts --file out/gold_review_haiku_only.csv
$R/gold-report.ts --resolution haiku-first-pass     # out/gold_report_haiku_only.md
```

The default (`--resolution full`) behaves exactly as before and still refuses to tally while
re-check or arbiter cells are pending. The Haiku-only rollup does not refuse on pending cells
(they are expected) but still refuses on unmapped videos, Job 1 merge conflicts, and videos
with an incomplete first pass unless `--allow-partial` is given.

## 5. Known limitations (read before citing)

- **Speaker attribution.** Captions don't mark who is speaking. Code can prove a quote is in the
  transcript, but not that the experiencer said it rather than the interviewer. This rests on the
  prompt and is measured in the gold set (`quote_is_experiencer`).
- **Unaddressed ≠ absent.** `not_addressed` means the person didn't clearly speak to the question
  in these videos. It is not evidence about their experience.
- **Sample.** The sample is YouTube videos of people who chose to share their stories publicly,
  with captions. It is not a random sample of experiencers.
- **Caption errors.** Auto-captions can mis-hear words. A quote can only be as accurate as the
  caption it was checked against.
- **Timestamps.** Video-moment links come from aligning the quote with the raw caption track. They
  are a convenience and play no part in validation.
- **Haiku-only answers are unchecked** (current scope): see the section above. Precision comes
  from the gold set alone.
- **No sampling temperature control**; see §2.
- **Names.** People with the same normalised full name and no curated profile are treated as one
  person. A first name on its own never identifies a person.

## 6. Running it

Prerequisites:
- the `bt_*` migration applied by the project owner;
- environment variables `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or
  `SUPABASE_SERVICE_KEY`) and `BOOK_TALLY_ANTHROPIC_API_KEY` (falling back to `ANTHROPIC_API_KEY`, then `CLAUDE_API`).

**Spend safety.**
- `--estimate` counts every request's input tokens with the free token-counting endpoint and
  prints two figures:
  - an *expected* cost, which includes an allowance for the models' internal reasoning tokens,
    billed as output;
  - a hard *ceiling*: every request at its maximum output, across all permitted retry attempts.
- Retries that would go beyond the approved ceiling need a separate `--confirm-retries`.
- Submission locks the run before the batch is created.
- If the program crashes after a batch was created but before it was recorded, it never
  resubmits on its own. It finds and adopts the existing batch. If it can't find the batch, it
  refuses and asks a person to `--adopt-batch` or, after 30 minutes, `--void-pending`.

**Every paid step is gated.** You run it with `--estimate`, which prints the token and dollar
estimate and records it as a run. Only `--confirm-spend <id>` (the run id for Job 1, the group id that Job 2's estimate prints) then submits it.

```bash
npm run test:book-tally                                   # unit tests (no API, no DB)
npx ts-node --transpile-only --project scripts/tsconfig.json scripts/book-tally/job1/build-links.ts --dry-run
npx ts-node --transpile-only --project scripts/tsconfig.json scripts/book-tally/job1/find-pairs.ts --dry-run
npx ts-node --transpile-only --project scripts/tsconfig.json scripts/book-tally/job1/judge-pairs.ts --estimate
npx ts-node --transpile-only --project scripts/tsconfig.json scripts/book-tally/job2/run-stance.ts --pilot --estimate
npx ts-node --transpile-only --project scripts/tsconfig.json scripts/book-tally/job2/pilot-report.ts --group <group_id>
```

Outputs (CSV and reports) are written to `scripts/book-tally/out/`. That folder is not committed,
because it contains transcript quotes.
