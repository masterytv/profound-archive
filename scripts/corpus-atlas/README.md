# corpus-atlas

Small, read-only command-line tools for pulling evidence out of the Project Profound
video corpus (NDE and UAP) without reading anything in bulk. Intended for ideation
sessions: form a candidate book idea, then ask the corpus what it actually says.

All tools here:

- use plain Node 22 ESM (`.mjs`), built-ins and raw `fetch` only — no npm dependencies;
- read `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_KEY` from the
  environment and never print their values;
- must be started with `NODE_USE_ENV_PROXY=1` in this environment, otherwise Node's
  global `fetch` cannot reach OpenAI or Supabase;
- issue only `POST /rest/v1/rpc/<fn>` and `GET /rest/v1/<table>` selects — nothing is written.

## retrieve.mjs

Embeds a query with OpenAI `text-embedding-3-small` (1536 dims — the model the corpus
was embedded with) and runs a pgvector cosine search through one of the site's existing
Supabase RPCs. Results are grouped by video, best similarity first.

```
NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/retrieve.mjs "<query text>" --domain nde|uap \
    [--k 15] [--min-sim 0.45] [--source moments|chunks] [--json]
```

### Flags

| Flag | Default | Meaning |
| --- | --- | --- |
| `--domain nde\|uap` | (required) | Which corpus to search. |
| `--source moments\|chunks` | `moments` | `moments` = timestamped punctuated-transcript embeddings, so each hit has a `start_time` and the YouTube URL carries `&t=<seconds>`. `chunks` = chatbot RAG chunks: larger passages, no timestamp. |
| `--k N` | `15` | Maximum hits to return (1–500). |
| `--min-sim X` | `0.45` | Cosine-similarity floor. The site's question pages use 0.50; drop to ~0.35 for exploratory queries. |
| `--json` | off | Print a JSON object (`query, domain, source, rpc, k, min_sim, embedding_tokens, hit_count, video_count, hits[]`) instead of the listing. |
| `-h`, `--help` | | Usage text. |

