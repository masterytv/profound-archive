# Corpus atlas

A compact, citable map of the Project Profound archive (about 6,300 confirmed NDE videos and 8,400 tier 1 and 2 UAP videos) built so an AI session can generate book ideas for *The Accidental Mystic* and its successors without reading roughly 60 million tokens of transcripts. Everything here is derived from public YouTube testimony already analyzed by the site's pipelines. No book text lives in this repo; the manuscript, outline, and style guide are read live from Google Drive using the IDs in `sources/DRIVE_SOURCES.md`.

## Start here for ideation

Read, in this order, then start proposing:

1. `ATLAS-stats.md`: the statistical half. Exact distributions, cross-tabs, outliers, and the gaps the numbers raise. Includes a condensed summary of what the site's own Big Question answers and blog already say.
2. `ATLAS-narrative.md`: the narrative half. Themes with approximate counts, standout accounts by video ID, a verbatim quote bank, tensions, rare items, and book-angle sparks consolidated from every video in both domains.
3. `appendix-syntheses.md`, `appendix-experiencers.md`, `appendix-top-lists.md`: drill-downs. Questions nobody has asked yet, people worth a deeper look, and top-25 lists.
4. From Drive: the manuscript, "Book Outline and Key Ideas/Stories", and "Writing Style and Identity".

To pull evidence for any candidate idea, run the semantic search CLI instead of reading in bulk:

```bash
NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/retrieve.mjs "life review where the experiencer felt the pain they caused" --domain nde
NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/retrieve.mjs "craft that changed shape and the witness lost time" --domain uap --source chunks
```

Every video ID in these files opens as `https://www.youtube.com/watch?v=<id>`, and on the site as `/video/<id>` (NDE) or `/uap/video/<id>` (UAP).

## File map

| Path | What it is |
|---|---|
| `ATLAS-stats.md` | Curated statistical atlas, about 9k words |
| `ATLAS-narrative.md` | Curated narrative atlas built from the section digests |
| `narrative/intro.md`, `narrative/nde.md`, `narrative/uap.md`, `narrative/cross-domain.md` | The four parts that `ATLAS-narrative.md` concatenates; edit a part and re-concatenate rather than editing the assembled file |
| `appendix-top-lists.md` | Top-25 lists by score, views, distressing, child, veridical, evidence, contact depth, era |
| `appendix-syntheses.md` | What the 147 cached Big Question answers, 231 blog posts, and 30 daily facts already say; questions nobody has asked |
| `appendix-experiencers.md` | Theme frequencies across 2,820 NDE profiles, top experiencers, contactees, people worth a deeper look |
| `stats/*.json`, `stats/tables.md` | Every computed table, machine-readable and rendered |
| `digests/<domain>/batch-NNN.md` | 348 batch digests, 40 videos each, six fixed sections |
| `merged/<domain>/section-NN.md` | 18 section digests, about 800 videos each, same six sections |
| `digests/usage.jsonl` | Per-batch token usage and cost for the digest run |
| `SITE-IDEAS.md` | Phased proposals for pages and graphs to browse and search all of this on the site |

Raw exports live in `scratch/corpus-atlas/` (gitignored, about 147 MB, regenerable).

## How it was built, and how to rebuild it

All scripts are in `scripts/corpus-atlas/` (documented in that folder's README), use Node built-ins only, and read the database through PostgREST with the service key. Nothing writes to the database.

```bash
NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/pull.mjs            # 20 tables to scratch/corpus-atlas/*.jsonl, counts verified
node scripts/corpus-atlas/aggregate.mjs                             # stats/*.json, stats/tables.md, appendix-top-lists.md
NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/batch-digest.mjs --domain nde   # 158 batches, then --domain uap for 190
NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/merge-digests.mjs --domain nde  # 8 sections, then --domain uap for 10
```

`ATLAS-stats.md`, the appendices, and `ATLAS-narrative.md` were written by Claude sessions reading those outputs; the numbers in `ATLAS-stats.md` come only from `stats/`.

Environment requirements: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `OPENAI_API_KEY` in the environment or `.env.local`; outbound access to the Supabase host and `api.openai.com`. In Claude Code cloud sessions, Node's fetch only reaches the network with `NODE_USE_ENV_PROXY=1`, and the environment's network access must be set to Custom with those two hosts allowed.

Observed costs on 2026-09-08: the batch digest run was 6.33M prompt and 0.78M completion tokens on gpt-5.6-luna, about $2.21, with no fallbacks. The level-1 merge is estimated at about $0.19 but had to be done by Claude subagents because the OpenAI balance ran out after the digest run; `merge-digests.mjs` remains the reproducible path once credits are added.

## Refreshing

The archive grows daily. A refresh is the four commands above; `batch-digest.mjs` and `merge-digests.mjs` skip batches and sections that already exist, so only new videos cost anything. Batch membership is deterministic by sorted video ID, so a large influx will shift batch boundaries; use `--force` for a clean rebuild in that case. `SITE-IDEAS.md` section 4 proposes running the refresh on the Oracle worker crontab like the other pipelines.

## Known gaps

- Batch and section theme counts are model estimates. Use `ATLAS-stats.md` for exact numbers.
- The database types file `src/lib/supabase/database.types.ts` is stale; `pull.mjs` validated columns against the live PostgREST schema instead.
- 802 tier 1 and 2 UAP videos and 2 NDE videos have no AI summary and are absent from the digests.
- `merged/` sections were written by Claude subagents to the `merge-digests.mjs` specification; rerunning the script would regenerate them from the batches on OpenAI.
