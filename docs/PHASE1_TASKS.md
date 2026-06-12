# Phase 1 — Hardening Task Checklist

> ## ✅ STATUS: Phase 1 COMPLETE — all 13 tasks (S-1…S-14) shipped to `staging` 2026-06-11.
> Test suite grew 41 → 99+; typecheck/lint held at the BASELINE.md baseline throughout; every
> fix has a regression test and passed fresh-context review. **Not yet promoted to production
> (`main`)** — that staging→main release is the owner's call. See "Follow-on work" at the bottom
> for everything still open (deployment docs, later phases, and the API-key cleanup).

Working checklist for the application-correctness/hardening pass. Each task is a concrete
engineering change: add an authorization check, throttle a request, validate and restrict input,
gate a debug override, escape rendered output, or remove debug logging. Full context for each
item (the "why") lives in [IMPROVEMENT_PLAN.md](./IMPROVEMENT_PLAN.md) under the matching ID;
deployment rules are in [CLAUDE.md](../CLAUDE.md).

**Workflow:** one task at a time, in the order below. Branch off `staging`, make the minimal
change, update/flip the matching characterization test in `tests/` (or add one), run
`npm run typecheck && npm run lint && npm test` and show real output, verify with a fresh-context
subagent, merge to `staging` to deploy, then produce a testing schema and stop for approval.
Do **not** fix the typecheck/lint baseline items (see [BASELINE.md](./BASELINE.md)) in this phase.

**Shared component (build once, reuse):** Tasks 1, 5, 11, and 3 all need request rate limiting.
Generalize the existing in-memory limiter at `src/app/api/questions/custom/route.ts:21-40` into a
small shared helper (keyed by IP, configurable window/limit) and reuse it. A shared store
(DB/Redis) is preferable to per-instance memory where autoscaling matters (see Task 3); start with
the in-memory helper if a store isn't wired yet, and note the limitation.

---

## Priority order

| # | ID | Task | Severity | Existing test |
|---|----|------|----------|---------------|
| 1 | S-1 | Throttle the public AI endpoints | Critical | `tests/api/chat-compassionate.test.ts` (extend) |
| 2 | S-6 | Restrict URL schemes + escape attributes in the markdown renderer | High | `tests/lib/markdown.test.ts` (flip) |
| 3 | S-13 | Move the per-slug auto-generation limit to a shared store | High | add |
| 4 | S-2 | Require a token or admin session on `email/manage-subs` POST | High | `tests/api/email-manage-subs.test.ts` (flip) |
| 5 | S-3 | Throttle the lead/contact email endpoints | High | add |
| 6 | S-4 | Gate the debug override to non-production | High | `tests/api/run-greyson-batch-auth.test.ts` (flip) |
| 7 | S-5 | Accept the automation credential by header only | Medium | add |
| 8 | S-7 | Remove the header-based access path on `uap/analytics` | Medium | add |
| 9 | S-9 | Remove per-request debug logging in the proxy | Medium | add |
| 10 | S-10 | Escape serialized JSON embedded in a `<script>` tag | Low | add |
| 11 | S-11 | Throttle the feedback write endpoint | Low | add |
| 12 | S-14 | Return a generic unauthorized response | Low | `tests/api/run-greyson-batch-auth.test.ts` (flip) |
| 13 | S-12 | Add schema validation at public POST boundaries | Low | add |

> S-8 (CSP `unsafe-inline`/`unsafe-eval` tightening) is deferred to post-launch per the plan — not a Phase 1 task.

---

## Tasks

### 1. (S-1) Throttle the public AI endpoints
- **Files:** `src/app/api/chat-compassionate/route.ts`, `src/app/api/uap/chat/route.ts`, `src/app/api/search3/route.ts`, `src/app/api/uap/search/route.ts`
- **Change:** Apply the shared rate-limiter helper (keyed by client IP) at the top of each POST/GET handler; return `429` with a generic message when the limit is exceeded. Pick a sensible window/limit (e.g. N requests/minute/IP).
- **Test:** Extend `tests/api/chat-compassionate.test.ts` — the existing "requires NO auth" case stays green for a single request; add an assertion that exceeding the limit returns `429` and does not call the model client.

