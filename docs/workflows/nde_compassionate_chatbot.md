# NDE Compassionate Chatbot

**Status:** ✅ Native
**File:** `src/app/api/chat-compassionate/route.ts`

## Description
Powers the empathetic chatbot that helps users discuss their NDE-related feelings.
Served at `/chat-compassionate`; `/chat`, `/chat-2` and `/chat-test` redirect here.

## Logic
1. **Request:** Receives `chatInput` and `sessionId`.
2. **Embed Input:** Uses OpenAI `text-embedding-3-small` to embed the user's message.
3. **Supabase Vector Search:** Searches `nde_chatbot_chunks` for relevant context.
4. **Chat Completion:** Sends context + history + system prompt to OpenAI.
5. **Response:** Returns the AI message and logs the exchange to `nde_chat_logs`.
