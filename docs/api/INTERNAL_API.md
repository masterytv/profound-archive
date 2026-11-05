# Internal API Routes

> These are the API endpoints hosted within the Next.js application at `/api/*`.

## Chat Compassionate
### `POST /api/chat-compassionate`
**Purpose:** Handles the "Compassionate Chat" feature, providing empathetic responses based on NDE accounts.
**Auth Required:** No (Publicly accessible, but logs session ID).
**Rate Limited:** No explicit rate limit in code (reasons to add one).

**Request Body:**
```json
{
  "sessionId": "string (uuid)",
  "chatInput": "string (user message)",
  "test": "boolean (optional, for staging)"
}
```

**Response:**
```json
{
  "output": "string (AI response content)"
}
```

**Logic:**
1. Fetches dynamic system prompt from `chatbot_configs` table (or falls back to hardcoded).
2. Generates embedding for `chatInput` using OpenAI `text-embedding-3-small`.
3. Calls Supabase RPC `nde_chatbot_match` to find relevant video chunks.
4. Fetches recent chat history from `nde_chat_logs`.
5. Constructs prompt with context and history.
6. Calls OpenAI `gpt-5.6-luna` (or `COMPASSIONATE_CHAT_MODEL`). If that call throws
   for any reason, it retries once on `gpt-4o-mini` (or `COMPASSIONATE_CHAT_FALLBACK_MODEL`)
   and logs the primary model's status/code, so a model-availability problem degrades to a
   cheaper answer rather than a 500. A 500 body now carries `code` alongside `error`.
7. Logs user message and bot response to `nde_chat_logs`.

**File:** `src/app/api/chat-compassionate/route.ts`

---

## Search
### `POST /api/search3`
**Purpose:** Keyword and semantic search over the video corpus, served directly
from Supabase. (The former `/api/search` webhook proxy has been retired.)
**Auth Required:** No. Rate limited to 30 requests/minute per IP — semantic
searches bill OpenAI embeddings.

**Request Body:**
```json
{
  "searchTerm": "string",
  "filters": "object",
  "sortBy": "object",
  "page": 1,
  "type": "keyword | semantic",
  "similarity": 0.50
}
```

**Response:**
Grouped video hits with facet counts.

**File:** `src/app/api/search3/route.ts`

---

## Short Maker research API (read-only)
Three routes that give Short Maker (`masterytv/short-maker`) research data without touching the
database directly. They only read: two existing search RPCs and selects on `nde_vids`,
`nde_analysis`, `experiencer_profiles`, `channels` and `nde_punctuated_embeddings`. No migration.

**Auth:** `Authorization: Bearer <SHORTMAKER_API_KEY>` (constant-time compare; header only; unset = 401).
**Responses:** `Cache-Control: no-store`. `400` bad input (with a message), `401` bad key, `404` unknown or
hidden case, `429` rate limited, `503` upstream failure (never an empty 200).
**Contract:** `src/lib/research/shortmaker/types.ts` (zod). Short Maker validates against a copy, so a
changed or removed field is a breaking change: bump `API_VERSION`.
**Tests:** `tests/api/shortmaker-research.test.ts`.

### `GET /api/research/cases`
Case search, grouped by video (the site's RPCs return moments, so one interview could fill a page).
Rate limit 30/min per IP.

| Param | Default | Meaning |
|---|---|---|
| `q` | required | Theme, 3–300 chars |
| `mode` | `hybrid` | `semantic` (embedding + `search_punctuated_embeddings_filtered`), `keyword` (`keyword_search_videos`), or `hybrid` (both, merged by reciprocal rank) |
| `limit` | 10 | 1–25 cases |
| `min_similarity` | 0.45 | Semantic floor |
| `sort` | `relevance` | or `views` |
| `experience_type`, `trigger`, `tone` | any | CSV |
| `element` | any | CSV of core elements that must be present with confidence ≥ 60 |
| `min_veridical`, `min_intensity` | none | Numbers |
| `named_only` | `true` | Only cases with a named experiencer |
| `exclude_flags` | none | CSV of content-safety flags to drop |
| `include_possible` | `false` | Also allow `possible_nde` videos |

Each case: experiencer (name, profile URL, website/social links), source (title, channel, YouTube and
projectprofound.org URLs, date, views), the 80–150 word summary, classification, present core
elements with quotes trimmed to 25 words, scores, content-safety flags, up to 3 matching moments with
timestamped links, and `permission.status: "none_on_file"`.

### `GET /api/research/cases/{videoId}?include=journey,encounters,transcript`
One case, plus optional sections: the ordered journey, the coded encounters (who was met and what they
said), and the line-level caption transcript (`start`, `end`, `text`) so quotes and clip in/out points can
be verified word for word. Element quotes carry `start_seconds` here. Rate limit 60/min per IP.

### `GET /api/research/counts?element=…|entity_type=…|phrase=…`
Archive counts of distinct confirmed NDE videos, e.g. `element=deceased_relatives` or
`entity_type=deceased_relative` (jsonb containment on the coded fields) or `phrase=what did you learn`
(full-text phrase search on transcript chunks). Returns `count`, `total`, `share`, `as_of`, `method`,
`source_line` (for the screen), `caveat` and the five most-viewed example videos. Cached in memory for an
hour. Rate limit 10/min per IP. Semantic "counts" are deliberately not offered: they are capped floors,
never prevalence.

**Files:** `src/app/api/research/{cases,cases/[videoId],counts}/route.ts`, `src/lib/research/shortmaker/`.
