# Working rules for AI agents on profound-archive

## Deployment & branches — READ FIRST
This repo auto-deploys via Firebase App Hosting. Branch = environment:

- `staging`  -> deploys to the STAGING site (staging.projectprofound.org) — safe to test on.
- `main`     -> deploys to PRODUCTION (projectprofound.org) — real users.

Rules:
- Do ALL your work on the `staging` branch, or on a feature branch that you merge into `staging`.
- Push to `staging` to deploy to the staging site for testing.
- NEVER commit, push, merge, or check out work onto `main`. Promotion `staging` -> `main` is a
  human action done via pull request. `main` is also branch-protected, so pushes to it will fail.
- Never trigger a production rollout in the Firebase console.

## Shared database
Staging and production currently share ONE database. Therefore:
- Don't run destructive data operations while testing on staging — you're touching live data.
- A schema migration on staging hits production data, so a migration IS a production change.
  Never run or "test" migrations on staging on your own; flag them for the human to run deliberately.

## How to report a fix for testing
After pushing a fix to `staging`, tell the user: the staging URL, the exact steps to test that
specific change, and what "working" looks like. Then stop and wait for confirmation before the
next change.

## Verifying before you claim something works
Before reporting progress, check each claim against an actual command output from this session
(tests, typecheck, lint). If something isn't verified, say so. No unverified "it works."

## More detail
The full phased improvement plan and the exact prompts for each phase are in
FABLE5_IMPROVEMENT_PROMPTS.md at the repo root.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
