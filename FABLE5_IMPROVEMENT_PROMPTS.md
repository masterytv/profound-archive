# Fable 5 Prompts — Improving `profound-archive`

Tailored to this repo: Next.js (App Router) + TypeScript (~113k LOC, 512 files), Supabase,
Genkit/Google GenAI + OpenAI + Anthropic, Radix/Tailwind, Firebase App Hosting. No test suite yet.

## How to use these
Run them **in order**, as separate sessions/turns. Don't paste them all at once.
Set effort to **high** (use **xhigh** for the audit and the security pass). Review the diff/PR
after each pass before starting the next.

Why this order: Fable 5 is strongest on one hard, ambiguous, long-horizon task — so Pass 0 (scope
the whole thing) plays to that. But a 113k-line app with no tests can't absorb a giant unreviewable
diff, so Pass 1 builds a safety net and every later pass is one reviewable concern at a time.

---

## Pass 0 — Audit & plan (READ-ONLY, no code changes)

```
I'm hardening profound-archive, a ~113k-line Next.js App Router + TypeScript app (Supabase
backend; Genkit/Google GenAI + OpenAI + Anthropic for AI; Radix/Tailwind UI; Firebase App
Hosting). It was built fast and iteratively ("vibe-coded") and has accumulated sprawl —
duplicate/experimental routes (chat, chat-2, chat-test, chat-compassionate; search/search2;
about/about-new; home-new/home-v2), and there is currently no test suite. It's a real app I
want to get to production-grade.

This pass is READ-ONLY. Do not change any code. Explore the repo end to end and produce
docs/IMPROVEMENT_PLAN.md containing:

1. An architecture map: how the app is actually wired (routing, data/auth via Supabase, the
   AI layer, server actions/API routes, shared lib/hooks).
2. Findings grouped by: Security, Architecture/structure, Dead code & duplicate routes,
   Performance, Usability/accessibility, Code quality, Testing/CI. For each finding: severity
   (Critical/High/Medium/Low), the specific files, the risk, and the fix.
3. A phased execution plan I can approve, where each phase is one concern, independently
   shippable, ordered by risk-vs-effort. Call out anything destructive or irreversible
   separately so I decide on it explicitly.

Use parallel subagents to explore different areas of the repo and keep working while they run.
Ground every claim in an actual file you read — cite the path; if you're inferring, say so.
When you have enough to write the plan, write it; don't re-survey options you won't recommend.
Before you start, ask me any clarifying questions that would change the plan (e.g. which
routes are live vs. abandoned, deployment constraints, what "done" means to me).
```

After it asks questions, answer them, then let it produce the plan. **Read the plan and edit it**
before moving on — this is where you stay in control.

---

## Pass 1 — Safety net (do this before any refactor)

```
Per docs/IMPROVEMENT_PLAN.md, this pass only establishes a safety net so later changes are
verifiable. Don't fix findings yet. Do:
1. Get `npm run typecheck` and `npm run lint` to a known baseline; record current errors in
   docs/BASELINE.md rather than fixing them now.
2. Add a test runner and write characterization tests around the highest-value, highest-risk
   flows the plan identified (auth, the live chat/AI path, any payment/data-write paths).
   Tests should capture current behavior, not ideal behavior.
3. Add a minimal CI check (.github) that runs typecheck + lint + tests on PRs.

Keep scope to the safety net — don't refactor app code in this pass. Stop and show me the test
list and CI config before expanding coverage further.
```

---

## Pass 2..N — One concern per pass (reuse this template)

Run once per concern, in the plan's order. Suggested order: **Security → dead-code/route
dedup → architecture → performance → usability/accessibility.**

