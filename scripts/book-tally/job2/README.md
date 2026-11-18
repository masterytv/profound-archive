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

Notes: no sampling parameters are sent (current models reject temperature); effort defaults are haiku
medium, sonnet medium, opus high. Recheck/arbiter requests do not set cache_control (their system prompt is
unique per video). Output goes to `scripts/book-tally/out/` (gitignored); logs print counts only.
