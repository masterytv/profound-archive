# Secrets & API Key Inventory

> Living checklist of every external credential the project uses, where it lives, and
> its rotation status. **No secret VALUES go in this file — names and locations only.**
> Started 2026-06-11 during the post-leak rotation pass.

## Rules of the road
0. **⚠️ Google-issued keys have non-obvious env names.** After deleting/shutting-down ANY GCP project or API key, re-test the app's Google creds: `YOUTUBE_API_KEY` (a Google `AIza…` key) and `GA_CLIENT_EMAIL`/`GA_PRIVATE_KEY` (a service account) — neither contains "GOOGLE" in the name. Deleting the leaked "API key 2" on 2026-06-11 silently broke `YOUTUBE_API_KEY` (it WAS that key). When auditing "is this Google key used?", grep for `YOUTUBE`/`GA_`/`MAPS`, not just `GOOGLE`/`GEMINI`/`FIREBASE`.
1. **Rotate additively:** create new key → update every environment → verify → *then* revoke old. Never delete-first.
2. **Never commit a value.** `.env*`, `.next*`, `*.pem` are gitignored. Build artifacts (`.next.old`) were the original leak vector — keep them out.
3. **Cap every paid provider** (provider-side spend limit) AND rely on the in-app budget guard (`AI_BUDGET_*`) as defense-in-depth.
4. **Prefer header/secret references** over inline values (the SoulWisdomNetwork key leaked because it was inline in `apphosting.yaml`).

## Where secrets live (environments)
| Env | Store | How to update |
|---|---|---|
| Project Profound — **prod** (Firebase App Hosting) | Google **Secret Manager** (project `432036554831`), referenced in `apphosting.yaml` | add a new secret version (Console or `firebase apphosting:secrets:set NAME`) → bump the yaml to the new **numeric** version (⚠️ NOT `versions/latest` — App Hosting fails builds on it, see LEARNINGS.md §5) → redeploy |
| Project Profound — **Oracle VM** (nightly automation) | `~/profound-archive/.env.local` on `150.230.166.48` | SSH, edit `.env.local` (cron reads it fresh each run) |
| Project Profound — **local** | `.env.local` on the Mac | edit file |
| MasteryTV — **Vercel** | Vercel → Settings → Environment Variables | dashboard → redeploy |
| Supabase | Project API settings | rotate in dashboard, update both apps |

---

## Leaked-credential remediation log (reactive — from the Feb 2026 incident)
| Credential | How it leaked | Status |
|---|---|---|
| **Apify token** (…6AXuC) | Committed `.next.old` build artifact in `profound-archive` | ✅ Leaked token removed — ⚠️ **if scanner still uses Apify, create a NEW `APIFY_API_TOKEN` and update prod/VM/local** |
| **Google API key** (Project Profound, `AIza…IhAU`) | Same `.next.old` artifact | ✅ Deleted (unused by app) |
| **Google API key** (SoulWisdomNetwork, `AIza…iWk8`) | Inline in that repo's `apphosting.yaml` | ✅ Entire `soulwisdomnewtwork` project shut down |
| **OpenAI key** (Feb 21) | Detected public | ✅ Auto-disabled by OpenAI — confirm gone + cap live key (see below) |
| **~25 stale GCP projects** | Forgotten experiments holding keys/service accounts | ✅ Shut down (30-day recovery window) |
| **Public repos** `soulwisdomnetwork` | Key in history | ⬜ Make private / delete |

---

## Live secret inventory & rotation status (proactive)
Priority order = blast radius × likely exposure. Rotate top-down.