```
We're executing [CONCERN, e.g. "the Security phase"] from docs/IMPROVEMENT_PLAN.md. Context:
this is a production app; I review every change as a PR before merge, and the test/CI safety
net from Pass 1 is in place.

Scope: only [CONCERN]. Make the changes on a new branch, in focused commits, and open one PR
with a plain-language summary of what changed and why.

Boundaries:
- Don't add features, refactor unrelated code, or introduce abstractions beyond what this
  phase needs. Do the simplest thing that works.
- Only validate at real system boundaries (user input, external APIs). Trust internal code.
- Pause and ask me ONLY for a destructive or irreversible action (deleting routes/data,
  schema migrations, rotating/removing secrets, anything touching production). For reversible
  in-scope changes, proceed.
- Before reporting progress, audit each claim against a tool result from this session — run
  the tests/typecheck and show output. If something isn't verified, say so. Don't claim a fix
  works without evidence.

Verify as you go: at each logical checkpoint, use a fresh-context subagent to check your work
against the plan and the tests, separate from the agent that wrote the change.

When done, lead with the outcome in one sentence (what changed, what's safe to merge), then
the details and anything that needs my decision.
```

### Security-pass wording (important)
Keep the security pass **defensive**: "find and fix vulnerabilities, misconfigurations,
exposed secrets, missing authz checks, unsafe Supabase RLS/policies." Avoid asking it to
"write exploits" or "build a PoC attack" — Fable 5's safety classifiers can refuse
offensive-security phrasing and silently fall back to a weaker model (Opus 4.8). Defensive
audit-and-fix does not trip this.

Known item to hand it directly: `.env.local` is committed to the repo. Rotate those keys
regardless, and have it move secrets out of version control + add to `.gitignore`.

---

## Optional: a memory file so it improves across passes
Add `CLAUDE.md` (or append to your existing `GEMINI.md` convention) at repo root:

```
## Working notes for AI agents on this repo
Record one lesson per entry with a one-line summary. Capture corrections and confirmed
approaches and why they mattered. Don't duplicate what the repo or PR history already records;
update an existing note instead of adding a duplicate; delete notes that turn out wrong.
Reference this file at the start of each session.
```

Fable 5 uses this well — it'll carry lessons (e.g. "route X is live, route Y is dead") between
passes instead of relearning them.

---

## Quick reference — Fable 5 settings & quirks
- **Effort:** `high` default; `xhigh` for the audit and security passes; `medium`/`low` for
  routine cleanup. Low effort on Fable 5 still beats max effort on older models.
- **Longer turns:** hard passes can run many minutes (autonomous runs, hours). Don't assume
  it's stuck. If it ends a turn with "I'll now do X" without doing it, reply "go ahead, end to
  end."
- **Don't** tell it to "explain your reasoning / show your thinking" in the response — that can
  trip a refusal category. Let it just do the work.
- **1M-token context, 128k output.** It can hold a lot of this repo at once — lean on that in
  the audit pass.

---

## Pass 2.5 — Wire up the staging→production pipeline (DO THIS BEFORE running fixes)

The infrastructure already exists (it was set up before and went stale): a `staging` git branch,
a `profound-archive-staging` App Hosting backend, and a `staging.projectprofound.org` DNS record.
The human (me) refreshes those in the consoles; the MODEL does the repo-side config/CI/docs below.

Branch flow we're standardizing on:
- feature branch -> PR into `staging` -> auto-deploys to `profound-archive-staging`
  (staging.projectprofound.org) -> human tests
- `staging` -> `main` release PR (human merges) -> auto-deploys to `profound-archive`
  (projectprofound.org = production). Merging to `main` IS the production gate.
- Production backend already tracks `main` and needs no change.
- DB is SHARED between staging and production for now (deliberate choice).