### 2. (S-6) Restrict URL schemes + escape attributes in the markdown renderer
- **Files:** `src/lib/markdown.ts` (link handling ~`:104-115`, image handling ~`:94-101`)
- **Change:** Before emitting `href`/`src`, allow only `http:`, `https:`, `mailto:`, and root-relative (`/…`) URLs; replace anything else with a safe placeholder (e.g. `#`) or drop the link, keeping the text. Escape `"`/`<`/`>`/`&` in attribute values.
- **Test:** Flip the two "documents S-6" cases in `tests/lib/markdown.test.ts` to assert the disallowed-scheme URLs are neutralized (no `href="javascript:…"` / `src="javascript:…"` in output) while `http(s)`/relative links still render.

### 3. (S-13) Move the per-slug auto-generation limit to a shared store
- **Files:** `src/app/api/questions/[slug]/route.ts` (limiter ~`:61-75`, auto-generate trigger ~`:195-209`)
- **Change:** Replace the per-instance in-memory counter with a shared/persistent limit (DB-backed, keyed by IP and/or globally) so it survives cold starts and autoscaling. If a store isn't available yet, at minimum make the cap global-and-persistent and note the follow-up.
- **Test:** Add a test asserting the limiter blocks generation past the cap and that a blocked request does not call the model client. **Note:** if this needs a new DB table/column, that's a schema change — describe it and stop; do not run a migration (shared prod DB).

### 4. (S-2) Require a token or admin session on `email/manage-subs` POST
- **Files:** `src/app/api/email/manage-subs/route.ts` (`POST`, ~`:65-102`)
- **Change:** Before writing, require either a valid unsubscribe token verified against the target email (mirror the `GET` guard at `:19-53`) or an authenticated admin session (`isAdminUser()`); otherwise return `401`.
- **Test:** Flip the two "documents S-2" cases in `tests/api/email-manage-subs.test.ts` to assert an unauthenticated POST returns `401` and performs no write; add a case for a valid token succeeding.

### 5. (S-3) Throttle the lead/contact email endpoints
- **Files:** `src/app/api/quiz-lead/route.ts` (~`:33-63`), `src/app/api/contact/route.ts` (~`:10-49`)
- **Change:** Apply the shared rate limiter, keyed by IP and by submitted email, before sending mail or writing rows; return `429` over the limit.
- **Test:** Add a test asserting over-limit requests return `429` and do not call the mail/DB clients.

### 6. (S-4) Gate the debug override to non-production
- **Files:** `src/app/api/run-greyson-batch/route.ts` (~`:38`), `run-core-elements-batch`, `run-phenomenology-batch`, `run-journey-flow-batch`, `run-transformation-batch`, `src/app/api/intake/route.ts` (~`:137-140`), `intake/process`, `uap/intake`, `uap/intake/process`, `uap/reanalyze`, `uap/fix-encounters/route.ts` (~`:35`)
- **Change:** Replace the truthiness check on `process.env.IS_DEBUG_MODE` with `process.env.NODE_ENV !== 'production' && process.env.IS_DEBUG_MODE === 'true'` everywhere it appears. (Consider a tiny shared helper so all sites stay consistent.)
- **Test:** Flip the "documents S-4" case in `tests/api/run-greyson-batch-auth.test.ts` to assert that with `IS_DEBUG_MODE="false"` (and in production), a request with a wrong credential returns `401`.

