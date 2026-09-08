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

## digest.mjs: batch digests from per-video analysis

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
NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/digest.mjs --domain nde --dry-run
NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/digest.mjs --domain uap --dry-run --print-cards 2

# 2. Smoke test: one batch, one API call.
NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/digest.mjs --domain nde --limit 1

# 3. Full runs, in the background with logs (safe to rerun: finished batches are skipped).
mkdir -p research/corpus-atlas/logs
NODE_USE_ENV_PROXY=1 nohup node scripts/corpus-atlas/digest.mjs --domain nde > research/corpus-atlas/logs/digest-nde.log 2>&1 &
NODE_USE_ENV_PROXY=1 nohup node scripts/corpus-atlas/digest.mjs --domain uap > research/corpus-atlas/logs/digest-uap.log 2>&1 &
tail -f research/corpus-atlas/logs/digest-nde.log
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
- A batch whose digest fails validation is still written (the merge step can decide), but
  the problem is logged to the console and to `usage.jsonl` (`sections_ok: false`).
- Tests against the 60-row sample in `scratch/corpus-atlas/sample/` should use
  `--data scratch/corpus-atlas/sample --out scratch/corpus-atlas/sample-digests` so the
  sample's batch-001 does not shadow the real batch-001 on the full run.
