# Hand-off: where the book-tally run stands (2026-11-18)

Read this first in a new session. Then read README.md and SPEC.md, and the "Working rules" in the
repo-root CLAUDE.md.

## LATEST (2026-11-18, evening): read this before the older sections below
- **Budget: $75 total** (raised from $50 by the owner). Spent so far: **$16.13**.
  - Job 1 pair judging: `j1h-20261118154545`, $0.05.
  - Job 1 name extraction: `j1n-20261118154610`, $0.23.
  - Job 2 pilot: `pilot-ea3c3348`, $2.48. Kappa 0.633, agreement 91.7%.
  - Job 2 full first pass: `full-first-1858d601`, $13.37, 6,054 videos.
  - Every paid run is estimated with `--budget-usd <cap>`, and the owner approves the cap.
- **Job 2 is being REDESIGNED; do not publish any stance-v1 tally.** The yes/no/mixed coding only
  works for real yes/no questions. On either/or and open questions (for example Q37, Q38, Q39, Q78)
  Haiku's "yes" mixes opposite answers. New design, decided by the owner:
  - Step 1 for every question: is it addressed in this account? A quote is required.
  - Step 2 depends on the question's type:
    - yes/no: yes, no or mixed;
    - multiple choice: 1 to 3 answers from a fixed list, plus "other". Several answers per person
      are allowed, so shares can exceed 100%, and reports must say so;
    - conditional: reported among people with a fact such as a violent death or a suicide attempt.
      These facts are coded once per video.
- **Codebook v1 is APPROVED** (`codebook/codebook-v1.md`; machine copy `codebook-v1.json` from
  `generate-v1.py`).
  - Q24 is merged into Q22.
  - Answers count when they are "what the experiencer experienced or learned from the NDE, during
    it or after". Beliefs held only before the NDE don't count.
  - Q30's wording names the signs (a reviewer fix).
- **Job 3 (codebook coding) is BUILT** in `job3/`. Independent review: APPROVE (commit cc84f16).
  - `run-codebook.ts`: estimate, `--confirm-spend`, `--resume`, `--sample`, `--budget-usd`.
  - `rollup.ts`: person tally, per-video sensitivity, report.
  - `gold-sheet.ts`, `import-gold.ts`, `gold-report.ts`: commit 7780163, labelled WIP. It is the
    final, verified version (554 tests pass), even though its message says WIP.
  - Tests: `tests/job3-*.test.ts`. Local-Postgres suite: `tests/sql/run-local-pg.sh`, which needs
    `runuser -u postgres` and a PGRUN directory postgres can write.
- **Migration `20261118_002_book_tally_codebook.sql` is NOT APPLIED yet**: the owner applies it.
  It adds only `bt_coded_answers` and `bt_coded_gold_marks`. Verification queries are at its end.