Tip: phrase the query the way an experiencer would tell it ("I felt every bit of pain
I had ever caused anyone") rather than as a keyword list — the corpus is first-person
transcript text, and similarity is highest against passages in the same register.

### Which RPC each mode calls

| Mode | Supabase RPC | Parameters sent | Notes |
| --- | --- | --- | --- |
| `nde` / `moments` | `search_punctuated_embeddings_filtered` | `query_embedding` (JSON array), `similarity_threshold`, `sort_column='similarity'`, `sort_direction='DESC'`, `page_limit=k`, `page_offset=0` | Table `nde_punctuated_embeddings`. Returns `content, start_time, similarity, video_id, url, title, thumbnailUrl, date, viewCount, channelName, analysis_nde_summary`. Filter params are left at their NULL defaults. |
| `uap` / `moments` | `search_uap_punctuated_embeddings` | same names as above | Table `uap_punctuated_embeddings`. Returns snake_case columns (`channel_name`, `view_count`, `analysis_uap_summary`, `tier`, `track`). Excludes tier 3 / out-of-scope videos server-side. |
| `nde` / `chunks` | `nde_chatbot_match` | `query_embedding` (JSON array), `match_count=k`, `filter={}` | Table `nde_chatbot_chunks`. Has **no threshold parameter**, so `--min-sim` is applied client-side after fetching `k` rows — fewer than `k` hits may print. Channel and date are filled in by a follow-up select on `nde_vids`. |
| `uap` / `chunks` | `match_uap_chatbot_chunks` | `query_embedding` (vector as text `"[...]"`), `match_threshold`, `match_count=k` | Table `uap_chatbot_chunks`. Returns only `id, video_id, content, metadata, similarity`; title, channel and date come from a follow-up select on `uap_vids`. |

All four combinations were verified live on 2026-09-08. If a mode ever has no function
in the database, the script reports the PostgREST 404 (`PGRST202`) with the parameter
names it sent, so the mismatch can be fixed from the `CREATE FUNCTION` in
`docs/supabase/functions/` or `supabase/migrations/`.

### Output

Per hit: global rank, similarity (2 dp), video ID, title (truncated), channel, date,
YouTube URL (`&t=<seconds>` when a start_time exists) and the passage (whitespace
collapsed, ~300 chars). Hits sharing a video are grouped under one header, best
similarity first. A one-line footer gives hit count, distinct-video count and the
embedding tokens used.

### Examples

```bash
# Timestamped NDE moments about a painful life review
NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/retrieve.mjs \
  "life review where the experiencer felt the pain they caused others" --domain nde

# Larger UAP chatbot chunks, JSON output for piping into another tool
NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/retrieve.mjs \
  "telepathic communication from a being during an abduction" --domain uap --source chunks --k 10 --json
```

## batch-digest.mjs: batch digests from per-video analysis

(Not to be confused with `digest.mjs` above/below, the read-only viewer for question, blog and profile pulls.)

Turns the per-video analysis records exported to `scratch/corpus-atlas/*.jsonl` into
narrative markdown "batch digests" (one per 40 videos) using the OpenAI chat API. The
digests are the input to the atlas merge step; each one has the same six sections
(Themes, Standout accounts, Quotes worth keeping, Tensions and contradictions, Rare or
unusual, Book-angle sparks) and a header line listing the video IDs it covers, so the
merge step can trace every claim back to a video.

Inputs (JSONL, one row per line; JSON columns may be objects or JSON strings):

| domain | files read |
|---|---|
| `nde` | `nde_vids.jsonl` (videoId, title, channelName, date, viewCount, duration, analysis_nde_summary, rvnde_*), `nde_analysis.jsonl` (joined on video_id) |
| `uap` | `uap_vids.jsonl` (snake_case), `uap_encounters.jsonl` (grouped by video_id, first 3 shown), `uap_video_stats.jsonl` (flags, tone, dominant entity) |

Videos without a summary are skipped. Cards are sorted by video ID and cut into fixed-size
batches, so batch numbers are stable across reruns as long as the input files do not change.

Run (Node 22 needs `NODE_USE_ENV_PROXY=1` to reach the API in this environment; no npm
dependencies, needs `OPENAI_API_KEY`):

```bash
# 1. Preview: card count, batch count, average card size, token and cost estimate. Writes nothing.
NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/batch-digest.mjs --domain nde --dry-run
NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/batch-digest.mjs --domain uap --dry-run --print-cards 2

# 2. Smoke test: one batch, one API call.
NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/batch-digest.mjs --domain nde --limit 1

# 3. Full runs, in the background with logs (safe to rerun: finished batches are skipped).
mkdir -p research/corpus-atlas/logs
NODE_USE_ENV_PROXY=1 nohup node scripts/corpus-atlas/batch-digest.mjs --domain nde > research/corpus-atlas/logs/batch-digest-nde.log 2>&1 &
NODE_USE_ENV_PROXY=1 nohup node scripts/corpus-atlas/batch-digest.mjs --domain uap > research/corpus-atlas/logs/batch-digest-uap.log 2>&1 &
tail -f research/corpus-atlas/logs/batch-digest-nde.log
```

Flags: `--domain nde|uap` (required), `--data <dir>` (default `scratch/corpus-atlas`),
`--out <dir>` (default `research/corpus-atlas/digests`), `--batch-size N` (40),
`--limit N` (first N batches only), `--model <id>` (default `gpt-5.6-luna`, falls back to
`gpt-4o-mini` when the primary fails), `--concurrency N` (4), `--force` (regenerate
existing batches), `--dry-run`, `--print-cards N` (dry-run aid), `--help`.

Outputs:

- `research/corpus-atlas/digests/<domain>/batch-NNN.md`: the digest. Written atomically;
  an existing non-empty file is skipped on rerun unless `--force`.
- `research/corpus-atlas/digests/usage.jsonl`: one line per API call with prompt/completion
  tokens, the model that actually answered, estimated USD (prices mirror
  `src/lib/ai/pricing.ts`), attempts, and any format problems found in the digest
  (missing section, wrong header, em dash, too few video IDs cited). The console prints a
  running total.

Behaviour worth knowing:

- Cards target 2,000-2,800 chars (500-700 tokens) and never exceed 3,200; long NDE cards are
  trimmed in steps (shorter quotes, fewer quoted elements, fewer entities) before anything
  is dropped. The dry run reports how many cards needed each trim level.
- Retries with exponential backoff on 429/5xx/network errors (honours `Retry-After`,
  up to 5 attempts per model, 120 s per request). A 400 for an unsupported parameter
  (for example `max_tokens` vs `max_completion_tokens`, or `temperature`) is fixed in the
  request and logged rather than treated as a model failure.
- `gpt-5.6-luna` rejects any `temperature` other than the default, so none is sent to gpt-5
  models (the fallback `gpt-4o-mini` still gets 0.6). Measured on batch-001 of each domain
  (2026-09-08): about 24k/14k prompt tokens (nde/uap) and 2.0-2.2k completion tokens per
  batch including 250-300 reasoning tokens, roughly $0.005-0.008 per batch on Luna.
- UAP cards average ~1.3k chars (most tier 1-2 videos have 0-1 encounters), so
  `--batch-size 60` is a reasonable choice for that domain if fewer, richer batches are wanted.
- A batch whose digest fails validation is still written (the merge step can decide), but
  the problem is logged to the console and to `usage.jsonl` (`sections_ok: false`).
- Tests against the 60-row sample in `scratch/corpus-atlas/sample/` should use
  `--data scratch/corpus-atlas/sample --out scratch/corpus-atlas/sample-digests` so the
  sample's batch-001 does not shadow the real batch-001 on the full run.

## aggregate.mjs

Offline statistics over the JSONL pull in `scratch/corpus-atlas/` (written by `pull.mjs`).
Node built-ins only; no network, no database, no environment variables. Run it with plain
`node` from anywhere:

```
node scripts/corpus-atlas/aggregate.mjs [--in scratch/corpus-atlas] [--out research/corpus-atlas]
```

It streams every `*.jsonl` file it needs (`nde_vids`, `nde_analysis`, `uap_vids`,
`uap_encounters`, `uap_video_stats`, `uap_events`, `uap_canonical_*`, `uap_contactee_profiles`,
`channels`, `uap_channels`, `uap_channel_scores`, `viz_graph_cache`) and writes:

| Output | What it holds |
| --- | --- |
| `research/corpus-atlas/stats/nde.json` | Every NDE table (id, title, caption with the denominator, columns, rows), plus `extra` (observed score ranges, heuristic counts, per-channel aggregates) and `top_lists`. |
| `research/corpus-atlas/stats/uap.json` | Same shape for the UAP domain (encounters, video stats, knowledge base, channels). |
| `research/corpus-atlas/stats/cross.json` | Cross-domain phenomenology comparison, the site's `viz_graph_cache` cross-domain entry copied in, upload years side by side, channel overlap. |
| `research/corpus-atlas/stats/channels.json` | Per-channel aggregates for both domains and the channel metadata tables. |
| `research/corpus-atlas/stats/tables.md` | Every table above rendered as markdown, grouped by domain, with a contents line of table ids. No length cap. |
| `research/corpus-atlas/appendix-top-lists.md` | Top-25 lists (video id with YouTube link, title, channel, year, views, the relevant score, summary truncated to ~220 chars). |

Conventions baked into the script:

- NDE tables are restricted to confirmed NDEs (`nde_vids` with `isNde=clear_nde`, n=6304) joined to
  `nde_analysis` on `video_id`; the 518 `nde_analysis` rows for other videos are ignored.
- Percentages are one decimal over the denominator stated in each table caption ("n=").
  Where a field is null for some rows, the caption says how many and the table uses non-null rows.
- Categorical values are trimmed, lowercased, and spaces/hyphens become underscores; no
  categories are invented. `analysis_failed` rows are excluded from numeric score tables.
- Bands: Greyson 0-7 / 8-15 / 16-23 / 24-32; NDE transformation 0 / 1-9 / 10-19 / 20-29 / 30-39 / 40-50;
  rvnde 0-9 / 10-14 / 15-19 / 20-24 / 25-32; UAP evidence 0-9 / 10-12 / 13-15 / 16-18 / 19-30;
  contact depth 0 / 1-8 / 9-16 / 17-24 / 25-32; UAP transformation 0 / 1-9 / 10-19 / 20-29 / 30-60.
- The child-experiencer and multiple-NDE lists are regex heuristics over AI summaries and are
  labelled as such in the output; the repeat-experiencer list matches `experiencerFullName` exactly.
- `viz_graph_cache` entries are reused for the UAP side of the cross-domain table (their
  `computed_at` is quoted in the caption); the NDE core-element co-occurrence is recomputed over the
  current confirmed set and compared with the cached `nde-elements` graph in `cross-nde-elements-cache-vs-now`.

The curated reading of these tables is `research/corpus-atlas/ATLAS-stats.md`. Re-run `pull.mjs`
then `aggregate.mjs` to refresh everything; the atlas prose has to be re-checked by hand.

## merge-digests.mjs: level-1 merge, batch digests -> section digests

Folds the batch digests written by `batch-digest.mjs` into "section digests", 20 batches
(about 800 videos) per section, so the next merge level reads 18 section files instead of
348 batch files. Each section digest has the same six sections as a batch digest (Themes,
Standout accounts, Quotes worth keeping, Tensions and contradictions, Rare or unusual,
Book-angle sparks) and a header line:

```
Section <domain>-<NN> | batches: <first>-<last> | videos: ~<count>
```

Groups are consecutive batch files sorted by batch number, `--group-size` (20) per group,
numbered `NN` from 01. With the 2026-09-08 digests that is nde: 8 sections (the last with
18 batches) and uap: 10 sections (the last with 10). `videos: ~N` is the number of IDs
listed in the member batch headers, computed by the script and given to the model as the
exact first line to emit.

Run (Node 22 needs `NODE_USE_ENV_PROXY=1`; no npm dependencies; needs `OPENAI_API_KEY`;
no database access):

```bash
# 1. Preview: groups, member files, estimated input tokens (chars/4) and cost. Writes nothing.
NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/merge-digests.mjs --domain nde --dry-run
NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/merge-digests.mjs --domain uap --dry-run

# 2. Smoke test: one group, one API call.
NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/merge-digests.mjs --domain nde --limit 1

# 3. Full runs (safe to rerun: finished sections are skipped unless --force).
mkdir -p research/corpus-atlas/logs
NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/merge-digests.mjs --domain nde 2>&1 | tee research/corpus-atlas/logs/merge-digests-nde.log
NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/merge-digests.mjs --domain uap 2>&1 | tee research/corpus-atlas/logs/merge-digests-uap.log
```

Flags: `--domain nde|uap` (required), `--in <dir>` (default `research/corpus-atlas/digests`),
`--out <dir>` (default `research/corpus-atlas/merged`), `--group-size N` (20), `--limit N`
(first N groups only; numbering unaffected), `--model <id>` (default `gpt-5.6-luna`, falls
back to `gpt-4o-mini` after the primary's retries are exhausted), `--concurrency N` (3),
`--force` (regenerate existing sections), `--dry-run`, `--help`.

Outputs:

- `research/corpus-atlas/merged/<domain>/section-NN.md`: the section digest, written
  atomically; an existing non-empty file is skipped on rerun unless `--force`.
- `research/corpus-atlas/merged/usage.jsonl`: one line per API call with the group, prompt,
  completion and reasoning tokens, the model that answered, estimated USD (Luna $0.20/M in,
  $1.20/M out; 4o-mini $0.15/M, $0.60/M), seconds, attempts, how many of the group's video
  IDs the section cites, how many of its quotes were found verbatim in the inputs, and any
  format problems (`sections_ok: false`).

What the model is asked for: 15-30 merged themes ordered by approximate summed count with
3-5 example IDs each; 15-20 standout accounts; 25-40 quotes copied verbatim from the batch
digests (trimmed quotes marked with an ellipsis); consolidated tensions with IDs on each
side; a deduplicated rare-or-unusual list; 10-15 book-angle sparks; video IDs everywhere,
no em dashes, nothing not present in the inputs; 2,500-3,500 output tokens. Each request is
about 31-34k prompt tokens (20 digests of roughly 6.3k chars plus the prompt), so a full run
of both domains is roughly 600k prompt tokens at chars/4 and about $0.20 on Luna.

Behaviour worth knowing:

- Same API code path as `batch-digest.mjs`: exponential backoff on 429/5xx/network errors
  (honours `Retry-After`, 5 attempts per model, 300 s per request because the prompts are
  large), in-place fixes for rejected parameters, no `temperature` sent to gpt-5 models.
- A 429 of type `insufficient_quota` (for example `credit_balance_exhausted`, "You have no
  credits remaining") is a billing error, not a rate limit: the script does not retry it,
  does not try the fallback model (same account), stops handing out further groups, prints a
  STOPPED line and exits with code 3. Add credits and rerun; finished sections are skipped.
- Validation after each call: exact header line, six headings in order, no en/em dash, at
  least 40 of the group's video IDs cited, 25 or more quotes, and every quoted string in
  "Quotes worth keeping" found verbatim in the member batch digests (straight/curly quotes
  and whitespace normalised, a leading or trailing ellipsis ignored). Problems are logged to
  the console and to `usage.jsonl`; the file is still written so the next level can decide.
- The batch headers occasionally list 41 IDs or a truncated ID, so `videos: ~N` is 800-802
  for a full group rather than exactly 800.
