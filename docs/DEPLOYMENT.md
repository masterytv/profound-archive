# Deployment Guide — profound-archive

How code gets from a laptop to production, how to promote, and how to roll back.
Console/GitHub one-time setup lives in [DEPLOYMENT_SETUP_STEPS.md](./DEPLOYMENT_SETUP_STEPS.md).
Read [LEARNINGS.md](./LEARNINGS.md) before changing any deploy/infra config.

## The pipeline at a glance

Firebase App Hosting auto-deploys on push. **Branch = environment:**

| Git branch | App Hosting backend | URL | Who deploys |
|---|---|---|---|
| `staging` | `profound-archive-staging` | https://staging.projectprofound.org (also `profound-archive-staging--studio-9638832619-7f197.us-east4.hosted.app`) | Anyone (agents included) — push to `staging` |
| `main` | `profound-archive` | https://projectprofound.org (behind Cloudflare) | **Owner only**, via PR `staging` → `main` |

- Firebase project: `studio-9638832619-7f197`, region `us-east4`.
- `main` is branch-protected: direct pushes fail; promotion is a GitHub PR.
- Agents must NEVER commit/merge/checkout `main` or trigger rollouts in the
  Firebase console (see [CLAUDE.md](../CLAUDE.md)).

## Day-to-day flow (feature → staging)

1. Branch off `staging` (`feat/...`, `fix/...`, `docs/...`).
2. Make the change; run `npm run typecheck && npm run lint && npm test`.
   Typecheck/lint are compared against [BASELINE.md](./BASELINE.md) (don't fix
   baseline items as a side effect); tests must pass outright.
3. Merge the branch into `staging` and push. App Hosting builds and rolls out
   automatically (~5–10 min). CI (`.github/workflows/ci.yml`) runs on the push:
   typecheck + lint non-blocking, tests blocking.
4. Test the change on the staging URL. Then stop — promotion is the owner's call.

## Promote staging → production (owner)

