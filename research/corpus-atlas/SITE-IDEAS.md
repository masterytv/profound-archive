# Corpus atlas: site ideas

A proposal for turning the 2026-09-08 corpus atlas into pages the founder can read, search and chart inside the site. Every reuse claim below cites a file in this repo; every storage choice says whether it needs a migration. Effort figures are working days for one engineer who knows the codebase, and include a vitest characterization test under `tests/` for any new route.

## 1. What the atlas produced, and who it is for

The atlas run left four kinds of material in `research/corpus-atlas/`. First, statistics: `ATLAS-stats.md` (9,155 words of curated reading), backed by 143 machine-readable tables in `stats/{nde,uap,cross,channels}.json` (465 KB total; each table is `{id, title, caption, columns, rows}`, plus `extra` and `top_lists` keys) and rendered in full in `stats/tables.md` (2,834 lines). Second, ranked lists: `appendix-top-lists.md`, 17 top-25 lists with video id, title, channel, year, views, score and a 220-character summary per row. Third, narrative: 348 batch digests (158 NDE, 190 UAP, 40 videos each, 2.2 MB, roughly 297,000 words) with six fixed sections, yielding 1,903 theme bullets, 2,358 standout accounts and 2,118 parseable quotes (average 60 characters, each tagged with a video id), with 18 merged section digests and `ATLAS-narrative.md` still being generated. Fourth, context: `appendix-syntheses.md` (what the 147 cached Big Question answers and 231 blog posts already claim, and section F, the questions nobody has asked) and `appendix-experiencers.md` (2,820 NDE profiles, 3,440 contactee profiles, the 15-theme vocabulary). The CLI `scripts/corpus-atlas/retrieve.mjs` already turns any book idea into timestamped transcript hits through the four pgvector RPCs.

Two audiences. The founder doing book research is the only audience that matters now: private, admin-only, desktop, one user, so pages can be heavier and rougher than public ones and can ship without SEO, OG images or ISR tuning. Public readers are optional and later: the stats and charts derive from data the site already publishes, so they could move under `/research/` with ISR once stable, while the digests' "book-angle sparks" and anything written in a workbench stay private. Note that `research/corpus-atlas/` is tracked in git and the repo is public (CLAUDE.md), so the digests are already public text; the workbench is the only truly private artifact proposed here.

## 2. Recommended build, phased

| Phase | Page or element | Storage | Effort | Depends on |
| --- | --- | --- | --- | --- |
| 1 | Admin Atlas hub: markdown atlas with TOC, every video id linkified; quote bank tab | None (build-time JSON in repo) | 2.5 days | nothing |
| 2 | Digest explorer (search over 366 digests) and outliers page | None at first; optional `corpus_digests` table later (migration) | 4 days | phase 1 parser |
| 3 | Cross-tab explorer and chart gallery | One `viz_graph_cache` row per slim fact set (no migration) | 4 days | phase 1 |
| 4 | Theme browser with co-occurrence graph | One `viz_graph_cache` row `atlas-themes` (no migration) plus a one-off LLM labeling pass | 4 days | phase 2 |
| 5 | Evidence search in the browser (retrieve RPCs) | None | 2 days | nothing |
| 6 | Book workbench | New table with RLS (migration, human-applied) or export-only mode (no storage) | 1.5 days export-only, 4 days with table | phase 1, 5 |
| 7 | Public atlas under `/research/atlas` | Same rows as phase 3 | 2 days | phases 1 to 4 stable |

Total for phases 1 to 6: about 20 working days spread over several weeks, with something usable after the first 2.5.

### Phase 1: the Atlas hub and quote bank (start here)

**Page.** `/admin/atlas` with a left-hand table of contents, rendering `ATLAS-stats.md`, the three appendices, `ATLAS-narrative.md` when it lands, and each merged section digest, one file per route segment (`/admin/atlas/stats`, `/admin/atlas/top-lists`, `/admin/atlas/digests/nde/section-03`). A second tab, `/admin/atlas/quotes`, lists all 2,118 quotes with domain and batch filters, a text box that filters as you type, copy-to-clipboard, and a link to the source video.