| # | Env var | Provider | Used by | Stored in | Provider cap? | Rotated | Status |
|---|---|---|---|---|---|---|---|
| 1 | `ANTHROPIC_API_KEY` | Anthropic | Blog pipeline + questions autogen (PP) — `claude-sonnet-4-5` | SM `v1`, local | ✅ monthly cap set at creation | ✅ created 2026-08-04 | ✅ verified local (real calls, priced `api_usage_log` rows). **TODO:** add to VM `.env.local` · promote to prod (main) |
| 1b | ~~`OPENROUTER_API_KEY`~~ | OpenRouter | **RETIRED 2026-08-04** — replaced by #1 | ~~SM `v2`~~ removed from `apphosting.yaml`; still on VM + local | ✅ $25/mo | ✅ 2026-06-11 | ⚠️ Key disabled by Tom during the Aug 2 burn incident. **TODO:** revoke old `antigravity-tom` key · delete remaining OpenRouter key(s) · destroy SM v1+v2 · remove from VM `.env.local`. Two dev-only scripts still read it (`scripts/test-guide-pipeline*.ts/.mjs`) — neither runs on App Hosting or cron. |
| 2 | `OPENAI_API_KEY` | OpenAI | Embeddings + chat (PP, both apps?) | SM, VM, local | ⬜ hard cap | ⬜ | Pending — confirm Feb leak dead |
| 3 | `SUPABASE_SERVICE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase | ⚠️ **~30 routes + ~50 scripts — full DB, bypasses RLS** | SM, VM, local | n/a | ⬜ | Pending — **highest impact**, do carefully |
| 4 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Client auth | SM, VM, local | n/a | ⬜ | Rotate with #3 (RLS-bound, lower risk) |
| 5 | `CRON_SECRET` | self | Automation auth (header-only now, S-5) | SM, VM, GitHub Actions | n/a | ⬜ | Pending — coordinate with Oracle crontab |
| 6 | `YOUTUBE_API_KEY` | Google (YouTube Data) | NDE/UAP scanner | SM `v2`, VM, local | ✅ restricted to YouTube Data API v3 | ✅ 2026-06-11 | ✅ rotated + verified — **was an accidental casualty**: the deleted leaked "API key 2" (`AIza…IhAU`) WAS this key. Recreated restricted. TODO: disable SM v1, promote to prod |
| 7 | `APIFY_API_TOKEN` | Apify | Transcript scrapers | SM, VM | ⬜ | ⚠️ removed | **Recreate if scanner active** |
| 8 | `FAL_API_KEY` | fal.ai | Hero/scene image gen | SM, VM | ⬜ | ⬜ | Pending |
| 9 | `RESEND_API_KEY` | Resend | Transactional email | SM | ⬜ | ⬜ | Pending — account under `coachapp@` too |
| 10 | `TAVILY_API_KEY` | Tavily | Blog research web search | SM, VM | ⬜ | ⬜ | Pending |
| 11 | `SUPADATA_API_KEY` | Supadata | Transcript fallback | SM, VM | ⬜ | ⬜ | Pending |
| 12 | `ELEVENLABS_API_KEY` | ElevenLabs | Referenced in code (TTS?) — **sub was cancelled** | ? | ⬜ | ⬜ | **Decide: re-key or remove code** (account under `awetomatic@`) |
| 13 | `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Telegram | Alerts/notifications | SM | n/a | ⬜ | Pending |
| 14 | `GA_CLIENT_EMAIL` / `GA_PRIVATE_KEY` | Google service account (`project-profound-analytics@…`) | Analytics dashboard | SM | n/a | ⬜ | **Service-account key — high value, verify not leaked** |
| 15 | `TYPESENSE_API_KEY` | Typesense | **DEAD** — Typesense removed from stack | — | — | n/a | 🗑 Remove dead code refs |

### Other accounts (from 2-year email sweep) — review & mostly delete
Not wired into `profound-archive`, but live accounts that can issue keys. Delete the unused ones rather than rotate.
- **In use / verify:** Stripe (Mastery TV), Twilio (active SMS billing), Vercel (MasteryTV), Kit/ConvertKit, Brave Search API, SerpApi (⚠️ welcome email exposed api_key in URL), Hugging Face, xAI/Grok (active invoices), Google Gemini/AI Studio.
- **Cancelled / likely dead → delete account+key:** ElevenLabs, Cohere, Together AI, Firecrawl, PDFVector, LinkdAPI, Rime.ai, Brevo, DigitalOcean, Sanity, n8n, Factory.ai, Kiro, MillionPodcasts, Supadata (if unused).

### Email aliases that own accounts (don't forget these when rotating)
`tom@masterytv.com` · `tom@awetomatic.com` · `coachapp@masterytv.com` · `optimayou@masterytv.com` · `alerts@masterytv.com` · `brainstorm@masterytv.com`

---

## Prevention (close the leak vector for good)
- [x] `.gitignore` covers `.env*`, `.next*`, `*.pem` (added post-incident)
- [ ] **gitleaks pre-commit hook** — block secrets before they're committed
- [ ] **CI secret-scan step** in `ci.yml` — catch anything pushed
- [ ] Commit complete `.env.example` (names only) as the canonical variable list
- [x] **Keep `apphosting.yaml` secret refs pinned to a NUMERIC version** — `versions/latest` **fails App Hosting builds** (LEARNINGS.md §5, confirmed again 2026-06-11). On each rotation: add the new version, bump the number in the yaml, redeploy.
- [ ] (Optional) Purge `.next.old` from `profound-archive` git history with `git-filter-repo`
- [ ] Make/keep `masterytv/soulwisdomnetwork` repo private or deleted

## Legend
SM = Google Secret Manager (prod) · VM = Oracle `.env.local` · local = Mac `.env.local`
✅ done · 🔄 in progress · ⬜ pending · ⚠️ needs decision · 🗑 delete