1. Confirm staging is healthy (see "Post-deploy verification" below).
2. Open a PR from `staging` into `main` on GitHub
   (https://github.com/masterytv/profound-archive/compare/main...staging).
3. Wait for the CI check to pass (tests are blocking).
4. Merge the PR. App Hosting auto-builds and rolls out `profound-archive`
   (production). No console action needed.
5. Verify production (below), including that `x-robots-tag: noindex` did NOT
   appear (that header is staging-only).

**If the change touches pipeline scripts or `src/lib/pipeline/*`:** the Oracle
VM worker runs scheduled jobs from `main` — after the PR merges, deploy it:
`ssh -i ~/.ssh/oracle-profound.key ubuntu@150.230.166.48`, then
`cd ~/profound-archive && git pull origin main && pm2 restart profound-worker`.

## Roll back production (owner)

Two mechanisms — prefer the git revert; use the console only as an emergency
stopgap, and always follow it with the git revert.

**A. Git revert (preferred — keeps git and the deployed app in sync):**

1. `git checkout -b revert/<what> origin/main`
2. `git revert -m 1 <merge-commit-sha>` (the promotion merge on `main`;
   `-m 1` keeps the mainline parent).
3. Push the branch, open a PR into `main`, merge after CI. App Hosting rolls
   out the reverted build automatically.
4. Apply the same revert (or the real fix) to `staging` so the branches don't
   silently diverge.

**B. Console rollback (emergency only, owner only):** Firebase console →
App Hosting → `profound-archive` → Rollouts → ⋮ on a previous good rollout →
roll back / redeploy. **Warning:** this does not change git — the next merge to
`main` will redeploy the bad code. Do step A afterwards. Rolling back does not
undo database changes (shared DB — see below).

## Configuration & secrets

- [`apphosting.yaml`](../apphosting.yaml) — base config for ALL backends
  (production values, all secret references).
- [`apphosting.staging.yaml`](../apphosting.staging.yaml) — staging-only
  overrides, applied because the staging backend's console "Environment name"
  is `staging`. Overrides merge **per key / per env variable**; everything not
  listed is inherited from the base file. Currently: `minInstances: 0`,
  `maxInstances: 1`, `NOINDEX_SITE=true` (emits noindex header/meta/robots.txt),
  and staging's own `NEXT_PUBLIC_SITE_URL`.
- **Secrets are Secret Manager references pinned to a NUMERIC version**
  (e.g. `.../versions/3`). `versions/latest` FAILS the App Hosting build
  (LEARNINGS.md §5). Rotation: add a new secret version → bump the number in
  `apphosting.yaml` → deploy. Never commit a secret value to either yaml.
  Rotation status lives in [SECRETS_INVENTORY.md](./SECRETS_INVENTORY.md).
- Config changes take effect at the next **build** — pushing the yaml change
  is what triggers the rebuild; editing the console alone does nothing until
  a new rollout happens.

## Shared database — the rules that bite

Staging and production share ONE Supabase database. Therefore:

- Testing on staging touches **live production data**. No destructive data
  operations from staging, ever.
- **A schema migration run "for staging" IS a production change.** Migrations
  (`supabase/migrations/*.sql`) are written by agents but RUN only by the
  owner, deliberately. Code that depends on a migration must fail safe until
  the migration is applied (pattern: feature no-ops / guard allows).
- Rolling back a deploy does not roll back data or schema. Plan migrations to
  be backwards-compatible with the previous app version when possible.

## One-off batch scripts (`scripts/*-compiled.mjs`)

A couple of manual backfill scripts are run as esbuild bundles rather than
through `npx tsx`:

```bash
npx esbuild scripts/uap-batch-phenomenology.ts --bundle --platform=node \
  --outfile=scripts/batch-phenom-compiled.mjs --format=esm
node --env-file=.env.local scripts/batch-phenom-compiled.mjs --dry-run
```

(Same shape for `uap-batch-context.ts` → `batch-context-compiled.mjs`; each
script's header comment carries its own exact command.)

**The bundles are gitignored — build them on demand, don't commit them.**
`scripts/batch-phenom-compiled.mjs` was tracked until 2026-07-22 (902 KB /
~24k lines, inlining the whole OpenAI SDK, Zod and supabase-js). It was
committed once, in the same commit as its `.ts` source, and never regenerated.
Reasons not to bring it back:

- **It drifts.** Nothing regenerates the bundle when the `.ts` source or
  `src/lib/ai/uap-phenomenology.ts` changes, so a stale bundle runs old
  analysis code against live data. This is [IMPROVEMENT_PLAN.md](./IMPROVEMENT_PLAN.md)
  item A-1.
- **Nothing consumes it.** The Oracle VM's 17 crontab jobs and the pm2
  `profound-worker` all run `.ts` sources via `npx tsx`
  ([LEARNINGS.md](./LEARNINGS.md) §Oracle Cloud Worker), and
  [`scripts/deploy-oracle.sh`](../scripts/deploy-oracle.sh) does `git pull` →
  conditional `npm ci` → `pm2 restart` with no bundling step. These are manual
  laptop-run backfills.
- **The sibling proves the convention.** `uap-batch-context.ts` documents the
  identical esbuild command and its `batch-context-compiled.mjs` was never
  tracked.

Building requires no new dependency — `npx esbuild` fetches it if it isn't
already present transitively. It is deliberately *not* wired into a
`package.json` script: `deploy-oracle.sh` triggers a full `npm ci` on any
`package.json` change, which stops the worker and is slow on the 1 GB VM, and
this build never runs there.

## Post-deploy verification

Staging (after any push to `staging`):

```bash
# App is up and noindexed (staging must never be indexed)
curl -sI https://staging.projectprofound.org | grep -iE "HTTP/|x-robots-tag"
# expect: HTTP/2 200 and x-robots-tag: noindex, nofollow
curl -s https://staging.projectprofound.org/robots.txt   # expect: Disallow: /
```

Production (after a promotion):

```bash
curl -sI https://projectprofound.org | grep -iE "HTTP/|x-robots-tag"
# expect: HTTP/2 200 and NO x-robots-tag line
curl -s https://projectprofound.org/robots.txt           # expect: Allow: / + sitemap
```

Then spot-check the specific change that was promoted (login, the affected
page/route), and check the App Hosting Rollouts tab if anything looks stale —
the build may still be in progress.

## Troubleshooting

- **Build fails immediately after a secrets change** → almost always a
  `versions/latest` reference or a version number that doesn't exist yet
  (LEARNINGS.md §5). Check the Rollouts build log.
- **Staging shows production behavior (or vice versa)** → confirm the backend's
  console Environment name is `staging` and that a build ran AFTER the config
  change landed.
- **Change works on staging but a scheduled pipeline still misbehaves** → the
  Oracle VM worker pulls `main`, not `staging`; it only picks up changes after
  promotion + `git pull` + pm2 restart on the VM.
- **HTTP 524 / timeouts on long requests in prod** → Cloudflare's hard 100s
  proxy timeout in front of production (LEARNINGS.md §2 — use the
  browser-triggered async pattern). The staging hosted.app URL is NOT behind
  Cloudflare, so staging can mask this class of bug.