**What it lets him do.** Read the whole atlas without leaving the site, and click any of the 9,903 distinct video ids referenced in digest bodies straight to `/video/[id]` or `/uap/video/[id]`. The link target is decided by which batch header the id appears in (NDE batches list NDE ids), so no lookup is needed. That single feature turns the atlas from a document into a navigable index of the archive.

**Reuse.** Admin gating is free: `src/proxy.ts` redirects non-admins away from `/admin/*`, and `src/app/admin/layout.tsx` re-checks the role. Add a "Corpus Atlas" entry to the NDE nav in `src/app/admin/AdminSidebar.tsx`. Markdown rendering reuses `src/lib/markdown.ts` (`markdownToHtml`), which already handles headings, lists, links and blockquotes and is covered by `tests/lib/markdown.test.ts`; it does not handle pipe tables, and the atlas is full of them, so the first half day goes to adding a table rule there (or, if npm access is settled, `marked`, which the file's own comment suggests). Page chrome follows `src/app/admin/page.tsx` and the card classes in `src/app/research/stats/page.tsx`. Video cards can reuse `src/components/explore/ExplorerVideoCard.tsx` (Next Image, `hqdefault`, links to `/video/[id]`); for UAP ids use the same card with the href swapped.

**Storage.** None. Add `scripts/corpus-atlas/build-index.mjs` (Node built-ins, like `aggregate.mjs`) that parses the digests into JSON and writes to `src/data/corpus-atlas/`: `quotes.json` (measured: 269 KB raw, 64 KB gzipped), `digests.json` (2.3 MB raw, 0.8 MB gzipped), `toc.json`, and the markdown bodies as strings. Pages import these with a plain `import`, so they are bundled at build time. Do not read `research/*.md` with `fs` at request time: Firebase App Hosting's standalone output only ships traced files, which is why `scripts/copy-public-to-standalone.mjs` exists (`outputFileTracingIncludes` in `next.config.ts` would also work, but is one more thing to get right). Import the 2.3 MB digest JSON only in server components and route handlers, never in client code.

**Effort.** 2.5 days: 0.5 for tables in `markdownToHtml`, 0.5 for `build-index.mjs` with the id resolver, 1 for the hub pages and TOC, 0.5 for the quote bank.

**Risks.** The digesting model sometimes truncated ids to 10 characters (`-037JoSLNr` in `digests/nde/batch-001.md`); a prefix match against the batch header resolves these (5 quote ids resolved this way in the measurement run, 19 could not be resolved, 13 quote lines did not parse). Log unresolved ids rather than dropping them. UAP quotes are often fragments (393 of 2,118 quotes are under 25 characters), and all quotes were lifted from AI summaries, not transcripts, so the bank should label them "as digested" until phase 5 confirms them against the transcript.

### Phase 2: digest explorer and outliers page

**Page.** `/admin/atlas/search`: one search box over every bullet of every digest, faceted by domain, section (Themes, Standouts, Quotes, Tensions, Rare, Sparks) and batch range, each hit shown with its section label, batch link, and the referenced videos as cards (cap 12 per page per `docs/LEARNINGS.md` section 4). A sibling `/admin/atlas/outliers` renders the 17 top-25 lists from `stats/*.json` `top_lists`, with a "re-query live" button for the lists that are plain sorts.

**What it lets him do.** Ask "what did the digests say about hell", "which batches flagged combat", "every tension involving forgiveness", and land on the videos. The outliers page gives him the atlas's extremes with fresh scores.

**Reuse.** The URL-param sort, filter and pagination pattern from `src/app/explore/greyson/page.tsx` with `src/components/explore/ExplorerControls.tsx`. Live re-query for "by transformation", "by Greyson", "by veridical" and "by views" is the same query those explorer pages already run against `nde_analysis` and `nde_vids`; the UAP evidence, contact and transformation lists come from `uap_encounters` the way `rebuildHynekSpace` in `src/lib/pipeline/rebuild-viz-caches.ts` reads them. The heuristic lists (child experiencers, multiple-NDE regex, repeat experiencers) cannot be re-queried without an RPC and should stay static from `top_lists`.

**Storage.** Start with no storage: a route handler `src/app/api/admin/atlas/search/route.ts` guarded by `isAdminUser()` from `src/lib/auth/admin-guard.ts`, importing `digests.json` and scoring with a small in-memory token index built once per server instance (about 12,000 bullets; a Map from token to bullet ids is a few MB and builds in well under a second). If he wants phrase search, stemming and highlighted snippets, graduate to a `corpus_digests` table (`id, domain, batch, section, position, text, video_ids text[], search tsvector generated always as to_tsvector('english', text) stored`, GIN index) following `supabase/migrations/20260402_add_fts_keyword_search.sql`; supabase-js `.textSearch()` on that column needs no RPC. That table is a migration and therefore a production change on the shared database (CLAUDE.md), so it is written as a migration file and applied by a human, the way `supabase/migrations/20260713_001_cross_domain_aggregates_rpc.sql` still waits.

**Effort.** 3 days for the explorer on JSON, 1 for outliers, plus 1 if the table route is chosen.

**Risks.** Theme bullets cite two or three example ids out of "about 25 of 40", so a theme hit points at examples, not the full set; say so in the UI. Digest text is model output and inherits its errors.

### Phase 3: cross-tab explorer and chart gallery

**Page.** `/admin/atlas/crosstab`: pick a row field and a column field, get a heatmap (counts or row percent) and a stacked bar, with CSV download. NDE fields: trigger, tone, experience type, journey type, Greyson band, transformation class, veridical level, intensity, upload year, channel, analysis model. UAP fields: Hynek type, evidence band, contact-depth band, transformation band, dominant entity, content type, source type, track, video tone, event decade, country, channel. A second route, `/admin/atlas/charts`, is the gallery in section 3.

**Does the stats JSON hold enough pairs?** No. `stats/nde.json` has 17 fixed cross-tabs (`nde-x-tone-by-trigger`, `nde-x-rvnde-by-greyson`, `nde-x-domains-by-tone` and so on) and `uap.json` has 9; they cover the pairs the atlas author chose, not arbitrary pairs. Two ways to get arbitrary pairs. Option A, no migration: have `aggregate.mjs` also emit one slim record per video with only the categorical and banded fields (about 14 fields for 6,304 NDE videos and 12 for 8,394 UAP videos; estimate 150 to 200 KB gzipped per domain), store each as a `viz_graph_cache` row (`atlas-facts-nde`, `atlas-facts-uap`), serve it through a route modelled on `src/app/api/viz/nde-elements/route.ts`, and cross-tabulate in the browser, which is instant at this size and gives him filters for free (for example "tone by trigger, only 2024 uploads"). Option B: a `GROUP BY` RPC taking two column names, which is a migration and must guard against injection through the column names. Option A is recommended; it is the same shape as `presentation-stats`, which already lives in `viz_graph_cache` without a schema change (`src/lib/pipeline/presentation-stats.ts`). `viz_graph_cache` has a public-read RLS policy (`supabase/migrations/20260526_001_viz_graph_cache.sql`), so slim facts would be readable with the anon key; they contain nothing the video pages do not already show.

**Reuse.** `recharts` is already used by `src/app/admin/analytics/analytics-dashboard.tsx` and wrapped by `src/components/ui/chart.tsx`; stacked bars follow `src/components/uap/CoverageBarChart.tsx`. Recharts has no heatmap, so the heatmap is a CSS grid of colored cells (the `hqdefault` and thumbnail rules do not apply). CSV download is a client-side Blob.

**Effort.** 4 days: 1 for the slim-facts emitter and cache rows, 2 for the cross-tab UI, 1 for the gallery.

**Risks.** The two analysis models scored veridical criteria differently (`nde-x-scores-by-model`), so every cross-tab should offer "split by model" so a model artifact is not read as a finding. Scores are spiky (Greyson at 30, transformation at 30 and 36); show n per cell and hide percentages when n is under 20.

### Phase 4: theme browser and co-occurrence graph

**Page.** `/admin/atlas/themes`: a canonical theme list with counts, click a theme to see the batches and example videos, and a 3D graph where nodes are themes and edges are "mentioned in the same batch" (or, better, "cite the same video").

**What it lets him do.** See which motifs travel together across 14,000 videos, and where the NDE and UAP vocabularies touch (the atlas already notes contact-and-transformation on the UAP side echoing transformation on the NDE side).

**Reuse.** `react-force-graph-3d` through `src/app/visualize/nde-elements/nde-element-graph.tsx`, with `VizPageShell`, `VizLegend`, `VizNodeTooltip` and the hooks in `src/components/viz/`; keep the `{nodes, edges, metadata}` payload shape so the existing page needs minimal changes. Serve from a new `viz_graph_cache` row `atlas-themes` through a route cloned from `src/app/api/viz/nde-elements/route.ts`.

**Storage.** The cache row, no migration. The hard part is vocabulary, not storage: the 1,903 theme bullets are free text ("Peace, love, and light", "Disclosure, secrecy, and institutional resistance") and need one LLM pass mapping each to a closed list of about 40 labels per domain, calling the chat API the way `batch-digest.mjs` does. Cost is under a dollar; write the labels back into `digests.json` so phase 2 search can facet on them.

**Effort.** 4 days: 1 for labeling and review, 1 for co-occurrence and the cache row, 2 for the page.

**Risks.** Label drift between runs; keep the label list in checked-in JSON and pass it to the model each time.

### Phase 5: evidence search in the browser

**Page.** `/admin/atlas/evidence`: query box, domain toggle (NDE, UAP), source toggle (moments, chunks), k up to 200, a similarity slider from 0.30 to 0.70, results grouped by video with each hit's timestamp as a link to `/video/[id]?t=` or `/uap/video/[id]?t=` (both pages read `t` from `searchParams` and pass it to the click-to-play `YouTubePlayer`), plus JSON and CSV export and a "find this quote" button on every quote-bank entry that runs the quote text as the query.

**What search3 already does and what is missing.** `src/app/api/search3/route.ts` embeds with `text-embedding-3-small`, calls `search_punctuated_embeddings_filtered` with a `similarity` parameter, and returns timestamped hits, so the core is done. Missing for research use: it is NDE-only (UAP semantic search lives in `src/app/api/uap/search/route.ts`), pages at 12, has no chunk mode (`nde_chatbot_match`, `match_uap_chatbot_chunks`), no grouping by video, no export, and is rate-limited at 30 per minute per IP, which is right for the public and wrong for a research session. The clean move is to port the `MODES` table from `scripts/corpus-atlas/retrieve.mjs` into `src/lib/research/retrieve.ts`, expose it at `src/app/api/admin/atlas/retrieve/route.ts` behind `isAdminUser()`, and wrap the OpenAI client with `wrapAiClient` from `src/lib/ai/usage-tracker` so the spend shows up in `/admin/usage`.

**Storage.** None. **Effort.** 2 days. **Risks.** Embedding cost is negligible, but a k of 200 against the chunk RPCs returns large passages; cap the response at a few hundred KB.

### Phase 6: book workbench

**Page.** `/admin/atlas/workbench`: a list of candidate ideas, each with a title, notes, attached quotes and video ids (added from any atlas page through a small "add to workbench" button), and "export to markdown".

**Storage, two honest options.** Export-only: state in `localStorage`, and an export button that copies markdown to the clipboard for pasting into the private Google Drive notes where CLAUDE.md says the book lives. No table, no migration, 1.5 days, but nothing survives a cleared browser. Persistent: a table `atlas_workbench (id, user_id references auth.users, title, body, items jsonb, created_at, updated_at)` with RLS `user_id = auth.uid()` on all four operations, written through server actions as `src/app/admin/actions.ts` does. That is a migration, so a production change to write as a file and hand to a human. The existing `collections` and `favorites` tables (`docs/database/SCHEMA.md`) are user-scoped video lists with no notes or quote fields, a partial fit at best.

**Effort.** 1.5 or 4 days. **Risks.** The persistent version puts private ideation in the shared production database; verify the RLS with a non-admin session before the first write.

### Phase 7: public atlas (optional, later)

Move the chart gallery and cross-tab explorer under `/research/atlas` with `export const revalidate = 3600`, next to `src/app/research/stats/page.tsx`, reading the same cache rows. Digests, quotes, evidence search and workbench stay admin-only. 2 days.

## 3. Graphs he can use for his own analysis

All charts read from `stats/*.json` tables or the phase 3 slim-facts rows; the ids in the second column are the table ids in `stats/tables.md`. Chart types follow current usage: `recharts` (`BarChart`, `LineChart`, `ScatterChart`, `RadarChart`, `Sankey`) as in `src/app/admin/analytics/analytics-dashboard.tsx`, and `react-force-graph-3d` as in `src/app/visualize/`.

| # | Chart | Source | Type | What it shows |
| --- | --- | --- | --- | --- |
| 1 | Greyson total distribution | `nde-greyson-values` (`nde_analysis.total_greyson_score`) | BarChart, one bar per score 0 to 32 | The spike: 49.2 percent score exactly 30 |
| 2 | Transformation score by model | `nde-transformation-values` split by `nde-x-scores-by-model` | Grouped BarChart | The twin spikes at 30 and 36 are a rubric property, not a model artifact |
| 3 | Tone by trigger | `nde-x-tone-by-trigger` | 100 percent stacked horizontal BarChart | Suicide attempt and overdose carry the most mixed and very negative tone |
| 4 | Veridical level by Greyson band | `nde-x-rvnde-by-greyson` | Stacked BarChart | Whether depth and checkable claims move together |
| 5 | Core element co-occurrence | `extra.core_element_pairs_all` and `nde-core-element-pairs-lift` (already cached as `nde-elements`) | ForceGraph3D with a count or lift toggle | Which of the 15 elements cluster beyond their base rates |
| 6 | Journey flow | `nde-journey-first`, `nde-journey-bigrams`, `nde-journey-last` | recharts Sankey | The dominant narrative path and where distressing journeys branch |
| 7 | Transformation domains by tone | `nde-x-domains-by-tone` (AD, AL, CC, PD, RO, SA, SI, VP, PE, RS) | RadarChart, one polygon per tone | What a very negative experience changes compared with a very positive one |
| 8 | Uploads and mean scores by year | `cross-year` and `nde-x-year` | LineChart, dual axis | Corpus growth (75 percent uploaded since 2023) and score drift over time |
| 9 | Hynek type by evidence band | `uap-x-hynek-by-evidence` | Heatmap (CSS grid) | Where evidence concentrates across CE1 to CE5 and NL |
| 10 | Hynek type by event decade | `uap-x-hynek-by-decade` | Stacked area or BarChart over decades | How the shape of reported encounters changed since the 1940s |
| 11 | Entity type by transformation band | `uap-x-entity-by-transformation` | Stacked BarChart | Which beings are associated with lasting change |
| 12 | Channel fingerprint | `nde-x-channels-top15` or `ch-nde-all` in `channels.json` | ScatterChart, x mean Greyson, y mean veridical, bubble size n, color percent distressing | Whether channels select for depth, evidence, or darkness |
| 13 | Views against score | phase 3 slim facts (viewCount, transformation, rvnde) | ScatterChart with log x axis | Popularity and evidence are unrelated, which matters for what a book should cite |

Twelve of these need nothing but the JSON already on disk; only chart 13 waits for the slim-facts row.

## 4. Data model and refresh

**Pipeline as it stands.** `pull.mjs` (read-only PostgREST export to gitignored `scratch/corpus-atlas/*.jsonl`) then `aggregate.mjs` (offline, writes `stats/*.json`, `tables.md`, `appendix-top-lists.md`) then `batch-digest.mjs` (OpenAI, writes `digests/<domain>/batch-NNN.md`; the full run cost $2.21 across 348 calls, 6.3M prompt tokens, about 41 minutes at concurrency 4) then `merge-digests.mjs` (20 batches per call, writes `merged/<domain>/section-NN.md`, 18 sections) and the final narrative pass to `ATLAS-narrative.md`. This proposal adds `build-index.mjs` (parse digests, resolve ids, emit `src/data/corpus-atlas/*.json`) and a `--publish` flag that upserts the slim facts, theme graph and quote bank into `viz_graph_cache` rows named `atlas-*`, mirroring `refreshPresentationStats` in `src/lib/pipeline/presentation-stats.ts`.

**Cadence.** Stats and slim facts are cheap and deterministic: run `pull`, `aggregate` and `build-index --publish` weekly as a fifth step of `scripts/weekly-maintenance.ts` on the Oracle worker crontab, which `docs/ARCHITECTURE.md` names as the single source of truth for scheduled automation (Sunday 5:00 UTC, after `rebuild-viz-caches` semantics). The Oracle `.env.local` already holds the OpenAI and Supabase keys the scripts read, and `NODE_USE_ENV_PROXY=1` is only needed in this sandbox. Digests should not run weekly: `batch-digest.mjs` sorts cards by video id and cuts fixed batches, so every new video shifts batch membership and would regenerate most of the 348 files. Treat the 2026-09-08 digests as edition one, and add a `--since` mode (or a stored batch manifest) that digests only videos absent from every existing header line into appended batches; run that monthly or on demand, at roughly a cent per 40 videos. `ATLAS-stats.md` prose must still be re-read by a person after each regeneration, as the script README says. A viz-cache row carries `computed_at`, and each atlas page should print it, as `/research/stats` does.

**What goes where.**

| Artifact | Storage | Reason |
| --- | --- | --- |
| Markdown atlas, digests, quotes, digest search index | JSON in `src/data/corpus-atlas/` generated by `build-index.mjs`, bundled at build | No runtime file reads, no migration, versioned with the text |
| Slim facts (NDE, UAP), theme graph, quote bank for charts | `viz_graph_cache` rows `atlas-facts-nde`, `atlas-facts-uap`, `atlas-themes`, `atlas-quotes` | Refreshable by cron without a deploy; same pattern as `presentation-stats` |
| Full-text digest search with ranking | `corpus_digests` table, tsvector, GIN (migration) | Only if in-memory search proves inadequate |
| Workbench | `atlas_workbench` table with RLS (migration) or `localStorage` export-only | Private data must not sit in a public-read cache row |

Every migration goes in `supabase/migrations/` with a status header like the cross-domain RPC file and is applied by a human; no agent runs it on staging, since staging and production share the database.

## 5. Start here

Build the phase 1 Atlas hub with linkified video ids, with the quote bank as its second tab. It is the smallest thing that changes how he works: two and a half days, no migration, no cache rows, no new API, only a build script, a table rule in `src/lib/markdown.ts`, and pages behind the admin gate that already exists. It also produces the one asset every later phase needs, the parsed and id-resolved `digests.json`, so the digest explorer, theme browser and workbench start from a known-good index instead of re-parsing markdown. And it matches what the atlas is right now: a body of text whose value is the links back into 14,000 videos. Once he has read it on the site and clicked through to a few dozen accounts, he will know whether he wants search (phase 2), charts (phase 3) or evidence (phase 5) next, and the remaining order can follow that.
