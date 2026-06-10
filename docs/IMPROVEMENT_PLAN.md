# Production-Hardening Improvement Plan

> Generated 2026-06-10 from a read-only audit of the full repo (direct reading of core wiring + five parallel audit passes: security, performance/quality, data-layer/CI, dead-code/route-history, and AI-layer). Every claim cites the file it came from; items based on inference rather than direct reading are marked **(inferred)**.
>
> **Context assumptions (confirmed with owner):** app is effectively pre-launch (breaking changes acceptable); canonical routes inferred from nav/sitemap; target is *pragmatic* production-grade (CI gate + targeted tests, not coverage-chasing); no fixed infra constraints, but the Oracle-crontab automation is load-bearing and must keep working.
>
> **Coverage:** all five audit passes completed (the route-history and AI-layer passes were re-run to completion after an initial session-limit cutoff). Updated 2026-06-10 to fold in their findings — notably a **correction to D-2** (a component the earlier draft marked for deletion is actually live) and a new AI-layer robustness section (§2.8).
>
> **Partial progress already shipped (safety-net pass, 2026-06-10):** a Vitest runner + 6 characterization-test files (`tests/`), an ESLint flat config (`eslint.config.mjs`), the `lint`/`test` npm scripts, a CI workflow (`.github/workflows/ci.yml`), and recorded static-analysis baselines (`docs/BASELINE.md`: **26 typecheck errors all in one script file**, `src/` clean; **206 lint problems**). This advances Phase 2 and seeds Phase 6. The CI typecheck/lint steps are intentionally non-blocking until the baseline is burned down; tests are blocking.

---

## 1. Architecture Map (as actually wired)

### Routing & rendering
- **Next.js 16** (`package.json`: `next ^16.0.10` — docs still say 14/15), App Router, ~50 route segments under `src/app/`.
- **Root layout** ([src/app/layout.tsx](../src/app/layout.tsx)) mounts on every page: `unified-site-header.tsx` (927-line client component), `site-footer.tsx`, `ChatPopup`, `CesFeedbackWidget`, cookie-consent + consent-gated GA4/ConvertKit scripts, next-themes. Fonts load via render-blocking Google Fonts `<link>`, not `next/font`.
- **Canonical public surface** (per nav/footer links in [unified-site-header.tsx](../src/components/unified-site-header.tsx) / [site-footer.tsx](../src/components/site-footer.tsx) and [sitemap.ts](../src/app/sitemap.ts)): `/` (renders sections imported from `src/app/home-new/`), `/about`, `/blog`, `/channels`, `/chat` → 301 → `/chat-compassionate` ([next.config.ts](../next.config.ts) redirects), `/compass` (quiz; `/quiz` 301s here), `/dashboard`, `/experiencer`, `/explore/*`, `/join`, `/nde`, `/questions`, `/research/*`, `/resources`, `/search3`, `/video-explore` + `/video/[id]`, `/visualize/*`, and the whole `/uap/*` mirror domain (`persons` not `people`).
- **ISR/SSG intent is widespread** (`revalidate` + `generateStaticParams` on blog/questions/experiencer/etc.) but **defeated on ~20 pages** that also read `searchParams` or cookies, forcing per-request dynamic rendering (see P-1, P-2).