- **Next steps:**
  1. After the owner applies 002, check read-only that both tables exist and are empty.
  2. Trial: `job3/run-codebook.ts --estimate --sample 40 --budget-usd <cap>`, then the owner's yes,
     then `--confirm-spend`.
  3. Inspect the trial: output tokens (recalibrate `VISIBLE_TOKENS`), truncation, "other" rates,
     and a sample of answers.
  4. Full run (estimate with a cap, then the owner's yes).
  5. `job3/gold-sheet.ts`. Build an interactive marking page for the owner, as for stance-v1.
     Owner marks, then `import-gold.ts`, then `gold-report.ts`.
  6. `job3/rollup.ts`.
- **Gold marking is paused.** The interactive sheet https://claude.ai/artifact/5t1QCp9VCp1C13j7wjVcEZ
  is for stance-v1 and is superseded. It holds at most a few owner marks; don't import them.
- **Job 1 Sonnet pair check**: the owner hasn't decided. Haiku judged 186 pairs same, 285 unsure and
  2 different. Estimate `j1s-20261118164623` is uncapped; re-estimate with `--budget-usd` before any
  submit.
- The other session's branch `claude/focused-meitner-j5bscj` was merged into
  `claude/project-profound-research-data-s2tx22` (PR #86). That branch is the base for this work.

## Owner's decisions
- **Budget: Haiku only.** Run Job 1 and the Job 2 Haiku first pass. **Do NOT run the Job 2 full
  Sonnet re-check or the Opus arbiter** (`run-stance --gold|--full --pass recheck|arbiter`). They may be
  funded later by a publisher. The code requires an extra flag for those passes; never pass it.
- **Results.** Publish Job 2 results with `--resolution haiku-first-pass` (rollup and gold sheet).
  The resolution is labelled "unchecked by a second model". Gold-set precision from the owner's
  marks is the accuracy evidence. No figure is published before the gold report.
- **Spending.** Before any run that spends money: run `--estimate`, show the owner the token
  counts, expected cost and hard ceiling, and wait for an explicit yes per run.
- **Optional, the owner decides at the estimate stage:**
  - the Job 2 pilot (100 videos on Haiku AND Sonnet, about $5), the only inter-model agreement
    measure;
  - Job 1's Sonnet second opinion on pairs (a few dollars). Without it there are no auto-merges,
    and Haiku's same/unsure pairs go to the owner's review list.

## State of the shared DB (staging and production share one DB)
- Migration `supabase/migrations/20261118_001_book_tally.sql` was applied by the owner and
  verified: 11 tables, 6 views, 22 triggers.
- **Job 1 run `j1l-20261118150321` (build-links) is complete.** It wrote 6,526 links. All 6,054
  NDE videos are mapped, with 0 unmapped, giving 3,689 persons before any merges.
- **Job 1 run `j1p-20261118150335` (find-pairs) is complete.** It wrote 473 candidate pairs.
- No paid API call has been made, and no `bt_stance_answers` rows exist.

## API key
- In this session `CLAUDE_API` was rejected with a 401, and `ANTHROPIC_API_KEY` is stripped inside
  Claude Code sessions.
- The owner is adding `BOOK_TALLY_ANTHROPIC_API_KEY` as an environment variable on the Default
  cloud environment. `lib/env.ts` reads that first.
- Never print the key.

## Next steps (in order)
Prefix every command with
`npx ts-node --transpile-only --project scripts/tsconfig.json scripts/book-tally/`.

1. **DONE: the Haiku-only mode is reviewed.** The independent reviewer returned APPROVE in round 3
   (at e3802a6, branch `claude/focused-meitner-j5bscj`) after two rounds of fixes: the expensive-pass
   guard now covers gold recheck/arbiter too, and the Haiku gold report uses only marks on the
   rebuilt sheet rows and refuses unless every row is marked. Its two optional nits were applied
   afterwards (a partial report goes to `out/gold_report_haiku_only_PARTIAL.md`).
2. **Run the free estimates** (no spend). Each writes a `bt_runs` row with status `estimated`:
   - DONE `job1/judge-pairs.ts --estimate` (Haiku stage): run `j1h-20261118151446`, 473 requests,
     446,681 input tokens, expected $0.27, ceiling $6.85.
   - DONE `job1/extract-names.ts --estimate`: run `j1n-20261118151539`, 639 requests (blank names
     only; 612 more single-token/placeholder names need `--include-unusable-names`), 4,262,192 input
     tokens, expected $0.55, ceiling $9.80.
   - Prices in `lib/cost.ts` were checked against the live pricing page on 2026-11-18 and match.
   - `job2/run-stance.ts --pilot --estimate` (optional pilot)
   - `job2/run-stance.ts --full --pass first --estimate`. This counts 6,054 requests with the free
     count_tokens endpoint, which is slow. Run it in the background.
3. **Show the owner the estimates** in one table: requests, input tokens, expected cost, ceiling.
   Check the prices against the live pricing page. Then wait for a yes on each run.
4. **On each yes, run it** with `--confirm-spend <id>`. Collect with `--resume` (Job 1) or by
   re-running the confirm command (Job 2).
5. **If the pilot ran**, run `job2/pilot-report.ts --group <id>` and report kappa, agreement, quote
   failure rate and cost. Stop for the owner.
6. **After the first pass:**
   - Run `job2/gold-sheet.ts --resolution haiku-first-pass` and give the owner
     `out/gold_review_haiku_only.csv`.
   - After the owner marks it, run `job2/import-gold.ts --file <marked csv>` and then
     `job2/gold-report.ts --resolution haiku-first-pass` (same --seed/--pilot-n/--gold-n as the sheet).
7. **Job 1 review CSVs:** `job1/export-review.ts`. The owner marks them, then run
   `import-decisions.ts`.
8. **Rollup:** `job2/rollup.ts --resolution haiku-first-pass`, only after the gold report and the
   Job 1 decisions are in.