```
We're finishing a staging->production pipeline before I run the fixes in
docs/IMPROVEMENT_PLAN.md. The infra already exists and I'm refreshing it in the Firebase/GitHub/
Cloudflare consoles myself. Your job is the REPO-SIDE work. Context that constrains you:

- Branch flow: feature branch -> PR into `staging` (auto-deploys to the staging backend at
  staging.projectprofound.org) -> I test -> I merge `staging` into `main` to promote to
  production (projectprofound.org). You work on feature branches and `staging` only. NEVER push
  or merge to `main`, and never trigger a production rollout — promotion is mine.
- The staging backend's environment name is `staging`, so its config file is apphosting.staging.yaml.
- The database is SHARED between staging and production. That means: staging is NOT safe for
  destructive data operations, and a schema migration on staging hits production data — so
  migrations are a separate human-run step, never something you "test" on staging.

Do the repo-side work now:
1. Create apphosting.staging.yaml alongside the existing apphosting.yaml, using App Hosting
   per-environment config. Keep secrets as referenced env/secret vars (commit none). In staging:
   set minInstances to 0 (cost), and set an env flag that makes the app emit `noindex` so
   staging.projectprofound.org never gets indexed.
2. Ensure the Pass 1 CI (.github) runs typecheck + lint + tests on: PRs into `staging`, PRs into
   `main`, and pushes to `staging`. Tell me the exact status-check name so I can mark it required
   on `main`'s branch protection.
3. Write docs/DEPLOYMENT.md: the branch flow above, how to promote, how to roll back (revert the
   merge commit on `main`; or roll back the rollout in the App Hosting console), and the
   shared-DB rules.
4. Write docs/DEPLOYMENT_SETUP_STEPS.md restating the console steps that are mine to do
   (refresh `staging` branch from main; set staging backend live branch = `staging` + env name =
   `staging` + auto-rollouts on; confirm staging.projectprofound.org is connected; protect `main`
   with required PR + CI; optional: delete the unused Studio backend) so we have a record.

Boundaries: don't change app code in this pass, don't touch production backend settings, don't
push to `main`. When done, lead with the outcome, then list anything you need me to confirm.
```

After this pass: with the consoles configured, push a trivial commit to `staging`, confirm it
appears on staging.projectprofound.org (NOT production), then do one `staging`->`main` promotion
yourself so you've watched the full loop once before real fixes flow through it.

---

## Pass 3 — Run each discovered issue through the staging loop

Use this once the pipeline exists. Run it per phase from the plan (Security first). It keeps you
testing on the staging site between every change, with production promotion staying in your hands.

```
We're executing [PHASE, e.g. "the Security phase"] from docs/IMPROVEMENT_PLAN.md, now that the
staging->production pipeline from docs/DEPLOYMENT.md is live. Context: real app, real users; I
review and test everything on staging before it ever reaches production.

For each issue in this phase, one at a time:
1. Create a feature branch off `staging`. Implement the smallest correct fix for that one issue.
2. Run typecheck, lint, and the tests; show me the actual output. Add/adjust a test that proves
   the issue is fixed and nothing regressed.
3. Open a PR into `staging` with a plain-language summary. Once CI is green you may merge into
   `staging`; it auto-deploys to staging.projectprofound.org.
4. Then STOP and tell me: the staging URL, the exact steps to test this specific fix, and what
   "working" looks like. Wait for me to confirm on staging before starting the next issue.

Rules:
- One issue per branch/PR. Don't batch unrelated fixes or refactor beyond the issue's scope.
- Never push or merge to `main`, never trigger a production rollout, never touch production
  secrets. Promotion `staging`->`main` is mine. The DB is shared with production, so don't run
  destructive data operations on staging. Pause and ask before anything destructive or
  irreversible (schema migrations, deletes, secret changes) — migrations are a separate human step.
- Before reporting any fix as done, audit the claim against a tool result from this session —
  if a test failed or a step was skipped, say so plainly. No unverified "it works."
- Use a fresh-context subagent to verify each fix against the plan and tests, separate from the
  agent that wrote it.
- Keep the security phase defensive (find-and-fix); don't write exploit/PoC code.

Lead each turn with the outcome in one sentence, then the test steps I need.
```

When a phase is fully tested on staging and you're happy, open and merge the `staging`->`main`
release PR yourself to ship it to production. Then start the next phase.
```
