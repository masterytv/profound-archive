# Deployment Setup — Owner Console Steps

One-time setup in the Firebase console and GitHub that agents cannot (and must
not) do. Day-to-day flow is in [DEPLOYMENT.md](./DEPLOYMENT.md). Status as of
**2026-06-11** — keep the checkboxes current when you change anything.

## Firebase console — App Hosting

Console path: console.firebase.google.com → project `studio-9638832619-7f197`
("Project Profound Main Stage") → Build → App Hosting.

- [x] **Two backends exist:** `profound-archive` (production) and
      `profound-archive-staging` (staging), region `us-east4`.
- [x] **Production live branch = `main`** — backend `profound-archive` →
      Settings → Deployment → live branch.
- [x] **Staging live branch = `staging`** — backend `profound-archive-staging`
      → Settings → Deployment → live branch.
- [x] **Staging Environment name = `staging`** — backend
      `profound-archive-staging` → Settings → Environment → "Environment name
      (for apphosting.yaml)". This is what makes `apphosting.staging.yaml`
      apply. *Verified live 2026-06-11: staging serves
      `x-robots-tag: noindex, nofollow` and a disallow-all robots.txt;
      production does not.*
- [x] **Staging custom domain** `staging.projectprofound.org` connected and
      serving (returns 200).
- [ ] **Leave production Environment name EMPTY** (or anything other than
      `staging`) — production must use the base `apphosting.yaml` only.
      Verify once: backend `profound-archive` → Settings → Environment.
- Keep **environment variable overrides in the console at zero** (both
  backends). All config belongs in the committed yaml files so it's
  version-controlled. The Environment settings page should keep showing
  "No environment variable overrides found".

## GitHub — branch protection on `main`

Repo: https://github.com/masterytv/profound-archive → Settings → Branches
(or Rules → Rulesets) → rule for `main`.

- [x] **Direct pushes to `main` blocked** (promotion is PR-only). Confirmed in
      practice — pushes fail.
- [ ] **Require the CI status check to pass before merging** — in the `main`
      protection rule enable "Require status checks to pass" and select the
      `checks` job from `.github/workflows/ci.yml`. Until this is on, a PR can
      be merged while tests are red.
- [ ] (Recommended) **Require a pull request before merging** with 0 required
      approvals — formalizes PR-only promotion even for admins.

## Secret Manager (per credential rotation)

Procedure for every rotation — details and status per key in
[SECRETS_INVENTORY.md](./SECRETS_INVENTORY.md):

1. Add a NEW version of the secret in Google Secret Manager.
2. Bump the version NUMBER in `apphosting.yaml` (never `versions/latest` —
   builds fail, LEARNINGS.md §5) and push to `staging`.
3. Verify on staging, promote to `main`, verify production.
4. **Disable the old version** in Secret Manager and revoke the old key at the
   provider.

Currently outstanding (as of 2026-06-12):

- [ ] Disable Secret Manager v1 of `OPENROUTER_API_KEY`; revoke the old
      OpenRouter `antigravity-tom` key at openrouter.ai.
- [ ] Disable Secret Manager v1 of `YOUTUBE_API_KEY`.

## Other owner-only actions (tracked elsewhere, listed for completeness)

- [ ] Run `supabase/migrations/20260611_api_usage_log.sql` on the shared
      Supabase DB to enable `/admin/usage` + the budget guard (both fail safe
      until then). Shared DB: a migration is a production change.
- [ ] Triage GitHub Dependabot alerts (10 vulnerabilities, 7 high, as of
      2026-06-11): https://github.com/masterytv/profound-archive/security/dependabot
