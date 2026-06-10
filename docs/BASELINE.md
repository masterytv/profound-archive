# Static-Analysis Baseline

> Recorded 2026-06-10 as part of the safety-net pass (see [IMPROVEMENT_PLAN.md](./IMPROVEMENT_PLAN.md) Phase 2).
> These are the **known, accepted** error counts at the time CI was introduced. CI treats typecheck/lint as
> non-blocking until these are burned down (Phase 4); tests are blocking from day one.
> Nothing here was fixed in this pass — by design, this pass only records reality.

## Toolchain

| Tool | Version | Command |
|---|---|---|
| TypeScript | 5.x (`tsc --noEmit`, `strict: true`) | `npm run typecheck` |
| ESLint | ^9.39.4 + `eslint-config-next` ^16.2.9 (`core-web-vitals`, flat config — **new in this pass**: `eslint.config.mjs`; previous `next lint` script was non-functional on Next 16 with no config present) | `npm run lint` |
| Vitest | ^4.1.8 (**new in this pass**) | `npm test` |

## Typecheck baseline: 26 errors, 1 file

All 26 errors are in **`scripts/nde-batch-analysis.ts`** and share one root cause: the doc comment at the
top of the file embeds Oracle crontab examples (lines 18–23), and the `*/` inside the cron expression
`10 */3 * * *` (line 19) terminates the block comment early. Everything after it parses as code →
TS1005/TS1109/TS1161 cascade. `src/` (the entire app) typechecks **clean** under `strict: true`.

⚠️ **Operational implication (not fixed per scope, but verify soon):** `tsx` parses this file the same way,
so if the Oracle VM checkout contains this version of the file, the five NDE analysis pipelines this script
runs every 3 hours are likely failing at parse time. Check `~/profound-archive/logs/nde-*.log` on the VM.
The fix (when approved) is a one-line comment reformat.

Consequence for `next.config.ts`'s `ignoreBuildErrors: true`: the flag is currently protecting against
**zero** errors in app code — it can likely be removed in Phase 4 with minimal burn-down (the one
offending file is a script, excluded from `next build` anyway).

<details>
<summary>Full typecheck output (26 errors)</summary>

```
scripts/nde-batch-analysis.ts(19,15): error TS1109: Expression expected.
scripts/nde-batch-analysis.ts(19,17): error TS1109: Expression expected.
scripts/nde-batch-analysis.ts(19,22): error TS1005: ';' expected.
scripts/nde-batch-analysis.ts(19,84): error TS1005: ';' expected.
scripts/nde-batch-analysis.ts(19,125): error TS1005: ';' expected.
scripts/nde-batch-analysis.ts(19,127): error TS1109: Expression expected.
scripts/nde-batch-analysis.ts(20,48): error TS1005: ';' expected.
scripts/nde-batch-analysis.ts(20,84): error TS1005: ';' expected.
scripts/nde-batch-analysis.ts(20,137): error TS1005: ';' expected.
scripts/nde-batch-analysis.ts(20,139): error TS1109: Expression expected.
scripts/nde-batch-analysis.ts(21,48): error TS1005: ';' expected.
scripts/nde-batch-analysis.ts(21,84): error TS1005: ';' expected.
scripts/nde-batch-analysis.ts(21,135): error TS1005: ';' expected.
scripts/nde-batch-analysis.ts(21,137): error TS1109: Expression expected.
scripts/nde-batch-analysis.ts(22,48): error TS1005: ';' expected.
scripts/nde-batch-analysis.ts(22,84): error TS1005: ';' expected.
scripts/nde-batch-analysis.ts(22,137): error TS1005: ';' expected.
scripts/nde-batch-analysis.ts(22,139): error TS1109: Expression expected.
scripts/nde-batch-analysis.ts(23,9): error TS1005: ';' expected.
scripts/nde-batch-analysis.ts(23,15): error TS1109: Expression expected.
scripts/nde-batch-analysis.ts(23,17): error TS1109: Expression expected.
scripts/nde-batch-analysis.ts(23,22): error TS1005: ';' expected.
scripts/nde-batch-analysis.ts(23,84): error TS1005: ';' expected.
scripts/nde-batch-analysis.ts(23,139): error TS1005: ';' expected.
scripts/nde-batch-analysis.ts(23,141): error TS1109: Expression expected.
scripts/nde-batch-analysis.ts(24,3): error TS1161: Unterminated regular expression literal.
```
</details>

## Lint baseline: 206 problems (181 errors, 25 warnings) across 154 files

Config: `eslint.config.mjs` — `eslint-config-next/core-web-vitals` flat config. Ignores: build output,
`database.types.ts` (generated), compiled script artifacts, and the untracked root scratch files already
slated for deletion (IMPROVEMENT_PLAN D-8).

| Count | Rule | Nature |
|---|---|---|
| ~175 | `react/no-unescaped-entities` | Cosmetic — raw `'`/`"` in JSX text. Bulk auto-fixable. |
| 7 | `react-hooks/exhaustive-deps` (warning) | Real review needed — stale-closure risk. |
| 6 | `@next/next/no-img-element` (warning) | Matches IMPROVEMENT_PLAN perf findings. |
| 1 | `react-hooks/rules-of-hooks` (**error**) | **The one real landmine** — conditional hook call; locate and fix in Phase 4. |
| 1 | Parsing error | Same `scripts/nde-batch-analysis.ts` comment bug as typecheck. |
| 1 | `jsx-a11y/alt-text` (warning) | Matches plan finding U-class. |
| ~remaining | misc (`no-anonymous-default-export`, `no-page-custom-font`, inline-disable directives) | Low priority. |

Full raw output lives in the CI logs of every run (lint is non-blocking but always executed); regenerate
locally any time with `npm run lint`.

## Burn-down rule

When a later phase fixes these, update this file (or delete it once typecheck + lint are zero-error and
flipped to blocking in `.github/workflows/ci.yml`). Until then: **new code must not add to these counts** —
reviewers should compare CI numbers against this document.
