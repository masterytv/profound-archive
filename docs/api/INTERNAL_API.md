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
6. Calls OpenAI `gpt-5-chat-latest` (or configured model).
7. Logs user message and bot response to `nde_chat_logs`.

**File:** `src/app/api/chat-compassionate/route.ts`

---

## Search Proxy
### `POST /api/search`
**Purpose:** Proxies search requests to an external n8n workflow.
**Auth Required:** No.

**Request Body:**
```json
{
  "query": "string",
  "filters": "object",
  ... (passed through to n8n)
}
```

**Response:**
Returns the JSON response directly from the n8n webhook.

**Upstream URL:** `https://n8n.awetomatic.com/webhook/4e993b0f-a3be-42ba-925d-4c5f78b3381c`

**File:** `src/app/api/search/route.ts`
