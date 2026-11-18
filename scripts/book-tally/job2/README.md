# Job 2 - stance tally (usage)

Run with `npx ts-node --transpile-only --project scripts/tsconfig.json scripts/book-tally/job2/<script>.ts <flags>`.

Order: `--pilot` (estimate, then confirm) -> `pilot-report` -> `--gold --pass first|recheck|arbiter`
-> `gold-sheet` -> human marks -> `import-gold` -> `gold-report` -> `--full --pass first|recheck|arbiter` -> `rollup`.

Every paid step: `run-stance.ts <mode> [--pass p] --estimate` prints requests, input tokens, assumed
output tokens, cost per model (batch price, no cache reads assumed, shared system prompt priced as a cache
write) and records `bt_runs` rows with status `estimated`. Submit with `--confirm-spend <group>`; the
requests are rebuilt from the frozen plan and must hash to the estimate. Re-running the same command
resumes (collects recorded batch ids, resubmits only errored/expired/truncated requests, attempt+1,
max 3). `--dry-run` is the offline variant (no API, no DB write).

Safety: every batch is created via lib/batch `submitGuarded` (compare-and-set to `submitting`, durable
pending marker, create with maxRetries 0). After a lost response the run stays `submitting`; re-running
`--confirm-spend <group>` asks the API whether the batch exists (`resolvePending`) and adopts it, or pass
`--adopt-batch <id>`. `--estimate` prints expected cost and a hard ceiling (all attempts at max_tokens,
doubling); retries beyond the ceiling are refused unless `--confirm-retries <group>`. An unsubmitted
estimate can be dropped with `--cancel <group>`; overlapping non-terminal runs of the same pass are refused.
`rollup.ts` refuses on unmapped NDE videos, Job 1 merge conflicts, pending cells (`--allow-pending`) or
incomplete coverage (`--allow-partial`); overrides are written into the CSV header/rows and tally_report.md.

Notes: no sampling parameters are sent (current models reject temperature); effort defaults are haiku
medium, sonnet medium, opus high. Recheck/arbiter requests do not set cache_control (their system prompt is
unique per video). Output goes to `scripts/book-tally/out/` (gitignored); logs print counts only.

Haiku-only scope (current): only `--full --pass first` runs. `--full --pass recheck|arbiter` additionally
needs `--i-understand-this-is-the-expensive-pass` with `--confirm-spend` (checked against the stored group,
so omitting `--full/--pass` does not bypass it). `--resolution haiku-first-pass` on `rollup.ts`,
`gold-sheet.ts`, `gold-report.ts` and `run-stance.ts --gold` selects the Haiku-only resolution (outputs
suffixed `_haiku_only`; see README "Haiku-only results (current scope)"). Gold in this mode needs no
spend once the first pass is complete: `run-stance --gold --resolution haiku-first-pass` says
"NO SPEND NEEDED" and writes nothing.
