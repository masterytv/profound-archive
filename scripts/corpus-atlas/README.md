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
