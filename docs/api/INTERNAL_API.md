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
6. Calls OpenAI `gpt-5-chat-latest` (or `COMPASSIONATE_CHAT_MODEL`). If that call throws
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