### 7. (S-5) Accept the automation credential by header only
- **Files:** `src/app/api/scanner/{audit,discover,discover-all,process,tick}/route.ts`, `src/app/api/uap/scanner/*`, `src/app/api/batch/run-fingerprint-batch/route.ts` (~`:18`), `src/app/api/uap/intake/reanalyze/route.ts`
- **Change:** Read the automation credential only from the `Authorization` / `x-cron-secret` header; remove the `?secret=` query-string path. **Coordinated:** the Oracle crontab curls must move the secret to a header in the same change window — flag this for the owner; do not assume it's done.
- **Test:** Add a test asserting a header-credentialed request passes and a query-string-only request is rejected.

### 8. (S-7) Remove the header-based access path on `uap/analytics`
- **Files:** `src/app/api/uap/analytics/route.ts` (~`:17-27`)
- **Change:** Remove the `Referer`-based access branch; rely solely on the automation credential (or make the endpoint deliberately public if that's intended — confirm with owner).
- **Test:** Add a test asserting a request with only a crafted `Referer` and no valid credential is rejected.

### 9. (S-9) Remove per-request debug logging in the proxy
- **Files:** `src/proxy.ts` (~`:6-7`, `:43`)
- **Change:** Delete the lines that log `sb-*` cookie fragments and the user email on every request (or guard them behind a non-production flag).
- **Test:** Add a small test asserting no cookie/email value is written to `console.log` during a normal request (spy on `console.log`).

### 10. (S-10) Escape serialized JSON embedded in a `<script>` tag
- **Files:** `src/app/blog/[slug]/page.tsx` (~`:197`) and any sibling pages embedding `JSON.stringify(...)` via `dangerouslySetInnerHTML`
- **Change:** Replace `<` with `<` (and `>`/`&` as needed) in the serialized JSON-LD string before injecting it, so content can't close the script element.
- **Test:** Add a unit test on the escaping helper (extract it if inline) asserting a value containing `</script>` is encoded.

### 11. (S-11) Throttle the feedback write endpoint
- **Files:** `src/app/api/ces-feedback/route.ts` (`POST`/`PATCH`)
- **Change:** Apply the shared rate limiter before the service-role write; return `429` over the limit.
- **Test:** Add a test asserting over-limit requests return `429` and perform no write.

### 12. (S-14) Return a generic unauthorized response
- **Files:** `src/app/api/run-greyson-batch/route.ts` (~`:40`) and sibling batch routes sharing the pattern
- **Change:** On credential mismatch, return a plain `401` (e.g. `{ error: 'Unauthorized' }`) without echoing expected-credential length or other metadata.
- **Test:** Flip the "401 leaks length" case in `tests/api/run-greyson-batch-auth.test.ts` to assert the body contains no length/metadata.

### 13. (S-12) Add schema validation at public POST boundaries
- **Files:** public POST routes (`quiz-lead`, `contact`, `ces-feedback`, `chat-compassionate`, `email/manage-subs`, …)
- **Change:** Parse request bodies with `zod` (already a dependency) and restrict fields to expected shapes/values; return `400` on invalid input. Optionally switch credential comparisons to `crypto.timingSafeEqual`.
- **Test:** Add cases asserting malformed/oversized bodies return `400` before any side effect. **Scope note:** keep this targeted to the public POST routes; the broader typed-DB-layer work is Phase 4, not here.

---

## Notes
- Tasks 1, 3, 5, 11 share the rate-limiter helper — build it in Task 1, reuse thereafter.
- Anything requiring a new table/column (possibly Task 3) is a **production schema change** because
  staging and prod share one database — describe it and stop; the owner runs migrations.
- The Oracle crontab credential move (Task 7) is the only task with an external coordination step.

---

# Follow-on work (after Phase 1) — the remaining task list

Phase 1 (security) is done. These are the next concerns, ordered. Run them the same way:
one branch → PR into `staging` → test on staging → owner promotes `staging`→`main`. Defensive
find-and-fix only. Read [LEARNINGS.md](./LEARNINGS.md) before any deploy/infra change
(esp. §5: `apphosting.yaml` secrets need a **numeric** version, never `versions/latest`).

### A. Owner actions (human-run; the model must not do these)
- [ ] **Promote `staging` → `main`** to ship Phase 1 + the blog-pipeline fix + the usage dashboard to production.
- [ ] **Run the usage-tracking migration** `supabase/migrations/20260611_api_usage_log.sql` (shared prod DB) to light up `/admin/usage` + the budget guard. Until run, both fail safe (logging no-ops, guard allows).
- [ ] Triage **GitHub dependabot** (10 vulnerabilities, 7 high as of 2026-06-11).

### B. Finish the production pipeline (Pass 2.5 of the production guide — repo-side) ✅ DONE 2026-06-12
- [x] `apphosting.staging.yaml` — per-environment config: `minInstances: 0`, `NOINDEX_SITE=true` (noindex header/meta/robots.txt — verified live on staging), staging `NEXT_PUBLIC_SITE_URL`; secrets stay as references.
- [x] `docs/DEPLOYMENT.md` — branch flow, how to promote, how to roll back, shared-DB rules.
- [x] `docs/DEPLOYMENT_SETUP_STEPS.md` — the owner's console/GitHub checklist (current state verified; open items: require-CI branch protection on `main`, Secret Manager v1 disables).

### C. API key / secrets cleanup (started — see [SECRETS_INVENTORY.md](./SECRETS_INVENTORY.md))
Post-leak rotation. **OpenRouter is done** (rotated, $25 cap, verified). Remaining, in priority order:
- [ ] OpenRouter finish: revoke old `antigravity-tom` key + disable Secret Manager `OPENROUTER_API_KEY` v1.
- [ ] Rotate **`OPENAI_API_KEY`** (+ hard cap; confirm the Feb-2026 leaked key is dead).
- [ ] Rotate **`SUPABASE_SERVICE_KEY`** — highest impact (full DB, bypasses RLS; ~30 routes + 50 scripts).
- [ ] Work down the inventory table: `CRON_SECRET`, `YOUTUBE_API_KEY`, `APIFY_API_TOKEN` (recreate — leaked one removed), `FAL_API_KEY`, `RESEND_API_KEY`, `TAVILY_API_KEY`, `TELEGRAM_*`, `GA_*` (service-account key).
- [ ] Resolve dead refs: `TYPESENSE_API_KEY` (Typesense removed), `ELEVENLABS_API_KEY` (subscription cancelled — re-key or delete the code path).
- [ ] Prevention: gitleaks pre-commit hook, CI secret-scan step, commit `.env.example` (names only), make `masterytv/soulwisdomnetwork` repo private/deleted.

### D. Later IMPROVEMENT_PLAN phases (full context in [IMPROVEMENT_PLAN.md](./IMPROVEMENT_PLAN.md) §3)
- [ ] **Phase 3** — Dead code & route cleanup (D-1…D-8, A-3/A-5/A-6). **Destructive — explicit approval per item.**
- [ ] **Phase 4** — Type-safety burn-down (Q-1/Q-2): remove `ignoreBuildErrors`, wire the generated `Database` types, then flip CI typecheck to blocking.
- [ ] **Phase 5** — Performance (P-1…P-6, U-1): restore real ISR, `Promise.all` waterfalls, `next/font`, dynamic-import recharts, error/loading boundaries.
- [ ] **Phase 6** — Full test suite (T-2) in blast-radius order; includes the AI-layer fixture tests (AI-1) and blog-pipeline link validation (AI-6, generator side).
- [ ] **Phase 7** — Data-layer reproducibility & doc accuracy (T-4/T-5/A-4): baseline migration + `config.toml`, commit the Oracle crontab, doc pass.
- [ ] **Phase 8** — Accessibility & UX polish (U-2/U-3, rest of Q-3).
- [ ] **Deferred (post-launch):** CSP nonces (S-8), monster-file refactors (Q-4).