### Auth (Supabase)
- Cookie sessions via `@supabase/ssr`. Active middleware is [src/proxy.ts](../src/proxy.ts) (Next 16's middleware convention; `src/middleware.ts.bak` is inert legacy). It refreshes the session on every matched request and gates `/admin/*` by loading `profiles.role` (admin/super_admin) and `is_banned`.
- Admin **pages** are double-protected: proxy + a server-side role check in `src/app/admin/layout.tsx`. Admin **API** routes use the shared [src/lib/auth/admin-guard.ts](../src/lib/auth/admin-guard.ts) (`isAdminUser()`); all 20 `/api/admin/*` routes enforce it. Auth is genuinely server-side — solid foundation.
- Two Supabase client factories: [src/lib/supabase/client.ts](../src/lib/supabase/client.ts) (browser singleton) and [server.ts](../src/lib/supabase/server.ts) (cookie-based). Additionally, ~30 API routes and ~50 scripts each construct their own **service-role** client inline with `SUPABASE_SERVICE_KEY` — the dominant write path, which bypasses RLS. RLS policies exist in `supabase/migrations/` (public-SELECT / service-role-ALL pattern) but are a backstop, not the primary control.

### AI layer
- **Live chat**: [src/app/api/chat-compassionate/route.ts](../src/app/api/chat-compassionate/route.ts) — direct OpenAI: `text-embedding-3-small` for retrieval + `gpt-5-chat-latest` for generation, RAG over Supabase pgvector embeddings. `/uap/chat` → `api/uap/chat` is the UAP twin. `/search3` and `/uap/search` call embedding-backed search routes.
- **Legacy chat**: the one remaining Genkit flow ([src/ai/flows/compassionate-chatbot-answers.ts](../src/ai/flows/compassionate-chatbot-answers.ts), Gemini 2.5 Flash via [src/ai/genkit.ts](../src/ai/genkit.ts)) is reachable through `getChatResponse` in [src/app/actions.ts](../src/app/actions.ts). The dead chat pages (`chat-2`, `chat-test`, old `chat`) post to external **n8n webhooks** baked in as `NEXT_PUBLIC_*_WEBHOOK_URL` ([apphosting.yaml](../apphosting.yaml)).
- **Analysis pipeline** (the bulk of AI code): 19 modules in `src/lib/ai/` (greyson, core-elements, journey-flow, phenomenology, transformation, uap-* etc.) called by `src/lib/pipeline/` intake code and by batch API routes / Oracle scripts. Uses OpenAI + OpenRouter (Claude) + Tavily + fal.ai.

### Automation (load-bearing — do not break)
- **Oracle VM crontab owns all scheduling** (per `docs/ARCHITECTURE.md` and recent commits). It runs ~9 live scripts from `scripts/` (scanner-discover, scanner-process, rapid-process via pm2, nde-batch-analysis, blog-generate, weekly-maintenance, uap-batch-triad, uap-knowledge-batch) with the service-role key, and curls 5 API routes authenticated by `CRON_SECRET` (`/api/cron/*`, `/api/email/cron`, `/api/email/feedback-digest`).
- **GitHub Actions**: 18 workflow files; 17 are disabled stubs (`workflow_dispatch` only), 1 intentional monthly schedule (`channel-score-snapshot.yml`). **No workflow runs on push/PR — there is zero merge gating.**
- **Deploy**: Firebase App Hosting auto-deploys from `main` (inferred — trigger lives in the Firebase console, not the repo). Secrets correctly in Google Secret Manager via [apphosting.yaml](../apphosting.yaml).

### Data layer
- ~74 distinct tables referenced from code (grep of `.from(...)`), but `supabase/migrations/` (47 files, earliest 2026-02-11) only covers deltas — **core tables have no CREATE TABLE in the repo**. A generated [database.types.ts](../src/lib/supabase/database.types.ts) exists but is **imported by zero files**; every query is untyped.

---

## 2. Findings

Severity scale: **Critical** = exploitable/cost-incurring today or ships broken code; **High** = significant risk or structural defect; **Medium** = real but bounded; **Low** = hygiene.

### 2.1 Security

| # | Sev | Finding | Files | Risk | Fix |
|---|---|---|---|---|---|
| S-1 | **Critical** | Public AI endpoints: no auth, no rate limit (cost abuse) | `src/app/api/chat-compassionate/route.ts:20-77`, `api/uap/chat/route.ts:52-77`, `api/search3/route.ts`, `api/uap/search/route.ts` | Anyone can loop unlimited POSTs that bill OpenAI/OpenRouter; scripted abuse = large bill + quota DoS | Per-IP rate limiting (in-repo pattern exists at `api/questions/custom/route.ts:21-40`; or Upstash) + optionally Turnstile on chat |
| S-2 | **High** | `email/manage-subs` POST mutates any email's subscriptions with **no auth** (IDOR) | `src/app/api/email/manage-subs/route.ts:65-102` | Anyone can mass-unsubscribe or re-activate arbitrary addresses via service-role write | Require the unsubscribe token (verified against email) or admin session, mirroring the GET guard at line 19 |
| S-3 | **High** | `quiz-lead` + `contact` send email to attacker-supplied addresses, unauthenticated & unthrottled | `api/quiz-lead/route.ts:33-63`, `api/contact/route.ts:10-49` | Email-bombing third parties, burning Resend domain reputation, DB spam via service role | Per-IP + per-email rate limit; captcha/Turnstile |
| S-4 | **High** | `IS_DEBUG_MODE` env var fully bypasses auth on mutation/AI routes — truthiness check, so even `"false"` bypasses | `api/run-greyson-batch/route.ts:38`, `api/run-core-elements-batch`, `run-phenomenology-batch`, `api/intake/route.ts:137-140`, `api/intake/process`, `api/uap/intake`, `api/uap/intake/process`, `api/uap/reanalyze`, `api/uap/fix-encounters/route.ts:35` | One stray env var in prod opens every batch/intake endpoint (service-role writes + AI spend) to the internet | Gate on `NODE_ENV !== 'production' && IS_DEBUG_MODE === 'true'`, or remove |
| S-5 | Medium | `CRON_SECRET` accepted as `?secret=` query param | `api/scanner/{audit,discover,discover-all,process,tick}`, `api/uap/scanner/*`, `api/batch/run-fingerprint-batch/route.ts:18`, `api/uap/intake/reanalyze` | Secrets in query strings land in access logs, history, Referer headers | Header-only (`Authorization` / `x-cron-secret`); update Oracle crontab curl commands in the same change |
| S-6 | **High** | Custom markdown renderer allows `javascript:` URLs → stored XSS, **reachable via scraped content** | `src/lib/markdown.ts:94-115` (links) + `:104-115`, rendered via `dangerouslySetInnerHTML` in `src/app/blog/[slug]/page.tsx:361`, `uap/blog/[slug]/page.tsx:360` | AI-layer audit confirmed the path is steerable, not just theoretical: `blog-story.ts:325-353` feeds a **full video transcript** into the article generator and the output `body_mdx` is rendered unescaped. A malicious transcript that induces `[src](javascript:…)` produces stored click-XSS on the public blog. Sanitizer strips tags/`on*=` but not URL schemes; attribute values also unescaped. (Raised Medium→High given the confirmed reach.) | Whitelist schemes (http/https/mailto/relative) **and escape attribute values** in `markdown.ts`, or swap to rehype-sanitize/DOMPurify. Test `tests/lib/markdown.test.ts` already pins the current vulnerable behavior. |
| S-7 | Medium | `uap/analytics` auth via spoofable `Referer` | `api/uap/analytics/route.ts:17-27` | Client-controlled header is not a control (impact limited: analytics read) | Remove referer path; rely on CRON_SECRET or make data public deliberately |
| S-8 | Medium | CSP includes `unsafe-inline` + `unsafe-eval` in `script-src` | `next.config.ts:13` | Substantially weakens XSS protection the CSP otherwise provides (headers are otherwise unusually thorough) | Move toward nonces post-launch; pairs with S-6 |
| S-9 | Medium | Auth-cookie fragments + user emails logged on **every request** | `src/proxy.ts:6-7,43` | Session-token prefixes and PII in Firebase logs; labeled "Debug" but shipped | Delete the log lines (or gate dev-only) |
| S-10 | Low | JSON-LD injection via unescaped `JSON.stringify` | `src/app/blog/[slug]/page.tsx:197` + similar | A title containing `</script>` breaks out of the script tag | Escape `<` as `<` when serializing |
| S-11 | Low | Unauthenticated public DB writes (spam) | `api/ces-feedback` (POST/PATCH, service-role write) | Junk-data spam; bounded impact | Same rate-limit middleware as S-1/S-3 |
| S-12 | Low | Hand-rolled validation; no zod in any API route; non-constant-time secret compares | all `api/*` routes | Malformed-input edge cases; minor timing oracle | Zod at public POST boundaries (zod already a dep); `timingSafeEqual` for secrets |
| S-13 | **High** | Public GET auto-generates a paid Claude-Sonnet answer for **any** unknown slug; only guard is a per-instance in-memory counter | `src/app/api/questions/[slug]/route.ts:61-75` (limiter), `:195-209` (auto-gen trigger), `:414` (`anthropic/claude-sonnet-4-5` via OpenRouter) | The 10/hr limit is per-instance memory — it resets on cold start and multiplies under autoscaling, so it does not bound cost. Each call also persists a row to `user_questions` (DB spam). Cost-abuse vector distinct from S-1's endpoints. | Move the rate limit to a shared store (DB/Redis) keyed by IP, and/or require human-verification before generation. (AI-layer audit.) |
| S-14 | Low | 401 bodies leak the expected `CRON_SECRET` length | `api/run-greyson-batch/route.ts:40` (and siblings sharing the pattern) | Error string returns `Expected N chars`, narrowing brute-force of the secret | Return a generic 401; pinned by `tests/api/run-greyson-batch-auth.test.ts`. |

**What's already good:** no secrets in git (`.env*` gitignored and untracked; verified `git ls-files`); service-role key never reaches client code (verified — only server routes/components); all `/api/admin/*` routes guarded; real security-headers/CSP block; secrets in Google Secret Manager; RLS + function-hardening migrations exist.

### 2.2 Architecture / structure

| # | Sev | Finding | Files | Risk | Fix |
|---|---|---|---|---|---|
| A-1 | **High** | Scripts duplicate pipeline logic ("copy-modify" pattern), incl. committed compiled artifacts | `scripts/uap-batch-*.ts` (headers literally say "Copy-Modify from: src/lib/pipeline/intake.ts lines 702-726"), `*-compiled.mjs` | Pipeline fixes don't propagate to the nightly Oracle jobs; compiled `.mjs` drifts from `.ts` sources | Make scripts import from `src/lib/pipeline` (newer scripts `nde-batch-analysis.ts`, `rapid-process.ts` already do); delete compiled artifacts |
| A-2 | **High** | ~30 API routes + ~50 scripts each build their own inline service-role client | throughout `src/app/api/`, `scripts/` | No single choke point for the most dangerous credential; inconsistent config | One shared `createServiceClient()` helper (typed, see Q-2) |
| A-3 | Medium | Root homepage's building blocks live inside a dead route's folder | `src/app/page.tsx:5-9` imports data + 4 section components from `src/app/home-new/` | Confusing; blocks deleting `home-new`; route folders shouldn't export shared modules | Move to `src/components/home/` + `src/lib/data/` first, then delete the route |
| A-4 | Medium | Oracle crontab schedule exists only as a markdown table | `docs/ARCHITECTURE.md` §automation; no crontab file in repo | The system's entire scheduling layer is unversioned; drift between doc and VM is invisible | Commit the actual crontab (e.g. `infra/oracle-crontab`) + a `scripts/README.md` mapping entry → script |
| A-5 | Low | `execution/` dir is dead (CLAUDE.md "Layer 3" convention unused; real automation is `scripts/`) | `execution/` (only test outputs: `anon_test_output.json`, `greyson_test_run.*`) | Misleading structure | Delete or repurpose; update CLAUDE.md if convention is abandoned |
| A-6 | Medium | Entire Genkit/Gemini stack is dead code (confirmed by AI-layer audit) | `src/ai/` (genkit.ts, dev.ts, flows/compassionate-chatbot-answers.ts), `src/app/chat/chat-ui.tsx`, `getChatResponse` in `src/app/actions.ts:73` | Only `actions.ts` imports `src/ai/`; its `getChatResponse` is called only by `chat-ui.tsx:44`, which **nothing imports** (the rendered `/chat` page uses an n8n webhook, not this flow). So the whole Genkit path is unreachable. | **Deletable:** `src/ai/` entirely, `chat-ui.tsx`, the `getChatResponse` export, the 4 genkit deps (`genkit`, `genkit-cli`, `@genkit-ai/google-genai`, `@genkit-ai/next`) and the two `genkit:*` npm scripts. (Caveat: grep-based; no dynamic imports detected.) Bundle into Phase 3. |

### 2.3 Dead code & duplicate routes

Canonical verdicts (evidence: nav/footer hrefs, `sitemap.ts`, `next.config.ts` redirects, inbound-link grep — zero inbound references found for every item below unless noted):

| # | Sev | Dead item | Evidence | Action |
|---|---|---|---|---|
| D-1 | **High** | Route folders: `chat-2`, `chat-test`, `search`, `search2`, `about-new`, `home-v2`, `video-2025`, `header-preview`, `logo-preview`, `uap/people`, `chat/page.tsx` (unreachable behind 301), `search3/dev/` | No inbound links; sitemap uses `/video/[id]` not `/video-2025`; `/chat` 301s in `next.config.ts:39`. Dead-code audit confirmed **zero cross-imports from any dead folder** except the known `home-new` case (`src/app/page.tsx:5-9`) — no other deletion blockers. Git history confirms these folders' only recent commits are repo-wide sweeps (dark-mode, unified-header, og-image), not feature work. | Delete (git-recoverable). `home-new`: relocate shared modules first (A-3). Verify nothing automation-facing is removed — the only app routes the Oracle crontab/scripts hit are `/api/*` (questions, scanner/process, uap/reanalyze, uap/fix-encounters, cron/*, email/*, admin/revalidate); none of the dead **page** routes are referenced. |
| D-2 | **High** | Dead components: `src/components/site-header.tsx` (971 lines, zero imports), `main-nav.tsx`, **`search-result-card.tsx`** (plain version, zero imports), `welcome-feedback.tsx` (zero imports), and the transitively-dead pair `src/components/ui/sidebar.tsx` + `src/hooks/use-mobile.tsx` (sidebar has no importers; `use-mobile` is imported only by sidebar) | Import grep (dead-code audit) | Delete. **⚠️ Correction:** the earlier draft listed `search-result-card-v4.tsx` here — that file is **LIVE** (imported by `src/app/search3/page.tsx` and `src/app/questions/[slug]/page.tsx`). Deleting it would break the canonical search page. The actually-dead file is the un-suffixed `search-result-card.tsx`. |
| D-3 | Medium | `src/app/experiencers/page.tsx` — v0-exported client brochure with `console.error("[v0]...")`; nav points to `/experiencer` instead | Perf audit | Owner decision: retire, or rebuild as server component if the marketing page is wanted |
| D-4 | Medium | Unused deps: `firebase`, `firebase-admin` (zero imports in `src/`), `howler` + `@types/howler` (experience engine deliberately uses native Audio) | Import grep; project skill docs | `npm uninstall` after grep of `scripts/` confirms |
| D-5 | Medium | ~35 one-off backfill/seed scripts in `scripts/`, all service-role-armed; **`uap-reset-analysis.ts` wipes analysis data**; 3 generations of question seeders; `test_search_logic.ts` references Typesense (no longer in stack) | Data-layer audit script inventory | Move to `scripts/archive/` (keeps history, removes foot-guns from the live dir) |
| D-6 | Medium | 17 disabled GHA workflow stubs | `.github/workflows/*` ("DISABLED: Moved to pg_cron/Oracle") | Delete stubs; keep `channel-score-snapshot.yml` (intentionally live, documented) |
| D-7 | Low | Tracked root junk: `get_failures_fetch.mjs`, `get_latest_failures.js`, `.gemini_push_content.txt` (31KB), `safe-summary-context.md` (31KB), `GEMINI_OLD_FEB2026.md`, `docs/LEARNINGS_OLD_BLOATED.md` | `git ls-files` | Delete |
| D-8 | Low | **Untracked** root junk (deletion is permanent — not git-recoverable): `test.py`, `test_fetch*.mjs` ×3, `test_openai.mjs`, `test_supabase.js`, `test-classify.ts`, `get_errors.js`, `get_errs.py`, `triad-output.log` (80KB), `tmp-pg/`, `tsconfig.tsbuildinfo`, `src/middleware.ts.bak`, `scripts/test-phenom-compiled 2.mjs`, `FABLE5_IMPROVEMENT_PROMPTS.md` (review first) | working-tree listing | Owner reviews list once, then delete + extend `.gitignore` (`*.log`, `tmp-pg/`, `*.tsbuildinfo`) |

### 2.4 Performance

| # | Sev | Finding | Files | Risk | Fix |
|---|---|---|---|---|---|
| P-1 | **High** | ISR declared but defeated on ~20 live pages (`revalidate` + `searchParams` → per-request dynamic) | `blog`, `video/[id]`, `channels`, `channel/[channelId]`, `experiencer`, `video-explore`, `explore/*`, `uap/{blog,channels/[handle],video/[id],events,persons,programs,organizations,experiencer,video-explore}` pages | Every visit runs live Supabase queries; `uap/channels/[handle]` runs **15+ queries/request**; the `warm-questions` script existing at all suggests the pain is known | Move searchParams-dependent UI into client children / `<Suspense>` so the shell stays static, or `unstable_cache` the fetchers. Single largest TTFB + cost win |
| P-2 | **High** | `questions/[slug]` defeats its own SSG with per-request cookie auth (for an admin debug panel) + 3–5 sequential service-role queries | `src/app/questions/[slug]/page.tsx:125,132,278-296,310-353` | SEO-critical pages pay 5–8 serial DB round-trips per hit; `generateStaticParams` work wasted | Render statically; gate debug panel client-side; `Promise.all` the checks |
| P-3 | Medium | Sequential query waterfalls on detail pages | `src/app/video/[id]/page.tsx:285-345` (5 sequential awaits), `uap/video/[id]` (inferred, same template) | 4–6 serialized round trips on dynamic pages | `Promise.all` independent queries |
| P-4 | Medium | Render-blocking Google Fonts `<link>` | `src/app/layout.tsx:45-52` | Extra DNS/TLS + blocking CSS on every page; FOUT | `next/font/google`; also drop the fonts entries from CSP |
| P-5 | Medium | 927-line client header + ChatPopup (~100 hardcoded strings) hydrate on every page | `unified-site-header.tsx`, `chat-popup.tsx`, mounted in `layout.tsx` | Hydration cost on all routes incl. static SEO pages | Server shell + small client islands (auth menu, mobile sheet); lazy-mount ChatPopup |
| P-6 | Medium | recharts imported statically into live UAP pages | `src/app/uap/intelligence/components.tsx` (754 lines), `src/components/uap/{CoverageBarChart,EncounterTaxonomy,TriadScoresPanel,ContentDNA,GuestTrajectory,ChannelUniverseMap,UapResearchBreakdown}.tsx` | recharts+d3 in the bundle of high-traffic channel pages. (The visualize/* pages already use `next/dynamic` correctly — copy that pattern) | `next/dynamic` the chart panels |

### 2.5 Usability / accessibility

| # | Sev | Finding | Files | Risk | Fix |
|---|---|---|---|---|---|
| U-1 | Medium | Almost no loading/error boundaries: 2 `loading.tsx`, **0 `error.tsx`, 0 `not-found.tsx`** across 50+ segments | route segments | Dynamic pages (P-1) show frozen navigations; any Supabase error → default Next error screen | Root `error.tsx` + `not-found.tsx`; `loading.tsx` for heavy list/detail segments |
| U-2 | Medium | Form inputs likely unlabeled: only 19 `htmlFor` app-wide | spot-check `src/app/search3/page.tsx` filters, `NewsletterModal.tsx` **(inferred from counts)** | Screen-reader users can't identify fields | Label pass on live-surface forms |
| U-3 | Low | Gradient `bg-clip-text` hero contrast unverifiable statically | `src/app/page.tsx:81` | Possible WCAG contrast failure | One Lighthouse/axe pass post-cleanup |

**Already healthy:** no click-handlers on raw divs found; raw `<img>` uses have alt; Radix handles focus; `prefers-reduced-motion` respected in GSAP/viz code (`src/components/experience/utils/motion.ts`, `src/components/viz/hooks/useReducedMotion.ts`).

### 2.6 Code quality

| # | Sev | Finding | Files | Risk | Fix |
|---|---|---|---|---|---|
| Q-1 | **Critical** | `typescript.ignoreBuildErrors: true` — `strict` tsconfig is decorative; type errors ship | `next.config.ts:42-44` | With no ESLint and no CI (T-1), there is **zero static safety net** between a keystroke and production | Burn down `tsc --noEmit` errors, remove flag (Phase 4) |
| Q-2 | **High** | Generated DB types imported by **zero files**; 327 `: any` + 62 `as any`, concentrated exactly in the DB/LLM-writing layer (116 in `src/app/api`, 108 in `src/lib`) | `src/lib/supabase/database.types.ts` (1,235 lines, unused), e.g. `api/admin/uap-scanner/route.ts:242` | 47 column-add migrations + untyped queries = renames break at runtime only | Regenerate types (`supabase gen types`), wire `Database` generic into both client factories + new shared service client (A-2) |
| Q-3 | Medium | 241 `console.log` in `src/`; 15 swallowed catches | e.g. `src/app/search3/page.tsx:144,163` (hides malformed-filter bugs) | Noise + silent failures | Log-or-throw pass on live surface; lint rule thereafter |
| Q-4 | Medium | Monster files | `src/lib/pipeline/intake-uap.ts` (1,252), `blog-article.ts` (1,238), `research/methodology/page.tsx` (1,215), `uap/channels/[handle]/page.tsx` (1,057), `api/admin/uap-scanner/route.ts` (1,051), `video/[id]/page.tsx` (950) | Unreviewable, untestable units | Split opportunistically when touched (don't big-bang refactor) |

### 2.7 Testing / CI

| # | Sev | Finding | Files | Risk | Fix |
|---|---|---|---|---|---|
| T-1 | **Critical** | Zero merge gating: no workflow triggers on push/PR; Firebase auto-deploys `main` (inferred) | `.github/workflows/*` (verified: no `push:`/`pull_request:` triggers anywhere) | Broken build/imports/type errors deploy straight to prod | `ci.yml`: `npm ci` → `tsc --noEmit` → eslint → vitest → `next build`; branch protection on main |
| T-2 | **High** | No tests, no framework, anywhere | `package.json`; `find src scripts -name "*.test.*"` → 0 | Recent history is bug-fix-heavy exactly in the unattended nightly pipeline (scanner queue dedup commits `2cf382c`, `cc0aade`) | Vitest + the 8-target suite in Phase 6 |
| T-3 | **High** | ESLint not configured at all; `npm run lint` is broken (`next lint` removed in Next 16 **(inferred)**; no eslint dep either way) | no `.eslintrc*`/`eslint.config.*`; `package.json` | Lint script silently dead | Flat config + `eslint-config-next` core-web-vitals; real `lint` script |
| T-4 | **High** | DB schema not reproducible from repo; `docs/GETTING_STARTED.md`'s `supabase db reset` would produce a broken DB | `supabase/migrations/` (deltas only, no baseline; no `config.toml`, no seed); ~74 tables in code vs partial coverage | No dev/staging environment possible; disaster recovery depends on Supabase backups alone | `supabase db pull` baseline migration + `config.toml`; make `db push` the only migration path (as `docs/database/MIGRATIONS.md` already claims) |
| T-5 | Medium | `.env.example` exists locally but is **not committed**, and is missing most live vars; README says Next 14, points to GEMINI.md; `ENVIRONMENT.md` still documents the superseded pg_cron/Vault scheduler | `git ls-files`; `README.md`; `docs/ENVIRONMENT.md` vs `docs/ARCHITECTURE.md:76-130` | New-machine setup fails at step 1; contradictory docs erode trust in all docs | Commit complete `.env.example` (names only); one doc-accuracy pass with `docs/ARCHITECTURE.md` as source of truth |

### 2.8 AI-layer robustness (from the AI-layer deep dive)

The pipeline calls are all OpenAI via a lazy `getOpenAIClient()`. The newer UAP modules validate model output with zod `safeParse` + normalizers; **all 9 NDE-era modules cast raw `JSON.parse(...) as Type` with no shape validation** — parse exceptions are caught, but a syntactically-valid-but-wrong-shape response is written straight to the DB.

| # | Sev | Finding | Files | Risk | Fix |
|---|---|---|---|---|---|
| AI-1 | Medium | 9 NDE analysis modules cast LLM JSON without schema validation | `greyson.ts:143`, `core-elements.ts:174`, `classify-experience.ts:143`, `cvnde.ts:152`, `transformation.ts:143`, `journey-flow.ts:233`, `nde-summary.ts:84`, `phenomenology-entities.ts:184`, `uap-summary.ts:93` | Silent DB corruption: malformed output writes `undefined` Greyson scores / garbage fingerprint vectors / mis-routed NDE classification into research tables that the public methodology pages are built on. `classify-experience` is worst — a missing `confidence` field silently routes a video into `possible_nde` and changes the whole downstream path. | Port the UAP zod-`safeParse`-plus-normalizer pattern back to the NDE modules. Phase 6 already lists fixture-based tests for `greyson`/`classify-uap`/`uap-phenomenology` — extend to these. |
| AI-2 | Medium | Citation verifier trusts hallucinated verdict indices | `src/lib/pipeline/blog-verify.ts:519-532` | `JSON.parse(relMatch[0]) as Array<…>` then `v.index - 1` indexes the link list with no bounds/shape check → correct references get stripped from published articles; enclosing catch only logs. | zod-validate the verdict array; bounds-check `index`. |
| AI-3 | Medium | JSON "repair" can publish a semantically-truncated story | `src/lib/pipeline/blog-story.ts:438-458` | On parse failure a regex appends braces/quotes and re-parses, still cast unvalidated → a draft cut mid-sentence (missing fields, truncated body) can reach a published public blog story. | Validate required fields + minimum body length after any repair; reject instead of publishing. |
| AI-4 | Low | No timeout / AbortController / explicit retry on any `src/lib/ai/` call | all of `src/lib/ai/` | Only the OpenAI SDK defaults apply (≈10-min timeout); a hung call stalls an unattended nightly batch for minutes. | Set per-call `timeout` / `maxRetries` at client init. |
| AI-5 | Low | UAP system prompt duplicated in two files | `api/uap/chat/route.ts:19`, `src/app/uap/actions.ts:26` | Drift between the popup chat and the `/uap/chat` page chat behavior. | Extract a single shared constant. |
| AI-6 | Medium | Blog pipeline emits malformed link constructs; **112 of 174** stored `blog_posts.body_mdx` rows contain at least one (found 2026-06-10 during the S-6 fix, via a read-only render sweep of all bodies) | generator: `src/lib/pipeline/blog-story.ts` / `blog-article.ts` link+citation handling (relates to AI-2/AI-3); data: `blog_posts.body_mdx` | Constructs like `[text](/video puts it bluntly:` (missing closing paren / spaces in URL) render as visible literal text in published articles — bounded and harmless since the S-6 follow-up fix in `src/lib/markdown.ts`, but unprofessional. Pre-existing on production too. | Two-part follow-up, post-Phase-1: ① validate/repair link syntax in the pipeline before saving so new articles can't ship malformed links (fold into the AI-2/AI-3 zod work); ② one-time content-repair pass over the 112 affected rows — **bulk write to the shared prod DB; owner schedules and supervises it deliberately**. |

**Model exposure (for context, ties to S-1/S-13):** the repo's highest-cost model `gpt-5-chat-latest` sits on the unauthenticated `api/chat-compassionate` POST (S-1); `anthropic/claude-sonnet-4-5` is reachable from the public `questions/[slug]` GET (S-13). No stale/nonexistent model IDs were found.

---

## 3. Phased Execution Plan

Each phase is one concern, independently shippable, ordered by risk-reduction per unit effort. Suggested verification listed per phase. **Nothing in Phases 1–2 deletes anything.**

### Phase 1 — Security hardening (≈1–2 days) · fixes S-1…S-14
The only phase addressing money-losing/exploitable-today issues. Highest-severity first: S-1 (public AI cost-abuse), S-6 (transcript-steerable stored XSS), S-13 (public Sonnet auto-gen), S-2/S-3/S-4.
1. Shared per-IP rate limiter (generalize `api/questions/custom/route.ts:21-40`) applied to: `chat-compassionate`, `uap/chat`, `search3`, `uap/search`, `quiz-lead`, `contact`, `ces-feedback` (S-1, S-3, S-11). Move the `questions/[slug]` auto-gen limit to a shared store (S-13).
2. Auth on `email/manage-subs` POST (token-verified, mirroring GET) (S-2).
3. Fix `IS_DEBUG_MODE`: `NODE_ENV !== 'production' && === 'true'` everywhere it appears (9 routes) (S-4).
4. URL-scheme whitelist + attribute escaping in `lib/markdown.ts` (S-6) — now High; pinned by `tests/lib/markdown.test.ts`.
5. Remove `?secret=` acceptance; header-only CRON auth (S-5). **Coordinated change: update Oracle crontab curls in the same window.**
6. Delete debug logging in `proxy.ts` (S-9); `<` escape in JSON-LD (S-10); remove referer path in `uap/analytics` (S-7); generic 401 bodies (S-14).
- *Tests:* the characterization suite already pins the current (vulnerable) behavior for S-1, S-2, S-4, S-6, S-14 — flip each to assert the secure behavior as the fix lands, making it the regression guard.
- *Verify:* curl each endpoint un/auth'd + over-limit; run one manual crontab tick against prod after the secret change.

### Phase 2 — CI safety net (≈half a day) · fixes T-1, T-3 — **substantially shipped 2026-06-10**
**Done:** `eslint.config.mjs` (flat config, `eslint-config-next/core-web-vitals`), working `lint`/`test` scripts, Vitest, and `.github/workflows/ci.yml` running `npm ci` → typecheck (non-blocking) → lint (non-blocking) → tests (blocking) on PR + push-to-main. Baselines recorded in `docs/BASELINE.md`.
**Remaining:** add `next build` (with dummy env) as a CI step; enable **branch protection on `main`** requiring the `checks` job — this is what actually gates the auto-deploy and is an owner action (GitHub setting). Flip typecheck/lint to blocking once the baseline is burned down (Phase 4).
- *Verify:* a PR with a deliberate type error shows the (non-blocking) failure; once blocking, a broken import blocks merge.

### Phase 3 — Dead code & route cleanup (≈1–2 days) · fixes D-1…D-8, A-3, A-5, A-6 — **destructive, see §4**
1. Relocate `home-new` shared modules (A-3) → then delete dead route folders (D-1). (Dead-code audit confirmed no other cross-imports block deletion.)
2. Delete dead components (D-2 — note the corrected list: `search-result-card.tsx` is dead, `-v4` is **live**), tracked junk (D-7), disabled workflow stubs (D-6), `execution/` (A-5).
3. Delete the dead Genkit stack (A-6): `src/ai/`, `chat-ui.tsx`, `getChatResponse`, the 4 genkit deps + `genkit:*` scripts.
4. `scripts/` → move one-offs to `scripts/archive/` (D-5); add `scripts/README.md`.
5. Uninstall `firebase`, `firebase-admin`, `howler`, `@types/howler` (D-4).
6. Webhook env vars in `apphosting.yaml`: drop `NEXT_PUBLIC_SEARCH_WEBHOOK_URL` **now** (read by nothing); drop `CHAT`/`CHAT_2`/`CHAT_TEST` webhook vars together with their dead routes; **keep `NEXT_PUBLIC_N8N_WEBHOOK_URL`** until the `/experiencers` page fate (D-3) is decided — it's the sole reader.
7. Untracked junk (D-8): owner reviews list, then delete; extend `.gitignore`.
- *Verify:* `next build` green; `npm test` green; click through nav; one Oracle tick (scanner-process) confirmed working post-archive.

### Phase 4 — Type-safety burn-down (≈2–4 days, unknown error count) · fixes Q-1, Q-2, part of Q-3
1. Run `tsc --noEmit`, fix errors (cleanup in Phase 3 will have deleted many).
2. Remove `ignoreBuildErrors`; flip CI typecheck to blocking.
3. Wire `Database` generic into client factories + new shared `createServiceClient()` (A-2); regenerate types.
4. Zod schemas on the public POST routes (S-12).
- *Verify:* CI green with blocking typecheck.

### Phase 5 — Performance (≈2–3 days) · fixes P-1…P-6, U-1
1. Restore real ISR on the ~20 affected pages (P-1) and `questions/[slug]` (P-2) — biggest win.
2. `Promise.all` waterfalls (P-3); `next/font` (P-4); dynamic-import recharts (P-6).
3. Root `error.tsx`/`not-found.tsx` + `loading.tsx` on heavy segments (U-1).
4. Header/ChatPopup splitting (P-5) — largest effort here; can trail.
- *Verify:* before/after Lighthouse + TTFB on `/blog`, `/uap/channels/[handle]`, `/questions/[slug]`.

### Phase 6 — Test suite (≈2–3 days) · fixes T-2
Vitest, in blast-radius order (these run unattended nightly with service-role keys): ① cron/batch auth guards incl. IS_DEBUG_MODE-in-prod regression test, ② proxy admin-gating decision (extract pure function), ③ scanner queue dedup/exclusion (`scripts/scanner-discover.ts`, `src/lib/scanner/` — the proven regression hotspot), ④ AI output parsing with malformed-fixture inputs (`src/lib/ai/greyson.ts`, `classify-uap.ts`, `uap-phenomenology.ts`), ⑤ transcript chunking (`src/lib/pipeline/punctuate-uap.ts`), ⑥ rapid-process credit caps, ⑦ search3 route contract, ⑧ email due-send selection (`src/lib/email/`). Add `vitest run` to CI.

### Phase 7 — Data-layer reproducibility & docs (≈1 day) · fixes T-4, T-5, A-4, M2-class doc rot
1. `supabase db pull` baseline migration + `supabase/config.toml`.
2. Commit complete `.env.example`; commit Oracle crontab file (A-4).
3. Doc pass: README (Next 16, CLAUDE.md), ENVIRONMENT.md (remove pg_cron/Vault section), GETTING_STARTED.md; add this file to `docs/INDEX.md`.

### Phase 8 — Accessibility & UX polish (≈1 day) · fixes U-2, U-3, rest of Q-3
Form-label pass, axe/Lighthouse audit on live surface, contrast fixes, console.log sweep + lint rule.

**Deliberately deferred (post-launch):** CSP nonces (S-8), monster-file refactors (Q-4), AI-layer robustness backfill on the 9 NDE modules (AI-1, fold into Phase 6 if time), blog-pipeline link-syntax validation + one-time repair of the 112 affected articles (AI-6 — the repair is a bulk prod-DB write, owner-scheduled), `experiencers` page fate (D-3 — needs your call on whether that marketing page has a future, and it gates dropping the last webhook env var).

---

## 4. Destructive / Irreversible Actions — explicit approval needed

| Action | Phase | Reversible? |
|---|---|---|
| Delete ~12 route folders, dead components (`site-header.tsx`, `main-nav.tsx`, `search-result-card.tsx`, `welcome-feedback.tsx`, `ui/sidebar.tsx`+`use-mobile.tsx` — **NOT `search-result-card-v4.tsx`, which is live**), tracked junk files, 17 workflow stubs, `execution/`, the dead `src/ai/` Genkit stack | 3 | ✅ Fully (git history) |
| `npm uninstall firebase firebase-admin howler @types/howler genkit genkit-cli @genkit-ai/google-genai @genkit-ai/next` | 3 | ✅ (reinstall) |
| Move ~35 one-off scripts to `scripts/archive/` (incl. `uap-reset-analysis.ts`, which can wipe prod analysis data if ever run) | 3 | ✅ (git mv) |
| **Delete untracked files** (`test_*.mjs`, `test.py`, `tmp-pg/`, `triad-output.log`, `get_errors.js`, `middleware.ts.bak`, …) | 3 | ❌ **Permanent — not in git.** I'll present the exact list for sign-off before deleting |
| Remove `?secret=` auth path | 1 | ✅ code-wise, but **breaks Oracle crontab curls until they're updated** — must be coordinated |
| Drop `NEXT_PUBLIC_*_WEBHOOK_URL` from `apphosting.yaml` (SEARCH now; CHAT/CHAT_2/CHAT_TEST with their routes; **N8N kept** until `/experiencers` decided) | 3 | ✅ (values restorable from Firebase console history; the n8n workflows themselves are untouched) |
| Remove `ignoreBuildErrors` | 4 | ✅ — but blocks deploys until errors are fixed (that's the point) |
| Branch protection on `main` | 2 | ✅ (GitHub setting) |

Nothing in this plan touches the production database, Supabase project settings, or the Oracle VM itself, except the coordinated CRON_SECRET-header change in Phase 1.
