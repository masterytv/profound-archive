# NDE Compassionate Chatbot

**Status:** 🔄 Validated / Hybrid
**File:** `docs/n8n/nde_compassionate_chatbot.json`

## Description
This workflow powers the empathetic chatbot that helps users discuss their NDE-related feelings.

## Logic (Original n8n)
1. **Webhook Trigger:** Receives `chatInput` and `sessionId`.
2. **Embed Input:** Uses OpenAI to embed the user's message.
3. **Supabase Vector Search:** Searches `nde_chatbot_chunks` for relevant context.
4. **Chat Completion:** Sends context + history + system prompt to OpenAI.
5. **Response:** Returns the AI message.

## Migration Status
This workflow has been largely migrated to `src/app/api/chat-compassionate/route.ts`. The native route handles embedding, retrieval, and chat completion directly.

**Differences:**
- The native implementation uses `text-embedding-3-small` (likely matching n8n).
- The native implementation logs chats to Supabase `nde_chat_logs`.
